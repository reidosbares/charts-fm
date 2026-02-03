'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import SignInModal from '@/components/SignInModal'
import LiquidGlassButton, { LiquidGlassLink } from '@/components/LiquidGlassButton'

export default function LoggedOutCallout() {
  const t = useTranslations('groups.public')
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false)

  return (
    <>
      <div
        className="rounded-xl md:rounded-2xl p-3 md:p-4 shadow-xl border border-white/30 mb-3 md:mb-4"
        style={{
          background: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs md:text-sm text-white/90 font-medium">
            {t('joinCommunityMessage')}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <LiquidGlassButton
              onClick={() => setIsSignInModalOpen(true)}
              variant="primary"
              size="sm"
              className="w-full sm:w-auto !bg-white/25 !text-white hover:!bg-white/35 !border-white/40 !px-3 !py-2 text-xs md:text-sm"
            >
              {t('logIn')}
            </LiquidGlassButton>
            <LiquidGlassLink
              href="/auth/signup"
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto !bg-white/20 !text-white hover:!bg-white/30 !border-white/40 !px-3 !py-2 text-xs md:text-sm"
            >
              {t('createAccount')}
            </LiquidGlassLink>
          </div>
        </div>
      </div>
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </>
  )
}
