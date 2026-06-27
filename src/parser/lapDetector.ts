import type { GpsSample, Lap } from './types.ts'

/**
 * Minimum speed (km/h) to consider the vehicle as "moving".
 * Used to detect start/finish line crossings.
 */
const MOVING_SPEED_KMH = 5

/**
 * Minimum number of samples per lap to be considered valid.
 */
const MIN_LAP_SAMPLES = 10

/**
 * Detect laps from a series of GPS samples.
 *
 * Strategy: look for transitions from stopped → moving as lap start markers.
 * This works well for RaceBox files where the vehicle pauses at pit lane
 * or between sessions. For continuous circuit driving a simple time-boundary
 * approach is used as fallback.
 */
export function detectLaps(samples: GpsSample[]): Lap[] {
  if (samples.length === 0) return []

  const boundaries = findLapBoundaries(samples)

  if (boundaries.length < 2) {
    // Treat the whole file as one lap
    return [buildLap(samples, 0)]
  }

  const laps: Lap[] = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i]
    const end = boundaries[i + 1]
    const lapSamples = samples.slice(start, end)
    if (lapSamples.length >= MIN_LAP_SAMPLES) {
      laps.push(buildLap(lapSamples, laps.length))
    }
  }

  // Include the last segment if it has enough samples
  const lastStart = boundaries[boundaries.length - 1]
  const lastSamples = samples.slice(lastStart)
  if (lastSamples.length >= MIN_LAP_SAMPLES) {
    laps.push(buildLap(lastSamples, laps.length))
  }

  return laps.length > 0 ? laps : [buildLap(samples, 0)]
}

/**
 * Find the sample indices where laps start.
 * Uses speed-based detection: a lap starts when the vehicle accelerates
 * from a near-stop.
 */
function findLapBoundaries(samples: GpsSample[]): number[] {
  const boundaries: number[] = [0]

  let wasStopped = samples[0] !== undefined && samples[0].speed < MOVING_SPEED_KMH

  for (let i = 1; i < samples.length; i++) {
    const sample = samples[i]
    if (sample === undefined) continue
    const isMoving = sample.speed >= MOVING_SPEED_KMH

    if (wasStopped && isMoving) {
      // Transition from stopped to moving → new lap
      if (i - (boundaries[boundaries.length - 1] ?? 0) >= MIN_LAP_SAMPLES) {
        boundaries.push(i)
      }
    }

    wasStopped = !isMoving
  }

  return boundaries
}

function buildLap(samples: GpsSample[], index: number): Lap {
  const first = samples[0]
  const last = samples[samples.length - 1]

  const startTime = first?.time ?? 0
  const endTime = last?.time ?? 0

  let durationMs: number
  if (endTime > startTime) {
    durationMs = (endTime - startTime) * 1000
  } else {
    // Fall back to sample count * 10ms (100Hz default)
    durationMs = samples.length * 10
  }

  return {
    id: crypto.randomUUID(),
    index,
    durationMs,
    samples,
    timeString: formatLapTime(durationMs),
  }
}

/**
 * Format milliseconds as M:SS.mmm
 */
export function formatLapTime(ms: number): string {
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds - minutes * 60
  const secStr = seconds.toFixed(3).padStart(6, '0')
  return `${minutes}:${secStr}`
}
