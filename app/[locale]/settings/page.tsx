'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import DeleteAccountModal from '@/components/DeleteAccountModal'
import CustomSelect from '@/components/CustomSelect'
import Toast from '@/components/Toast'
import { useTranslations } from 'next-intl'
import { routing } from '@/i18n/routing'

export default function SettingsPage() {
  const router = useRouter()
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    locale: 'en',
  })
  const [originalLocale, setOriginalLocale] = useState<string>('en')
  const [originalEmail, setOriginalEmail] = useState<string>('')
  const [emailVerified, setEmailVerified] = useState<boolean>(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    document.title = 'ChartsFM - Settings'
  }, [])

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          const userLocale = data.user.locale || 'en'
          setFormData({
            email: data.user.email || '',
            locale: userLocale,
          })
          setOriginalLocale(userLocale)
          setOriginalEmail(data.user.email || '')
          setEmailVerified(data.user.emailVerified || false)
        }
        setIsLoading(false)
      })
      .catch(err => {
        setError(t('failedToLoad'))
        setIsLoading(false)
      })
  }, [t])

  // Map API error messages to translation keys
  const translateError = (errorMessage: string): string => {
    const errorMap: Record<string, string> = {
      'Email is required': t('errors.emailRequired'),
      'Invalid email format': t('errors.invalidEmail'),
      'An account with this email already exists': t('errors.emailExists'),
    }
    return errorMap[errorMessage] || errorMessage
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSaving(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        const translatedError = translateError(data.error || '')
        throw new Error(translatedError || t('failedToUpdate'))
      }

      setSuccess(true)
      
      // Update email verification status if email changed
      if (formData.email !== originalEmail) {
        setEmailVerified(false)
        setOriginalEmail(formData.email)
      }
      
      // Reload profile data to get updated verification status
      const profileResponse = await fetch('/api/user/profile')
      const profileData = await profileResponse.json()
      if (profileData.user) {
        setEmailVerified(profileData.user.emailVerified || false)
      }
      
      // If locale changed, set cookie and reload the page to apply the new locale
      if (formData.locale !== originalLocale) {
        // Update original locale to prevent multiple redirects
        setOriginalLocale(formData.locale)
        // Set cookie for middleware to use
        document.cookie = `NEXT_LOCALE=${formData.locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
        // Redirect to new locale
        window.location.href = `/${formData.locale}/settings`
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToUpdate'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden flex items-center justify-center px-4">
        <div className="relative z-10 text-center">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl md:text-4xl text-yellow-500 mb-4" />
          <p className="text-sm md:text-base text-gray-700">{tCommon('loading')}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden">
      {/* Toast notifications */}
      <Toast
        message={t('settingsUpdated')}
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

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 md:px-6 lg:px-12 xl:px-24 py-8 md:py-16 lg:py-24">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold pb-1 bg-gradient-to-r from-yellow-600 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              {t('title')}
            </h1>
          </div>

          <div
            className="rounded-3xl p-4 md:p-6 lg:p-8 xl:p-10 relative"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
            }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-400/30 to-purple-400/30 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="email" className="block text-xs md:text-sm font-semibold text-gray-800">
                      {t('email')}
                    </label>
                    <div className="flex items-center gap-2">
                      {emailVerified ? (
                        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {t('emailVerified')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-yellow-600 font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {t('emailNotVerified')}
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value })
                      // Reset verification status when email changes from original
                      if (e.target.value !== originalEmail) {
                        setEmailVerified(false)
                      }
                    }}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder="your.email@example.com"
                    disabled={isSaving}
                  />
                  {formData.email !== originalEmail && (
                    <p className="text-xs text-yellow-600 mt-2">
                      {t('emailChangeWarning')}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="locale" className="block text-xs md:text-sm font-semibold text-gray-800 mb-2">
                    {t('language')}
                  </label>
                  <CustomSelect
                    id="locale"
                    options={routing.locales.map((locale) => {
                      const localeNames: Record<string, string> = {
                        'en': 'English',
                        'pt': 'Português'
                      };
                      return {
                        value: locale,
                        label: localeNames[locale] || locale.toUpperCase(),
                      };
                    })}
                    value={formData.locale}
                    onChange={(value) => setFormData({ ...formData, locale: String(value) })}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    {t('selectLanguage')}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
                  <LiquidGlassButton
                    type="submit"
                    disabled={isSaving}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="text-base md:text-lg min-h-[44px]"
                  >
                    {isSaving ? t('saving') : t('saveChanges')}
                  </LiquidGlassButton>
                  <LiquidGlassButton
                    type="button"
                    onClick={() => router.back()}
                    variant="neutral"
                    size="lg"
                    className="min-h-[44px]"
                  >
                    {tCommon('cancel')}
                  </LiquidGlassButton>
                </div>
              </form>
            </div>
          </div>

          {/* Danger Zone */}
          <div
            className="rounded-3xl p-4 md:p-6 lg:p-8 xl:p-10 relative mt-6 md:mt-8"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
            }}
          >
            <div className="relative z-10">
              <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-2">{t('dangerZone.title')}</h2>
              <p className="text-xs md:text-sm text-gray-600 mb-4">
                {t('dangerZone.description')}
              </p>
              <div className="pt-4 border-t border-red-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                      {t('dangerZone.deleteAccount.title')}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600">
                      {t('dangerZone.deleteAccount.description')}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-4 py-2.5 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm md:text-base min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                  >
                    {t('dangerZone.deleteAccount.button')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </main>
  )
}
