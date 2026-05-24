import { NextRequest, NextResponse } from 'next/server'

const OSRM = process.env.OSRM_ENDPOINT ?? 'https://router.project-osrm.org'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const fromLat = searchParams.get('fromLat')
  const fromLng = searchParams.get('fromLng')
  const toLat = searchParams.get('toLat')
  const toLng = searchParams.get('toLng')

  if (!fromLat || !fromLng || !toLat || !toLng) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  const url = `${OSRM}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=polyline`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`OSRM ${res.status}`)
    const data = await res.json()

    const route = data.routes?.[0]
    if (!route) return NextResponse.json({ error: 'No route found' }, { status: 404 })

    return NextResponse.json({
      polyline: route.geometry,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationHr: Math.round((route.duration / 3600) * 100) / 100,
    })
  } catch (err) {
    console.error('OSRM error:', err)
    return NextResponse.json({ error: 'Routing service unavailable' }, { status: 503 })
  }
}
