'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon, faCircleHalfStroke } from '@fortawesome/free-solid-svg-icons'
import { useAppearance, type Appearance } from '@/contexts/AppearanceContext'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

const NEXT: Record<Appearance, Appearance> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

interface AppearanceToggleProps {
  className?: string
}

export default function AppearanceToggle({ className = '' }: AppearanceToggleProps) {
  const { appearance, setAppearance } = useAppearance()
  const t = useSafeTranslations('navbar')

  const icon = appearance === 'light' ? faSun : appearance === 'dark' ? faMoon : faCircleHalfStroke
  const label =
    appearance === 'light' ? t('appearanceLight') :
    appearance === 'dark' ? t('appearanceDark') :
    t('appearanceSystem')

  return (
    <button
      type="button"
      onClick={() => setAppearance(NEXT[appearance])}
      className={`flex items-center justify-center w-10 h-10 rounded-full text-gray-200 hover:text-white hover:bg-white/10 focus:outline-none transition-colors ${className}`}
      aria-label={label}
      title={label}
    >
      <FontAwesomeIcon icon={icon} className="text-base" />
    </button>
  )
}
