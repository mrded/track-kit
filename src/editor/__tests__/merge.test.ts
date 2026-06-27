import { describe, it, expect } from 'vitest'
import { mergeLaps } from '../merge.ts'
import type { Session, Lap, GpsSample } from '../../parser/types.ts'

function makeSession(id: string): Session {
  return {
    id,
    fileName: `${id}.vbo`,
    header: {
      sections: { header: ['File Created\tRaceBox'] },
      columnNames: ['time', 'lat', 'lon', 'velocity kmh'],
      timeIndex: 0,
      latIndex: 1,
      lonIndex: 2,
      speedIndex: 3,
    },
    samples: [],
    laps: [],
  }
}

function makeSample(time: number): GpsSample {
  return { raw: `${time} 0 0 50`, time, lat: 0, lon: 0, speed: 50 }
}

function makeLap(id: string, samples: GpsSample[]): Lap {
  return {
    id,
    index: 0,
    durationMs: 60_000,
    samples,
    timeString: '1:00.000',
  }
}

describe('mergeLaps', () => {
  it('concatenates samples from selected laps', () => {
    const session = makeSession('s1')
    const lap1 = makeLap('l1', [makeSample(0), makeSample(1)])
    const lap2 = makeLap('l2', [makeSample(2), makeSample(3)])

    const result = mergeLaps([
      { session, lap: lap1 },
      { session, lap: lap2 },
    ])

    expect(result.samples.length).toBe(4)
    expect(result.samples[0]!.time).toBe(0)
    expect(result.samples[3]!.time).toBe(3)
  })

  it('uses the first session as base', () => {
    const s1 = makeSession('s1')
    const s2 = makeSession('s2')
    const lap1 = makeLap('l1', [makeSample(0)])
    const lap2 = makeLap('l2', [makeSample(1)])

    const result = mergeLaps([
      { session: s1, lap: lap1 },
      { session: s2, lap: lap2 },
    ])

    expect(result.session.id).toBe('s1')
  })

  it('throws when no laps selected', () => {
    expect(() => mergeLaps([])).toThrow()
  })
})
