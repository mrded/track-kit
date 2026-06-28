import type { Session } from '../parser/types.ts'
import { LapList } from './LapList.tsx'
import styles from './SessionCard.module.css'

interface SessionCardProps {
  session: Session
  selectedLapIds: Set<string>
  onToggleLap: (lapId: string) => void
}

export function SessionCard({ session, selectedLapIds, onToggleLap }: SessionCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.fileName}>{session.fileName}</span>
          <span className={styles.details}>
            {session.venue && <span>{session.venue}</span>}
            {session.date && <span>{session.date}</span>}
          </span>
        </div>
        <span className={styles.lapCount}>
          {session.laps.length} lap{session.laps.length !== 1 ? 's' : ''}
        </span>
      </div>
      <LapList
        laps={session.laps}
        selectedIds={selectedLapIds}
        onToggle={onToggleLap}
      />
    </div>
  )
}
