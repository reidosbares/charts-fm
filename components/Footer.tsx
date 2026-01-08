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
      <div className="w-full py-4 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-white">
            {t('copyright', { year: currentYear })}
          </div>
          <div className="flex gap-4 items-center">
            <Link
              href="/about"
              className="text-sm text-white hover:text-gray-200 transition-colors duration-200 font-semibold"
            >
              {t('about')}
            </Link>
            <span className="text-white/50">|</span>
            <Link
              href="/faq"
              className="text-sm text-white hover:text-gray-200 transition-colors duration-200 font-semibold"
            >
              {t('faq')}
            </Link>
            <span className="text-white/50">|</span>
            <div className="flex gap-2 items-center">
              {routing.locales.map((loc, index) => (
                <span key={loc} className="flex items-center gap-2">
                  <Link
                    href={pathname}
                    locale={loc}
                    className={`text-sm transition-colors duration-200 font-semibold ${
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

