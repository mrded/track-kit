import { describe, it, expect } from 'vitest'
import { readVbo } from '../readVbo.ts'
import { writeVbo } from '../writeVbo.ts'

// Times in HHMMSS.CC format: 100000.00 = 10h 00m 00.00s = 36000s
const SAMPLE_VBO = `[header]
File Created	RaceBox

[column names]
time	lat	lon	velocity kmh

[data]
100000.00	5139.5000	-00014.5000	0.0
100000.10	5139.5001	-00014.5001	50.0
100000.20	5139.5002	-00014.5002	80.0
`

describe('writeVbo', () => {
  it('includes header sections', () => {
    const session = readVbo('test.vbo', SAMPLE_VBO)
    const output = writeVbo(session, session.samples)
    expect(output).toContain('[header]')
    expect(output).toContain('[column names]')
  })

  it('includes data section', () => {
    const session = readVbo('test.vbo', SAMPLE_VBO)
    const output = writeVbo(session, session.samples)
    expect(output).toContain('[data]')
  })

  it('writes correct number of data lines', () => {
    const session = readVbo('test.vbo', SAMPLE_VBO)
    const output = writeVbo(session, session.samples)
    const dataLines = output
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0 && !l.startsWith('[') && !l.includes('RaceBox') && !l.includes('time'))
    expect(dataLines.length).toBe(3)
  })

  it('round-trips through parse and write', () => {
    const session = readVbo('test.vbo', SAMPLE_VBO)
    const output = writeVbo(session, session.samples)
    // Re-parse the output
    const reparsed = readVbo('reparsed.vbo', output)
    expect(reparsed.samples.length).toBe(session.samples.length)
  })

  it('handles empty samples list', () => {
    const session = readVbo('test.vbo', SAMPLE_VBO)
    const output = writeVbo(session, [])
    expect(output).toContain('[data]')
  })

  it('writes time in HHMMSS.CC format (no colons)', () => {
    const session = readVbo('test.vbo', SAMPLE_VBO)
    const output = writeVbo(session, session.samples)
    const dataLines = output
      .split(/\r?\n/)
      .filter((l) => /^\d{6}\.\d{2}/.test(l))
    expect(dataLines.length).toBe(3)
    expect(dataLines[0]).toMatch(/^100000\.00/)
  })
})
