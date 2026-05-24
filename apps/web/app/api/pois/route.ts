import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { fetchPOIs } from '@rouvio/overpass-client'
import { decodePolyline, polylineBbox, distanceToPolylineKm, overpassCacheKey } from '@rouvio/route-utils'
import type { POICategory, POI } from '@rouvio/shared-types'
import Anthropic from '@anthropic-ai/sdk'

const redis = Redis.fromEnv()
const anthropic = new Anthropic()

const CATEGORIES: POICategory[] = ['culture', 'nature', 'food', 'scenic', 'practical', 'family', 'accommodation', 'shopping']

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

  // Try cache first
  const cached = await redis.get<POI[]>(cacheKey)
  if (cached) {
    return NextResponse.json({ pois: cached, source: 'cache' })
  }

  // Fetch from Overpass
  const rawPOIs = await fetchPOIs(bbox, validCategories)

  // Filter to corridor
  const inCorridor = rawPOIs.filter((p) =>
    distanceToPolylineKm({ lat: p.lat, lng: p.lng }, coords) <= corridorKm
  )

  // Enrich uncached POIs with Claude Haiku descriptions
  const enriched = await enrichWithDescriptions(inCorridor.slice(0, 50))

  // Cache enriched result
  await redis.set(cacheKey, enriched, { ex: 3600 })

  return NextResponse.json({ pois: enriched, source: 'fresh' })
}

async function enrichWithDescriptions(rawPOIs: Awaited<ReturnType<typeof fetchPOIs>>): Promise<POI[]> {
  const needsEnrichment = rawPOIs.slice(0, 30)

  const enriched = await Promise.all(
    needsEnrichment.map(async (p): Promise<POI> => {
      const descCacheKey = `poi:desc:${p.osmId}`
      const cached = await redis.get<{ de: string; en: string }>(descCacheKey)

      if (cached) {
        return buildPOI(p, cached.de, cached.en)
      }

      try {
        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 120,
          messages: [
            {
              role: 'user',
              content: `Write exactly 2 short sentences (German + English) describing "${p.name}" (category: ${p.category}, OSM tags: ${JSON.stringify(p.tags).slice(0, 200)}).
Format: {"de": "...", "en": "..."}
Be specific, enthusiastic, concise. No fluff.`,
            },
          ],
        })

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
        const de = parsed.de ?? p.name
        const en = parsed.en ?? p.name

        await redis.set(descCacheKey, { de, en }, { ex: 86400 })
        return buildPOI(p, de, en)
      } catch {
        return buildPOI(p, p.name, p.name)
      }
    })
  )

  return enriched
}

function buildPOI(
  raw: Awaited<ReturnType<typeof fetchPOIs>>[number],
  descDe: string,
  descEn: string
): POI {
  return {
    osmId: raw.osmId,
    name: raw.name,
    category: raw.category,
    coords: { lat: raw.lat, lng: raw.lng },
    distanceOffRouteKm: 0,
    descriptionDe: descDe,
    descriptionEn: descEn,
    openingHours: raw.openingHours,
    tags: raw.tags,
  }
}
