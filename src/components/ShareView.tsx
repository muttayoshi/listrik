import { useMemo } from 'react'
import { useStore } from '../store'
import { calcDevice } from '../db'
import { formatRupiah, formatKwh } from '../utils'
import { parseShareHash } from '../share'

interface Props {
  hash: string
  onExit: () => void
}

export default function ShareView({ hash, onExit }: Props) {
  const { importData } = useStore()
  const result = useMemo(() => parseShareHash(hash), [hash])

  async function handleImport() {
    if (!result.ok) return
    if (!window.confirm('Ini akan mengganti semua data yang ada saat ini. Lanjutkan?')) return
    await importData(result.data)
    onExit()
  }

  if (!result.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--color-surface)' }}>
        <div className="text-center max-w-xs">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-gray-500 mb-4">{result.error}</p>
          <button onClick={onExit} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            Kembali ke aplikasi
          </button>
        </div>
      </div>
    )
  }

  const { rooms, devices, settings } = result.data
  const totals = devices.reduce(
    (acc, d) => {
      const { monthlyKwh, monthlyCost } = calcDevice(d, settings)
      acc.monthlyKwh += monthlyKwh
      acc.monthlyCost += monthlyCost
      return acc
    },
    { monthlyKwh: 0, monthlyCost: 0 }
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-emerald-100/60"
        style={{ background: 'rgba(248, 255, 254, 0.9)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <span className="font-extrabold text-gray-900 text-base tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            👁️ Pratinjau Data Dibagikan
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 pb-28">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-5 text-xs text-amber-700">
          Ini pratinjau data yang dibagikan orang lain — bukan data kamu sendiri.
        </div>

        <div
          className="rounded-2xl p-5 text-white relative overflow-hidden mb-5"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 60%, #064e3b 100%)' }}
        >
          <p className="text-xs font-medium uppercase tracking-widest opacity-70 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Estimasi Biaya / Bulan
          </p>
          <p className="text-3xl font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {formatRupiah(totals.monthlyCost)}
          </p>
          <p className="text-xs opacity-60 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            {formatKwh(totals.monthlyKwh)} kWh/bulan
          </p>
          <p className="text-xs opacity-50 mt-2">
            {rooms.length} ruangan · {devices.length} perangkat · tarif {formatRupiah(settings.tariffPerKwh)}/kWh
          </p>
        </div>

        <div className="space-y-3">
          {rooms.map((room) => {
            const roomDevices = devices.filter((d) => d.roomId === room.id)
            const roomCost = roomDevices.reduce((sum, d) => sum + calcDevice(d, settings).monthlyCost, 0)
            return (
              <div key={room.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
                  <span className="text-xl leading-none">{room.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-display)' }}>{room.name}</p>
                    <p className="text-xs text-gray-400">{roomDevices.length} perangkat</p>
                  </div>
                  <p className="font-bold text-emerald-700 text-sm" style={{ fontFamily: 'var(--font-display)' }}>{formatRupiah(roomCost)}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {roomDevices.map((device) => {
                    const { monthlyKwh, monthlyCost } = calcDevice(device, settings)
                    return (
                      <div key={device.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{device.name}</p>
                          <p className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-mono)' }}>
                            {device.watt} W · {device.hoursPerDay} jam/hari · {formatKwh(monthlyKwh)} kWh
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatRupiah(monthlyCost)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button
            onClick={onExit}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Tutup Pratinjau
          </button>
          <button
            onClick={handleImport}
            className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
          >
            Import ke Perangkat Ini
          </button>
        </div>
      </div>
    </div>
  )
}
