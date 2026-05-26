'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { POI, RouteResult } from '@rouvio/shared-types'

interface Props {
  route: RouteResult | null
  pois: POI[]
  tripStops: POI[]
  lang: 'de' | 'en'
  onSuggestedPOIs: (ids: string[]) => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestedPOIIds?: string[]
}

const PLACEHOLDER = {
  de: 'Frag RODI nach Zielen entlang deiner Route…',
  en: 'Ask RODI about stops along your route…',
}

const STARTERS = {
  de: ['Beste Biergärten?', 'Familienfreundliche Stopps?', 'Geheimtipps Burgen?', 'Mittagspause wo?'],
  en: ['Best beer gardens?', 'Family-friendly stops?', 'Hidden castles?', 'Where to have lunch?'],
}

export default function ChatBar({ route, pois, tripStops, lang, onSuggestedPOIs }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingText])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setStreamingText('')
    if (!expanded) setExpanded(true)

    abortRef.current = new AbortController()

    try {
      const routeContext = route ? {
        fromName: route.fromName ?? 'Start',
        toName: route.toName ?? 'Ziel',
        distanceKm: route.distanceKm,
        durationHr: route.durationHr,
        poiCount: pois.length,
        tripStopNames: tripStops.map(p => p.name),
      } : null

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          routeContext,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          userId: 'anonymous',
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Agent unavailable')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let parsedResult: { message: string; suggestedPOIIds?: string[] } | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })

        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          try {
            const parsed = JSON.parse(data)
            if (parsed.done && parsed.result) {
              parsedResult = parsed.result
            } else if (parsed.delta) {
              fullText += parsed.delta
              setStreamingText(fullText)
            }
          } catch { /* not json */ }
        }
      }

      const finalMessage = parsedResult?.message ?? fullText
      const suggestedIds = parsedResult?.suggestedPOIIds ?? []

      setMessages(prev => [...prev, { role: 'assistant', content: finalMessage, suggestedPOIIds: suggestedIds }])
      setStreamingText('')
      if (suggestedIds.length > 0) onSuggestedPOIs(suggestedIds)
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: lang === 'de'
            ? 'RODI ist gerade nicht erreichbar. Bitte versuche es gleich nochmal.'
            : 'RODI is unavailable right now. Please try again in a moment.',
        }])
        setStreamingText('')
      }
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [loading, route, pois, tripStops, messages, lang, expanded, onSuggestedPOIs])

  return (
    <div className="flex flex-col" style={{ gap: '8px' }}>
      {/* ── Expanded chat history ── */}
      {expanded && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(10,20,45,0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #00C9A7, #1B3A6B)' }}>
                <Sparkles size={10} className="text-white" />
              </div>
              <span className="text-white/60 text-xs font-medium tracking-wide">RODI — Rouvio Discovery Intelligence</span>
              {messages.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,201,167,0.12)', color: '#00C9A7', border: '1px solid rgba(0,201,167,0.18)' }}>
                  {messages.length}
                </span>
              )}
            </div>
            <button onClick={() => setExpanded(false)} className="text-white/30 hover:text-white/60 transition-colors">
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="px-4 py-3 space-y-3 overflow-y-auto" style={{ maxHeight: '260px' }}>
            {messages.length === 0 && (
              <p className="text-white/25 text-xs text-center py-2">
                {lang === 'de'
                  ? 'Frag RODI nach Sehenswürdigkeiten, Restaurants oder versteckten Schätzen.'
                  : 'Ask RODI about sights, restaurants, or hidden gems along your route.'}
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-5 h-5 rounded-md shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #00C9A7, #1B3A6B)' }}>
                    <Sparkles size={9} className="text-white" />
                  </div>
                )}
                <div className="max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                  style={msg.role === 'user' ? {
                    background: 'rgba(0,201,167,0.12)',
                    border: '1px solid rgba(0,201,167,0.18)',
                    color: 'rgba(255,255,255,0.88)',
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.78)',
                  }}>
                  {msg.content}
                  {msg.suggestedPOIIds && msg.suggestedPOIIds.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-white/10">
                      <span className="text-[10px]" style={{ color: '#00C9A7' }}>
                        ✦ {msg.suggestedPOIIds.length} {lang === 'de' ? 'Orte markiert' : 'places highlighted'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Typing / streaming */}
            {(loading || streamingText) && (
              <div className="flex gap-2 justify-start">
                <div className="w-5 h-5 rounded-md shrink-0 mt-0.5 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #00C9A7, #1B3A6B)' }}>
                  <Sparkles size={9} className="text-white" />
                </div>
                <div className="max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.78)' }}>
                  {streamingText || (
                    <span className="flex items-center gap-1">
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce inline-block"
                          style={{ background: '#00C9A7', animationDelay: `${delay}ms` }} />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick starters */}
          {messages.length === 0 && !loading && (
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {STARTERS[lang].map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  className="shrink-0 text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-all"
                  style={{ background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.18)', color: 'rgba(255,255,255,0.5)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,201,167,0.18)'
                    ;(e.currentTarget as HTMLElement).style.color = '#00C9A7'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,201,167,0.08)'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
                  }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
        style={{
          background: 'rgba(10,20,45,0.88)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        }}>
        {/* RODI badge */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(0,201,167,0.18), rgba(27,58,107,0.35))',
            border: '1px solid rgba(0,201,167,0.22)',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,201,167,0.45)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,201,167,0.22)'}
        >
          <Sparkles size={11} style={{ color: '#00C9A7' }} />
          <span className="text-[11px] font-bold tracking-widest" style={{ color: '#00C9A7' }}>RODI</span>
          {expanded
            ? <ChevronDown size={9} style={{ color: 'rgba(0,201,167,0.55)' }} />
            : <ChevronUp size={9} style={{ color: 'rgba(0,201,167,0.55)' }} />}
          {messages.filter(m => m.role === 'assistant').length > 0 && (
            <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: '#00C9A7', color: '#0F1F3D' }}>
              {messages.filter(m => m.role === 'assistant').length}
            </span>
          )}
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          onFocus={() => !expanded && setExpanded(true)}
          placeholder={PLACEHOLDER[lang]}
          disabled={loading}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        />

        {/* Send */}
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: input.trim() && !loading ? 'linear-gradient(135deg, #00C9A7, #00A88C)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${input.trim() && !loading ? '#00C9A7' : 'rgba(255,255,255,0.08)'}`,
            color: input.trim() && !loading ? '#0F1F3D' : 'rgba(255,255,255,0.2)',
          }}>
          {loading
            ? <div className="w-3 h-3 rounded-full border-2 animate-spin"
                style={{ borderColor: '#00C9A7', borderTopColor: 'transparent' }} />
            : <Send size={12} />}
        </button>
      </div>
    </div>
  )
}
