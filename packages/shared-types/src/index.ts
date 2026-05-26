export type Language = 'de' | 'en'

export type POICategory =
  | 'culture'
  | 'nature'
  | 'food'
  | 'scenic'
  | 'practical'
  | 'family'
  | 'accommodation'
  | 'shopping'

export interface Coords {
  lat: number
  lng: number
}

export interface POI {
  osmId: string
  name: string
  category: POICategory
  coords: Coords
  distanceOffRouteKm: number
  descriptionDe: string
  descriptionEn: string
  openingHours?: string
  isOpenNow?: boolean
  rating?: number
  photoUrl?: string
  tags: Record<string, string>
}

export interface RouteResult {
  polyline: string        // encoded polyline
  distanceKm: number
  durationHr: number
  fromCoords: Coords
  toCoords: Coords
  fromName?: string
  toName?: string
}

export interface TripStop {
  id: string
  osmId: string
  name: string
  category: POICategory
  coords: Coords
  position: number
  notes?: string
}

export interface Trip {
  id: string
  userId?: string
  title: string
  fromName: string
  toName: string
  fromCoords: Coords
  toCoords: Coords
  routePolyline: string
  routeDistanceKm: number
  routeDurationHr: number
  stops: TripStop[]
  createdAt: string
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  suggestedPOIIds?: string[]
  timestamp: number
}

export interface AgentResponse {
  message: string
  suggestedPOIIds: string[]
  addToRouteConfirm: boolean
  followUpQuestion: string | null
}

export interface RouteContext {
  from: string
  to: string
  distanceKm: number
  durationHr: number
  poiCount: number
  activeCategories: POICategory[]
  addedStops: string[]
  timeOfDay: string
  dayOfWeek: string
}
