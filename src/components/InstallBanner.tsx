import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'installBannerDismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === '1',
  )

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  if (dismissed || isStandalone()) return null

  const showIOSInstructions = isIOS() && !deferredPrompt
  if (!deferredPrompt && !showIOSInstructions) return null

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-xs text-emerald-800 leading-relaxed" style={{ fontFamily: 'var(--font-display)' }}>
          {showIOSInstructions
            ? <>Pasang di layar utama: ketuk <strong>Bagikan</strong> lalu <strong>Tambah ke Layar Utama</strong>.</>
            : <>Pasang Listrikku sebagai aplikasi untuk akses lebih cepat.</>}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {!showIOSInstructions && (
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl text-white font-bold text-xs whitespace-nowrap transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)', fontFamily: 'var(--font-display)' }}
            >
              Pasang aplikasi
            </button>
          )}
          <button
            onClick={handleDismiss}
            aria-label="Tutup"
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-emerald-100 text-emerald-700 transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
