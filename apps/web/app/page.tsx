'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeftRight, Globe } from 'lucide-react'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

const POPULAR_ROUTES = [
  { label: 'Stuttgart → München', from: 'Stuttgart', to: 'München' },
  { label: 'Hamburg → Berlin', from: 'Hamburg', to: 'Berlin' },
  { label: 'Freiburg → München', from: 'Freiburg im Breisgau', to: 'München' },
  { label: 'Köln → Frankfurt', from: 'Köln', to: 'Frankfurt am Main' },
  { label: 'Berlin → Dresden', from: 'Berlin', to: 'Dresden' },
]

export default function LandingPage() {
  const router = useRouter()
  const [lang, setLang] = useState<'de' | 'en'>('de')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [fromSuggestions, setFromSuggestions] = useState<NominatimResult[]>([])
  const [toSuggestions, setToSuggestions] = useState<NominatimResult[]>([])
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const t = lang === 'de'
    ? {
        tagline: 'Entdecke alles zwischen A und B',
        sub: 'Burgen, Seen, Biergärten, Geheimtipps — filtere, was dich begeistert. Dein KI-Reiseassistent RODI plant mit dir.',
        fromPlaceholder: 'Von — Stadt, Adresse oder Sehenswürdigkeit',
        toPlaceholder: 'Nach — Stadt, Adresse oder Sehenswürdigkeit',
        discover: 'Route entdecken',
      }
    : {
        tagline: 'Discover everything between A and B',
        sub: 'Castles, lakes, beer gardens, hidden gems — filter what excites you. Your AI travel companion RODI plans with you.',
        fromPlaceholder: 'From — city, address or landmark',
        toPlaceholder: 'To — city, address or landmark',
        discover: 'Discover route',
      }

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
    <main className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Alpine animated background */}
      <div className="absolute inset-0 bg-animate-gradient" />

      {/* Mint glow — top right */}
      <div
        className="absolute top-[-15%] right-[0%] w-[500px] h-[500px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00C9A7, transparent)' }}
      />
      {/* Orange glow — bottom left */}
      <div
        className="absolute bottom-[-10%] left-[5%] w-[350px] h-[350px] rounded-full opacity-12 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF8C42, transparent)' }}
      />

      {/* Mountain silhouette at bottom */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none opacity-10">
        <svg viewBox="0 0 1440 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-32">
          <path d="M0 200L180 80L320 140L480 40L620 120L780 20L940 100L1100 50L1260 130L1440 60V200H0Z" fill="white" />
        </svg>
      </div>

      {/* Topbar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <RouvioLogo />
        <button
          onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
          className="flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-pill"
          style={{ color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.15)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,201,167,0.5)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
        >
          <Globe size={13} />
          {lang === 'de' ? 'EN' : 'DE'}
        </button>
      </header>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-20">
        {/* Badge */}
        <div
          className="mb-6 px-3 py-1 rounded-pill text-xs font-medium tracking-widest uppercase"
          style={{ background: 'rgba(0,201,167,0.12)', color: '#00C9A7', border: '1px solid rgba(0,201,167,0.25)' }}
        >
          Deutschland · Österreich · Schweiz
        </div>

        <div className="text-center mb-10 max-w-2xl">
          <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-4 tracking-tight">
            {t.tagline}
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t.sub}
          </p>
        </div>

        {/* Search card */}
        <div
          className="w-full max-w-lg rounded-modal p-6 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 0 60px rgba(0,201,167,0.08)',
          }}
        >
          <div className="flex flex-col gap-3">
            {/* From */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: '#00C9A7' }} />
              <input
                type="text"
                value={from}
                onChange={(e) => { setFrom(e.target.value); debounceSearch(e.target.value, setFromSuggestions) }}
                onFocus={(e) => { setActiveField('from'); (e.target as HTMLInputElement).style.borderColor = '#00C9A7' }}
                onBlur={(e) => { setTimeout(() => setActiveField(null), 150); (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
                placeholder={t.fromPlaceholder}
                className="w-full pl-8 pr-4 py-3.5 rounded-input text-sm text-white placeholder-white/30 focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              {activeField === 'from' && fromSuggestions.length > 0 && (
                <SuggestionDropdown results={fromSuggestions} onPick={(r) => { setFrom(r.display_name.split(',').slice(0, 2).join(',').trim()); setFromSuggestions([]) }} />
              )}
            </div>

            {/* Swap */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <button
                onClick={swap}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.2)', color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,201,167,0.2)'; (e.currentTarget as HTMLElement).style.color = '#00C9A7' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,201,167,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)' }}
              >
                <ArrowLeftRight size={13} />
              </button>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* To */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <PinIcon />
              </div>
              <input
                type="text"
                value={to}
                onChange={(e) => { setTo(e.target.value); debounceSearch(e.target.value, setToSuggestions) }}
                onFocus={(e) => { setActiveField('to'); (e.target as HTMLInputElement).style.borderColor = '#00C9A7' }}
                onBlur={(e) => { setTimeout(() => setActiveField(null), 150); (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
                placeholder={t.toPlaceholder}
                className="w-full pl-8 pr-4 py-3.5 rounded-input text-sm text-white placeholder-white/30 focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              {activeField === 'to' && toSuggestions.length > 0 && (
                <SuggestionDropdown results={toSuggestions} onPick={(r) => { setTo(r.display_name.split(',').slice(0, 2).join(',').trim()); setToSuggestions([]) }} />
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handleDiscover}
              disabled={!from || !to}
              className="mt-1 w-full py-3.5 rounded-input font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #00C9A7, #00A88C)', color: '#0F1F3D', boxShadow: '0 4px 24px rgba(0,201,167,0.35)' }}
              onMouseEnter={(e) => { if (from && to) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 32px rgba(0,201,167,0.55)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,201,167,0.35)' }}
            >
              {t.discover}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Popular routes */}
        <div className="mt-7 flex flex-wrap gap-2 justify-center">
          {POPULAR_ROUTES.map((r) => (
            <button
              key={r.label}
              onClick={() => { setFrom(r.from); setTo(r.to) }}
              className="text-xs px-3 py-1.5 rounded-pill transition-all"
              style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#00C9A7'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,201,167,0.4)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Rouvio · Powered by OpenStreetMap · GDPR-konform · Keine Google-APIs
      </footer>
    </main>
  )
}

/* ── Logo — Alpine: cobalt square + mountain-ridge R + wordmark ── */
function RouvioLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="alpineGrad" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B3A6B" />
            <stop offset="100%" stopColor="#2A5298" />
          </linearGradient>
        </defs>
        <rect width="30" height="30" rx="8" fill="url(#alpineGrad)" />
        {/* Mountain ridge clipped into top-right */}
        <path d="M16 4L22 12H28V4H16Z" fill="rgba(0,201,167,0.25)" />
        <path d="M17 4L22 10L27 4" stroke="#00C9A7" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
        {/* R letterform */}
        <path d="M9 8h6c1.8 0 3.2 1.4 3.2 3.2S16.8 14.4 15 14.4H9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
        <line x1="9" y1="8" x2="9" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 14.4L20 22" stroke="white" strokeWidth="2" strokeLinecap="round" />
        {/* Route dot */}
        <circle cx="20" cy="22" r="2" fill="#FF8C42" />
      </svg>

      <svg width="72" height="22" viewBox="0 0 72 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text
          x="0" y="17"
          fontFamily="Outfit, sans-serif"
          fontWeight="700"
          fontSize="18"
          fill="white"
          letterSpacing="-0.3"
        >
          rouvio
        </text>
      </svg>
    </div>
  )
}

/* ── Destination pin — mint ── */
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 8 4 8s4-4.75 4-8c0-2.21-1.79-4-4-4z" fill="#00C9A7" />
      <circle cx="7" cy="5" r="1.5" fill="white" />
    </svg>
  )
}

/* ── Nominatim dropdown ── */
function SuggestionDropdown({ results, onPick }: { results: NominatimResult[]; onPick: (r: NominatimResult) => void }) {
  return (
    <div
      className="absolute top-full left-0 right-0 mt-1 z-50 rounded-card overflow-hidden shadow-2xl"
      style={{ background: 'rgba(10,24,52,0.97)', border: '1px solid rgba(0,201,167,0.2)', backdropFilter: 'blur(20px)' }}
    >
      {results.map((r) => (
        <button
          key={r.place_id}
          onMouseDown={() => onPick(r)}
          className="w-full text-left px-4 py-2.5 text-sm flex items-start gap-2.5 transition-colors"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,201,167,0.12)'; (e.currentTarget as HTMLElement).style.color = 'white' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)' }}
        >
          <PinIcon />
          <span className="line-clamp-1 mt-px">{r.display_name}</span>
        </button>
      ))}
    </div>
  )
}
