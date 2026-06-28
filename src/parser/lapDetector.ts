import type { GpsSample, Lap, StartFinishLine } from './types.ts'

const MOVING_SPEED_KMH = 5
const MIN_LAP_SAMPLES = 10
const MIN_LAP_SECONDS = 30

interface Boundary {
  index: number
  time: number // interpolated crossing time in seconds
}

export function detectLaps(samples: GpsSample[], startFinish?: StartFinishLine): Lap[] {
  if (samples.length === 0) return []

  if (startFinish) {
    return detectByStartFinish(samples, startFinish)
  }

  const indices = findSpeedBoundaries(samples)
  if (indices.length < 2) {
    return [buildLap(samples, 0, false)]
  }

  const laps: Lap[] = []
  for (let i = 0; i < indices.length - 1; i++) {
    const lapSamples = samples.slice(indices[i], indices[i + 1])
    if (lapSamples.length >= MIN_LAP_SAMPLES) {
      laps.push(buildLap(lapSamples, laps.length, false))
    }
  }
  const lastSamples = samples.slice(indices[indices.length - 1])
  if (lastSamples.length >= MIN_LAP_SAMPLES) {
    laps.push(buildLap(lastSamples, laps.length, false))
  }
  return laps.length > 0 ? laps : [buildLap(samples, 0, false)]
}

function detectByStartFinish(samples: GpsSample[], sf: StartFinishLine): Lap[] {
  const boundaries = findCrossingBoundaries(samples, sf)

  if (boundaries.length < 2) {
    return [buildLap(samples, 0, false)]
  }

  const laps: Lap[] = []
  const sessionStart: Boundary = { index: 0, time: samples[0]!.time }
  const sessionEnd: Boundary = {
    index: samples.length - 1,
    time: samples[samples.length - 1]!.time,
  }

  // Out-lap: session start → first SF crossing
  const outSamples = samples.slice(0, boundaries[0]!.index)
  if (outSamples.length >= MIN_LAP_SAMPLES) {
    laps.push(buildLap(outSamples, laps.length, false, sessionStart.time, boundaries[0]!.time))
  }

  // Complete laps: SF crossing → SF crossing
  for (let i = 0; i < boundaries.length - 1; i++) {
    const b0 = boundaries[i]!
    const b1 = boundaries[i + 1]!
    const lapSamples = samples.slice(b0.index, b1.index)
    if (lapSamples.length >= MIN_LAP_SAMPLES) {
      laps.push(buildLap(lapSamples, laps.length, true, b0.time, b1.time))
    }
  }

  // In-lap: last SF crossing → session end
  const inSamples = samples.slice(boundaries[boundaries.length - 1]!.index)
  if (inSamples.length >= MIN_LAP_SAMPLES) {
    laps.push(
      buildLap(
        inSamples,
        laps.length,
        false,
        boundaries[boundaries.length - 1]!.time,
        sessionEnd.time,
      ),
    )
  }

  return laps.length > 0 ? laps : [buildLap(samples, 0, false)]
}

/**
 * Detect lap boundaries by finding when the car's path crosses the
 * start/finish line segment (proper segment-segment intersection).
 * Returns interpolated crossing times for sub-sample precision.
 * MIN_LAP_SECONDS gap suppresses GPS jitter near the line.
 */
function findCrossingBoundaries(samples: GpsSample[], sf: StartFinishLine): Boundary[] {
  const boundaries: Boundary[] = []
  let lastCrossingTime = samples[0]!.time

  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!
    const b = samples[i]!

    if (segmentsCross(a, b, sf)) {
      const crossTime = interpolateCrossingTime(a, b, sf)
      if (crossTime - lastCrossingTime >= MIN_LAP_SECONDS) {
        boundaries.push({ index: i, time: crossTime })
        lastCrossingTime = crossTime
      }
    }
  }

  return boundaries
}

/**
 * Linearly interpolate the exact time the car crosses the SF line between
 * consecutive samples a and b. Uses the cross-product distance to weight.
 */
function interpolateCrossingTime(a: GpsSample, b: GpsSample, sf: StartFinishLine): number {
  const da = cross2d(sf.lat2 - sf.lat1, sf.lon2 - sf.lon1, a.lat - sf.lat1, a.lon - sf.lon1)
  const db = cross2d(sf.lat2 - sf.lat1, sf.lon2 - sf.lon1, b.lat - sf.lat1, b.lon - sf.lon1)
  const t = da / (da - db)
  return a.time + (b.time - a.time) * t
}

function cross2d(dlat: number, dlon: number, plat: number, plon: number): number {
  return dlat * plon - dlon * plat
}

function segmentsCross(a: GpsSample, b: GpsSample, sf: StartFinishLine): boolean {
  const d1 = cross2d(sf.lat2 - sf.lat1, sf.lon2 - sf.lon1, a.lat - sf.lat1, a.lon - sf.lon1)
  const d2 = cross2d(sf.lat2 - sf.lat1, sf.lon2 - sf.lon1, b.lat - sf.lat1, b.lon - sf.lon1)
  const d3 = cross2d(b.lat - a.lat, b.lon - a.lon, sf.lat1 - a.lat, sf.lon1 - a.lon)
  const d4 = cross2d(b.lat - a.lat, b.lon - a.lon, sf.lat2 - a.lat, sf.lon2 - a.lon)
  return Math.sign(d1) !== Math.sign(d2) && Math.sign(d3) !== Math.sign(d4)
}

/**
 * Fallback: detect laps by stopped→moving transitions (works for sessions
 * where the car fully stops between laps, e.g. pit-lane sessions).
 */
function findSpeedBoundaries(samples: GpsSample[]): number[] {
  const boundaries: number[] = [0]
  let wasStopped = (samples[0]?.speed ?? 0) < MOVING_SPEED_KMH

  for (let i = 1; i < samples.length; i++) {
    const s = samples[i]!
    const isMoving = s.speed >= MOVING_SPEED_KMH
    if (wasStopped && isMoving) {
      if (i - (boundaries[boundaries.length - 1] ?? 0) >= MIN_LAP_SAMPLES) {
        boundaries.push(i)
      }
    }
    wasStopped = !isMoving
  }

  return boundaries
}

function buildLap(
  samples: GpsSample[],
  index: number,
  isComplete: boolean,
  startTime?: number,
  endTime?: number,
): Lap {
  const tStart = startTime ?? samples[0]?.time ?? 0
  const tEnd = endTime ?? samples[samples.length - 1]?.time ?? 0
  const durationMs = tEnd > tStart ? (tEnd - tStart) * 1000 : samples.length * 10

  return {
    id: crypto.randomUUID(),
    index,
    durationMs,
    samples,
    timeString: formatLapTime(durationMs),
    isComplete,
  }
}

/** Format milliseconds as M:SS.ss (centiseconds) */
export function formatLapTime(ms: number): string {
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds - minutes * 60
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`
}
