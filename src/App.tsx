import { useEffect, useState } from 'react'
import { useStore } from './store'
import { useTheme } from './theme'
import type { Device, Room } from './db'
import SummaryCards from './components/SummaryCards'
import RoomCard from './components/RoomCard'
import RoomForm from './components/RoomForm'
import DeviceForm from './components/DeviceForm'
import SettingsPanel from './components/SettingsPanel'
import InstallBanner from './components/InstallBanner'
import DonationModal from './components/DonationModal'
import ShareModal from './components/ShareModal'
import ShareView from './components/ShareView'
import { SHARE_HASH_PREFIX } from './share'

type Modal =
  | { type: 'addRoom' }
  | { type: 'editRoom'; room: Room }
  | { type: 'addDevice'; roomId: string }
  | { type: 'editDevice'; device: Device }
  | { type: 'settings' }
  | { type: 'donation' }
  | { type: 'share' }
  | null

export default function App() {
  const { rooms, devices, settings, loaded, load } = useStore()
  const [theme, setTheme] = useTheme()
  const [modal, setModal] = useState<Modal>(null)
  const [fabOpen, setFabOpen] = useState(false)
  const [shareHash, setShareHash] = useState(() =>
    location.hash.startsWith(SHARE_HASH_PREFIX) ? location.hash : null
  )

  useEffect(() => { load() }, [])

  if (shareHash) {
    return (
      <ShareView
        hash={shareHash}
        onExit={() => {
          history.replaceState(null, '', location.pathname + location.search)
          setShareHash(null)
        }}
      />
    )
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400 dark:text-gray-500" style={{ fontFamily: 'var(--font-display)' }}>Memuat…</p>
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
        className="sticky top-0 z-40 backdrop-blur-md border-b border-emerald-100/60 dark:border-emerald-800/60 bg-[rgba(248,255,254,0.9)] dark:bg-[rgba(13,42,31,0.85)]"
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
            >
              ⚡
            </div>
            <span className="font-extrabold text-gray-900 dark:text-gray-100 text-base tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Hitung Pemakaian Listrik
            </span>
          </div>
          <div className="flex items-center gap-1">
            {rooms.length > 0 && (
              <button
                onClick={() => setModal({ type: 'share' })}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                aria-label="Bagikan Data"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setModal({ type: 'settings' })}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              aria-label="Pengaturan"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
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
              <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
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
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-emerald-800 text-sm font-semibold text-gray-400 dark:text-gray-500 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 transition-all"
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
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ❤️ Traktir Kopi Pengembang
          </button>
        </footer>
      </main>

      {/* FAB — mobile only; desktop uses the inline "Tambah Ruangan" button in the list */}
      {rooms.length > 0 && (
        <>
          {fabOpen && (
            <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />
          )}
          <div className="fixed bottom-6 right-4 sm:hidden z-30">
            <button
              onClick={() => {
                setFabOpen(false)
                setModal({ type: 'addRoom' })
              }}
              className={`absolute bottom-32 right-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-emerald-950 text-gray-700 dark:text-gray-300 font-semibold text-sm shadow-lg whitespace-nowrap transition-all duration-200 ${
                fabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Ruangan
            </button>
            <button
              onClick={() => {
                setFabOpen(false)
                setModal({ type: 'addDevice', roomId: rooms[0].id })
              }}
              className={`absolute bottom-16 right-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-emerald-950 text-gray-700 dark:text-gray-300 font-semibold text-sm shadow-lg whitespace-nowrap transition-all duration-200 ${
                fabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Perangkat
            </button>
            <button
              onClick={() => setFabOpen((o) => !o)}
              aria-label={fabOpen ? 'Tutup menu tambah' : 'Tambah'}
              className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`}
              >
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </>
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
        <SettingsPanel onClose={() => setModal(null)} theme={theme} setTheme={setTheme} />
      )}
      {modal?.type === 'donation' && (
        <DonationModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'share' && (
        <ShareModal onClose={() => setModal(null)} />
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
      <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Mulai dari ruangan
      </h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mb-6 leading-relaxed">
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
