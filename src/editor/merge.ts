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
  for (const { lap } of selectedLaps) {
    allSamples.push(...lap.samples)
  }

  return {
    session: baseSession,
    samples: allSamples,
  }
}
