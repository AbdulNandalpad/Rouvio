'use client'

import { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { POI, RouteResult } from '@rouvio/shared-types'
import { decodePolyline } from '@rouvio/route-utils'

const CATEGORY_COLORS: Record<string, string> = {
  culture: '#8B5CF6',
  nature: '#00C9A7',
  food:   '#FF8C42',
  scenic: '#38BDF8',
  practical: '#9CA3AF',
  family: '#EC4899',
  accommodation: '#0EA5E9',
  shopping: '#FBBF24',
}

// Free CartoDB Positron — clean, minimal, no API key
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-light': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
      maxzoom: 19,
    },
  },
  layers: [{
    id: 'carto-light-layer',
    type: 'raster',
    source: 'carto-light',
    minzoom: 0,
    maxzoom: 20,
  }],
}

interface Props {
  route: RouteResult | null
  pois: POI[]
  selectedPOIId: string | null
  tripStopIds: string[]
  onPOIClick: (poi: POI) => void
}

export default function MapCanvas({ route, pois, selectedPOIId, tripStopIds, onPOIClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const fromMarkerRef = useRef<maplibregl.Marker | null>(null)
  const toMarkerRef = useRef<maplibregl.Marker | null>(null)
  const poisRef = useRef<POI[]>([])
  poisRef.current = pois

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [10.5, 51.3],
      zoom: 5.5,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update route layer
  useEffect(() => {
    const map = mapRef.current
    if (!map || !route) return

    const coords = decodePolyline(route.polyline)
    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords.map(c => [c.lng, c.lat]),
      },
    }

    const addLayers = () => {
      // Remove existing
      if (map.getLayer('route-glow')) map.removeLayer('route-glow')
      if (map.getLayer('route-line')) map.removeLayer('route-line')
      if (map.getLayer('route-outline')) map.removeLayer('route-outline')
      if (map.getSource('route')) map.removeSource('route')

      map.addSource('route', { type: 'geojson', data: geojson })

      // Wide glow layer
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#00C9A7',
          'line-width': 16,
          'line-opacity': 0.15,
          'line-blur': 4,
        },
      })

      // White outline
      map.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 6,
          'line-opacity': 0.6,
        },
      })

      // Main route line
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#00C9A7',
          'line-width': 4,
          'line-opacity': 1,
        },
      })

      // Add A and B markers
      fromMarkerRef.current?.remove()
      toMarkerRef.current?.remove()
      fromMarkerRef.current = new maplibregl.Marker({ element: createEndpointMarker('A', '#00C9A7') })
        .setLngLat([route.fromCoords.lng, route.fromCoords.lat])
        .addTo(map)
      toMarkerRef.current = new maplibregl.Marker({ element: createEndpointMarker('B', '#FF8C42') })
        .setLngLat([route.toCoords.lng, route.toCoords.lat])
        .addTo(map)

      // Fit map to route
      const lngs = coords.map(c => c.lng)
      const lats = coords.map(c => c.lat)
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: { top: 80, bottom: 120, left: 400, right: 60 }, maxZoom: 12, duration: 1200 }
      )
    }

    if (map.isStyleLoaded()) {
      addLayers()
    } else {
      map.once('load', addLayers)
    }
  }, [route])

  // Update POI markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const addMarkers = () => {
      // Remove old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()

      pois.forEach(poi => {
        const el = createPOIMarker(poi, poi.osmId === selectedPOIId, tripStopIds.includes(poi.osmId))
        el.addEventListener('click', () => {
          const p = poisRef.current.find(p => p.osmId === poi.osmId)
          if (p) onPOIClick(p)
        })

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([poi.coords.lng, poi.coords.lat])
          .addTo(map)
        markersRef.current.set(poi.osmId, marker)
      })
    }

    if (map.isStyleLoaded()) {
      addMarkers()
    } else {
      map.once('load', addMarkers)
    }
  }, [pois, selectedPOIId, tripStopIds])

  return (
    <div ref={containerRef} className="w-full h-full" style={{ cursor: 'default' }} />
  )
}

function createEndpointMarker(label: string, color: string): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = `
    width: 36px; height: 36px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: ${color};
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center;
    cursor: default;
  `
  const inner = document.createElement('div')
  inner.style.cssText = `
    transform: rotate(45deg);
    color: white;
    font-weight: 800;
    font-size: 11px;
    font-family: Outfit, sans-serif;
  `
  inner.textContent = label
  el.appendChild(inner)
  return el
}

function createPOIMarker(poi: POI, isSelected: boolean, inTrip: boolean): HTMLElement {
  const color = CATEGORY_COLORS[poi.category] ?? '#FF8C42'
  const size = isSelected ? 28 : 22

  const el = document.createElement('div')
  el.style.cssText = `
    width: ${size}px; height: ${size}px;
    border-radius: 50%;
    background: ${inTrip ? '#00C9A7' : color};
    border: ${isSelected ? '3px' : '2px'} solid white;
    cursor: pointer;
    box-shadow: ${isSelected ? `0 0 0 4px ${color}40, 0 4px 12px rgba(0,0,0,0.4)` : '0 2px 8px rgba(0,0,0,0.3)'};
    transition: all 0.15s ease;
    display: flex; align-items: center; justify-content: center;
    position: relative;
    z-index: ${isSelected ? 10 : 1};
  `

  const dot = document.createElement('div')
  dot.style.cssText = `width: 5px; height: 5px; border-radius: 50%; background: white; opacity: 0.9;`
  el.appendChild(dot)

  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.25)'
    el.style.zIndex = '20'
  })
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)'
    el.style.zIndex = isSelected ? '10' : '1'
  })

  return el
}
