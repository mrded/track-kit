import type { Lap, Session } from '../parser/types.ts'
import type { GpsSample } from '../parser/types.ts'

export interface SelectedLap {
  session: Session
  lap: Lap
}

/**
 * Merge the given selected laps into a single flat array of GPS samples.
 * Samples are taken from each lap in order and concatenated.
 */
export function mergeLaps(selectedLaps: SelectedLap[]): {
  session: Session
  samples: GpsSample[]
} {
  if (selectedLaps.length === 0) {
    throw new Error('No laps selected')
  }

  // Use the first session as the base (its header becomes the merged file header)
  const baseSession = selectedLaps[0]!.session

  const allSamples: GpsSample[] = []

  for (let i = 0; i < selectedLaps.length; i++) {
    const { lap } = selectedLaps[i]!

    // Prepend the sample just before this lap's SF crossing so the merged file
    // contains a crossing at the start of each lap (RaceChrono needs to see the
    // crossing to begin timing). Skip if it's already the last sample added
    // (avoids duplicates when merging consecutive laps from the same session).
    if (lap.preBoundarySample) {
      const last = allSamples[allSamples.length - 1]
      if (!last || last.raw !== lap.preBoundarySample.raw) {
        allSamples.push(lap.preBoundarySample)
      }
    }

    allSamples.push(...lap.samples)
  }

  // Append the sample just after the last lap's closing SF crossing so
  // RaceChrono can close the final lap rather than leaving it open.
  const lastLap = selectedLaps[selectedLaps.length - 1]!.lap
  if (lastLap.postBoundarySamples) {
    allSamples.push(...lastLap.postBoundarySamples)
  }

  return {
    session: baseSession,
    samples: allSamples,
  }
}
