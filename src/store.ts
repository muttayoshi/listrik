import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { db, type Device, type Room, type Settings, getSettings, saveSettings } from './db'

interface AppState {
  rooms: Room[]
  devices: Device[]
  settings: Settings
  loaded: boolean
  load: () => Promise<void>
  // Rooms
  addRoom: (r: Pick<Room, 'name' | 'icon'>) => Promise<Room>
  updateRoom: (id: string, r: Partial<Pick<Room, 'name' | 'icon'>>) => Promise<void>
  deleteRoom: (id: string) => Promise<void>
  // Devices
  addDevice: (d: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateDevice: (id: string, d: Partial<Omit<Device, 'id' | 'createdAt'>>) => Promise<void>
  deleteDevice: (id: string) => Promise<void>
  // Settings
  updateSettings: (s: Settings) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  rooms: [],
  devices: [],
  settings: { id: 1, tariffPerKwh: 1444.7, daysPerMonth: 30, ppjPercent: 0 },
  loaded: false,

  load: async () => {
    const [rooms, devices, settings] = await Promise.all([
      db.rooms.orderBy('order').toArray(),
      db.devices.orderBy('createdAt').toArray(),
      getSettings(),
    ])
    set({ rooms, devices, settings, loaded: true })
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist()
    }
  },

  addRoom: async ({ name, icon }) => {
    const maxOrder = get().rooms.reduce((m, r) => Math.max(m, r.order), -1)
    const room: Room = { id: uuid(), name, icon, order: maxOrder + 1, createdAt: Date.now() }
    await db.rooms.add(room)
    set((s) => ({ rooms: [...s.rooms, room] }))
    return room
  },

  updateRoom: async (id, data) => {
    await db.rooms.update(id, data)
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...data } : r)) }))
  },

  deleteRoom: async (id) => {
    await db.transaction('rw', db.rooms, db.devices, async () => {
      await db.devices.where('roomId').equals(id).delete()
      await db.rooms.delete(id)
    })
    set((s) => ({
      rooms: s.rooms.filter((r) => r.id !== id),
      devices: s.devices.filter((d) => d.roomId !== id),
    }))
  },

  addDevice: async (data) => {
    const now = Date.now()
    const device: Device = { ...data, id: uuid(), createdAt: now, updatedAt: now }
    await db.devices.add(device)
    set((s) => ({ devices: [...s.devices, device] }))
  },

  updateDevice: async (id, data) => {
    const updatedAt = Date.now()
    await db.devices.update(id, { ...data, updatedAt })
    set((s) => ({
      devices: s.devices.map((d) => (d.id === id ? { ...d, ...data, updatedAt } : d)),
    }))
  },

  deleteDevice: async (id) => {
    await db.devices.delete(id)
    set((s) => ({ devices: s.devices.filter((d) => d.id !== id) }))
  },

  updateSettings: async (settings) => {
    await saveSettings(settings)
    set({ settings })
  },
}))
