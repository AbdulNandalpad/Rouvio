import type { POICategory } from '@rouvio/shared-types'

export const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'

type Bbox = { south: number; west: number; north: number; east: number }

interface RawOSMNode {
  type: 'node'
  id: number
  lat: number
  lon: number
  tags?: Record<string, string>
}

export interface RawPOI {
  osmId: string
  lat: number
  lng: number
  name: string
  category: POICategory
  tags: Record<string, string>
  openingHours?: string
}

const CATEGORY_FILTERS: Record<POICategory, string[]> = {
  culture: [
    'node["historic"]["name"]',
    'node["tourism"="museum"]["name"]',
    'node["tourism"="artwork"]["name"]',
    'way["historic"]["name"]',
  ],
  nature: [
    'node["natural"]["name"]',
    'node["leisure"="nature_reserve"]["name"]',
    'node["tourism"="viewpoint"]["name"]',
    'way["natural"="water"]["name"]',
  ],
  food: [
    'node["amenity"="restaurant"]["name"]',
    'node["amenity"="biergarten"]["name"]',
    'node["amenity"="cafe"]["name"]',
    'node["amenity"="ice_cream"]["name"]',
  ],
  scenic: [
    'node["tourism"="viewpoint"]["name"]',
    'way["route"="road"]["name"]',
  ],
  practical: [
    'node["amenity"="fuel"]',
    'node["amenity"="charging_station"]',
    'node["highway"="rest_area"]',
    'node["amenity"="pharmacy"]["name"]',
  ],
  family: [
    'node["leisure"="playground"]',
    'node["tourism"="zoo"]["name"]',
    'node["tourism"="theme_park"]["name"]',
    'node["leisure"="miniature_golf"]["name"]',
  ],
  accommodation: [
    'node["tourism"="hotel"]["name"]',
    'node["tourism"="guest_house"]["name"]',
    'node["tourism"="camp_site"]["name"]',
    'node["tourism"="hostel"]["name"]',
  ],
  shopping: [
    'node["amenity"="marketplace"]["name"]',
    'node["shop"="mall"]["name"]',
    'node["shop"]["name"]',
  ],
}

function buildOverpassQuery(bbox: Bbox, categories: POICategory[]): string {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`
  const filters = categories.flatMap((cat) =>
    CATEGORY_FILTERS[cat].map((f) => `${f}(${bboxStr});`)
  )
  return `[out:json][timeout:25];\n(\n  ${filters.join('\n  ')}\n);\nout body;`
}

function inferCategory(tags: Record<string, string>): POICategory {
  if (tags.historic || tags.tourism === 'museum' || tags.tourism === 'artwork') return 'culture'
  if (tags.natural || tags.leisure === 'nature_reserve' || tags.tourism === 'viewpoint') return 'nature'
  if (tags.amenity === 'restaurant' || tags.amenity === 'biergarten' || tags.amenity === 'cafe' || tags.amenity === 'ice_cream') return 'food'
  if (tags.amenity === 'fuel' || tags.amenity === 'charging_station' || tags.highway === 'rest_area') return 'practical'
  if (tags.leisure === 'playground' || tags.tourism === 'zoo' || tags.tourism === 'theme_park') return 'family'
  if (tags.tourism === 'hotel' || tags.tourism === 'guest_house' || tags.tourism === 'camp_site') return 'accommodation'
  if (tags.amenity === 'marketplace' || tags.shop) return 'shopping'
  return 'scenic'
}

export async function fetchPOIs(bbox: Bbox, categories: POICategory[]): Promise<RawPOI[]> {
  const query = buildOverpassQuery(bbox, categories)
  const res = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) throw new Error(`Overpass error: ${res.status}`)

  const data: { elements: RawOSMNode[] } = await res.json()

  return data.elements
    .filter((el) => el.tags?.name)
    .map((el) => ({
      osmId: `node/${el.id}`,
      lat: el.lat,
      lng: el.lon,
      name: el.tags!.name!,
      category: inferCategory(el.tags!),
      tags: el.tags!,
      openingHours: el.tags?.opening_hours,
    }))
}
