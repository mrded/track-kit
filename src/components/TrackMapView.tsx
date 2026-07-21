import { useMemo } from 'react'
import { MapContainer, TileLayer, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Lap, Session } from '../parser/types.ts'
import { buildTrackSegments } from '../editor/trackSegments.ts'
import type { ColorMetric } from '../editor/colorScale.ts'
import { FitBounds } from './FitBounds.tsx'
import styles from './TrackMapView.module.css'

interface TrackMapViewProps {
  laps: { session: Session; lap: Lap }[]
  colorBy: ColorMetric
}

export function TrackMapView({ laps, colorBy }: TrackMapViewProps) {
  const built = useMemo(() => buildTrackSegments(laps, colorBy), [laps, colorBy])

  if (!built) {
    return <div className={styles.placeholder}>Select a lap above to preview it on the map.</div>
  }

  return (
    <div className={styles.mapWrapper}>
      <MapContainer bounds={built.bounds} className={styles.map} preferCanvas scrollWheelZoom>
        <TileLayer
          attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {built.segments.map((seg) => (
          <Polyline
            key={seg.key}
            positions={seg.positions}
            pathOptions={{ color: seg.color, weight: 4 }}
          />
        ))}
        <FitBounds bounds={built.bounds} />
      </MapContainer>
    </div>
  )
}
