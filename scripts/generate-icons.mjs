import { deflateSync, crc32 } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const GRADIENT_START = [5, 150, 105] // #059669
const GRADIENT_END = [4, 120, 87] // #047857
const BOLT_COLOR = [255, 255, 255]

// Lightning bolt polygon, normalized to a 0..1 unit square.
const BOLT_POINTS = [
  [0.6, 0.05],
  [0.28, 0.55],
  [0.46, 0.55],
  [0.4, 0.95],
  [0.75, 0.4],
  [0.55, 0.4],
  [0.6, 0.05],
]

function scalePoints(points, factor) {
  return points.map(([x, y]) => [0.5 + (x - 0.5) * factor, 0.5 + (y - 0.5) * factor])
}

// Ray-casting point-in-polygon test.
function isInsidePolygon(px, py, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function pixelColor(x, y, size, boltPoints) {
  const t = (x + y) / (2 * (size - 1))
  const bg = GRADIENT_START.map((c0, i) => Math.round(c0 + (GRADIENT_END[i] - c0) * t))
  const nx = (x + 0.5) / size
  const ny = (y + 0.5) / size
  return isInsidePolygon(nx, ny, boltPoints) ? BOLT_COLOR : bg
}

function crc32Buf(buf) {
  const c = crc32(buf) >>> 0
  const out = Buffer.alloc(4)
  out.writeUInt32BE(c, 0)
  return out
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBuf, data])
  return Buffer.concat([length, typeBuf, data, crc32Buf(crcInput)])
}

function encodePng(size, boltPoints) {
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3)
    raw[rowStart] = 0 // filter type: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelColor(x, y, size, boltPoints)
      const px = rowStart + 1 + x * 3
      raw[px] = r
      raw[px + 1] = g
      raw[px + 2] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const idat = deflateSync(raw)

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function writeIcon(path, size, boltPoints) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, encodePng(size, boltPoints))
  console.log(`wrote ${path} (${size}x${size})`)
}

const OUT_DIR = process.argv[2] ?? 'public/icons'

writeIcon(`${OUT_DIR}/icon-192.png`, 192, scalePoints(BOLT_POINTS, 0.9))
writeIcon(`${OUT_DIR}/icon-512.png`, 512, scalePoints(BOLT_POINTS, 0.9))
writeIcon(`${OUT_DIR}/icon-512-maskable.png`, 512, scalePoints(BOLT_POINTS, 0.72))
writeIcon(`${OUT_DIR}/apple-touch-icon.png`, 180, scalePoints(BOLT_POINTS, 0.9))
