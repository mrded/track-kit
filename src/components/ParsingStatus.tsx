import styles from './ParsingStatus.module.css'

interface ParsingStatusProps {
  parsing: boolean
  progress: string[]
  errors: string[]
}

export function ParsingStatus({ parsing, progress, errors }: ParsingStatusProps) {
  return (
    <>
      {parsing && (
        <div className={styles.progressBox}>
          {progress.map((msg, i) => (
            <p key={i} className={styles.progressLine}>
              {msg}
            </p>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className={styles.errorBox}>
          {errors.map((msg, i) => (
            <p key={i} className={styles.errorLine}>
              {msg}
            </p>
          ))}
        </div>
      )}
    </>
  )
}
