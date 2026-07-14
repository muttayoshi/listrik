import { useMemo } from 'react'
import { useStore } from '../store'
import { calcDevice } from '../db'
import { formatRupiah, formatKwh } from '../utils'

export default function SummaryCards() {
  const { devices, settings, rooms } = useStore()

  const totals = useMemo(() => {
    return devices.reduce(
      (acc, d) => {
        const { dailyKwh, monthlyKwh, monthlyCost } = calcDevice(d, settings)
        acc.dailyKwh += dailyKwh
        acc.monthlyKwh += monthlyKwh
        acc.monthlyCost += monthlyCost
        return acc
      },
      { dailyKwh: 0, monthlyKwh: 0, monthlyCost: 0 }
    )
  }, [devices, settings])

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div
        className="col-span-2 rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 60%, #064e3b 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 80% 20%, #34d399 0%, transparent 60%), radial-gradient(circle at 20% 80%, #6ee7b7 0%, transparent 50%)',
          }}
        />
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

      <div className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-sm">
        <p className="text-xs text-gray-400 font-medium mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Konsumsi Harian
        </p>
        <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>
          {formatKwh(totals.dailyKwh)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">kWh/hari</p>
      </div>

      <div className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-sm">
        <p className="text-xs text-gray-400 font-medium mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Konsumsi Bulanan
        </p>
        <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>
          {formatKwh(totals.monthlyKwh)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">kWh/bulan</p>
      </div>
    </div>
  )
}
