import type { Room, Device, Settings } from './db'

export interface ExportPayload {
  schemaVersion: 1
  exportedAt: string
  rooms: Room[]
  devices: Device[]
  settings: Settings
}

export function buildExportPayload(rooms: Room[], devices: Device[], settings: Settings): ExportPayload {
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), rooms, devices, settings }
}

export function exportFilename(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `listrikku-backup-${y}-${m}-${d}.json`
}

export function downloadJson(payload: ExportPayload, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export type ValidationResult = { ok: true; data: ExportPayload } | { ok: false; error: string }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isValidRoom(v: unknown): v is Room {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.icon === 'string' &&
    typeof v.order === 'number' &&
    typeof v.createdAt === 'number'
  )
}

function isValidDevice(v: unknown): v is Device {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.roomId === 'string' &&
    typeof v.name === 'string' &&
    typeof v.watt === 'number' &&
    typeof v.hoursPerDay === 'number' &&
    typeof v.quantity === 'number' &&
    typeof v.createdAt === 'number' &&
    typeof v.updatedAt === 'number'
  )
}

function isValidSettings(v: unknown): v is Omit<Settings, 'id'> {
  return (
    isRecord(v) &&
    typeof v.tariffPerKwh === 'number' &&
    typeof v.daysPerMonth === 'number' &&
    typeof v.ppjPercent === 'number'
  )
}

export function validateImportPayload(raw: unknown): ValidationResult {
  if (!isRecord(raw)) return { ok: false, error: 'File bukan objek JSON yang valid.' }
  if (raw.schemaVersion !== 1) return { ok: false, error: 'Versi skema file tidak didukung.' }
  if (typeof raw.exportedAt !== 'string') return { ok: false, error: 'Field exportedAt tidak valid.' }

  if (!Array.isArray(raw.rooms) || !raw.rooms.every(isValidRoom)) {
    return { ok: false, error: 'Data ruangan tidak valid.' }
  }
  const rooms = raw.rooms as Room[]

  if (!Array.isArray(raw.devices) || !raw.devices.every(isValidDevice)) {
    return { ok: false, error: 'Data perangkat tidak valid.' }
  }
  const devices = raw.devices as Device[]

  if (!isValidSettings(raw.settings)) {
    return { ok: false, error: 'Data pengaturan tidak valid.' }
  }
  const settings: Settings = { id: 1, ...raw.settings }

  const roomIds = new Set(rooms.map((r) => r.id))
  if (devices.some((d) => !roomIds.has(d.roomId))) {
    return { ok: false, error: 'Ada perangkat yang menunjuk ke ruangan yang tidak ada di file.' }
  }

  return { ok: true, data: { schemaVersion: 1, exportedAt: raw.exportedAt, rooms, devices, settings } }
}
