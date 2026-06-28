import { describe, it, expect } from 'vitest'
import { detectLaps, formatLapTime } from '../lapDetector.ts'
import type { GpsSample } from '../types.ts'

function makeSample(time: number, speed: number): GpsSample {
  return { raw: `${time} 0 0 ${speed}`, time, lat: 0, lon: 0, speed }
}

describe('detectLaps', () => {
  it('returns empty array for empty input', () => {
    expect(detectLaps([])).toEqual([])
  })

  it('returns single lap for continuously moving samples', () => {
    const samples = Array.from({ length: 20 }, (_, i) => makeSample(i * 0.1, 80))
    const laps = detectLaps(samples)
    expect(laps.length).toBe(1)
  })

  it('detects two laps separated by a stop', () => {
    const samples: GpsSample[] = [
      // First lap – moving
      ...Array.from({ length: 15 }, (_, i) => makeSample(i * 0.1, 80)),
      // Stop
      ...Array.from({ length: 10 }, (_, i) => makeSample(1.5 + i * 0.1, 0)),
      // Second lap – moving
      ...Array.from({ length: 15 }, (_, i) => makeSample(2.5 + i * 0.1, 80)),
    ]
    const laps = detectLaps(samples)
    expect(laps.length).toBeGreaterThanOrEqual(2)
  })

  it('assigns increasing indices', () => {
    const samples: GpsSample[] = [
      ...Array.from({ length: 15 }, (_, i) => makeSample(i * 0.1, 80)),
      ...Array.from({ length: 10 }, (_, i) => makeSample(1.5 + i * 0.1, 0)),
      ...Array.from({ length: 15 }, (_, i) => makeSample(2.5 + i * 0.1, 80)),
    ]
    const laps = detectLaps(samples)
    laps.forEach((lap, i) => {
      expect(lap.index).toBe(i)
    })
  })

  it('calculates lap duration from sample times', () => {
    const samples = Array.from({ length: 20 }, (_, i) => makeSample(i * 0.1, 80))
    const laps = detectLaps(samples)
    expect(laps[0]!.durationMs).toBeGreaterThan(0)
  })
})

describe('formatLapTime', () => {
  it('formats sub-minute times', () => {
    expect(formatLapTime(58_100)).toBe('0:58.10')
  })

  it('formats minute times', () => {
    expect(formatLapTime(118_000)).toBe('1:58.00')
  })

  it('formats zero', () => {
    expect(formatLapTime(0)).toBe('0:00.00')
  })
})
