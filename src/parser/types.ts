/** A single GPS/telemetry sample from a VBO file */
export interface GpsSample {
  /** Raw line from the data section */
  raw: string
  /** Parsed time field (seconds of day, floating point) */
  time: number
  /** Latitude in decimal degrees */
  lat: number
  /** Longitude in decimal degrees */
  lon: number
  /** Speed in km/h (or kph as stored in the file) */
  speed: number
}

/** A detected lap within a session */
export interface Lap {
  id: string
  index: number
  /** Lap duration in milliseconds */
  durationMs: number
  /** Samples that belong to this lap */
  samples: GpsSample[]
  /** Human-readable time string, e.g. "1:58.123" */
  timeString: string
  /** True when the lap runs from start/finish crossing to start/finish crossing */
  isComplete: boolean
}

/** Metadata extracted from a VBO file header */
export interface VboHeader {
  /** Raw header lines grouped by section */
  sections: Record<string, string[]>
  /** Column names from the [column names] section */
  columnNames: string[]
  /** Index of the "time" column */
  timeIndex: number
  /** Index of the "lat" column (may be -1 if absent) */
  latIndex: number
  /** Index of the "lon" column (may be -1 if absent) */
  lonIndex: number
  /** Index of the speed column */
  speedIndex: number
}

/** Start/finish line defined by two GPS coordinates */
export interface StartFinishLine {
  lat1: number
  lon1: number
  lat2: number
  lon2: number
}

/** A fully parsed VBO session */
export interface Session {
  id: string
  /** Original file name */
  fileName: string
  header: VboHeader
  /** All samples in the file */
  samples: GpsSample[]
  /** Detected laps */
  laps: Lap[]
  /** Venue name from the [comments] section, if present */
  venue?: string
  /** Session date/time string from the [comments] section, if present */
  date?: string
  /** Start/finish line used for lap detection */
  startFinish?: StartFinishLine
}

/** Message sent to the parser worker */
export type WorkerInMessage =
  | { type: 'parse'; id: string; fileName: string; content: string }

/** Message received from the parser worker */
export type WorkerOutMessage =
  | { type: 'progress'; id: string; fileName: string }
  | { type: 'result'; id: string; session: Session }
  | { type: 'error'; id: string; fileName: string; message: string }
