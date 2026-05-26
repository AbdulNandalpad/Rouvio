'use client'

import type { POI } from '@rouvio/shared-types'
import { Plus, Check, MapPin } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  culture: '#8B5CF6', nature: '#00C9A7', food: '#FF8C42', scenic: '#38BDF8',
  practical: '#9CA3AF', family: '#EC4899', accommodation: '#0EA5E9', shopping: '#FBBF24',
}

const CATEGORY_EMOJI: Record<string, string> = {
  culture: '🏰', nature: '🌿', food: '🍺', scenic: '🛣️',
  practical: '⛽', family: '🎡', accommodation: '🛏️', shopping: '🛍️',
}

interface Props {
  poi: POI
  lang: 'de' | 'en'
  inTrip: boolean
  isSelected: boolean
  onSelect: () => void
  onAddToTrip: () => void
  onRemoveFromTrip: () => void
}

export default function POICard({ poi, lang, inTrip, isSelected, onSelect, onAddToTrip, onRemoveFromTrip }: Props) {
  const color = CATEGORY_COLORS[poi.category] ?? '#00C9A7'
  const emoji = CATEGORY_EMOJI[poi.category] ?? '📍'

  return (
    <div
      onClick={onSelect}
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 group"
      style={{
        background: isSelected ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isSelected ? color + '50' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: isSelected ? `0 0 20px ${color}20` : 'none',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
        }
      }}
    >
      {/* Top color accent bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

      <div className="px-3.5 py-3 flex items-center gap-3">
        {/* Category emoji bubble */}
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          {emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-heading font-semibold text-white text-sm leading-tight truncate">
            {poi.name}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {poi.distanceOffRouteKm > 0 && (
              <span className="text-white/35 text-[10px] flex items-center gap-0.5">
                <MapPin size={8} />
                {poi.distanceOffRouteKm.toFixed(1)} km
              </span>
            )}
            {poi.openingHours && (
              <span className="text-white/30 text-[10px] truncate">{poi.openingHours.slice(0, 20)}</span>
            )}
          </div>
        </div>

        {/* Add/Remove button */}
        <button
          onClick={e => { e.stopPropagation(); inTrip ? onRemoveFromTrip() : onAddToTrip() }}
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
          style={{
            background: inTrip ? '#00C9A7' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${inTrip ? '#00C9A7' : 'rgba(255,255,255,0.1)'}`,
            color: inTrip ? '#0F1F3D' : 'rgba(255,255,255,0.5)',
          }}
          onMouseEnter={e => {
            if (!inTrip) {
              (e.currentTarget as HTMLElement).style.background = `${color}20`
              ;(e.currentTarget as HTMLElement).style.borderColor = color
              ;(e.currentTarget as HTMLElement).style.color = color
            }
          }}
          onMouseLeave={e => {
            if (!inTrip) {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'
              ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
            }
          }}
        >
          {inTrip ? <Check size={12} /> : <Plus size={12} />}
        </button>
      </div>
    </div>
  )
}
