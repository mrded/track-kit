import { useCallback, useMemo, useState } from 'react'
import type { Lap, Session } from '../parser/types.ts'
import { FileDrop } from '../components/FileDrop.tsx'
import { SessionCard } from '../components/SessionCard.tsx'
import { ParsingStatus } from '../components/ParsingStatus.tsx'
import { TrackMapView } from '../components/TrackMapView.tsx'
import { ColorMetricToggle } from '../components/ColorMetricToggle.tsx'
import { useVboParser } from '../hooks/useVboParser.ts'
import type { ColorMetric } from '../editor/colorScale.ts'
import styles from './TrackMap.module.css'

export function TrackMap() {
  const [selectedLapIds, setSelectedLapIds] = useState<Set<string>>(new Set())
  const [colorBy, setColorBy] = useState<ColorMetric>('none')

  const { sessions, parsing, progress, errors, handleFiles } = useVboParser()

  const handleToggleLap = useCallback((lapId: string) => {
    setSelectedLapIds((prev) => {
      const next = new Set(prev)
      if (next.has(lapId)) {
        next.delete(lapId)
      } else {
        next.add(lapId)
      }
      return next
    })
  }, [])

  const selectedLaps = useMemo(() => {
    const result: { session: Session; lap: Lap }[] = []
    for (const session of sessions) {
      for (const lap of session.laps) {
        if (selectedLapIds.has(lap.id)) result.push({ session, lap })
      }
    }
    return result
  }, [sessions, selectedLapIds])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Track Map</h1>
        <p className={styles.description}>
          Drop in VBO sessions, pick one or more laps, and preview the GPS trace on a map —
          color-graded by speed or by braking/acceleration.
        </p>
      </header>

      <main className={styles.main}>
        <FileDrop onFiles={handleFiles} disabled={parsing} />

        <ParsingStatus parsing={parsing} progress={progress} errors={errors} />

        {sessions.length > 0 && (
          <div className={styles.sessionList}>
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                selectedLapIds={selectedLapIds}
                onToggleLap={handleToggleLap}
              />
            ))}
          </div>
        )}

        <div className={styles.mapSection}>
          <ColorMetricToggle value={colorBy} onChange={setColorBy} />
          <TrackMapView laps={selectedLaps} colorBy={colorBy} />
        </div>
      </main>
    </div>
  )
}
