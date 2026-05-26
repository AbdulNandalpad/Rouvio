'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowUpDown, Globe, Sparkles } from 'lucide-react'
import { RouvioMark } from '@/components/Brand/RouvioMark'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

const POPULAR_ROUTES = [
  { from: 'Stuttgart', to: 'München' },
  { from: 'Hamburg', to: 'Berlin' },
  { from: 'Freiburg im Breisgau', to: 'München' },
  { from: 'Köln', to: 'Frankfurt am Main' },
  { from: 'Berlin', to: 'Dresden' },
]

const STATS = {
  de: [
    { value: '8', label: 'Kategorien' },
    { value: 'RODI', label: 'KI-Assistent' },
    { value: '100%', label: 'DSGVO-konform' },
    { value: '∞', label: 'Geheimtipps' },
  ],
  en: [
    { value: '8', label: 'Categories' },
    { value: 'RODI', label: 'AI assistant' },
    { value: '100%', label: 'GDPR safe' },
    { value: '∞', label: 'Hidden gems' },
  ],
}

export default function LandingPage() {
  const router = useRouter()
  const [lang, setLang] = useState<'de' | 'en'>('de')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [fromSuggestions, setFromSuggestions] = useState<NominatimResult[]>([])
  const [toSuggestions, setToSuggestions] = useState<NominatimResult[]>([])
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const t = {
    de: {
      headline1: 'Entdecke alles',
      headline2: 'zwischen A und B',
      sub: 'Burgen, Biergärten, Panoramastraßen — RODI, dein KI-Reiseassistent, findet die besten Stopps auf deiner Route.',
      fromLabel: 'Startpunkt',
      toLabel: 'Ziel',
      fromPlaceholder: 'Stadt, Adresse oder Sehenswürdigkeit',
      toPlaceholder: 'Stadt, Adresse oder Sehenswürdigkeit',
      discover: 'Route entdecken',
      popular: 'Beliebte Routen',
    },
    en: {
      headline1: 'Discover everything',
      headline2: 'between A and B',
      sub: 'Castles, beer gardens, scenic roads — RODI, your AI travel companion, finds the best stops along your route.',
      fromLabel: 'Starting point',
      toLabel: 'Destination',
      fromPlaceholder: 'City, address or landmark',
      toPlaceholder: 'City, address or landmark',
      discover: 'Discover route',
      popular: 'Popular routes',
    },
  }[lang]

  function swap() { setFrom(to); setTo(from) }

  async function nominatimSearch(query: string): Promise<NominatimResult[]> {
    if (query.length < 2) return []
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=de,at,ch&accept-language=${lang}`
    const res = await fetch(url, { headers: { 'User-Agent': 'Rouvio/1.0' } })
    return res.json()
  }

  function debounceSearch(val: string, setter: (r: NominatimResult[]) => void) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => setter(await nominatimSearch(val)), 300)
  }

  function handleDiscover() {
    if (!from || !to) return
    router.push(`/map?${new URLSearchParams({ from, to }).toString()}`)
  }

  return (
    <main
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#050B14' }}
    >
      {/* ── Faceted wireframe background — echoes logo geometry ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="facet-grid" patternUnits="userSpaceOnUse" width="160" height="185">
              {/* Diamond outline — same proportions as the Gem Peak mark */}
              <polygon
                points="80,12 148,65 80,118 12,65"
                stroke="rgba(255,255,255,0.028)"
                fill="none"
                strokeWidth="0.6"
              />
              {/* Inner belt line echo */}
              <polyline
                points="12,65 80,54 148,65"
                stroke="rgba(255,140,66,0.04)"
                fill="none"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#facet-grid)" />
        </svg>
      </div>

      {/* ── Ambient colour glows ── */}
      {/* Mint — upper right */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-10%', right: '-5%',
          width: 700, height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,201,167,0.13) 0%, transparent 65%)',
        }}
      />
      {/* Orange — lower left */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-15%', left: '-8%',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,140,66,0.1) 0%, transparent 65%)',
        }}
      />
      {/* Cobalt centre bloom */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(27,58,107,0.35) 0%, transparent 65%)',
        }}
      />

      {/* ── Navigation ── */}
      <header
        className="relative z-20 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-3">
          <RouvioMark size={32} />
          <span
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 700,
              fontSize: 18,
              color: 'white',
              letterSpacing: '-0.3px',
            }}
          >
            rouvio
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* RODI badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(0,201,167,0.07)',
              border: '1px solid rgba(0,201,167,0.18)',
            }}
          >
            <Sparkles size={11} style={{ color: '#00C9A7' }} />
            <span style={{ fontSize: 11, color: '#00C9A7', fontWeight: 600, letterSpacing: '0.5px' }}>
              RODI AI
            </span>
          </div>

          {/* Language toggle */}
          <button
            onClick={() => setLang(l => l === 'de' ? 'en' : 'de')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-sm"
            style={{ color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'white'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,201,167,0.4)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            <Globe size={12} />
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">

        {/* Large mark — hero centrepiece */}
        <div className="mb-8 relative">
          {/* Outer glow ring behind mark */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(0,201,167,0.18) 0%, transparent 70%)',
              transform: 'scale(2.8)',
            }}
          />
          <RouvioMark size={96} />
        </div>

        {/* Region badge */}
        <div
          className="mb-7 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.35)',
            border: '1px solid rgba(255,255,255,0.08)',
            letterSpacing: '3px',
          }}
        >
          Deutschland · Österreich · Schweiz
        </div>

        {/* Headline — two lines, bold, gradient */}
        <div className="text-center mb-6 max-w-3xl">
          <h1
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(38px, 6vw, 76px)',
              lineHeight: 1.08,
              letterSpacing: '-2px',
              marginBottom: 0,
            }}
          >
            <span style={{ color: 'white', display: 'block' }}>{t.headline1}</span>
            <span
              style={{
                display: 'block',
                background: 'linear-gradient(95deg, #ffffff 10%, #00C9A7 60%, #00A88C 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t.headline2}
            </span>
          </h1>

          <p
            className="mt-5 text-base md:text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'DM Sans, sans-serif' }}
          >
            {t.sub}
          </p>
        </div>

        {/* ── Unified search widget ── */}
        <div
          className="w-full max-w-xl mt-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 0 80px rgba(0,201,167,0.06), 0 24px 60px rgba(0,0,0,0.4)',
            overflow: 'visible',
          }}
        >
          {/* From row */}
          <div className="relative px-5 pt-4 pb-3">
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 6,
              }}
            >
              {t.fromLabel}
            </label>
            <div className="flex items-center gap-3">
              {/* Origin dot */}
              <div
                style={{
                  width: 10, height: 10,
                  borderRadius: '50%',
                  background: '#FF8C42',
                  boxShadow: '0 0 8px rgba(255,140,66,0.6)',
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                value={from}
                onChange={e => { setFrom(e.target.value); debounceSearch(e.target.value, setFromSuggestions) }}
                onFocus={() => setActiveField('from')}
                onBlur={() => setTimeout(() => setActiveField(null), 150)}
                placeholder={t.fromPlaceholder}
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{
                  color: from ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
              {from && (
                <button
                  onClick={() => setFrom('')}
                  style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'}
                >
                  ×
                </button>
              )}
            </div>
            {activeField === 'from' && fromSuggestions.length > 0 && (
              <SuggestionDropdown
                results={fromSuggestions}
                onPick={r => { setFrom(r.display_name.split(',').slice(0, 2).join(',').trim()); setFromSuggestions([]) }}
              />
            )}
          </div>

          {/* Divider + swap */}
          <div className="relative flex items-center px-5">
            <div className="flex-1" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <button
              onClick={swap}
              className="mx-3 w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.3)',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,201,167,0.15)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,201,167,0.4)'
                ;(e.currentTarget as HTMLElement).style.color = '#00C9A7'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'
              }}
            >
              <ArrowUpDown size={12} />
            </button>
            <div className="flex-1" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* To row */}
          <div className="relative px-5 pt-3 pb-4">
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 6,
              }}
            >
              {t.toLabel}
            </label>
            <div className="flex items-center gap-3">
              {/* Destination gem — mini mark */}
              <div style={{ flexShrink: 0 }}>
                <svg width="10" height="11" viewBox="0 0 64 70" fill="none">
                  <polygon points="32,5 4,28 32,23"  fill="#1C3A6A" />
                  <polygon points="32,5 32,23 60,28" fill="#4E88DC" />
                  <polygon points="32,23 4,28 32,67" fill="#040407" />
                  <polygon points="32,23 32,67 60,28" fill="#00C9A7" />
                  <circle cx="32" cy="5" r="12" fill="#00C9A7" opacity="0.7" />
                  <circle cx="32" cy="5" r="5" fill="white" opacity="0.95" />
                </svg>
              </div>
              <input
                type="text"
                value={to}
                onChange={e => { setTo(e.target.value); debounceSearch(e.target.value, setToSuggestions) }}
                onFocus={() => setActiveField('to')}
                onBlur={() => setTimeout(() => setActiveField(null), 150)}
                placeholder={t.toPlaceholder}
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{
                  color: to ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
              {to && (
                <button
                  onClick={() => setTo('')}
                  style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'}
                >
                  ×
                </button>
              )}
            </div>
            {activeField === 'to' && toSuggestions.length > 0 && (
              <SuggestionDropdown
                results={toSuggestions}
                onPick={r => { setTo(r.display_name.split(',').slice(0, 2).join(',').trim()); setToSuggestions([]) }}
              />
            )}
          </div>

          {/* CTA button — full width bottom */}
          <div className="px-3 pb-3">
            <button
              onClick={handleDiscover}
              disabled={!from || !to}
              className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all"
              style={{
                background: from && to
                  ? 'linear-gradient(135deg, #00C9A7 0%, #00A88C 100%)'
                  : 'rgba(255,255,255,0.05)',
                color: from && to ? '#050B14' : 'rgba(255,255,255,0.2)',
                border: from && to ? 'none' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: from && to ? '0 4px 32px rgba(0,201,167,0.4)' : 'none',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.2px',
                cursor: from && to ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={e => {
                if (from && to) (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 40px rgba(0,201,167,0.6)'
              }}
              onMouseLeave={e => {
                if (from && to) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 32px rgba(0,201,167,0.4)'
              }}
            >
              {t.discover}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Popular routes ── */}
        <div className="mt-8 w-full max-w-xl">
          <p
            className="text-center mb-4 text-xs tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.2)', letterSpacing: '2px' }}
          >
            {t.popular}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR_ROUTES.map(r => (
              <button
                key={r.from}
                onClick={() => { setFrom(r.from); setTo(r.to) }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs transition-all"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.38)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,201,167,0.08)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,201,167,0.3)'
                  ;(e.currentTarget as HTMLElement).style.color = '#00C9A7'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)'
                }}
              >
                <span
                  style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#FF8C42',
                    display: 'inline-block', flexShrink: 0,
                  }}
                />
                {r.from}
                <span style={{ opacity: 0.4 }}>→</span>
                {r.to}
              </button>
            ))}
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div
          className="mt-12 flex items-center gap-0 rounded-2xl overflow-hidden"
          style={{
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {STATS[lang].map((s, i) => (
            <div
              key={s.label}
              className="flex flex-col items-center px-7 py-3"
              style={{
                borderRight: i < STATS[lang].length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 700,
                  fontSize: 18,
                  color: '#00C9A7',
                  lineHeight: 1,
                }}
              >
                {s.value}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 4,
                  letterSpacing: '0.5px',
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 flex items-center justify-between px-8 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', fontFamily: 'DM Sans, sans-serif' }}>
          © 2025 Rouvio · Powered by OpenStreetMap · Keine Google-APIs
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', fontFamily: 'DM Sans, sans-serif' }}>
          DSGVO-konform · Daten in der EU
        </span>
      </footer>
    </main>
  )
}

/* ── Nominatim suggestion dropdown ── */
function SuggestionDropdown({ results, onPick }: {
  results: NominatimResult[]
  onPick: (r: NominatimResult) => void
}) {
  return (
    <div
      className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden"
      style={{
        background: 'rgba(7,14,28,0.98)',
        border: '1px solid rgba(0,201,167,0.18)',
        borderRadius: 14,
        backdropFilter: 'blur(24px)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      {results.map((r, i) => (
        <button
          key={r.place_id}
          onMouseDown={() => onPick(r)}
          className="w-full text-left px-4 py-3 flex items-center gap-3 transition-all"
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 13,
            fontFamily: 'DM Sans, sans-serif',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,201,167,0.08)'
            ;(e.currentTarget as HTMLElement).style.color = 'white'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'
          }}
        >
          {/* Mini gem dot */}
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C9A7', flexShrink: 0, opacity: 0.7 }} />
          <span className="truncate">{r.display_name}</span>
        </button>
      ))}
    </div>
  )
}
