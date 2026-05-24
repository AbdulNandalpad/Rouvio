import type { Coords } from '@rouvio/shared-types'

// Decode a Google/OSRM encoded polyline into coordinate pairs
export function decodePolyline(encoded: string): Coords[] {
  const coords: Coords[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    lng += result & 1 ? ~(result >> 1) : result >> 1

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return coords
}

// Compute an axis-aligned bounding box around a polyline with a corridor buffer (km)
export function polylineBbox(
  coords: Coords[],
  corridorKm: number
): { south: number; west: number; north: number; east: number } {
  const lats = coords.map((c) => c.lat)
  const lngs = coords.map((c) => c.lng)
  const degPerKmLat = 1 / 111
  const degPerKmLng = 1 / (111 * Math.cos((Math.PI / 180) * ((Math.max(...lats) + Math.min(...lats)) / 2)))
  const buf = corridorKm
  return {
    south: Math.min(...lats) - buf * degPerKmLat,
    north: Math.max(...lats) + buf * degPerKmLat,
    west: Math.min(...lngs) - buf * degPerKmLng,
    east: Math.max(...lngs) + buf * degPerKmLng,
  }
}

// Distance between two coords in km (Haversine)
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

// Minimum distance from a point to any segment of the polyline (km)
export function distanceToPolylineKm(point: Coords, polyline: Coords[]): number {
  let minDist = Infinity
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentKm(point, polyline[i], polyline[i + 1])
    if (d < minDist) minDist = d
  }
  return minDist
}

function pointToSegmentKm(p: Coords, a: Coords, b: Coords): number {
  const dx = b.lat - a.lat
  const dy = b.lng - a.lng
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return haversineKm(p, a)
  const t = Math.max(0, Math.min(1, ((p.lat - a.lat) * dx + (p.lng - a.lng) * dy) / lenSq))
  return haversineKm(p, { lat: a.lat + t * dx, lng: a.lng + t * dy })
}

// Stable cache key for an Overpass query (bbox + sorted categories)
export function overpassCacheKey(
  bbox: { south: number; west: number; north: number; east: number },
  categories: string[]
): string {
  const b = `${bbox.south.toFixed(4)},${bbox.west.toFixed(4)},${bbox.north.toFixed(4)},${bbox.east.toFixed(4)}`
  return `overpass:${b}:${[...categories].sort().join(',')}`
}

// Format duration in hours as human-readable string
export function formatDuration(hours: number, lang: 'de' | 'en' = 'de'): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (lang === 'de') return h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
