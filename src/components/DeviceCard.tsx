import { useMemo } from 'react'
import type { Device } from '../db'
import { calcDevice } from '../db'
import type { Settings } from '../db'
import { formatRupiah, formatKwh } from '../utils'

interface Props {
  device: Device
  settings: Settings
  onEdit: (d: Device) => void
}

export default function DeviceCard({ device, settings, onEdit }: Props) {
  const { monthlyKwh, monthlyCost } = useMemo(
    () => calcDevice(device, settings),
    [device, settings]
  )

  const intensity = Math.min(monthlyCost / 300000, 1)
  const hue = Math.round(140 - intensity * 80) // green → orange

  return (
    <button
      onClick={() => onEdit(device)}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: `hsl(${hue}, 75%, 48%)` }}
            />
            <p
              className="font-semibold text-gray-900 truncate text-sm"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {device.name}
            </p>
            {device.quantity > 1 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                ×{device.quantity}
              </span>
            )}
          </div>
          <div className="flex gap-3 text-xs text-gray-400" style={{ fontFamily: 'var(--font-mono)' }}>
            <span>{device.watt} W</span>
            <span>·</span>
            <span>{device.hoursPerDay} jam/hari</span>
            <span>·</span>
            <span>{formatKwh(monthlyKwh)} kWh</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-display)' }}>
            {formatRupiah(monthlyCost)}
          </p>
          <p className="text-xs text-gray-400">/bulan</p>
        </div>
      </div>
      <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(3, intensity * 100)}%`,
            backgroundColor: `hsl(${hue}, 70%, 52%)`,
          }}
        />
      </div>
    </button>
  )
}
