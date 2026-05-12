'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface NewsThemeContextValue {
  preview: string | null
  setPreview: (theme: string | null) => void
}

const NewsThemeContext = createContext<NewsThemeContextValue>({
  preview: null,
  setPreview: () => {},
})

export function useNewsTheme() {
  return useContext(NewsThemeContext)
}

export function NewsThemeProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!preview) return
    const main = document.querySelector('main')
    if (!main) return

    const themeClass = `theme-${preview.replace('_', '-')}`
    main.classList.add(themeClass)
    main.setAttribute('data-theme-preview', preview)

    return () => {
      main.classList.remove(themeClass)
      main.removeAttribute('data-theme-preview')
    }
  }, [preview])

  return (
    <NewsThemeContext.Provider value={{ preview, setPreview }}>
      {children}
    </NewsThemeContext.Provider>
  )
}
