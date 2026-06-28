import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '../parser/types.ts'
import type { WorkerOutMessage, WorkerInMessage } from '../parser/types.ts'
import { FileDrop } from '../components/FileDrop.tsx'
import { SessionCard } from '../components/SessionCard.tsx'
import { ExportButton } from '../components/ExportButton.tsx'
import { mergeLaps } from '../editor/merge.ts'
import { exportVbo } from '../editor/export.ts'
import { tracksMatch } from '../editor/validateSession.ts'
import styles from './Home.module.css'

export function Home() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedLapIds, setSelectedLapIds] = useState<Set<string>>(new Set())
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Map<string, string>>(new Map()) // id -> fileName
  const sessionsRef = useRef<Session[]>([]) // mirrors sessions state for use in worker callbacks

  useEffect(() => {
    const worker = new Worker(new URL('../worker/parser.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data

      if (msg.type === 'progress') {
        setProgress((prev) => [...prev, `Parsing ${msg.fileName}…`])
      } else if (msg.type === 'result') {
        const existing = sessionsRef.current
        const conflict = existing.length > 0 && !tracksMatch(existing[0]!, msg.session)

        if (conflict) {
          const existingVenue = existing[0]!.venue ?? 'unknown track'
          const newVenue = msg.session.venue ?? 'unknown track'
          setErrors((prev) => [
            ...prev,
            `${msg.session.fileName} is from ${newVenue} and cannot be mixed with ${existingVenue} sessions.`,
          ])
        } else {
          setSessions((prev) => {
            const next = [...prev, msg.session]
            sessionsRef.current = next
            return next
          })
          setSelectedLapIds((prev) => {
            const next = new Set(prev)
            for (const lap of msg.session.laps) next.add(lap.id)
            return next
          })
        }

        pendingRef.current.delete(msg.id)
        if (pendingRef.current.size === 0) {
          setParsing(false)
          setProgress([])
        }
      } else if (msg.type === 'error') {
        setProgress((prev) => [...prev, `Error: ${msg.fileName} – ${msg.message}`])
        pendingRef.current.delete(msg.id)
        if (pendingRef.current.size === 0) {
          setParsing(false)
        }
      }
    }

    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  const handleFiles = useCallback((files: File[]) => {
    setParsing(true)
    for (const file of files) {
      const id = crypto.randomUUID()
      pendingRef.current.set(id, file.name)

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        const msg: WorkerInMessage = { type: 'parse', id, fileName: file.name, content }
        workerRef.current?.postMessage(msg)
      }
      reader.readAsText(file)
    }
  }, [])

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
