import type { Session, VboHeader } from './types.ts'

/**
 * Rebuild a VBO file from a subset of samples.
 *
 * The header from the source session is preserved verbatim.
 * All samples are written in their original raw format.
 */
export function writeVbo(session: Session, samples: { raw: string; time: number }[]): string {
  const lines: string[] = []

  // Write all header sections
  for (const [sectionName, sectionLines] of Object.entries(session.header.sections)) {
    lines.push(`[${sectionName}]`)
    for (const line of sectionLines) {
      lines.push(line)
    }
    lines.push('')
  }

  // Write data section
  lines.push('[data]')

  // Rebuild timestamps so they start from 0 and increase monotonically
  const rebuiltSamples = rebuildTimestamps(samples, session.header)

  for (const sample of rebuiltSamples) {
    lines.push(sample.raw)
  }

  return lines.join('\r\n')
}

/**
 * Rebuild time fields so timestamps are continuous across merged laps.
 * The time difference between consecutive samples is preserved; only
 * the absolute offset is adjusted to start from the first sample's time.
 */
function rebuildTimestamps(
  samples: { raw: string; time: number }[],
  header: VboHeader,
): { raw: string }[] {
  if (header.timeIndex < 0) {
    return samples.map((s) => ({ raw: s.raw }))
  }

  const result: { raw: string }[] = []

  if (samples.length === 0) return result

  const firstTime = samples[0]!.time
  let lastOriginalTime = firstTime
  let accumulatedTime = firstTime

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]!
    const delta = i === 0 ? 0 : Math.max(0, sample.time - lastOriginalTime)
    accumulatedTime = i === 0 ? firstTime : accumulatedTime + delta
    lastOriginalTime = sample.time

    const fields = sample.raw.includes('\t') ? sample.raw.split('\t') : sample.raw.split(/\s+/)
    fields[header.timeIndex] = formatTime(accumulatedTime)
    result.push({ raw: fields.join(' ') })
  }

  return result
}

/**
 * Format a time value back to HH:MM:SS.SSS
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    s.toFixed(2).padStart(5, '0'),
  ].join(':')
}
