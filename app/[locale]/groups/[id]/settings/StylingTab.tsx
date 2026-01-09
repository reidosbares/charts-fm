'use client'

import { useState, useMemo } from 'react'
import { useRouter } from '@/i18n/routing'
import { routing } from '@/i18n/routing'
import { THEME_NAMES, GROUP_THEMES, type ThemeName } from '@/lib/group-themes'
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
  }), [tThemes])
  
  const [colorTheme, setColorTheme] = useState<ThemeName>((initialColorTheme as ThemeName) || 'white')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 lg:p-8">

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div>
          <label htmlFor="colorTheme" className="block text-base md:text-lg font-bold text-gray-900 mb-2">
            {t('colorTheme')}
          </label>
          <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
            {t('colorThemeDescription')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {THEME_NAMES.map((themeName) => {
              const theme = GROUP_THEMES[themeName]
              const isSelected = colorTheme === themeName
              
              return (
                <label
                  key={themeName}
                  className={`relative cursor-pointer border-2 rounded-xl p-4 transition-all ${
                    isSelected
                      ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-lighter)]/20'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={isSelected ? {
                    '--theme-primary': theme.primary,
                    '--theme-primary-lighter': theme.primaryLighter,
                  } as React.CSSProperties : undefined}
                >
                  <input
                    type="radio"
                    name="colorTheme"
                    value={themeName}
                    checked={isSelected}
                    onChange={(e) => setColorTheme(e.target.value as ThemeName)}
                    className="sr-only"
                  />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        {THEME_DISPLAY_NAMES[themeName]}
                        {themeName === 'white' && <span className="ml-2 text-xs text-gray-500">{t('default')}</span>}
                      </h3>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: theme.primary }}></div>
                      )}
                    </div>
                    
                    {/* Color preview - three colors only */}
                    <div className="flex gap-2 pt-2">
                      <div className="flex-1 space-y-1">
                        <div className="text-xs text-gray-500">{t('background')}</div>
                        <div 
                          className="h-12 rounded border border-gray-200"
                          style={
                            themeName === 'rainbow'
                              ? {
                                  backgroundImage: 'linear-gradient(135deg, rgb(239 68 68), rgb(249 115 22), rgb(234 179 8), rgb(34 197 94), rgb(59 130 246), rgb(147 51 234), rgb(219 39 119), rgb(239 68 68))',
                                }
                              : { backgroundColor: theme.backgroundFrom }
                          }
                          title={themeName === 'rainbow' ? 'Rainbow gradient background' : 'Background color'}
                        ></div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-xs text-gray-500">{t('button')}</div>
                        <div 
                          className="h-12 rounded border border-gray-200"
                          style={{ backgroundColor: theme.primaryLight }}
                          title={t('button')}
                        ></div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-xs text-gray-500">{t('titleColor')}</div>
                        <div 
                          className="h-12 rounded border border-gray-200"
                          style={{ backgroundColor: theme.primaryDark }}
                          title="Title color"
                        ></div>
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
            className="px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
      </div>
    </>
  )
}
