'use client'

import type { POICategory } from '@rouvio/shared-types'

const CATEGORIES: { id: POICategory; emoji: string; de: string; en: string; color: string }[] = [
  { id: 'culture',       emoji: '🏰', de: 'Kultur',      en: 'Culture',       color: '#8B5CF6' },
  { id: 'nature',        emoji: '🌿', de: 'Natur',       en: 'Nature',        color: '#00C9A7' },
  { id: 'food',          emoji: '🍺', de: 'Essen',       en: 'Food',          color: '#FF8C42' },
  { id: 'scenic',        emoji: '🛣️', de: 'Panorama',    en: 'Scenic',        color: '#38BDF8' },
  { id: 'practical',     emoji: '⛽', de: 'Praktisch',   en: 'Practical',     color: '#9CA3AF' },
  { id: 'family',        emoji: '🎡', de: 'Familie',     en: 'Family',        color: '#EC4899' },
  { id: 'accommodation', emoji: '🛏️', de: 'Unterkunft',  en: 'Stay',          color: '#0EA5E9' },
  { id: 'shopping',      emoji: '🛍️', de: 'Shopping',    en: 'Shopping',      color: '#FBBF24' },
]

interface Props {
  activeCategories: POICategory[]
  onToggle: (cat: POICategory) => void
  lang: 'de' | 'en'
}

export default function FilterBar({ activeCategories, onToggle, lang }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
      {CATEGORIES.map(cat => {
        const isActive = activeCategories.includes(cat.id)
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium transition-all whitespace-nowrap"
            style={{
              background: isActive ? `${cat.color}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isActive ? cat.color : 'rgba(255,255,255,0.08)'}`,
              color: isActive ? cat.color : 'rgba(255,255,255,0.4)',
              boxShadow: isActive ? `0 0 10px ${cat.color}30` : 'none',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = `${cat.color}10`
                ;(e.currentTarget as HTMLElement).style.color = cat.color
                ;(e.currentTarget as HTMLElement).style.borderColor = `${cat.color}60`
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
              }
            }}
          >
            <span className="text-sm leading-none">{cat.emoji}</span>
            {lang === 'de' ? cat.de : cat.en}
          </button>
        )
      })}
    </div>
  )
}
