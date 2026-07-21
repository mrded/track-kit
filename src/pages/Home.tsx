import { useCallback, useState } from 'react'
import type { Session } from '../parser/types.ts'
import { FileDrop } from '../components/FileDrop.tsx'
import { SessionCard } from '../components/SessionCard.tsx'
import { ExportButton } from '../components/ExportButton.tsx'
import { ParsingStatus } from '../components/ParsingStatus.tsx'
import { mergeLaps } from '../editor/merge.ts'
import { exportVbo } from '../editor/export.ts'
import { tracksMatch } from '../editor/validateSession.ts'
import { useVboParser } from '../hooks/useVboParser.ts'
import styles from './Home.module.css'

export function Home() {
  const [selectedLapIds, setSelectedLapIds] = useState<Set<string>>(new Set())

  const validateSession = useCallback((session: Session, existing: Session[]) => {
    if (existing.length === 0 || tracksMatch(existing[0]!, session)) return undefined
    const existingVenue = existing[0]!.venue ?? 'unknown track'
    const newVenue = session.venue ?? 'unknown track'
    return `${session.fileName} is from ${newVenue} and cannot be mixed with ${existingVenue} sessions.`
  }, [])

  const onSessionAdded = useCallback((session: Session) => {
    setSelectedLapIds((prev) => {
      const next = new Set(prev)
      for (const lap of session.laps) next.add(lap.id)
      return next
    })
  }, [])

  const { sessions, parsing, progress, errors, handleFiles } = useVboParser({
    validateSession,
    onSessionAdded,
  })

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

  const handleExport = useCallback(() => {
    const selected: { session: Session; lap: import('../parser/types.ts').Lap }[] = []
    for (const session of sessions) {
      for (const lap of session.laps) {
        if (selectedLapIds.has(lap.id)) {
          selected.push({ session, lap })
        }
      }
    }
    if (selected.length === 0) return

    const { session, samples } = mergeLaps(selected)
    exportVbo(session, samples)
  }, [sessions, selectedLapIds])

  const selectedCount = selectedLapIds.size

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>RaceBox VBO Editor</h1>
        <p className={styles.description}>
          This tool lets you import multiple VBO sessions, pick the laps you care about, and export them as a single new session file
          — ready to analyse in RaceChrono Pro or any other tool that supports VBO.
        </p>
        <p className={styles.description}>
          Mainly developed around motorcycle track days using RaceBox, so it may not work
          correctly for other situations. If something isn't working, feel free to{' '}
          <a
            href="https://github.com/mrded/vbo-editor/issues"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.descriptionLink}
          >
            open a ticket
          </a>
          .
        </p>
      </header>

      <main className={styles.main}>
        <FileDrop onFiles={handleFiles} disabled={parsing} />

        <ParsingStatus parsing={parsing} progress={progress} errors={errors} />

        {sessions.length > 0 && (
          <>
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

            <div className={styles.exportRow}>
              <ExportButton
                disabled={selectedCount === 0}
                selectedCount={selectedCount}
                onClick={handleExport}
              />
            </div>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <a
          href="https://github.com/mrded/vbo-editor"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerLink}
        >
          github.com/mrded/vbo-editor
        </a>
        <span className={styles.footerText}>by Dmitry Demenchuk</span>
      </footer>
    </div>
  )
}
