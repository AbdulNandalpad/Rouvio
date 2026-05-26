'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Share2, Bookmark, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { POI, POICategory, RouteResult } from '@rouvio/shared-types'
import FilterBar from '@/components/FilterBar/FilterBar'
import POICard from '@/components/POICard/POICard'
import ChatBar from '@/components/AgentChat/ChatBar'

const MapCanvas = dynamic(() => import('@/components/Map/MapCanvas'), { ssr: false })

const ALL_CATEGORIES: POICategory[] = [
  'culture', 'nature', 'food', 'scenic', 'practical', 'family', 'accommodation', 'shopping'
]

interface NominatimResult { lat: string; lon: string; display_name: string }

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=de,at,ch`
  const res = await fetch(url, { headers: { 'User-Agent': 'Rouvio/1.0' } })
  const data: NominatimResult[] = await res.json()
  if (!data[0]) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-[#0F1F3D] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-[#00C9A7]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00C9A7] animate-spin" />
          </div>
          <p className="text-white/50 text-sm">Lade Karte…</p>
        </div>
      </div>
    }>
      <MapPageInner />
    </Suspense>
  )
}

function MapPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

  const [route, setRoute] = useState<RouteResult | null>(null)
  const [pois, setPois] = useState<POI[]>([])
  const [activeCategories, setActiveCategories] = useState<POICategory[]>(ALL_CATEGORIES)
  const [corridorKm, setCorridorKm] = useState(10)
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null)
  const [tripStops, setTripStops] = useState<POI[]>([])
  const [panelOpen, setPanelOpen] = useState(true)
  const [loadingRoute, setLoadingRoute] = useState(true)
  const [loadingPOIs, setLoadingPOIs] = useState(false)
  const [lang] = useState<'de' | 'en'>('de')

  const filteredPois = pois.filter(p => activeCategories.includes(p.category))

  // Initial data load
  useEffect(() => {
    if (!from || !to) return
    loadRoute()
  }, [from, to])

  // Re-fetch POIs when corridor changes
  useEffect(() => {
    if (route) loadPOIs(route.polyline, activeCategories)
  }, [corridorKm])

  async function loadRoute() {
    setLoadingRoute(true)
    try {
      const [fromCoords, toCoords] = await Promise.all([geocode(from), geocode(to)])
      if (!fromCoords || !toCoords) return

      const res = await fetch(
        `/api/route?fromLat=${fromCoords.lat}&fromLng=${fromCoords.lng}&toLat=${toCoords.lat}&toLng=${toCoords.lng}`
      )
      const data = await res.json()

      const routeResult: RouteResult = {
        polyline: data.polyline,
        distanceKm: data.distanceKm,
        durationHr: data.durationHr,
        fromCoords,
        toCoords,
        fromName: from,
        toName: to,
      }
      setRoute(routeResult)
      await loadPOIs(data.polyline, ALL_CATEGORIES)
    } catch (e) {
      console.error('Route load failed', e)
    } finally {
      setLoadingRoute(false)
    }
  }

  async function loadPOIs(polyline: string, categories: POICategory[]) {
    setLoadingPOIs(true)
    try {
      const res = await fetch('/api/pois', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polyline, categories, corridorKm }),
      })
      const data = await res.json()
      setPois(data.pois ?? [])
    } catch (e) {
      console.error('POI load failed', e)
    } finally {
      setLoadingPOIs(false)
    }
  }

  function toggleCategory(cat: POICategory) {
    setActiveCategories(prev =>
      prev.includes(cat)
        ? prev.length > 1 ? prev.filter(c => c !== cat) : prev
        : [...prev, cat]
    )
  }

  function addToTrip(poi: POI) {
    setTripStops(prev => prev.find(p => p.osmId === poi.osmId) ? prev : [...prev, poi])
    setSelectedPOI(null)
  }

  function removeFromTrip(osmId: string) {
    setTripStops(prev => prev.filter(p => p.osmId !== osmId))
  }

  const formatDuration = (hr: number) => {
    const h = Math.floor(hr)
    const m = Math.round((hr - h) * 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0F1F3D]">
      {/* ── Full-screen map ── */}
      <div className="absolute inset-0">
        <MapCanvas
          route={route}
          pois={filteredPois}
          selectedPOIId={selectedPOI?.osmId ?? null}
          tripStopIds={tripStops.map(s => s.osmId)}
          onPOIClick={setSelectedPOI}
        />
      </div>

      {/* ── Loading overlay ── */}
      {loadingRoute && (
        <div className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(15,31,61,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-[#00C9A7]/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00C9A7] animate-spin" />
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wide">
              {lang === 'de' ? 'Route wird berechnet…' : 'Calculating route…'}
            </p>
          </div>
        </div>
      )}

      {/* ── Floating topbar ── */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center gap-3 pointer-events-none">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'rgba(15,31,61,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#00C9A7'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'}
        >
          <ArrowLeft size={16} />
        </button>

        {/* Route breadcrumb */}
        <div
          className="pointer-events-auto flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full"
          style={{ background: 'rgba(15,31,61,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="w-2 h-2 rounded-full bg-[#00C9A7] shrink-0" />
          <span className="text-white text-sm font-medium truncate">{from}</span>
          <div className="flex-1 flex items-center gap-1 px-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-1 h-px bg-white/20" />
            ))}
            <div className="w-1 h-1 rounded-full bg-white/40" />
          </div>
          <div className="w-2 h-2 rounded-full bg-[#FF8C42] shrink-0" />
          <span className="text-white text-sm font-medium truncate">{to}</span>
        </div>

        {/* Action buttons */}
        <div className="pointer-events-auto flex gap-2">
          {[
            { icon: Bookmark, label: 'Save', count: tripStops.length },
            { icon: Share2, label: 'Share', count: 0 },
          ].map(({ icon: Icon, label, count }) => (
            <button key={label}
              className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(15,31,61,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#00C9A7'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              <Icon size={15} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF8C42] text-white text-[9px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Floating left panel ── */}
      <div
        className="absolute top-20 bottom-24 left-4 z-20 flex transition-all duration-300 ease-out"
        style={{ width: panelOpen ? '360px' : '0px' }}
      >
        <div
          className="relative w-[360px] shrink-0 rounded-2xl flex flex-col overflow-hidden"
          style={{
            background: 'rgba(10,20,45,0.82)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            opacity: panelOpen ? 1 : 0,
            transform: panelOpen ? 'translateX(0)' : 'translateX(-20px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          {/* Route stats */}
          {route && (
            <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-bold text-white text-base">
                  {lang === 'de' ? 'Deine Route' : 'Your Route'}
                </h2>
                {loadingPOIs && (
                  <div className="w-3 h-3 rounded-full border border-transparent border-t-[#00C9A7] animate-spin" />
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: lang === 'de' ? 'Strecke' : 'Distance', value: `${route.distanceKm} km` },
                  { label: lang === 'de' ? 'Fahrzeit' : 'Drive time', value: formatDuration(route.durationHr) },
                  { label: 'POIs', value: `${filteredPois.length}` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl px-3 py-2.5 text-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-[#00C9A7] font-heading font-bold text-base leading-none">{value}</div>
                    <div className="text-white/40 text-[10px] mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter chips */}
          <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/[0.06]">
            <FilterBar
              activeCategories={activeCategories}
              onToggle={toggleCategory}
              lang={lang}
            />
          </div>

          {/* Corridor slider */}
          <div className="shrink-0 px-5 pt-3 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-xs">
                {lang === 'de' ? 'Korridor' : 'Corridor'}
              </span>
              <span className="text-[#00C9A7] text-xs font-semibold">{corridorKm} km</span>
            </div>
            <div className="flex gap-2">
              {[5, 10, 25].map(km => (
                <button key={km} onClick={() => setCorridorKm(km)}
                  className="flex-1 py-1.5 rounded-pill text-xs font-medium transition-all"
                  style={{
                    background: corridorKm === km ? '#00C9A7' : 'rgba(255,255,255,0.05)',
                    color: corridorKm === km ? '#0F1F3D' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${corridorKm === km ? '#00C9A7' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  {km} km
                </button>
              ))}
            </div>
          </div>

          {/* POI list */}
          <div className="flex-1 overflow-y-auto px-3 pt-3 pb-3 space-y-2">
            {filteredPois.length === 0 && !loadingPOIs && (
              <div className="flex flex-col items-center justify-center h-32 text-white/25 text-sm text-center px-4">
                {lang === 'de' ? 'Keine POIs gefunden. Passe den Korridor oder Filter an.' : 'No POIs found. Adjust the corridor or filters.'}
              </div>
            )}
            {loadingPOIs && filteredPois.length === 0 && (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-2xl h-[88px] animate-pulse"
                    style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            )}
            {filteredPois.map(poi => (
              <POICard
                key={poi.osmId}
                poi={poi}
                lang={lang}
                inTrip={tripStops.some(s => s.osmId === poi.osmId)}
                isSelected={selectedPOI?.osmId === poi.osmId}
                onSelect={() => setSelectedPOI(prev => prev?.osmId === poi.osmId ? null : poi)}
                onAddToTrip={() => addToTrip(poi)}
                onRemoveFromTrip={() => removeFromTrip(poi.osmId)}
              />
            ))}
          </div>
        </div>

        {/* Panel toggle tab */}
        <button
          onClick={() => setPanelOpen(p => !p)}
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-14 rounded-r-xl flex items-center justify-center transition-all z-10"
          style={{
            background: 'rgba(10,20,45,0.82)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: 'none',
            color: 'rgba(255,255,255,0.5)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00C9A7' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >
          {panelOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* ── POI detail sheet ── */}
      {selectedPOI && (
        <div
          className="absolute bottom-24 right-4 z-30 w-80 rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(10,20,45,0.92)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          <POIDetailSheet
            poi={selectedPOI}
            lang={lang}
            inTrip={tripStops.some(s => s.osmId === selectedPOI.osmId)}
            onClose={() => setSelectedPOI(null)}
            onAddToTrip={() => addToTrip(selectedPOI)}
            onRemoveFromTrip={() => removeFromTrip(selectedPOI.osmId)}
          />
        </div>
      )}

      {/* ── RODI bottom bar ── */}
      {/* Sits to the right of the 360px panel + 16px left + 8px gap + 8px panel-toggle */}
      <div
        className="absolute bottom-4 z-30"
        style={{
          left: panelOpen ? 'calc(16px + 360px + 20px)' : '80px',
          right: '16px',
          transition: 'left 0.3s ease-out',
        }}
      >
        <ChatBar
          route={route}
          pois={filteredPois}
          tripStops={tripStops}
          lang={lang}
          onSuggestedPOIs={(ids) => {
            const suggested = pois.filter(p => ids.includes(p.osmId))
            if (suggested.length) setSelectedPOI(suggested[0])
          }}
        />
      </div>
    </div>
  )
}

/* ── POI detail sheet ── */
function POIDetailSheet({ poi, lang, inTrip, onClose, onAddToTrip, onRemoveFromTrip }: {
  poi: POI; lang: 'de' | 'en'; inTrip: boolean
  onClose: () => void; onAddToTrip: () => void; onRemoveFromTrip: () => void
}) {
  const CATEGORY_COLORS: Record<string, string> = {
    culture: '#8B5CF6', nature: '#00C9A7', food: '#FF8C42', scenic: '#38BDF8',
    practical: '#6B7280', family: '#EC4899', accommodation: '#0EA5E9', shopping: '#FBBF24'
  }
  const color = CATEGORY_COLORS[poi.category] ?? '#00C9A7'

  return (
    <>
      {/* Color header band */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <h3 className="font-heading font-bold text-white text-base leading-tight">{poi.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-pill font-medium"
                style={{ background: `${color}20`, color }}>
                {poi.category}
              </span>
              {poi.distanceOffRouteKm > 0 && (
                <span className="text-white/35 text-[10px]">
                  {poi.distanceOffRouteKm.toFixed(1)} km {lang === 'de' ? 'abseits' : 'off route'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'white'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'}
          >
            <X size={13} />
          </button>
        </div>

        <p className="text-white/50 text-xs leading-relaxed mb-4">
          {lang === 'de' ? poi.descriptionDe : poi.descriptionEn}
        </p>

        {poi.openingHours && (
          <div className="text-white/30 text-[10px] mb-3">🕐 {poi.openingHours}</div>
        )}

        <button
          onClick={inTrip ? onRemoveFromTrip : onAddToTrip}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: inTrip ? 'rgba(255,255,255,0.06)' : '#00C9A7',
            color: inTrip ? 'rgba(255,255,255,0.5)' : '#0F1F3D',
            border: inTrip ? '1px solid rgba(255,255,255,0.1)' : 'none',
          }}
        >
          {inTrip
            ? (lang === 'de' ? '✓ Zur Route hinzugefügt' : '✓ Added to trip')
            : (lang === 'de' ? '+ Zur Route hinzufügen' : '+ Add to trip')}
        </button>
      </div>
    </>
  )
}
