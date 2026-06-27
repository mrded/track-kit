import type { GpsSample, Session, VboHeader } from './types.ts'
import { detectLaps } from './lapDetector.ts'

/**
 * Parse the raw content of a VBO file into a Session object.
 */
export function readVbo(fileName: string, content: string): Session {
  const lines = content.split(/\r?\n/)

  const header = parseHeader(lines)
  const samples = parseSamples(lines, header)
  const laps = detectLaps(samples)

  return {
    id: crypto.randomUUID(),
    fileName,
    header,
    samples,
    laps,
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

  // Column names are stored as a single tab-separated line
  const rawColumnLine = (sections['column names'] ?? [])[0] ?? ''
  const columnNames = rawColumnLine.length > 0
    ? rawColumnLine.split('\t').map((c) => c.trim())
    : []
  const lower = columnNames.map((c) => c.toLowerCase())

  const timeIndex = findColumnIndex(lower, ['time', 'utc time'])
  const latIndex = findColumnIndex(lower, ['lat', 'latitude'])
  const lonIndex = findColumnIndex(lower, ['lon', 'long', 'longitude'])
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
 * Parse a VBO time field.
 * VBO files typically encode time as HH:MM:SS.SSS or as seconds-of-day.
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
  return isNaN(n) ? 0 : n
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
