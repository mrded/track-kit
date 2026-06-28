import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { readVbo } from '../readVbo.ts'
import { writeVbo } from '../writeVbo.ts'
import { mergeLaps } from '../../editor/merge.ts'
import { tracksMatch } from '../../editor/validateSession.ts'

function fixture(subfolder: string, name: string): string {
  return readFileSync(join(__dirname, 'fixtures', subfolder, name), 'utf-8')
}

const bedford1 = readVbo('09-09-2024_16-44.vbo', fixture('bedford-gt', '09-09-2024_16-44.vbo'))
const bedford2 = readVbo('20-06-2026_11-40.vbo', fixture('bedford-gt', '20-06-2026_11-40.vbo'))
const cadwell = readVbo('30-08-2025_10-50.vbo', fixture('cadwell-park', '30-08-2025_10-50.vbo'))

describe('09/09/2024 16:44 session (Bedford GT)', () => {
  it('detects 6 laps total (4 complete + 2 incomplete)', () => {
    expect(bedford1.laps.length).toBe(6)
  })

  it('has 4 complete laps', () => {
    expect(bedford1.laps.filter((l) => l.isComplete).length).toBe(4)
  })

  it('has 2 incomplete laps', () => {
    expect(bedford1.laps.filter((l) => !l.isComplete).length).toBe(2)
  })

  it('best lap is 2:35.30', () => {
    const best = bedford1.laps
      .filter((l) => l.isComplete)
      .reduce((a, b) => (a.durationMs < b.durationMs ? a : b))
    expect(best.timeString).toBe('2:35.30')
  })
})

describe('20/06/2026 11:40 session (Bedford GT)', () => {
  it('detects 5 laps total (3 complete + 2 incomplete)', () => {
    expect(bedford2.laps.length).toBe(5)
  })

  it('has 3 complete laps', () => {
    expect(bedford2.laps.filter((l) => l.isComplete).length).toBe(3)
  })

  it('has 2 incomplete laps', () => {
    expect(bedford2.laps.filter((l) => !l.isComplete).length).toBe(2)
  })

  it('best lap is 2:34.52', () => {
    const best = bedford2.laps
      .filter((l) => l.isComplete)
      .reduce((a, b) => (a.durationMs < b.durationMs ? a : b))
    expect(best.timeString).toBe('2:34.52')
  })
})

describe('export round-trip: one lap from each of two sessions', () => {
  const bestLap1 = bedford1.laps
    .filter((l) => l.isComplete)
    .reduce((a, b) => (a.durationMs < b.durationMs ? a : b))

  const bestLap2 = bedford2.laps
    .filter((l) => l.isComplete)
    .reduce((a, b) => (a.durationMs < b.durationMs ? a : b))

  const { session, samples } = mergeLaps([
    { session: bedford1, lap: bestLap1 },
    { session: bedford2, lap: bestLap2 },
  ])
  const vboText = writeVbo(session, samples)
  const reparsed = readVbo('merged.vbo', vboText)
  const completeLaps = reparsed.laps.filter((l) => l.isComplete)

  it('exported file contains exactly 2 complete laps', () => {
    expect(completeLaps.length).toBe(2)
  })

  it('first complete lap is within 40ms of the selected lap from session 1', () => {
    // Cross-session merge: the lap boundary uses the opposing session's SF crossing
    // geometry, which may differ by up to one sample interval (~40ms) from the
    // original crossing. Timing is still accurate to better than 1/25th of a second.
    const diff = Math.abs(completeLaps[0]!.durationMs - bestLap1.durationMs)
    expect(diff).toBeLessThan(40)
  })

  it('second complete lap matches the selected lap from session 2', () => {
    expect(completeLaps[1]!.timeString).toBe(bestLap2.timeString)
  })
})

describe('track compatibility', () => {
  it('two Bedford GT sessions are compatible', () => {
    expect(tracksMatch(bedford1, bedford2)).toBe(true)
  })

  it('Bedford GT and Cadwell Park sessions are not compatible', () => {
    expect(tracksMatch(bedford1, cadwell)).toBe(false)
  })

  it('Bedford GT and Cadwell Park cannot be mixed in either order', () => {
    expect(tracksMatch(cadwell, bedford1)).toBe(false)
  })
})
