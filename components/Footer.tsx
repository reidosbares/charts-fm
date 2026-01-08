'use client'

import { Link } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

export default function Footer() {
  const t = useSafeTranslations('footer')
  const currentYear = new Date().getFullYear()

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
          <div>
            <Link
              href="/faq"
              className="text-sm text-white hover:text-gray-200 transition-colors duration-200 font-semibold"
            >
              {t('faq')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

