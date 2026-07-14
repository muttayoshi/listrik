import { useState } from 'react'
import { useStore } from '../store'
import { PLN_TARIFFS } from '../db'
import { formatRupiah } from '../utils'

interface Props {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: Props) {
  const { settings, updateSettings } = useStore()
  const [tariff, setTariff] = useState(String(settings.tariffPerKwh))
  const [days, setDays] = useState(String(settings.daysPerMonth))

  async function handleSave() {
    const t = parseFloat(tariff)
    const d = parseInt(days)
    if (isNaN(t) || t <= 0 || isNaN(d) || d < 1 || d > 31) return
    await updateSettings({ ...settings, tariffPerKwh: t, daysPerMonth: d })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
          <h2
            className="text-base font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Pengaturan
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Tariff presets */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
              Preset Golongan PLN
            </label>
            <div className="space-y-1.5">
              {PLN_TARIFFS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setTariff(String(p.value))}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                    parseFloat(tariff) === p.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50 text-gray-600'
                  }`}
                >
                  <span className="font-medium">{p.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                    {formatRupiah(p.value)}/kWh
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual tariff */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              Tarif per kWh (Rp) — manual
            </label>
            <input
              type="number"
              value={tariff}
              onChange={(e) => setTariff(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 font-mono"
            />
          </div>

          {/* Days per month */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              Hari per Bulan
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              min={1}
              max={31}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 font-mono"
            />
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-700" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="font-bold">Data tersimpan lokal.</span> Semua data hanya ada di browser ini. Ganti browser atau bersihkan data situs → data hilang. Ini adalah <em>estimasi</em>, bukan tagihan resmi PLN.
            </p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  )
}
