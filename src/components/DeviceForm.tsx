import { useState, useEffect, useMemo } from 'react'
import type { Device } from '../db'
import { calcDevice } from '../db'
import { useStore } from '../store'
import { formatRupiah, parseLocalNumber } from '../utils'

interface Props {
  device?: Device | null
  defaultRoomId?: string
  onClose: () => void
}

const PRESETS = [
  { name: 'Kulkas', watt: 100 },
  { name: 'AC 1 PK', watt: 840 },
  { name: 'AC 0.5 PK', watt: 420 },
  { name: 'TV LED 32"', watt: 50 },
  { name: 'TV LED 55"', watt: 130 },
  { name: 'Lampu LED', watt: 9 },
  { name: 'Mesin Cuci', watt: 350 },
  { name: 'Rice Cooker', watt: 400 },
  { name: 'Setrika', watt: 350 },
  { name: 'Dispenser', watt: 300 },
  { name: 'Kipas Angin', watt: 45 },
  { name: 'Laptop', watt: 65 },
  { name: 'PC Desktop', watt: 300 },
  { name: 'Pompa Air', watt: 250 },
  { name: 'Water Heater', watt: 350 },
  { name: 'Microwave', watt: 1000 },
]

export default function DeviceForm({ device, defaultRoomId, onClose }: Props) {
  const { addDevice, updateDevice, deleteDevice, settings, rooms } = useStore()

  const [roomId, setRoomId] = useState(device?.roomId ?? defaultRoomId ?? rooms[0]?.id ?? '')
  const [name, setName] = useState(device?.name ?? '')
  const [watt, setWatt] = useState(device ? String(device.watt) : '')
  const [hours, setHours] = useState(device ? String(device.hoursPerDay) : '')
  const [qty, setQty] = useState(device ? String(device.quantity) : '1')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [delConfirm, setDelConfirm] = useState(false)
  const [showPresets, setShowPresets] = useState(!device)

  const preview = useMemo(() => {
    const w = parseLocalNumber(watt)
    const h = parseLocalNumber(hours)
    const q = parseInt(qty) || 1
    if (!isNaN(w) && !isNaN(h) && w > 0 && h >= 0 && h <= 24) {
      const fakeDevice = { watt: w, hoursPerDay: h, quantity: q } as Device
      return calcDevice(fakeDevice, settings)
    }
    return null
  }, [watt, hours, qty, settings])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function validate() {
    const e: Record<string, string> = {}
    if (!roomId) e.room = 'Pilih ruangan'
    if (!name.trim()) e.name = 'Nama tidak boleh kosong'
    if (name.trim().length > 50) e.name = 'Maksimal 50 karakter'
    const w = parseLocalNumber(watt)
    if (isNaN(w) || w <= 0) e.watt = 'Masukkan angka lebih dari 0'
    const h = parseLocalNumber(hours)
    if (isNaN(h) || h < 0 || h > 24) e.hours = 'Masukkan antara 0–24'
    const q = parseInt(qty)
    if (isNaN(q) || q < 1) e.qty = 'Minimal 1 unit'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    const data = {
      roomId,
      name: name.trim(),
      watt: parseLocalNumber(watt),
      hoursPerDay: parseLocalNumber(hours),
      quantity: parseInt(qty),
    }
    if (device) {
      await updateDevice(device.id, data)
    } else {
      await addDevice(data)
    }
    onClose()
  }

  async function handleDelete() {
    if (!device) return
    await deleteDevice(device.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-emerald-950 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-emerald-800" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 dark:border-emerald-900">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100" style={{ fontFamily: 'var(--font-display)' }}>
            {device ? 'Edit Perangkat' : 'Tambah Perangkat'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900/40 text-gray-400 dark:text-gray-500 transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Room selector */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block" style={{ fontFamily: 'var(--font-display)' }}>
              Ruangan *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRoomId(r.id)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    roomId === r.id
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'bg-gray-50 dark:bg-emerald-900/20 border-gray-200 dark:border-emerald-800 text-gray-600 dark:text-gray-400 hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  <span>{r.icon}</span> {r.name}
                </button>
              ))}
            </div>
            {errors.room && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.room}</p>}
          </div>

          {/* Presets */}
          {showPresets && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                Preset perangkat
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => { setName(p.name); setWatt(String(p.watt)); setShowPresets(false) }}
                    className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              Nama Perangkat *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Kulkas Samsung"
              maxLength={50}
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40 dark:bg-emerald-950 dark:text-gray-100 ${errors.name ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-emerald-800'}`}
            />
            {errors.name && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* Watt */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              Daya (Watt) *
            </label>
            <input
              type="number"
              value={watt}
              onChange={(e) => setWatt(e.target.value)}
              placeholder="mis. 100"
              min="0"
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40 dark:bg-emerald-950 dark:text-gray-100 font-mono ${errors.watt ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-emerald-800'}`}
            />
            {errors.watt && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.watt}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
                Jam / Hari *
              </label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0–24"
                min="0"
                max="24"
                step="0.5"
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40 dark:bg-emerald-950 dark:text-gray-100 font-mono ${errors.hours ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-emerald-800'}`}
              />
              {errors.hours && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.hours}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
                Jumlah Unit
              </label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="1"
                min="1"
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40 dark:bg-emerald-950 dark:text-gray-100 font-mono ${errors.qty ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-emerald-800'}`}
              />
              {errors.qty && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.qty}</p>}
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Estimasi biaya</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300" style={{ fontFamily: 'var(--font-display)' }}>
                {formatRupiah(preview.monthlyCost)}<span className="text-sm font-medium">/bulan</span>
              </p>
              <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                {preview.monthlyKwh.toFixed(2)} kWh/bulan · {preview.dailyKwh.toFixed(2)} kWh/hari
              </p>
            </div>
          )}
        </div>

        <div className="px-5 pt-3 pb-5 border-t border-gray-100 dark:border-emerald-900 space-y-2">
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
          >
            {device ? 'Simpan Perubahan' : 'Tambah Perangkat'}
          </button>

          {device && (
            delConfirm ? (
              <div className="flex gap-2">
                <button onClick={() => setDelConfirm(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-emerald-800 text-gray-500 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-emerald-900/30 transition-colors">Batal</button>
                <button onClick={handleDelete} className="flex-1 py-3 rounded-2xl bg-red-500 dark:bg-red-600 text-white text-sm font-bold hover:bg-red-600 dark:hover:bg-red-500 transition-colors">Ya, Hapus</button>
              </div>
            ) : (
              <button onClick={() => setDelConfirm(true)} className="w-full py-3 rounded-2xl text-red-500 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                Hapus Perangkat
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
