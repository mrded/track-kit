import type { Session } from '../parser/types.ts'
import type { GpsSample } from '../parser/types.ts'
import { writeVbo } from '../parser/writeVbo.ts'

/**
 * Build a VBO string from the given session and samples, then trigger a
 * browser download of the result as "merged.vbo".
 */
export function exportVbo(session: Session, samples: GpsSample[]): void {
  const content = writeVbo(session, samples)
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'merged.vbo'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
