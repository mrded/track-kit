import type { Lap } from '../parser/types.ts'
import styles from './LapList.module.css'
import { formatLapTime } from '../parser/lapDetector.ts'

interface LapListProps {
  laps: Lap[]
  selectedIds: Set<string>
  onToggle: (lapId: string) => void
}

export function LapList({ laps, selectedIds, onToggle }: LapListProps) {
  return (
    <ul className={styles.list}>
      {laps.map((lap, i) => (
        <li key={lap.id} className={styles.item}>
          <label className={styles.label}>
            <input
              type="checkbox"
              checked={selectedIds.has(lap.id)}
              onChange={() => onToggle(lap.id)}
              className={styles.checkbox}
            />
            <span className={styles.lapName}>Lap {i + 1}</span>
            <span className={styles.lapTime}>{formatLapTime(lap.durationMs)}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}
