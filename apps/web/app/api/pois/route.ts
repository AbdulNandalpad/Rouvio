import { NextRequest, NextResponse } from 'next/server'
import { fetchPOIs } from '@rouvio/overpass-client'
import { decodePolyline, polylineBbox, distanceToPolylineKm, overpassCacheKey } from '@rouvio/route-utils'
import type { POICategory, POI } from '@rouvio/shared-types'

const CATEGORIES: POICategory[] = ['culture', 'nature', 'food', 'scenic', 'practical', 'family', 'accommodation', 'shopping']

// Lazy-init Redis — won't crash if env vars are missing
function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token || url.startsWith('your_') || token.startsWith('your_')) return null
  try {
    const { Redis } = require('@upstash/redis')
    return Redis.fromEnv() as {
      get: <T>(key: string) => Promise<T | null>
      set: (key: string, value: unknown, opts?: { ex: number }) => Promise<unknown>
    }
  } catch {
    return null
  }
}

// Lazy-init Anthropic — won't crash if env key is missing
function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key.startsWith('your_') || key === '') return null
  try {
    const Anthropic = require('@anthropic-ai/sdk').default
    return new Anthropic({ apiKey: key }) as {
      messages: {
        create: (opts: {
          model: string
          max_tokens: number
          messages: { role: string; content: string }[]
        }) => Promise<{ content: { type: string; text?: string }[] }>
      }
    }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { polyline, categories, corridorKm = 10 } = body as {
    polyline: string
    categories: POICategory[]
    corridorKm: number
  }

  if (!polyline || !categories?.length) {
    return NextResponse.json({ error: 'polyline and categories required' }, { status: 400 })
  }

  const validCategories = categories.filter((c) => CATEGORIES.includes(c))
  const coords = decodePolyline(polyline)
  const bbox = polylineBbox(coords, corridorKm)
  const cacheKey = overpassCacheKey(bbox, validCategories)

  const redis = getRedis()

  // Try cache first
  if (redis) {
    try {
      const cached = await redis.get<POI[]>(cacheKey)
      if (cached) {
        return NextResponse.json({ pois: cached, source: 'cache' })
      }
    } catch {
      // Cache miss is fine — continue to fetch
    }
  }

  // Fetch from Overpass
  const rawPOIs = await fetchPOIs(bbox, validCategories)

  // Filter to corridor and compute distance off route
  const inCorridor = rawPOIs
    .map((p) => ({
      ...p,
      distanceOffRouteKm: distanceToPolylineKm({ lat: p.lat, lng: p.lng }, coords),
    }))
    .filter((p) => p.distanceOffRouteKm <= corridorKm)
    .sort((a, b) => a.distanceOffRouteKm - b.distanceOffRouteKm)
    .slice(0, 60)

  // Enrich with Claude Haiku descriptions (best-effort — skip if no API key)
  const enriched = await enrichWithDescriptions(inCorridor.slice(0, 50), redis)

  // Cache enriched result
  if (redis) {
    try {
      await redis.set(cacheKey, enriched, { ex: 3600 })
    } catch {
      // Cache write failure is non-fatal
    }
  }

  return NextResponse.json({ pois: enriched, source: 'fresh' })
}

type RawPOIWithDistance = Awaited<ReturnType<typeof fetchPOIs>>[number] & { distanceOffRouteKm: number }

async function enrichWithDescriptions(
  rawPOIs: RawPOIWithDistance[],
  redis: ReturnType<typeof getRedis>
): Promise<POI[]> {
  const anthropic = getAnthropic()

  const results = await Promise.all(
    rawPOIs.map(async (p): Promise<POI> => {
      // Check per-POI description cache
      if (redis) {
        try {
          const descCacheKey = `poi:desc:${p.osmId}`
          const cached = await redis.get<{ de: string; en: string }>(descCacheKey)
          if (cached) return buildPOI(p, cached.de, cached.en)
        } catch {
          // cache miss
        }
      }

      // Try AI enrichment if Anthropic is available
      if (anthropic) {
        try {
          const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 120,
            messages: [
              {
                role: 'user',
                content: `Write exactly 2 short sentences describing "${p.name}" (category: ${p.category}, OSM tags: ${JSON.stringify(p.tags).slice(0, 200)}).
Format: {"de": "German sentence.", "en": "English sentence."}
Be specific, enthusiastic, no fluff.`,
              },
            ],
          })

          const text = msg.content[0].type === 'text' ? msg.content[0].text ?? '{}' : '{}'
          const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
          const de = parsed.de ?? p.name
          const en = parsed.en ?? p.name

          // Cache per-POI description
          if (redis) {
            try {
              await redis.set(`poi:desc:${p.osmId}`, { de, en }, { ex: 86400 })
            } catch { /* non-fatal */ }
          }

          return buildPOI(p, de, en)
        } catch {
          // Enrichment failed — use name as fallback
        }
      }

      return buildPOI(p, p.name, p.name)
    })
  )

  return results
}

function buildPOI(
  raw: RawPOIWithDistance,
  descDe: string,
  descEn: string
): POI {
  return {
    osmId: raw.osmId,
    name: raw.name,
    category: raw.category,
    coords: { lat: raw.lat, lng: raw.lng },
    distanceOffRouteKm: Math.round(raw.distanceOffRouteKm * 10) / 10,
    descriptionDe: descDe,
    descriptionEn: descEn,
    openingHours: raw.openingHours,
    tags: raw.tags,
  }
}
