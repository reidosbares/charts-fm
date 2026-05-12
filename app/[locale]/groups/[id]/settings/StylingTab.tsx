'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { routing } from '@/i18n/routing'
import { THEME_NAMES, type ThemeName } from '@/lib/group-themes'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import Toast from '@/components/Toast'

interface StylingTabProps {
  groupId: string
  initialColorTheme: string | null
}

export default function StylingTab({
  groupId,
  initialColorTheme,
}: StylingTabProps) {
  const router = useRouter()
  const t = useSafeTranslations('groups.settings.styling')
  const tThemes = useSafeTranslations('groups.settings.styling.themes')
  
  const THEME_DISPLAY_NAMES = useMemo(() => ({
    yellow: tThemes('yellow'),
    royal_blue: tThemes('royalBlue'),
    cyan: tThemes('cyan'),
    bright_red: tThemes('brightRed'),
    maroon: tThemes('maroon'),
    graphite: tThemes('graphite'),
    hot_pink: tThemes('hotPink'),
    neon_green: tThemes('neonGreen'),
    white: tThemes('white'),
    rainbow: tThemes('rainbow'),
    synthwave: tThemes('synthwave'),
    sunset: tThemes('sunset'),
  }), [tThemes])
  
  const [colorTheme, setColorTheme] = useState<ThemeName>((initialColorTheme as ThemeName) || 'white')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Live-preview: swap the surrounding <main>'s theme class as the user picks tiles
  // so the entire settings page reflects the choice immediately.
  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    const next = `theme-${colorTheme.replace('_', '-')}`
    Array.from(main.classList).forEach((c) => {
      if (c.startsWith('theme-')) main.classList.remove(c)
    })
    main.classList.add(next)
  }, [colorTheme])

  const hasChanges = colorTheme !== (initialColorTheme || 'white')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/groups/${groupId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          colorTheme: colorTheme,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('failedToUpdate'))
      }

      setSuccess(true)
      
      // Force a full page reload to ensure fresh data is fetched
      // This ensures the server component gets the updated colorTheme
      // Extract locale from current pathname to include in redirect
      const currentPath = window.location.pathname
      const pathParts = currentPath.split('/').filter(Boolean)
      const locale = pathParts[0] && routing.locales.includes(pathParts[0] as typeof routing.locales[number]) 
        ? pathParts[0] 
        : routing.defaultLocale
      window.location.href = `/${locale}/groups/${groupId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToUpdate'))
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Toast notifications */}
      <Toast
        message={t('updatedSuccessfully')}
        type="success"
        isVisible={success}
        onClose={() => setSuccess(false)}
      />
      <Toast
        message={error || ''}
        type="error"
        isVisible={!!error}
        onClose={() => setError(null)}
      />

      <div className="bg-[var(--surface-card)] rounded-lg shadow-lg p-4 md:p-6 lg:p-8">

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div>
          <label htmlFor="colorTheme" className="block text-base md:text-lg font-bold text-[var(--text-primary)] mb-2">
            {t('colorTheme')}
          </label>
          <p className="text-xs md:text-sm text-[var(--text-muted)] mb-3 md:mb-4">
            {t('colorThemeDescription')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {THEME_NAMES.map((themeName) => {
              const isSelected = colorTheme === themeName
              const themeClass = `theme-${themeName.replace('_', '-')}`

              return (
                <label
                  key={themeName}
                  className={`${themeClass} relative cursor-pointer rounded-xl p-4 transition-all overflow-hidden border-2 ${
                    isSelected
                      ? 'border-[var(--theme-primary)] shadow-lg'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                  style={{
                    backgroundImage: 'linear-gradient(135deg, var(--theme-background-from), var(--theme-background-to))',
                  }}
                >
                  <input
                    type="radio"
                    name="colorTheme"
                    value={themeName}
                    checked={isSelected}
                    onChange={(e) => setColorTheme(e.target.value as ThemeName)}
                    className="sr-only"
                  />

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="text-2xl md:text-3xl font-bold leading-tight text-[var(--theme-primary-dark)]"
                      >
                        {THEME_DISPLAY_NAMES[themeName]}
                      </h3>
                      {isSelected && (
                        <div
                          className="w-5 h-5 rounded-full shrink-0 mt-1"
                          style={{
                            backgroundColor: 'var(--theme-primary)',
                            boxShadow: '0 0 0 2px var(--theme-background-from)',
                          }}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div
                        className="px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm"
                        style={{
                          backgroundColor: 'var(--theme-primary)',
                          color: 'var(--theme-button-text)',
                        }}
                      >
                        {t('viewSample')}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-md ring-1 ring-black/10 dark:ring-white/10"
                          style={{ backgroundColor: 'var(--theme-primary-light)' }}
                          title="Secondary accent"
                        />
                        <span
                          className="w-7 h-7 rounded-md ring-1 ring-black/10 dark:ring-white/10"
                          style={{ backgroundColor: 'var(--theme-text)' }}
                          title="Data accent"
                        />
                      </div>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-3 md:pt-4">
          <button
            type="submit"
            disabled={isLoading || !hasChanges}
            className="flex-1 py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('saving') : t('saveSettings')}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base bg-[var(--surface-base)] text-[var(--text-primary)] rounded-lg hover:brightness-95 transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
      </div>
    </>
  )
}
