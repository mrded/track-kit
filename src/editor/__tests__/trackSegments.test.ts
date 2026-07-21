import { describe, it, expect } from 'vitest'
import { buildTrackSegments } from '../trackSegments.ts'
import { SOLID_LINE_COLOR } from '../colorScale.ts'
import type { GpsSample, Lap } from '../../parser/types.ts'

function makeSample(overrides: Partial<GpsSample> = {}): GpsSample {
  return { raw: '', time: 0, lat: 0, lon: 0, speed: 0, longAcc: 0, leanAngle: 0, ...overrides }
}

function makeLap(id: string, samples: GpsSample[]): Lap {
  return { id, index: 0, durationMs: 0, samples, timeString: '0:00.00', isComplete: true }
}

describe('buildTrackSegments', () => {
  it('returns undefined when there are fewer than 2 total samples', () => {
    expect(buildTrackSegments([], 'speed')).toBeUndefined()
    expect(buildTrackSegments([{ lap: makeLap('a', [makeSample()]) }], 'speed')).toBeUndefined()
  })

  it("'none' mode draws one solid segment per lap covering all its samples", () => {
    const lap = makeLap('lap-1', [
      makeSample({ lat: 1, lon: 2 }),
      makeSample({ lat: 3, lon: 4 }),
      makeSample({ lat: 5, lon: 6 }),
    ])
    const result = buildTrackSegments([{ lap }], 'none')

    expect(result!.segments).toHaveLength(1)
    expect(result!.segments[0]!.key).toBe('lap-1')
    expect(result!.segments[0]!.color).toBe(SOLID_LINE_COLOR)
    expect(result!.segments[0]!.positions).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ])
  })

  it('heat modes draw one 2-point segment per consecutive sample pair', () => {
    const lap = makeLap('lap-1', [
      makeSample({ lat: 1, lon: 1, speed: 50 }),
      makeSample({ lat: 2, lon: 2, speed: 100 }),
      makeSample({ lat: 3, lon: 3, speed: 150 }),
    ])
    const result = buildTrackSegments([{ lap }], 'speed')

    expect(result!.segments).toHaveLength(2)
    expect(result!.segments[0]!.positions).toEqual([
      [1, 1],
      [2, 2],
    ])
    expect(result!.segments[1]!.positions).toEqual([
      [2, 2],
      [3, 3],
    ])
  })

  it('colors the slowest sample blue and the fastest sample red for speed', () => {
    const lap = makeLap('lap-1', [
      makeSample({ lat: 0, lon: 0, speed: 0 }),
      makeSample({ lat: 0, lon: 1, speed: 100 }),
    ])
    const result = buildTrackSegments([{ lap }], 'speed')

    expect(result!.segments[0]!.color).toBe('rgb(239, 68, 68)')
  })

  it('computes bounds from the min/max lat/lon across all selected laps', () => {
    const lapA = makeLap('a', [makeSample({ lat: 10, lon: -5 }), makeSample({ lat: 12, lon: -3 })])
    const lapB = makeLap('b', [makeSample({ lat: 8, lon: -6 }), makeSample({ lat: 11, lon: -1 })])
    const result = buildTrackSegments([{ lap: lapA }, { lap: lapB }], 'none')

    expect(result!.bounds).toEqual([
      [8, -6],
      [12, -1],
    ])
  })

  it('normalises the heat scale across all selected laps combined, not per-lap', () => {
    const lapA = makeLap('a', [
      makeSample({ lat: 0, lon: 0, speed: 0 }),
      makeSample({ lat: 0, lon: 1, speed: 50 }),
    ])
    const lapB = makeLap('b', [
      makeSample({ lat: 1, lon: 0, speed: 50 }),
      makeSample({ lat: 1, lon: 1, speed: 100 }),
    ])
    const result = buildTrackSegments([{ lap: lapA }, { lap: lapB }], 'speed')

    // lapA's fastest sample (50) is only the midpoint of the combined 0..100 range,
    // so it should land on the middle of the gradient, not the hot end.
    expect(result!.segments[0]!.color).not.toBe('rgb(239, 68, 68)')
    expect(result!.segments[1]!.color).toBe('rgb(239, 68, 68)')
  })
})
