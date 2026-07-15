import { useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'listrikku-theme'

export function getStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage unavailable (e.g. Safari private mode) — fall back to 'system'
  }
  return 'system'
}

function storeTheme(theme: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage unavailable — preference only persists for this session
  }
}

function prefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveEffectiveTheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme === 'system') return prefersDark() ? 'dark' : 'light'
  return theme
}

export function applyTheme(theme: ThemePreference) {
  const effective = resolveEffectiveTheme(theme)
  document.documentElement.classList.toggle('dark', effective === 'dark')
}

export function useTheme(): [ThemePreference, (t: ThemePreference) => void] {
  const [theme, setThemeState] = useState<ThemePreference>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange() {
      applyTheme('system')
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [theme])

  function setTheme(next: ThemePreference) {
    storeTheme(next)
    setThemeState(next)
  }

  return [theme, setTheme]
}
