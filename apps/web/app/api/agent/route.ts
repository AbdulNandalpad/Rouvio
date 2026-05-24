import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import Anthropic from '@anthropic-ai/sdk'
import type { AgentMessage, RouteContext } from '@rouvio/shared-types'

const redis = Redis.fromEnv()
const anthropic = new Anthropic()

const RATE_LIMIT = 10
const RATE_WINDOW = 60

function buildSystemPrompt(ctx: RouteContext): string {
  return `Du bist RODI (Rouvio Discovery Intelligence) — der eingebaute Reiseassistent von Rouvio.
Du bist ein freundlicher, kenntnisreicher lokaler Experte für Deutschland, Österreich und die Schweiz.
Du kennst Bundesstrassen, Landstrassen, Geheimtipps, saisonale Highlights und lokale Spezialitäten.

KONTEXT (wird bei jedem Request dynamisch übergeben):
- Route: ${ctx.from} nach ${ctx.to} (${ctx.distanceKm} km, ca. ${ctx.durationHr.toFixed(1)} Stunden)
- Gefundene POIs: ${ctx.poiCount} gesamt
- Aktive Filter: ${ctx.activeCategories.join(', ') || 'alle'}
- Bereits hinzugefügte Stopps: ${ctx.addedStops.join(', ') || 'keine'}
- Tageszeit: ${ctx.timeOfDay} | Wochentag: ${ctx.dayOfWeek}

VERHALTENSREGELN:
1. Antworte IMMER in der Sprache des Nutzers (Deutsch oder Englisch — auto-detect)
2. Mache konkrete Empfehlungen — keine vagen Aussagen wie "es gibt viele Möglichkeiten"
3. Empfehle nie mehr als 4 Stopps auf einmal — lieber weniger, dafür besser erklärt
4. Berücksichtige immer: Öffnungszeiten, Saisonalität, Fahrtzeit-Auswirkungen
5. Bei Familien mit Kindern: priorisiere kostenlose, interaktive, kindgerechte Stopps
6. Schlage nie Stopps vor die mehr als 30 Min. Umweg bedeuten (es sei denn Nutzer fragt explizit)
7. Sei enthusiastisch aber präzise — wie ein begeisterter lokaler Freund
8. Wenn unklar was der Nutzer will: EINE gezielte Rückfrage stellen

ANTWORTFORMAT — IMMER als valides JSON:
{
  "message": "Deine Antwort an den Nutzer als natürlicher Text",
  "suggestedPOIIds": ["osm_id_1", "osm_id_2"],
  "addToRouteConfirm": false,
  "followUpQuestion": "Optional: eine einzige gezielte Rückfrage oder null"
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

  if (!message?.trim() || !routeContext) {
    return NextResponse.json({ error: 'message and routeContext required' }, { status: 400 })
  }

  // Rate limiting
  const rateLimitKey = `ratelimit:agent:${userId ?? req.ip ?? 'anon'}`
  const current = await redis.incr(rateLimitKey)
  if (current === 1) await redis.expire(rateLimitKey, RATE_WINDOW)
  if (current > RATE_LIMIT) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const systemPrompt = buildSystemPrompt(routeContext)
  const messages = [
    ...conversationHistory.slice(-10).map((m) => ({
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
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: fullText, suggestedPOIIds: [], addToRouteConfirm: false, followUpQuestion: null }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, result: parsed })}\n\n`))
      } catch (err) {
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
