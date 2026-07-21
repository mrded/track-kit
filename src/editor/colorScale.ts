import type { GpsSample } from '../parser/types.ts'

export type ColorMetric = 'none' | 'speed' | 'braking' | 'cornering'

/** Metrics that get a low → high heat gradient; 'none' is a solid line instead. */
export type HeatMetric = Exclude<ColorMetric, 'none'>

type Rgb = [number, number, number]

// Low → high intensity: blue, green, yellow, red.
const HEAT_STOPS: Rgb[] = [
  [37, 99, 235],
  [34, 197, 94],
  [250, 204, 21],
  [239, 68, 68],
]

/** Line color for the 'none' (normal) map mode — matches the app's accent blue. */
export const SOLID_LINE_COLOR = 'rgb(37, 99, 235)'

/**
 * Extract the value a heat metric colors by:
 *  - speed: raw km/h
 *  - braking: rectified deceleration g (0 when coasting/accelerating)
 *  - cornering: lean angle magnitude, normalised for left/right turns
 */
export function heatMetricValue(sample: GpsSample, metric: HeatMetric): number {
  switch (metric) {
    case 'speed':
      return sample.speed
    case 'braking':
      return Math.max(0, -sample.longAcc)
    case 'cornering':
      return Math.abs(sample.leanAngle)
  }
}

/** Map a value within [min, max] to a color along the heat gradient. */
export function colorForValue(value: number, min: number, max: number): string {
  const t = max > min ? clamp01((value - min) / (max - min)) : 0
  return sampleGradient(HEAT_STOPS, t)
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

function sampleGradient(stops: Rgb[], t: number): string {
  const segments = stops.length - 1
  const scaled = t * segments
  const i = Math.min(segments - 1, Math.floor(scaled))
  const localT = scaled - i
  const [r1, g1, b1] = stops[i]!
  const [r2, g2, b2] = stops[i + 1]!
  const r = Math.round(r1 + (r2 - r1) * localT)
  const g = Math.round(g1 + (g2 - g1) * localT)
  const b = Math.round(b1 + (b2 - b1) * localT)
  return `rgb(${r}, ${g}, ${b})`
}

/** Min/max via a loop instead of `Math.min(...arr)` — safe for large sample arrays. */
export function minMax(values: number[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  return [min, max]
}
