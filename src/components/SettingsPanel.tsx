import { useRef, useState, type ChangeEvent } from 'react'
import { useStore } from '../store'
import { PLN_TARIFFS } from '../db'
import { formatRupiah } from '../utils'
import { buildExportPayload, downloadJson, exportFilename, validateImportPayload } from '../exportImport'
import DonationModal from './DonationModal'
import { useTheme } from '../theme'

interface Props {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: Props) {
  const { rooms, devices, settings, updateSettings, importData } = useStore()
  const [theme, setTheme] = useTheme()
  const [tariff, setTariff] = useState(String(settings.tariffPerKwh))
  const [days, setDays] = useState(String(settings.daysPerMonth))
  const [ppj, setPpj] = useState(String(settings.ppjPercent))
  const [importError, setImportError] = useState('')
  const [showDonation, setShowDonation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    const t = parseFloat(tariff)
    const d = parseInt(days)
    const p = parseFloat(ppj)
    if (isNaN(t) || t <= 0 || isNaN(d) || d < 1 || d > 31) return
    if (isNaN(p) || p < 0 || p > 10) return
    await updateSettings({ ...settings, tariffPerKwh: t, daysPerMonth: d, ppjPercent: p })
    onClose()
  }

  function handleExport() {
    const payload = buildExportPayload(rooms, devices, settings)
    downloadJson(payload, exportFilename())
  }

  function handleImportClick() {
    setImportError('')
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setImportError('File bukan JSON yang valid.')
      return
    }

    const result = validateImportPayload(parsed)
    if (!result.ok) {
      setImportError(result.error)
      return
    }

    if (!window.confirm('Ini akan mengganti semua data yang ada saat ini. Lanjutkan?')) return

    await importData(result.data)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md max-h-[85vh] bg-white dark:bg-emerald-950 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-emerald-800" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 dark:border-emerald-900 shrink-0">
          <h2
            className="text-base font-bold text-gray-900 dark:text-gray-100"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Pengaturan
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900/40 text-gray-400 dark:text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 overflow-y-auto min-h-0">
          {/* Appearance */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
              Tampilan
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-emerald-900/40">
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                    theme === t
                      ? 'bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t === 'system' ? 'Sistem' : t === 'light' ? 'Terang' : 'Gelap'}
                </button>
              ))}
            </div>
          </div>

          {/* Tariff presets */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
              Preset Golongan PLN
            </label>
            <div className="space-y-1.5">
              {PLN_TARIFFS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setTariff(String(p.value))}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                    parseFloat(tariff) === p.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-emerald-800 hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 text-gray-600 dark:text-gray-400'
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
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              Tarif per kWh (Rp) — manual
            </label>
            <input
              type="number"
              value={tariff}
              onChange={(e) => setTariff(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-emerald-800 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40 dark:bg-emerald-950 dark:text-gray-100 font-mono"
            />
          </div>

          {/* Days per month */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              Hari per Bulan
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              min={1}
              max={31}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-emerald-800 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40 dark:bg-emerald-950 dark:text-gray-100 font-mono"
            />
          </div>

          {/* PPJ */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              PPJ (%)
            </label>
            <input
              type="number"
              value={ppj}
              onChange={(e) => setPpj(e.target.value)}
              min={0}
              max={10}
              step={0.1}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-emerald-800 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40 dark:bg-emerald-950 dark:text-gray-100 font-mono"
            />
          </div>

          {/* Export / Import */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              Cadangkan Data
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="py-3 rounded-xl border border-gray-200 dark:border-emerald-800 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Export Data
              </button>
              <button
                onClick={handleImportClick}
                className="py-3 rounded-xl border border-gray-200 dark:border-emerald-800 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Import Data
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              aria-label="Import Data"
              className="hidden"
              onChange={handleFileSelected}
            />
            {importError && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{importError}</p>}
          </div>

          {/* Donation */}
          <button
            onClick={() => setShowDonation(true)}
            className="w-full py-3 rounded-xl border border-gray-200 dark:border-emerald-800 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ❤️ Traktir Kopi Pengembang
          </button>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="font-bold">Data tersimpan lokal.</span> Semua data hanya ada di browser ini. Ganti browser atau bersihkan data situs → data hilang. Ini adalah <em>estimasi</em>, bukan tagihan resmi PLN.
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-emerald-900 shrink-0">
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>

      {showDonation && <DonationModal onClose={() => setShowDonation(false)} />}
    </div>
  )
}
