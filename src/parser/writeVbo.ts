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

  for (const raw of fixCrossSessionTimestamps(samples, session.header)) {
    lines.push(raw)
  }

  return lines.join('\r\n')
}

/**
 * Samples from the same session are copied verbatim (raw strings are already
 * correct). When a cross-session jump is detected (time goes backwards), all
 * subsequent samples have their time field rewritten so the file stays
 * monotonically increasing. Everything else in the raw line is untouched.
 */
function fixCrossSessionTimestamps(
  samples: { raw: string; time: number }[],
  header: VboHeader,
): string[] {
  if (samples.length === 0) return []

  let drift = 0 // total seconds added to compensate for backwards jumps

  return samples.map((sample, i) => {
    if (i > 0) {
      const prev = samples[i - 1]!
      if (sample.time < prev.time) {
        drift += prev.time - sample.time
      }
    }

    if (drift === 0) return sample.raw

    // Only rewrite the time field; everything else stays verbatim.
    const sep = sample.raw.includes('\t') ? '\t' : ' '
    const fields = sample.raw.split(sep === '\t' ? '\t' : /\s+/)
    fields[header.timeIndex] = formatTime(sample.time + drift)
    return fields.join(sep)
  })
}

/**
 * Format seconds-of-day back to VBO compact time: HHMMSS.CC
 * e.g. 56649.10 → "154409.10" (15h 44m 09.10s)
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return (h * 10000 + m * 100 + s).toFixed(2)
}
