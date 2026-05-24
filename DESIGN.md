# Rouvio — Design System

## Philosophy
"Map-first, friction-zero, beautiful always."
The map is the product. Every UI element serves the map.

## Color Tokens — Alpine (Final, chosen 2026-05-24)
| Token               | Hex       | Usage                                           |
|---------------------|-----------|-------------------------------------------------|
| --color-primary     | #1B3A6B   | App bar, headers, sidebar, agent bubble bg      |
| --color-accent      | #00C9A7   | Primary CTAs, active filter pills, route line   |
| --color-accent-dark | #00A88C   | CTA hover state                                 |
| --color-highlight   | #FF8C42   | POI map pins, notification badges, star ratings |
| --color-surface     | #F0F6FF   | Card backgrounds, panel backgrounds             |
| --color-dark-bg     | #0F1F3D   | Dark mode background                            |

## Typography
| Role     | Font     | Usage                                |
|----------|----------|--------------------------------------|
| Body     | DM Sans  | UI text, labels, body copy           |
| Heading  | Outfit   | Headings, POI names, hero titles     |

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Outfit:wght@600;700;800&display=swap
```

## Border Radius
- Cards: 16px
- Modals / drawers: 24px
- Filter pills: 999px (full pill)
- Inputs / buttons: 8px

## Spacing Scale
Uses Tailwind default 4px base. Key values: 4, 8, 12, 16, 20, 24, 32, 40, 48.

## Animation
- Library: Framer Motion (web), React Native Reanimated (mobile)
- Spring physics — no jarring linear transitions
- Map marker entrance: scale 0→1, spring stiffness 300
- Panel slide-in: x from -20px, opacity 0→1, 200ms

## Map Style
- Light mode: muted OSM tiles, route rendered in #4ECDC4 (teal), POI pins in #FFD93D (amber)
- Dark mode: dark OSM tiles, same route/pin colors

## Icon Set
- Base: Lucide React
- Category icons: emoji-style custom SVGs per POI type

## POI Category Colors (pill accent)
| Category       | Color   |
|----------------|---------|
| Culture        | #8B5CF6 |
| Nature         | #10B981 |
| Food & Drink   | #F59E0B |
| Scenic Roads   | #3B82F6 |
| Practical      | #6B7280 |
| Family & Fun   | #EC4899 |
| Accommodation  | #14B8A6 |
| Shopping       | #F97316 |

## Component Rules
- Never hardcode color values in components — always use CSS variables
- All interactive elements must have focus-visible ring (teal, 2px)
- Cards: shadow-sm on rest, shadow-md on hover, smooth 150ms transition
- Filter pills: teal background + navy text when active; surface bg + navy text when inactive
