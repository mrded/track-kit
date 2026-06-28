import type { Session } from '../parser/types.ts'

// ~22 metres in decimal degrees — large enough to ignore GPS noise,
// small enough to distinguish different track layouts.
const SF_TOLERANCE = 0.0002

/**
 * Returns true if two sessions are from the same track layout, determined by
 * comparing their start/finish line coordinates. Sessions without a
 * start/finish line are considered compatible with anything.
 */
export function tracksMatch(a: Session, b: Session): boolean {
  if (!a.startFinish || !b.startFinish) return true
  const s = a.startFinish
  const t = b.startFinish
  return (
    Math.abs(s.lat1 - t.lat1) < SF_TOLERANCE &&
    Math.abs(s.lon1 - t.lon1) < SF_TOLERANCE &&
    Math.abs(s.lat2 - t.lat2) < SF_TOLERANCE &&
    Math.abs(s.lon2 - t.lon2) < SF_TOLERANCE
  )
}
