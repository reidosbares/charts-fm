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

function readStoredAppearance(): Appearance {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // localStorage unavailable (Safari private mode, etc.)
  }
  return 'system'
}

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
}

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  // Initial state is 'system' on the server to match the pre-hydration default
  // applied by components/AppearanceBootScript.tsx. The first effect below syncs
  // to localStorage on mount.
  const [appearance, setAppearanceState] = useState<Appearance>('system')
  const [resolvedAppearance, setResolvedAppearance] = useState<ResolvedAppearance>('light')

  // Sync from localStorage on mount.
  useEffect(() => {
    const stored = readStoredAppearance()
    setAppearanceState(stored)
  }, [])

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
  }, [])

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
