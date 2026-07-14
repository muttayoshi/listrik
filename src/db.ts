import Dexie, { type Table } from 'dexie'

export interface Room {
  id: string
  name: string
  icon: string
  order: number
  createdAt: number
}

export interface Device {
  id: string
  roomId: string
  name: string
  watt: number
  hoursPerDay: number
  quantity: number
  createdAt: number
  updatedAt: number
}

export interface Settings {
  id: 1
  tariffPerKwh: number
  daysPerMonth: number
  ppjPercent: number
}

export const PLN_TARIFFS = [
  { label: 'R-1/TR 450 VA (subsidi)', value: 415 },
  { label: 'R-1/TR 900 VA (subsidi)', value: 605 },
  { label: 'R-1/TR 900 VA (RTM)', value: 1352 },
  { label: 'R-1/TR 1.300 VA', value: 1444.7 },
  { label: 'R-1/TR 2.200 VA', value: 1444.7 },
  { label: 'R-2/TR 3.500–5.500 VA', value: 1699.53 },
  { label: 'R-3/TR 6.600 VA+', value: 1699.53 },
]

export const ROOM_PRESETS = [
  { name: 'Ruang Tamu', icon: '🛋️' },
  { name: 'Kamar Tidur', icon: '🛏️' },
  { name: 'Dapur', icon: '🍳' },
  { name: 'Kamar Mandi', icon: '🚿' },
  { name: 'Ruang Keluarga', icon: '📺' },
  { name: 'Ruang Kerja', icon: '💻' },
  { name: 'Garasi', icon: '🚗' },
  { name: 'Teras / Balkon', icon: '🌿' },
  { name: 'Gudang', icon: '📦' },
]

class ListrikkuDB extends Dexie {
  rooms!: Table<Room>
  devices!: Table<Device>
  settings!: Table<Settings>

  constructor() {
    super('listrikku')
    this.version(1).stores({
      devices: 'id, createdAt',
      settings: 'id',
    })
    this.version(2).stores({
      rooms: 'id, order, createdAt',
      devices: 'id, roomId, createdAt',
      settings: 'id',
    })
  }
}

export const db = new ListrikkuDB()

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(1)
  return s ?? { id: 1, tariffPerKwh: 1444.7, daysPerMonth: 30, ppjPercent: 0 }
}

export async function saveSettings(s: Settings) {
  await db.settings.put(s)
}

export function calcDevice(d: Device, settings: Settings) {
  const dailyKwh = (d.watt * d.quantity * d.hoursPerDay) / 1000
  const monthlyKwh = dailyKwh * settings.daysPerMonth
  const monthlyCost = monthlyKwh * settings.tariffPerKwh * (1 + settings.ppjPercent / 100)
  return { dailyKwh, monthlyKwh, monthlyCost }
}
