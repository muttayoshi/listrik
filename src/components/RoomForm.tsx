import { useState } from 'react'
import type { Room } from '../db'
import { ROOM_PRESETS } from '../db'
import { useStore } from '../store'

interface Props {
  room?: Room | null
  onClose: (room?: Room) => void
}

const ICONS = ['🛋️','🛏️','🍳','🚿','📺','💻','🚗','🌿','📦','🏠','🪴','🎮','🔧','🧺','❄️','💡']

export default function RoomForm({ room, onClose }: Props) {
  const { addRoom, updateRoom, deleteRoom } = useStore()
  const [name, setName] = useState(room?.name ?? '')
  const [icon, setIcon] = useState(room?.icon ?? '🏠')
  const [error, setError] = useState('')
  const [delConfirm, setDelConfirm] = useState(false)

  async function handleSave() {
    if (!name.trim()) { setError('Nama ruangan tidak boleh kosong'); return }
    if (name.trim().length > 40) { setError('Maksimal 40 karakter'); return }
    if (room) {
      await updateRoom(room.id, { name: name.trim(), icon })
      onClose()
    } else {
      const newRoom = await addRoom({ name: name.trim(), icon })
      onClose(newRoom)
    }
  }

  async function handleDelete() {
    if (!room) return
    await deleteRoom(room.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onClose()} />
      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            {room ? 'Edit Ruangan' : 'Tambah Ruangan'}
          </h2>
          <button onClick={() => onClose()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Presets */}
          {!room && (
            <div>
              <p className="text-xs text-gray-400 mb-2 font-medium" style={{ fontFamily: 'var(--font-display)' }}>Preset ruangan</p>
              <div className="flex flex-wrap gap-1.5">
                {ROOM_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => { setName(p.name); setIcon(p.icon) }}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      name === p.name
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    <span>{p.icon}</span> {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block" style={{ fontFamily: 'var(--font-display)' }}>
              Nama Ruangan *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              placeholder="mis. Kamar Tidur Utama"
              maxLength={40}
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors ${error ? 'border-red-400' : 'border-gray-200'}`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Icon picker */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2" style={{ fontFamily: 'var(--font-display)' }}>Ikon</p>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-9 h-9 text-lg rounded-xl border-2 transition-all flex items-center justify-center ${
                    icon === ic
                      ? 'border-emerald-500 bg-emerald-50 scale-110'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-2">
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
          >
            {room ? 'Simpan Perubahan' : 'Buat Ruangan'}
          </button>

          {room && (
            delConfirm ? (
              <div className="flex gap-2">
                <button onClick={() => setDelConfirm(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors">Batal</button>
                <button onClick={handleDelete} className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">Ya, Hapus Ruangan</button>
              </div>
            ) : (
              <button onClick={() => setDelConfirm(true)} className="w-full py-3 rounded-2xl text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                Hapus Ruangan & Semua Perangkatnya
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
