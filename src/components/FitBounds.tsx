import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { LatLngBoundsExpression } from 'leaflet'

interface FitBoundsProps {
  bounds: LatLngBoundsExpression
}

/** Imperatively re-fits the map viewport whenever the selected laps change. */
export function FitBounds({ bounds }: FitBoundsProps) {
  const map = useMap()

  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] })
  }, [map, bounds])

  return null
}
