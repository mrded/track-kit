import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session, WorkerInMessage, WorkerOutMessage } from '../parser/types.ts'

interface UseVboParserOptions {
  /** Return an error message to reject a newly parsed session, or undefined to accept it. */
  validateSession?: (session: Session, existing: Session[]) => string | undefined
  /** Called right after a session is accepted and added to state. */
  onSessionAdded?: (session: Session) => void
}

export function useVboParser({ validateSession, onSessionAdded }: UseVboParserOptions = {}) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Map<string, string>>(new Map()) // id -> fileName
  const sessionsRef = useRef<Session[]>([]) // mirrors sessions state for use in worker callbacks
  const validateRef = useRef(validateSession)
  const onSessionAddedRef = useRef(onSessionAdded)
  validateRef.current = validateSession
  onSessionAddedRef.current = onSessionAdded

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
        const validationError = validateRef.current?.(msg.session, existing)

        if (validationError) {
          setErrors((prev) => [...prev, validationError])
        } else {
          setSessions((prev) => {
            const next = [...prev, msg.session]
            sessionsRef.current = next
            return next
          })
          onSessionAddedRef.current?.(msg.session)
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

  return { sessions, parsing, progress, errors, handleFiles }
}
