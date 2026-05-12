'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

export type Appearance = 'light' | 'dark' | 'system'
export type ResolvedAppearance = 'light' | 'dark'

interface AppearanceContextValue {
  appearance: Appearance
  resolvedAppearance: ResolvedAppearance
  setAppearance: (value: Appearance) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

const STORAGE_KEY = 'appearance'

function resolveSystemAppearance(): ResolvedAppearance {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function applyClass(resolved: ResolvedAppearance) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

interface AppearanceProviderProps {
  children: ReactNode
  /**
   * Initial preference from the server (the authed user's stored appearance, if any).
   * Used on mount when localStorage is empty so the user's DB-persisted preference
   * carries across devices. localStorage takes precedence once set on a given device.
   */
  initialAppearance?: Appearance | null
  /** Whether the visitor is authenticated. Controls whether setAppearance also calls the API. */
  isAuthed?: boolean
}

export function AppearanceProvider({ children, initialAppearance, isAuthed = false }: AppearanceProviderProps) {
  // Initial state is 'system' on the server to match the pre-hydration default
  // applied by components/AppearanceBootScript.tsx. The first effect below syncs
  // to localStorage on mount.
  const [appearance, setAppearanceState] = useState<Appearance>('system')
  const [resolvedAppearance, setResolvedAppearance] = useState<ResolvedAppearance>('light')

  // Sync from localStorage on mount. If localStorage is empty, fall back to the
  // server-provided preference (so a returning user on a new device sees their
  // saved preference). Once a value is in localStorage, it wins.
  useEffect(() => {
    let next: Appearance | null = null
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          next = stored
        }
      } catch {
        // localStorage unavailable
      }
    }
    if (!next && initialAppearance) {
      next = initialAppearance
      // Mirror server preference into localStorage so the boot script can
      // pick it up on subsequent visits and avoid the post-hydration shift.
      try {
        window.localStorage.setItem(STORAGE_KEY, initialAppearance)
      } catch {
        // ignore
      }
    }
    if (next) {
      setAppearanceState(next)
    }
  }, [initialAppearance])

  // Recompute resolved appearance whenever the preference changes or the system preference changes.
  useEffect(() => {
    function compute() {
      const next = appearance === 'system' ? resolveSystemAppearance() : appearance
      setResolvedAppearance(next)
      applyClass(next)
    }
    compute()

    if (appearance !== 'system') return
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', compute)
    return () => media.removeEventListener('change', compute)
  }, [appearance])

  const setAppearance = useCallback((value: Appearance) => {
    setAppearanceState(value)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // localStorage unavailable; in-memory state will still drive the class
    }
    if (isAuthed) {
      // Fire-and-forget persistence. Failures fall back to localStorage.
      fetch('/api/user/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appearance: value }),
      }).catch(() => {
        // ignore — localStorage is the next-best source of truth
      })
    }
  }, [isAuthed])

  return (
    <AppearanceContext.Provider value={{ appearance, resolvedAppearance, setAppearance }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) {
    throw new Error('useAppearance must be used within AppearanceProvider')
  }
  return ctx
}
