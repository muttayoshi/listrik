import { DONATION_PLATFORMS } from '../donation'

interface Props {
  onClose: () => void
}

export default function DonationModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Traktir Kopi Pengembang
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
        </div>

        <div className="px-5 py-6">
          {DONATION_PLATFORMS.length === 0 ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="text-4xl mb-3">❤️</div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Tautan donasi belum ditambahkan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {DONATION_PLATFORMS.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>
                    {platform.name}
                  </span>
                  {platform.qrImage && (
                    <img src={platform.qrImage} alt={`QR ${platform.name}`} className="w-10 h-10 rounded-lg" />
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
