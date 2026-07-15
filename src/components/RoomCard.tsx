import { useState, useMemo } from 'react'
import type { Room, Device, Settings } from '../db'
import { calcDevice } from '../db'
import { formatRupiah, formatKwh } from '../utils'
import DeviceCard from './DeviceCard'

interface Props {
  room: Room
  devices: Device[]
  settings: Settings
  onAddDevice: (roomId: string) => void
  onEditDevice: (device: Device) => void
  onEditRoom: (room: Room) => void
}

export default function RoomCard({ room, devices, settings, onAddDevice, onEditDevice, onEditRoom }: Props) {
  const [open, setOpen] = useState(true)

  const roomTotals = useMemo(() => {
    return devices.reduce(
      (acc, d) => {
        const { monthlyKwh, monthlyCost } = calcDevice(d, settings)
        acc.monthlyKwh += monthlyKwh
        acc.monthlyCost += monthlyCost
        return acc
      },
      { monthlyKwh: 0, monthlyCost: 0 }
    )
  }, [devices, settings])

  const sorted = [...devices].sort((a, b) => {
    const ca = (a.watt * a.quantity * a.hoursPerDay) / 1000
    const cb = (b.watt * b.quantity * b.hoursPerDay) / 1000
    return cb - ca
  })

  return (
    <div className="bg-white dark:bg-emerald-950 rounded-2xl border border-gray-100 dark:border-emerald-900 shadow-sm overflow-hidden">
      {/* Room header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/60 dark:hover:bg-emerald-900/30 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-xl leading-none">{room.icon}</span>
        <div className="flex-1 text-left min-w-0">
          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {room.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
            {devices.length} perangkat · {formatKwh(roomTotals.monthlyKwh)} kWh
          </p>
        </div>
        <div className="text-right flex-shrink-0 mr-1">
          <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm" style={{ fontFamily: 'var(--font-display)' }}>
            {formatRupiah(roomTotals.monthlyCost)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">/bulan</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEditRoom(room) }}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900/40 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors flex-shrink-0"
          aria-label="Edit ruangan"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <svg
          width="14" height="14"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round"
          className={`text-gray-300 dark:text-gray-600 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Device list */}
      {open && (
        <div className="border-t border-gray-100 dark:border-emerald-900">
          {sorted.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">Belum ada perangkat di ruangan ini</p>
              <button
                onClick={() => onAddDevice(room.id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tambah perangkat
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {sorted.map((d) => (
                <DeviceCard key={d.id} device={d} settings={settings} onEdit={onEditDevice} />
              ))}
              <button
                onClick={() => onAddDevice(room.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tambah perangkat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
