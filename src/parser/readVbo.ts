import type { GpsSample, Session, StartFinishLine, VboHeader } from './types.ts'
import { detectLaps } from './lapDetector.ts'

/**
 * Parse the raw content of a VBO file into a Session object.
 */
export function readVbo(fileName: string, content: string): Session {
  const lines = content.split(/\r?\n/)

  const header = parseHeader(lines)
  const samples = parseSamples(lines, header)
  const startFinish = parseLaptiming(header.sections['laptiming'] ?? [])
  const comments = header.sections['comments'] ?? []
  const venue = parseVenue(comments)
  const date = parseDate(comments)
  const laps = detectLaps(samples, startFinish)

  return {
    id: crypto.randomUUID(),
    fileName,
    header,
    samples,
    laps,
    venue,
    date,
    startFinish,
  }
}

function parseHeader(lines: string[]): VboHeader {
  const sections: Record<string, string[]> = {}
  let currentSection = ''
  let inData = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const sectionName = trimmed.slice(1, -1).toLowerCase()
      if (sectionName === 'data') {
        inData = true
        break
      }
      currentSection = sectionName
      sections[currentSection] = []
      continue
    }

    if (inData) break

    if (currentSection && trimmed.length > 0) {
      sections[currentSection].push(trimmed)
    }
  }

  // Column names may be tab-separated (preserves multi-word names like "velocity kmh")
  // or space-separated (each word is its own column name).
  const rawColumnLine = (sections['column names'] ?? [])[0] ?? ''
  const columnNames = rawColumnLine.length > 0
    ? (rawColumnLine.includes('\t') ? rawColumnLine.split('\t') : rawColumnLine.split(/\s+/))
        .map((c) => c.trim())
        .filter(Boolean)
    : []
  const lower = columnNames.map((c) => c.toLowerCase())

  const timeIndex = findColumnIndex(lower, ['time', 'utc time'])
  const latIndex = findColumnIndex(lower, ['lat', 'latitude'])
  const lonIndex = findColumnIndex(lower, ['lng', 'lon', 'long', 'longitude'])
  const speedIndex = findColumnIndex(lower, ['velocity kmh', 'speed', 'velocity', 'kmh'])

  return {
    sections,
    columnNames,
    timeIndex,
    latIndex,
    lonIndex,
    speedIndex,
  }
}

function findColumnIndex(columns: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = columns.findIndex((c) => c === candidate)
    if (idx !== -1) return idx
  }
  for (const candidate of candidates) {
    const idx = columns.findIndex((c) => c.includes(candidate))
    if (idx !== -1) return idx
  }
  return -1
}

function parseSamples(lines: string[], header: VboHeader): GpsSample[] {
  let inData = false
  const samples: GpsSample[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '[data]') {
      inData = true
      continue
    }

    if (!inData) continue
    if (trimmed.length === 0) continue
    if (trimmed.startsWith('[')) break

    const fields = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(/\s+/)

    const time = header.timeIndex >= 0 ? parseTimeField(fields[header.timeIndex] ?? '') : 0
    const lat = header.latIndex >= 0 ? parseCoord(fields[header.latIndex] ?? '') : 0
    const lon = header.lonIndex >= 0 ? parseCoord(fields[header.lonIndex] ?? '') : 0
    const speed = header.speedIndex >= 0 ? parseFloat(fields[header.speedIndex] ?? '0') : 0

    samples.push({
      raw: trimmed,
      time,
      lat,
      lon,
      speed: isNaN(speed) ? 0 : speed,
    })
  }

  return samples
}

/**
 * Parse a VBO time field into seconds of day.
 * Handles two formats:
 *   HH:MM:SS.SSS  (already seconds-based)
 *   HHMMSS.CC     (RaceBox compact format, e.g. 154409.00 = 15:44:09.00)
 */
function parseTimeField(field: string): number {
  if (field.includes(':')) {
    const parts = field.split(':')
    if (parts.length === 3) {
      const h = parseFloat(parts[0] ?? '0')
      const m = parseFloat(parts[1] ?? '0')
      const s = parseFloat(parts[2] ?? '0')
      return h * 3600 + m * 60 + s
    }
  }
  const n = parseFloat(field)
  if (isNaN(n)) return 0
  // Values > 10000 are HHMMSS.CC: e.g. 154409.00 → 15h 44m 09.00s
  if (n > 10000) {
    const h = Math.floor(n / 10000)
    const m = Math.floor((n % 10000) / 100)
    const s = n % 100
    return h * 3600 + m * 60 + s
  }
  return n
}

/**
 * Parse a VBO coordinate field.
 * VBO stores coordinates in DDDMM.MMMM format (degrees + decimal minutes).
 */
function parseCoord(field: string): number {
  if (field.length === 0) return 0
  const n = parseFloat(field)
  if (isNaN(n)) return 0
  // Convert from DDDMM.MMMM to decimal degrees
  const abs = Math.abs(n)
  const degrees = Math.floor(abs / 100)
  const minutes = abs - degrees * 100
  const decimal = degrees + minutes / 60
  return n < 0 ? -decimal : decimal
}

/** Parse the venue name from the [comments] section (e.g. "Venue : Bedford"). */
function parseVenue(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(/^Venue\s*:\s*(.+)$/)
    if (match) return match[1].trim()
  }
  return undefined
}

/** Parse the session date from the [comments] section (e.g. "UTC Date Started : 09/09/2024 15:44"). */
function parseDate(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(/^UTC Date Started\s*:\s*(.+)$/)
    if (match) return match[1].trim()
  }
  return undefined
}

/**
 * Parse the [laptiming] section to extract the start/finish line.
 * Line format: "Start  <lat1> <lon1> <lat2> <lon2> ¬ <name>"
 */
function parseLaptiming(lines: string[]): StartFinishLine | undefined {
  for (const line of lines) {
    if (!line.trimStart().startsWith('Start')) continue
    const tokens = line.trim().split(/\s+/)
    // tokens: ["Start", lat1, lon1, lat2, lon2, "¬", ...]
    if (tokens.length < 5) continue
    const lat1 = parseCoord(tokens[1] ?? '')
    const lon1 = parseCoord(tokens[2] ?? '')
    const lat2 = parseCoord(tokens[3] ?? '')
    const lon2 = parseCoord(tokens[4] ?? '')
    if (lat1 === 0 && lon1 === 0) continue
    return { lat1, lon1, lat2, lon2 }
  }
  return undefined
}
