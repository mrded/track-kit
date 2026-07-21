import { describe, it, expect } from 'vitest'
import { colorForValue, heatMetricValue, minMax } from '../colorScale.ts'
import type { GpsSample } from '../../parser/types.ts'

function makeSample(overrides: Partial<GpsSample> = {}): GpsSample {
  return { raw: '', time: 0, lat: 0, lon: 0, speed: 0, longAcc: 0, leanAngle: 0, ...overrides }
}

describe('colorForValue', () => {
  it('maps the minimum value to the first stop color', () => {
    expect(colorForValue(0, 0, 100)).toBe('rgb(37, 99, 235)')
  })

  it('maps the maximum value to the last stop color', () => {
    expect(colorForValue(100, 0, 100)).toBe('rgb(239, 68, 68)')
  })

  it('handles a flat range without dividing by zero', () => {
    expect(colorForValue(50, 50, 50)).toBe('rgb(37, 99, 235)')
  })
})

describe('heatMetricValue', () => {
  it('returns raw speed for the speed metric', () => {
    expect(heatMetricValue(makeSample({ speed: 87.5 }), 'speed')).toBe(87.5)
  })

  it('rectifies braking to a positive g-force, zero while accelerating', () => {
    expect(heatMetricValue(makeSample({ longAcc: -0.8 }), 'braking')).toBeCloseTo(0.8)
    expect(heatMetricValue(makeSample({ longAcc: 0.8 }), 'braking')).toBe(0)
  })

  it('normalises cornering to the absolute lean angle regardless of turn direction', () => {
    expect(heatMetricValue(makeSample({ leanAngle: -32.4 }), 'cornering')).toBeCloseTo(32.4)
    expect(heatMetricValue(makeSample({ leanAngle: 32.4 }), 'cornering')).toBeCloseTo(32.4)
  })
})

describe('minMax', () => {
  it('returns the min and max of a list', () => {
    expect(minMax([3, -1, 7, 2])).toEqual([-1, 7])
  })

  it('handles a single value', () => {
    expect(minMax([5])).toEqual([5, 5])
  })
})
