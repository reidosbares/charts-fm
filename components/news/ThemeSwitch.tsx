'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import { useAppearance } from '@/contexts/AppearanceContext'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

export default function ThemeSwitch() {
  const { resolvedAppearance, setAppearance } = useAppearance()
  const t = useSafeTranslations('news')

  const isDark = resolvedAppearance === 'dark'
  const label = isDark ? t('switchToLight') : t('switchToDark')
  const icon = isDark ? faSun : faMoon

  return (
    <span className="not-prose inline-block my-4">
      <button
        type="button"
        onClick={() => setAppearance(isDark ? 'light' : 'dark')}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold hover:brightness-110 transition-all shadow-sm"
        style={{
          backgroundColor: 'var(--theme-primary)',
          color: 'var(--theme-button-text)',
        }}
      >
        <FontAwesomeIcon icon={icon} className="w-4 h-4" />
        <span>{label}</span>
      </button>
    </span>
  )
}
