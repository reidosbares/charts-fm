'use client'

import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { useNewsTheme } from './NewsThemeProvider'

const DISPLAY_NAME_KEY: Record<string, string> = {
  yellow: 'yellow',
  royal_blue: 'royalBlue',
  cyan: 'cyan',
  bright_red: 'brightRed',
  maroon: 'maroon',
  graphite: 'graphite',
  hot_pink: 'hotPink',
  neon_green: 'neonGreen',
  white: 'white',
  rainbow: 'rainbow',
  synthwave: 'synthwave',
  sunset: 'sunset',
}

interface ThemePreviewProps {
  theme: string
}

export default function ThemePreview({ theme }: ThemePreviewProps) {
  const { preview, setPreview } = useNewsTheme()
  const tThemes = useSafeTranslations('groups.settings.styling.themes')
  const tStyling = useSafeTranslations('groups.settings.styling')

  const isActive = preview === theme
  const themeClass = `theme-${theme.replace('_', '-')}`
  const displayKey = DISPLAY_NAME_KEY[theme] ?? theme

  return (
    <button
      type="button"
      onClick={() => setPreview(isActive ? null : theme)}
      aria-pressed={isActive}
      className={`${themeClass} not-prose group relative w-full cursor-pointer rounded-xl p-4 text-left transition-all overflow-hidden border-2 ${
        isActive
          ? 'border-[var(--theme-primary)] shadow-lg'
          : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
      }`}
      style={{
        backgroundImage:
          'linear-gradient(135deg, var(--theme-background-from), var(--theme-background-to))',
      }}
    >
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-2xl md:text-3xl font-bold leading-tight text-[var(--theme-primary-dark)]">
            {tThemes(displayKey)}
          </h3>
          {isActive && (
            <span
              className="w-5 h-5 rounded-full shrink-0 mt-1"
              style={{
                backgroundColor: 'var(--theme-primary)',
                boxShadow: '0 0 0 2px var(--theme-background-from)',
              }}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span
            className="px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-button-text)',
            }}
          >
            {tStyling('viewSample')}
          </span>
          <span className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-md ring-1 ring-black/10 dark:ring-white/10"
              style={{ backgroundColor: 'var(--theme-primary-light)' }}
            />
            <span
              className="w-7 h-7 rounded-md ring-1 ring-black/10 dark:ring-white/10"
              style={{ backgroundColor: 'var(--theme-text)' }}
            />
          </span>
        </div>
      </div>
    </button>
  )
}
