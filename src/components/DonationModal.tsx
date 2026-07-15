import { useState } from 'react'
import { COFFEE_OPTIONS, type CoffeeOption } from '../donation'
import { formatRupiah } from '../utils'

interface Props {
  onClose: () => void
}

export default function DonationModal({ onClose }: Props) {
  const [selected, setSelected] = useState<CoffeeOption | null>(null)

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
            Traktir Kopi Pengembang
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900/40 text-gray-400 dark:text-gray-500 transition-colors">✕</button>
        </div>

        {selected === null ? (
          <div className="px-5 py-6 space-y-3">
            {COFFEE_OPTIONS.map((coffee) => (
              <button
                key={coffee.id}
                onClick={() => setSelected(coffee)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-left"
              >
                <div
                  className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `linear-gradient(135deg, ${coffee.gradientFrom}, ${coffee.gradientTo})` }}
                >
                  {coffee.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>
                    {coffee.name}
                  </div>
                  <div className="text-xs text-gray-400">{coffee.subtitle}</div>
                </div>
                <div className="text-sm font-bold text-emerald-600 shrink-0">
                  {formatRupiah(coffee.price)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-5 py-6">
            <button
              onClick={() => setSelected(null)}
              className="text-xs font-semibold text-gray-400 hover:text-emerald-600 transition-colors mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ← Pilih kopi lain
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-2"
                style={{ background: `linear-gradient(135deg, ${selected.gradientFrom}, ${selected.gradientTo})` }}
              >
                {selected.emoji}
              </div>
              <div className="text-sm font-bold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>
                {selected.name}
              </div>
              <div className="text-xs text-gray-400 mb-1">{selected.subtitle}</div>
              <div className="text-base font-bold text-emerald-600">{formatRupiah(selected.price)}</div>
            </div>

            {/* Replace this placeholder block with <img src={qrisImage} alt="QRIS" /> once a real QRIS PNG is available */}
            <div className="flex flex-col items-center">
              <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                  <path d="M4 4h5v5H4V4zm0 11h5v5H4v-5zM15 4h5v5h-5V4z" strokeLinejoin="round" />
                  <path d="M15 15h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3 0h2v2h-2v-2z" />
                </svg>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed max-w-[220px]">
                QRIS belum tersedia — pemilik aplikasi belum menambahkan kode QRIS asli.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
