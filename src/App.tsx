import { useEffect, useState } from 'react'
import { useStore } from './store'
import type { Device, Room } from './db'
import SummaryCards from './components/SummaryCards'
import RoomCard from './components/RoomCard'
import RoomForm from './components/RoomForm'
import DeviceForm from './components/DeviceForm'
import SettingsPanel from './components/SettingsPanel'
import InstallBanner from './components/InstallBanner'
import DonationModal from './components/DonationModal'

type Modal =
  | { type: 'addRoom' }
  | { type: 'editRoom'; room: Room }
  | { type: 'addDevice'; roomId: string }
  | { type: 'editDevice'; device: Device }
  | { type: 'settings' }
  | { type: 'donation' }
  | null

export default function App() {
  const { rooms, devices, settings, loaded, load } = useStore()
  const [modal, setModal] = useState<Modal>(null)

  useEffect(() => { load() }, [])

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-display)' }}>Memuat…</p>
        </div>
      </div>
    )
  }

  function handleRoomCreated(room?: Room) {
    setModal(null)
    if (room) {
      // Auto-open add device for the new room
      setModal({ type: 'addDevice', roomId: room.id })
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-emerald-100/60"
        style={{ background: 'rgba(248, 255, 254, 0.9)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
            >
              ⚡
            </div>
            <span className="font-extrabold text-gray-900 text-base tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Hitung Pemakaian Listrik
            </span>
          </div>
          <button
            onClick={() => setModal({ type: 'settings' })}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
            aria-label="Pengaturan"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <InstallBanner />

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 pt-5 pb-28">
        {rooms.length > 0 && <SummaryCards />}

        {rooms.length === 0 ? (
          <EmptyState onAddRoom={() => setModal({ type: 'addRoom' })} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
                Ruangan ({rooms.length})
              </h2>
            </div>

            <div className="space-y-3">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  devices={devices.filter((d) => d.roomId === room.id)}
                  settings={settings}
                  onAddDevice={(roomId) => setModal({ type: 'addDevice', roomId })}
                  onEditDevice={(device) => setModal({ type: 'editDevice', device })}
                  onEditRoom={(room) => setModal({ type: 'editRoom', room })}
                />
              ))}

              {/* Add room inline button */}
              <button
                onClick={() => setModal({ type: 'addRoom' })}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/40 transition-all"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tambah Ruangan
              </button>
            </div>
          </>
        )}

        <footer className="mt-8 text-center">
          <button
            onClick={() => setModal({ type: 'donation' })}
            className="text-xs text-gray-400 hover:text-emerald-600 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ❤️ Dukung Pengembang
          </button>
        </footer>
      </main>

      {/* FAB — mobile only; desktop uses the inline "Tambah Ruangan" button in the list */}
      {rooms.length > 0 && (
        <div className="fixed bottom-6 right-4 sm:hidden z-30">
          <button
            onClick={() => setModal({ type: 'addRoom' })}
            className="flex items-center gap-2.5 px-5 py-3.5 rounded-full text-white font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Ruangan
          </button>
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'addRoom' && (
        <RoomForm onClose={handleRoomCreated} />
      )}
      {modal?.type === 'editRoom' && (
        <RoomForm room={modal.room} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'addDevice' && (
        <DeviceForm defaultRoomId={modal.roomId} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'editDevice' && (
        <DeviceForm device={modal.device} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'settings' && (
        <SettingsPanel onClose={() => setModal(null)} />
      )}
      {modal?.type === 'donation' && (
        <DonationModal onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function EmptyState({ onAddRoom }: { onAddRoom: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5"
        style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}
      >
        🏠
      </div>
      <h3 className="text-lg font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Mulai dari ruangan
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mb-6 leading-relaxed">
        Tambahkan ruangan terlebih dahulu — dapur, kamar tidur, ruang tamu — lalu isi perangkat elektronik di tiap ruangan.
      </p>
      <button
        onClick={onAddRoom}
        className="px-6 py-3 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
      >
        Tambah Ruangan Pertama
      </button>
    </div>
  )
}
