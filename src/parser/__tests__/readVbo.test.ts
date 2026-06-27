import { describe, it, expect } from 'vitest'
import { readVbo } from '../readVbo.ts'

const MINIMAL_VBO = `[header]
File Created	RaceBox

[column names]
time	lat	lon	velocity kmh

[data]
10:00:00.00	5139.5000	-00014.5000	0.0
10:00:00.10	5139.5001	-00014.5001	5.0
10:00:00.20	5139.5002	-00014.5002	50.0
10:00:00.30	5139.5003	-00014.5003	80.0
`

const TWO_LAPS_VBO = `[header]
File Created	RaceBox

[column names]
time	lat	lon	velocity kmh

[data]
10:00:00.00	5139.5000	-00014.5000	0.0
10:00:00.10	5139.5001	-00014.5001	50.0
10:00:00.20	5139.5002	-00014.5002	80.0
10:00:00.30	5139.5003	-00014.5003	90.0
10:00:00.40	5139.5004	-00014.5004	60.0
10:00:00.50	5139.5005	-00014.5005	0.0
10:00:00.60	5139.5006	-00014.5006	0.0
10:00:00.70	5139.5007	-00014.5007	0.0
10:00:00.80	5139.5008	-00014.5008	0.0
10:00:00.90	5139.5009	-00014.5009	0.0
10:00:01.00	5139.5010	-00014.5010	0.0
10:00:01.10	5139.5011	-00014.5011	50.0
10:00:01.20	5139.5012	-00014.5012	80.0
10:00:01.30	5139.5013	-00014.5013	90.0
10:00:01.40	5139.5014	-00014.5014	70.0
10:00:01.50	5139.5015	-00014.5015	60.0
10:00:01.60	5139.5016	-00014.5016	50.0
10:00:01.70	5139.5017	-00014.5017	40.0
10:00:01.80	5139.5018	-00014.5018	30.0
10:00:01.90	5139.5019	-00014.5019	10.0
`

describe('readVbo', () => {
  it('parses column names', () => {
    const session = readVbo('test.vbo', MINIMAL_VBO)
    expect(session.header.columnNames).toEqual(['time', 'lat', 'lon', 'velocity kmh'])
  })

  it('finds column indices', () => {
    const session = readVbo('test.vbo', MINIMAL_VBO)
    expect(session.header.timeIndex).toBe(0)
    expect(session.header.latIndex).toBe(1)
    expect(session.header.lonIndex).toBe(2)
    expect(session.header.speedIndex).toBe(3)
  })

  it('parses data samples', () => {
    const session = readVbo('test.vbo', MINIMAL_VBO)
    expect(session.samples.length).toBe(4)
  })

  it('parses time as seconds', () => {
    const session = readVbo('test.vbo', MINIMAL_VBO)
    expect(session.samples[0]!.time).toBeCloseTo(36000)
    expect(session.samples[1]!.time).toBeCloseTo(36000.1)
  })

  it('converts lat/lon from DDDMM.MMMM to decimal degrees', () => {
    const session = readVbo('test.vbo', MINIMAL_VBO)
    // 5139.5000 → 51 + 39.5/60 = 51.6583...
    expect(session.samples[0]!.lat).toBeCloseTo(51.6583, 3)
    // -00014.5000 → -(0 + 14.5/60) = -0.2416...
    expect(session.samples[0]!.lon).toBeCloseTo(-0.2417, 3)
  })

  it('parses speed', () => {
    const session = readVbo('test.vbo', MINIMAL_VBO)
    expect(session.samples[2]!.speed).toBeCloseTo(50)
  })

  it('detects laps when there is a stop-start pattern', () => {
    const session = readVbo('test.vbo', TWO_LAPS_VBO)
    expect(session.laps.length).toBeGreaterThanOrEqual(1)
  })

  it('assigns fileName and id', () => {
    const session = readVbo('my-session.vbo', MINIMAL_VBO)
    expect(session.fileName).toBe('my-session.vbo')
    expect(typeof session.id).toBe('string')
    expect(session.id.length).toBeGreaterThan(0)
  })

  it('handles empty data section gracefully', () => {
    const empty = `[header]\nFile Created\tRaceBox\n\n[column names]\ntime\tlat\tlon\tvelocity kmh\n\n[data]\n`
    const session = readVbo('empty.vbo', empty)
    expect(session.samples.length).toBe(0)
    expect(session.laps.length).toBe(0)
  })
})
