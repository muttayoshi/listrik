import LZString from 'lz-string'
import type { ExportPayload, ValidationResult } from './exportImport'
import { validateImportPayload } from './exportImport'
import { calcDevice } from './db'

export const SHARE_HASH_PREFIX = '#share='
export const MAX_SHARE_URL_LENGTH = 4000

export interface BuildShareLinkResult {
  url: string
  truncated: boolean
  droppedDeviceCount: number
}

function compressPayload(payload: ExportPayload): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

function buildUrl(origin: string, compressed: string): string {
  return `${origin}${SHARE_HASH_PREFIX}${compressed}`
}

export function buildShareLink(payload: ExportPayload, origin: string): BuildShareLinkResult {
  const full = compressPayload(payload)
  if (full.length <= MAX_SHARE_URL_LENGTH || payload.devices.length === 0) {
    return { url: buildUrl(origin, full), truncated: false, droppedDeviceCount: 0 }
  }

  // Drop whole devices, cheapest monthly cost first, until the compressed link fits.
  const byCostAscending = [...payload.devices].sort(
    (a, b) => calcDevice(a, payload.settings).monthlyCost - calcDevice(b, payload.settings).monthlyCost
  )

  for (let dropped = 1; dropped <= byCostAscending.length; dropped++) {
    const remaining = byCostAscending.slice(dropped)
    const keptRoomIds = new Set(remaining.map((d) => d.roomId))
    const rooms = payload.rooms.filter((r) => keptRoomIds.has(r.id))
    const devices = [...remaining].sort((a, b) => a.createdAt - b.createdAt)
    const compressed = compressPayload({ ...payload, rooms, devices })
    if (compressed.length <= MAX_SHARE_URL_LENGTH || dropped === byCostAscending.length) {
      return { url: buildUrl(origin, compressed), truncated: true, droppedDeviceCount: dropped }
    }
  }

  // Unreachable: the loop above always returns on its last iteration. Kept for TypeScript's
  // control-flow analysis (a function typed to return BuildShareLinkResult on every path).
  return { url: buildUrl(origin, full), truncated: false, droppedDeviceCount: 0 }
}

export function parseShareHash(hash: string): ValidationResult {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) {
    return { ok: false, error: 'Link tidak valid.' }
  }

  const compressed = hash.slice(SHARE_HASH_PREFIX.length)
  let json: string
  try {
    json = LZString.decompressFromEncodedURIComponent(compressed) ?? ''
  } catch {
    return { ok: false, error: 'Link rusak atau tidak bisa dibaca.' }
  }
  if (!json) {
    return { ok: false, error: 'Link rusak atau tidak bisa dibaca.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Link rusak atau tidak bisa dibaca.' }
  }

  return validateImportPayload(parsed)
}
