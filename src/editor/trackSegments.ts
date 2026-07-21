import type { Lap } from '../parser/types.ts'
import {
  colorForValue,
  heatMetricValue,
  minMax,
  SOLID_LINE_COLOR,
  type ColorMetric,
} from './colorScale.ts'

export interface ColoredSegment {
  key: string
  positions: [number, number][]
  color: string
}

export interface TrackSegments {
  segments: ColoredSegment[]
  bounds: [[number, number], [number, number]]
}

/**
 * Build the colored map polylines for a set of selected laps.
 * 'none' draws one solid-colored polyline per lap; heat metrics draw one
 * 2-point segment per sample pair, colored by that metric's value.
 */
export function buildTrackSegments(
  laps: { lap: Lap }[],
  colorBy: ColorMetric,
): TrackSegments | undefined {
  const allSamples = laps.flatMap((l) => l.lap.samples)
  if (allSamples.length < 2) return undefined

  const [minLat, maxLat] = minMax(allSamples.map((s) => s.lat))
  const [minLon, maxLon] = minMax(allSamples.map((s) => s.lon))
  const bounds: TrackSegments['bounds'] = [
    [minLat, minLon],
    [maxLat, maxLon],
  ]

  if (colorBy === 'none') {
    const segments: ColoredSegment[] = laps.map(({ lap }) => ({
      key: lap.id,
      positions: lap.samples.map((s): [number, number] => [s.lat, s.lon]),
      color: SOLID_LINE_COLOR,
    }))
    return { segments, bounds }
  }

  const [min, max] = minMax(allSamples.map((s) => heatMetricValue(s, colorBy)))

  const segments: ColoredSegment[] = []
  for (const { lap } of laps) {
    for (let i = 1; i < lap.samples.length; i++) {
      const a = lap.samples[i - 1]!
      const b = lap.samples[i]!
      segments.push({
        key: `${lap.id}-${i}`,
        positions: [
          [a.lat, a.lon],
          [b.lat, b.lon],
        ],
        color: colorForValue(heatMetricValue(b, colorBy), min, max),
      })
    }
  }

  return { segments, bounds }
}
