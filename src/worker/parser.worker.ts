import type { WorkerInMessage, WorkerOutMessage } from '../parser/types.ts'
import { readVbo } from '../parser/readVbo.ts'

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data

  if (msg.type === 'parse') {
    const { id, fileName, content } = msg

    // Notify progress before heavy work
    const progressMsg: WorkerOutMessage = { type: 'progress', id, fileName }
    self.postMessage(progressMsg)

    try {
      const session = readVbo(fileName, content)
      const resultMsg: WorkerOutMessage = { type: 'result', id, session }
      self.postMessage(resultMsg)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      const errorMsg: WorkerOutMessage = { type: 'error', id, fileName, message }
      self.postMessage(errorMsg)
    }
  }
}
