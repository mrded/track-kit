import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '../parser/types.ts'
import type { WorkerOutMessage, WorkerInMessage } from '../parser/types.ts'
import { FileDrop } from '../components/FileDrop.tsx'
import { SessionCard } from '../components/SessionCard.tsx'
import { ExportButton } from '../components/ExportButton.tsx'
import { mergeLaps } from '../editor/merge.ts'
import { exportVbo } from '../editor/export.ts'
import styles from './Home.module.css'

export function Home() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedLapIds, setSelectedLapIds] = useState<Set<string>>(new Set())
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState<string[]>([])

  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Map<string, string>>(new Map()) // id -> fileName

  useEffect(() => {
    const worker = new Worker(new URL('../worker/parser.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data

      if (msg.type === 'progress') {
        setProgress((prev) => [...prev, `Parsing ${msg.fileName}…`])
      } else if (msg.type === 'result') {
        setSessions((prev) => [...prev, msg.session])
        // Auto-select all laps in the new session
        setSelectedLapIds((prev) => {
          const next = new Set(prev)
          for (const lap of msg.session.laps) {
            next.add(lap.id)
          }
          return next
        })
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
    </div>
  )
}
