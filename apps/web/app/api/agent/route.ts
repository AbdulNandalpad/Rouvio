import { NextRequest, NextResponse } from 'next/server'
import type { AgentMessage } from '@rouvio/shared-types'

interface RouteContext {
  fromName?: string
  toName?: string
  distanceKm?: number
  durationHr?: number
  poiCount?: number
  tripStopNames?: string[]
  activeCategories?: string[]
  addedStops?: string[]
  timeOfDay?: string
  dayOfWeek?: string
}

const RATE_LIMIT = 10
const RATE_WINDOW = 60

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token || url.startsWith('your_') || token.startsWith('your_')) return null
  try {
    const { Redis } = require('@upstash/redis')
    return Redis.fromEnv() as {
      incr: (key: string) => Promise<number>
      expire: (key: string, sec: number) => Promise<unknown>
    }
  } catch {
    return null
  }
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key.startsWith('your_') || key === '') return null
  try {
    const Anthropic = require('@anthropic-ai/sdk').default
    return new Anthropic({ apiKey: key })
  } catch {
    return null
  }
}

function buildSystemPrompt(ctx: RouteContext): string {
  const from = ctx.fromName ?? 'Start'
  const to = ctx.toName ?? 'Ziel'
  const dist = ctx.distanceKm ?? 0
  const dur = ctx.durationHr ?? 0
  const stops = ctx.tripStopNames?.join(', ') || 'keine'
  const cats = ctx.activeCategories?.join(', ') || 'alle'

  return `Du bist RODI (Rouvio Discovery Intelligence) — der eingebaute Reiseassistent von Rouvio.
Du bist ein freundlicher, kenntnisreicher lokaler Experte für Deutschland, Österreich und die Schweiz.
Du kennst Bundesstrassen, Landstrassen, Geheimtipps, saisonale Highlights und lokale Spezialitäten.

KONTEXT:
- Route: ${from} nach ${to} (${dist} km, ca. ${dur.toFixed(1)} Stunden)
- Gefundene POIs: ${ctx.poiCount ?? 0} gesamt
- Aktive Filter: ${cats}
- Bereits hinzugefügte Stopps: ${stops}

VERHALTENSREGELN:
1. Antworte IMMER in der Sprache des Nutzers (Deutsch oder Englisch — auto-detect)
2. Mache konkrete Empfehlungen — keine vagen Aussagen
3. Empfehle nie mehr als 4 Stopps auf einmal
4. Berücksichtige Öffnungszeiten, Saisonalität, Fahrtzeit-Auswirkungen
5. Schlage nie Stopps vor die mehr als 30 Min. Umweg bedeuten
6. Sei enthusiastisch aber präzise — wie ein begeisterter lokaler Freund
7. Wenn unklar was der Nutzer will: EINE gezielte Rückfrage stellen

ANTWORTFORMAT — IMMER als valides JSON:
{
  "message": "Deine Antwort an den Nutzer als natürlicher Text",
  "suggestedPOIIds": [],
  "addToRouteConfirm": false,
  "followUpQuestion": null
}`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { message, routeContext, conversationHistory, userId } = body as {
    message: string
    routeContext: RouteContext
    conversationHistory: AgentMessage[]
    userId?: string
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }

  // Rate limiting — skip gracefully if Redis unavailable
  const redis = getRedis()
  if (redis) {
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anon'
      const rateLimitKey = `ratelimit:agent:${userId ?? ip}`
      const current = await redis.incr(rateLimitKey)
      if (current === 1) await redis.expire(rateLimitKey, RATE_WINDOW)
      if (current > RATE_LIMIT) {
        return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
      }
    } catch {
      // Rate limit check failed — allow request to proceed
    }
  }

  const anthropic = getAnthropic()

  // If no Anthropic key, return a mock helpful response for local dev
  if (!anthropic) {
    const mockResponse = {
      message: routeContext
        ? `Ich würde gerne Empfehlungen für deine Route von ${routeContext.fromName ?? 'Start'} nach ${routeContext.toName ?? 'Ziel'} machen! Bitte hinterlege deinen Anthropic API-Key in .env.local um RODI zu aktivieren.`
        : 'RODI ist bereit! Bitte hinterlege deinen Anthropic API-Key in .env.local.',
      suggestedPOIIds: [],
      addToRouteConfirm: false,
      followUpQuestion: null,
    }
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result: mockResponse })}\n\n`))
        controller.close()
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  const systemPrompt = buildSystemPrompt(routeContext ?? {})
  const messages = [
    ...(conversationHistory ?? []).slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ]

  // Streaming SSE response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          system: systemPrompt,
          messages,
          stream: true,
        })

        let fullText = ''
        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullText += chunk.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk.delta.text })}\n\n`))
          }
        }

        // Parse and validate final JSON
        const jsonMatch = fullText.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch
          ? JSON.parse(jsonMatch[0])
          : { message: fullText, suggestedPOIIds: [], addToRouteConfirm: false, followUpQuestion: null }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result: parsed })}\n\n`))
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Agent error' })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
