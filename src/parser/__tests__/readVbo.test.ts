import { describe, it, expect } from 'vitest'
import { readVbo } from '../readVbo.ts'

const MINIMAL_VBO = `[header]
File Created	RaceBox

[column names]
time	lat	lon	velocity kmh

[data]
10:00:00.00	3099.5000	00014.5000	0.0
10:00:00.10	3099.5001	00014.5001	5.0
10:00:00.20	3099.5002	00014.5002	50.0
10:00:00.30	3099.5003	00014.5003	80.0
`

const TWO_LAPS_VBO = `[header]
File Created	RaceBox

[column names]
time	lat	lon	velocity kmh

[data]
10:00:00.00	3099.5000	00014.5000	0.0
10:00:00.10	3099.5001	00014.5001	50.0
10:00:00.20	3099.5002	00014.5002	80.0
10:00:00.30	3099.5003	00014.5003	90.0
10:00:00.40	3099.5004	00014.5004	60.0
10:00:00.50	3099.5005	00014.5005	0.0
10:00:00.60	3099.5006	00014.5006	0.0
10:00:00.70	3099.5007	00014.5007	0.0
10:00:00.80	3099.5008	00014.5008	0.0
10:00:00.90	3099.5009	00014.5009	0.0
10:00:01.00	3099.5010	00014.5010	0.0
10:00:01.10	3099.5011	00014.5011	50.0
10:00:01.20	3099.5012	00014.5012	80.0
10:00:01.30	3099.5013	00014.5013	90.0
10:00:01.40	3099.5014	00014.5014	70.0
10:00:01.50	3099.5015	00014.5015	60.0
10:00:01.60	3099.5016	00014.5016	50.0
10:00:01.70	3099.5017	00014.5017	40.0
10:00:01.80	3099.5018	00014.5018	30.0
10:00:01.90	3099.5019	00014.5019	10.0
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

  it('converts lat/lon from minutes to decimal degrees', () => {
    const session = readVbo('test.vbo', MINIMAL_VBO)
    // 3099.5000 minutes / 60 = 51.6583... (latitude is north-positive)
    expect(session.samples[0]!.lat).toBeCloseTo(51.6583, 3)
    // VBO stores longitude west-positive: 14.5000 / 60 = 0.2417 W → -0.2417
    expect(session.samples[0]!.lon).toBeCloseTo(-0.2417, 3)
  })

  it('parses speed', () => {
    const session = readVbo('test.vbo', MINIMAL_VBO)
    expect(session.samples[2]!.speed).toBeCloseTo(50)
  })

  it('defaults longAcc and leanAngle to 0 when the columns are absent', () => {
    const session = readVbo('test.vbo', MINIMAL_VBO)
    expect(session.header.longAccIndex).toBe(-1)
    expect(session.header.leanAngleIndex).toBe(-1)
    expect(session.samples[0]!.longAcc).toBe(0)
    expect(session.samples[0]!.leanAngle).toBe(0)
  })

  it('parses LongAcc and lean-angle columns when present', () => {
    const vbo = `[header]
File Created	RaceBox

[column names]
time lat lon velocity LongAcc lean-angle

[data]
10:00:00.00 3099.5000 00014.5000 0.0 -0.850 32.4
`
    const session = readVbo('test.vbo', vbo)
    expect(session.header.longAccIndex).toBe(4)
    expect(session.header.leanAngleIndex).toBe(5)
    expect(session.samples[0]!.longAcc).toBeCloseTo(-0.85)
    expect(session.samples[0]!.leanAngle).toBeCloseTo(32.4)
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
