import type { ColorMetric } from '../editor/colorScale.ts'
import styles from './ColorMetricToggle.module.css'

interface ColorMetricToggleProps {
  value: ColorMetric
  onChange: (metric: ColorMetric) => void
}

const OPTIONS: { metric: ColorMetric; label: string; legend?: [string, string] }[] = [
  { metric: 'none', label: 'Normal' },
  { metric: 'speed', label: 'Speed', legend: ['slow', 'fast'] },
  { metric: 'braking', label: 'Braking G-Force', legend: ['light', 'hard'] },
  { metric: 'cornering', label: 'Cornering', legend: ['upright', 'max lean'] },
]

export function ColorMetricToggle({ value, onChange }: ColorMetricToggleProps) {
  const active = OPTIONS.find((o) => o.metric === value)

  return (
    <div className={styles.row}>
      <div className={styles.toggle}>
        {OPTIONS.map((o) => (
          <button
            key={o.metric}
            className={`${styles.option} ${value === o.metric ? styles.active : ''}`}
            onClick={() => onChange(o.metric)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {active?.legend && (
        <div className={styles.legend}>
          <span>{active.legend[0]}</span>
          <span className={styles.gradient} />
          <span>{active.legend[1]}</span>
        </div>
      )}
    </div>
  )
}
