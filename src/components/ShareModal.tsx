import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { buildExportPayload } from '../exportImport'
import { buildShareLink } from '../share'

interface Props {
  onClose: () => void
}

export default function ShareModal({ onClose }: Props) {
  const { rooms, devices, settings } = useStore()
  const [copied, setCopied] = useState(false)

  const result = useMemo(
    () => buildShareLink(buildExportPayload(rooms, devices, settings), window.location.origin + window.location.pathname),
    [rooms, devices, settings]
  )

  async function handleCopy() {
    await navigator.clipboard.writeText(result.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleNativeShare() {
    await navigator.share({ title: 'Data Listrikku', url: result.url })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-sm bg-white dark:bg-emerald-950 rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-emerald-800" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 dark:border-emerald-900">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100" style={{ fontFamily: 'var(--font-display)' }}>
            Bagikan Data
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900/40 text-gray-400 dark:text-gray-500 transition-colors">✕</button>
        </div>

        <div className="px-5 py-5">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 leading-relaxed">
            Siapa pun yang membuka link ini bisa melihat seluruh data ruangan, perangkat, dan hasil hitungan yang sudah kamu buat.
          </p>

          {result.truncated && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mb-3 text-xs text-amber-700 dark:text-amber-300">
              {result.droppedDeviceCount} perangkat tidak disertakan karena link jadi terlalu panjang. Perangkat dengan biaya bulanan terkecil yang dihilangkan duluan.
            </div>
          )}

          <input
            readOnly
            aria-label="Link Share"
            value={result.url}
            onFocus={(e) => e.target.select()}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-emerald-800 dark:bg-emerald-950 text-xs text-gray-600 dark:text-gray-300 mb-3"
            style={{ fontFamily: 'var(--font-mono)' }}
          />

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-emerald-800 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 transition-colors"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {copied ? 'Tersalin!' : 'Salin Link'}
            </button>
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button
                onClick={handleNativeShare}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
              >
                Bagikan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
