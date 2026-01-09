'use client'

import { Link, usePathname } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'

export default function Footer() {
  const t = useSafeTranslations('footer')
  const currentYear = new Date().getFullYear()
  const locale = useLocale()
  const pathname = usePathname()

  const localeNames: Record<string, string> = {
    'en': 'English',
    'pt': 'Português'
  }

  return (
    <footer
      className="relative z-10 mt-auto bg-black"
      style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 -8px 32px 0 rgba(0, 0, 0, 0.2)',
      }}
    >
      <div className="w-full py-3 sm:py-4 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm text-white text-center sm:text-left">
            {t('copyright', { year: currentYear })}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
            <div className="flex gap-2 sm:gap-3 items-center">
              <Link
                href="/about"
                className="text-xs sm:text-sm text-white hover:text-gray-200 transition-colors duration-200 font-semibold py-1 px-2 sm:px-0"
              >
                {t('about')}
              </Link>
              <span className="text-white/50 hidden sm:inline">|</span>
              <Link
                href="/faq"
                className="text-xs sm:text-sm text-white hover:text-gray-200 transition-colors duration-200 font-semibold py-1 px-2 sm:px-0"
              >
                {t('faq')}
              </Link>
            </div>
            <span className="text-white/50 hidden sm:inline">|</span>
            <div className="flex gap-1.5 sm:gap-2 items-center">
              {routing.locales.map((loc, index) => (
                <span key={loc} className="flex items-center gap-1.5 sm:gap-2">
                  <Link
                    href={pathname}
                    locale={loc}
                    className={`text-xs sm:text-sm transition-colors duration-200 font-semibold py-1 px-2 sm:px-0 ${
                      locale === loc
                        ? 'text-white'
                        : 'text-white/60 hover:text-white/80'
                    }`}
                  >
                    {localeNames[loc] || loc.toUpperCase()}
                  </Link>
                  {index < routing.locales.length - 1 && (
                    <span className="text-white/30">/</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

