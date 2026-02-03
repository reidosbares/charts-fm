'use client'

import { useState, useEffect } from 'react'
import { useRouter, Link } from '@/i18n/routing'
import { getDefaultGroupImage } from '@/lib/default-images'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faUpload, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import RemovePictureModal from '@/components/RemovePictureModal'
import CustomSelect from '@/components/CustomSelect'
import Toast from '@/components/Toast'
import { useTranslations } from 'next-intl'

export default function ProfilePage() {
  const router = useRouter()
  const t = useTranslations('profile')
  const tCommon = useTranslations('common')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    bio: '',
    profilePublic: true,
    showProfileStats: true,
    showProfileGroups: true,
    highlightedGroupId: '' as string | null,
  })
  const [profileGroups, setProfileGroups] = useState<{ id: string; name: string }[]>([])
  const [lastfmUsername, setLastfmUsername] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)

  useEffect(() => {
    document.title = 'ChartsFM - Profile'
  }, [])

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setFormData({
            name: data.user.name || '',
            image: data.user.image || '',
            bio: data.user.bio || '',
            profilePublic: data.user.profilePublic ?? true,
            showProfileStats: data.user.showProfileStats ?? true,
            showProfileGroups: data.user.showProfileGroups ?? true,
            highlightedGroupId: data.user.highlightedGroupId || null,
          })
          setProfileGroups(data.groups || [])
          setLastfmUsername(data.user.lastfmUsername || null)
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
      'Image must be a valid URL or path': t('errors.invalidImageUrl'),
      'Image URL cannot exceed 500 characters': t('errors.imageTooLong'),
      'Image must be a string': t('errors.imageMustBeString'),
      'Name cannot exceed 100 characters': t('errors.nameTooLong'),
      'Name must be a string': t('errors.nameMustBeString'),
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

  const displayImage = previewUrl || formData.image || getDefaultGroupImage()
  
  // Check if current image is from uploaded storage
  const isUploadedImage = !!(formData.image && (
    formData.image.startsWith('/uploads/profile-pictures/') ||
    formData.image.includes('blob.vercel-storage.com')
  ))

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setError(t('upload.invalidFileType'))
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('upload.fileTooLarge'))
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/user/profile/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('upload.failed'))
      }

      // Reload profile data to get the updated image
      const profileResponse = await fetch('/api/user/profile')
      const profileData = await profileResponse.json()
      
      if (profileData.user) {
        setFormData(prev => ({
          ...prev,
          image: profileData.user.image || '',
        }))
      }
      
      setSuccess(true)
      
      // Clear file selection
      setSelectedFile(null)
      setPreviewUrl(null)
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload.failed'))
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleRemovePicture = async () => {
    if (!formData.image) return

    setIsRemoving(true)
    setError(null)

    try {
      const response = await fetch('/api/user/profile/picture', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('removePicture.failed'))
      }

      // Reload profile data to get updated state
      const profileResponse = await fetch('/api/user/profile')
      const profileData = await profileResponse.json()
      
      if (profileData.user) {
        setFormData(prev => ({
          ...prev,
          image: profileData.user.image || '',
        }))
      }
      
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('removePicture.failed'))
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden">
      {/* Toast notifications */}
      <Toast
        message={t('profileUpdated')}
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
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-yellow-600 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              {t('title')}
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-700">
              {t('subtitle')}
            </p>
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
                <div className="flex flex-col items-center mb-4 md:mb-6">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 mb-3 md:mb-4">
                    <img
                      src={displayImage}
                      alt="Profile picture"
                      className="rounded-full object-cover w-24 h-24 md:w-32 md:h-32 border-4 border-white/50 shadow-lg"
                      onError={(e) => {
                        e.currentTarget.src = getDefaultGroupImage()
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs md:text-sm text-gray-600 font-medium">{t('profilePicturePreview')}</p>
                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => setIsRemoveModalOpen(true)}
                        disabled={isRemoving || isSaving || isUploading}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        <span>{t('removePicture.button')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className="block text-xs md:text-sm font-semibold text-gray-800 mb-2">
                    {t('name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder="Your name"
                    disabled={isSaving || isUploading}
                  />
                </div>

                <div>
                  <label htmlFor="image" className="block text-xs md:text-sm font-semibold text-gray-800 mb-2">
                    {t('profilePicture')}
                  </label>
                  
                  {/* File Upload Section */}
                  <div className="mb-4">
                    <label
                      htmlFor="file-upload"
                      className="flex items-center justify-center w-full px-4 py-3 text-sm md:text-base rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-yellow-500 transition-colors"
                      style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <FontAwesomeIcon icon={faUpload} className="mr-2 text-gray-500" />
                      <span className="text-gray-700">{t('upload.selectFile')}</span>
                      <input
                        id="file-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isSaving || isUploading}
                      />
                    </label>
                    
                    {selectedFile && (
                      <div className="mt-3 p-3 rounded-xl border border-gray-200" style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(8px)',
                      }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                              {previewUrl && (
                                <img
                                  src={previewUrl}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {selectedFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isUploading && (
                              <>
                                <LiquidGlassButton
                                  type="button"
                                  onClick={handleFileUpload}
                                  variant="primary"
                                  size="sm"
                                  disabled={isSaving || isUploading}
                                >
                                  {t('upload.upload')}
                                </LiquidGlassButton>
                                <button
                                  type="button"
                                  onClick={handleRemoveFile}
                                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                                  disabled={isSaving || isUploading}
                                >
                                  <FontAwesomeIcon icon={faTimes} />
                                </button>
                              </>
                            )}
                            {isUploading && (
                              <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-yellow-500" />
                                <span className="text-sm text-gray-600">{t('upload.uploading')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* URL Input (Alternative) */}
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="text-xs text-gray-500 px-2">{t('upload.or')}</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                    <input
                      type="text"
                      id="image"
                      value={isUploadedImage ? '' : formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(8px)',
                      }}
                      placeholder={isUploadedImage ? t('upload.urlDisabledPlaceholder') : "https://example.com/profile.jpg"}
                      disabled={isSaving || isUploading || isUploadedImage}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs md:text-sm font-semibold text-gray-800">{t('lastfmUsername')}</span>
                    <div className="relative group">
                      <svg
                        className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 cursor-help"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] max-w-[200px] md:max-w-none"
                        style={{
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        {t('lastfmUsernameTooltip')}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="px-3 md:px-4 py-2.5 md:py-3 rounded-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <p className="text-base md:text-lg text-gray-900 font-medium break-words">{lastfmUsername || 'Not set'}</p>
                  </div>
                </div>

                {/* Public profile settings */}
                <div>
                  <label htmlFor="bio" className="block text-xs md:text-sm font-semibold text-gray-800 mb-2">
                    {t('bio')}
                  </label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder={t('bioPlaceholder')}
                    rows={4}
                    maxLength={500}
                    disabled={isSaving || isUploading}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-600">{t('bioHelp')}</p>
                    <p className="text-xs text-gray-500">{(formData.bio || '').length}/500</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs md:text-sm font-semibold text-gray-800 mb-2">{t('publicProfile.title')}</h3>
                  <div
                    className="rounded-xl border border-gray-200 p-3 md:p-4 space-y-3"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-800 font-medium">{t('publicProfile.profilePublic')}</span>
                      <input
                        type="checkbox"
                        checked={formData.profilePublic}
                        onChange={(e) => setFormData({ ...formData, profilePublic: e.target.checked })}
                        disabled={isSaving || isUploading}
                        className="h-5 w-5 accent-yellow-500"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-800 font-medium">{t('publicProfile.showStats')}</span>
                      <input
                        type="checkbox"
                        checked={formData.showProfileStats}
                        onChange={(e) => setFormData({ ...formData, showProfileStats: e.target.checked })}
                        disabled={isSaving || isUploading || !formData.profilePublic}
                        className="h-5 w-5 accent-yellow-500"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-800 font-medium">{t('publicProfile.showGroups')}</span>
                      <input
                        type="checkbox"
                        checked={formData.showProfileGroups}
                        onChange={(e) => setFormData({ ...formData, showProfileGroups: e.target.checked })}
                        disabled={isSaving || isUploading || !formData.profilePublic}
                        className="h-5 w-5 accent-yellow-500"
                      />
                    </label>

                    {formData.profilePublic && formData.showProfileGroups && profileGroups.length > 0 && (
                      <div className="pt-2 border-t border-gray-200">
                        <label htmlFor="highlightedGroupId" className="block text-sm text-gray-800 font-medium mb-1.5">
                          {t('publicProfile.highlightedGroup')}
                        </label>
                        <p className="text-xs text-gray-600 mb-2">{t('publicProfile.highlightedGroupHelp')}</p>
                        <CustomSelect
                          id="highlightedGroupId"
                          options={[
                            { value: '', label: t('publicProfile.highlightedGroupNone') },
                            ...profileGroups.map((g) => ({ value: g.id, label: g.name })),
                          ]}
                          value={formData.highlightedGroupId ?? ''}
                          onChange={(value) => setFormData({ ...formData, highlightedGroupId: value || null })}
                          disabled={isSaving || isUploading}
                        />
                      </div>
                    )}

                    {lastfmUsername && formData.profilePublic && (
                      <div className="pt-2 border-t border-gray-200">
                        <Link
                          href={`/u/${encodeURIComponent(lastfmUsername)}`}
                          className="text-sm font-semibold text-[var(--theme-primary-dark)] hover:underline"
                        >
                          {t('publicProfile.viewPublicProfileLink')}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
                  <LiquidGlassButton
                    type="submit"
                    disabled={isSaving || isUploading}
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
        </div>
      </div>

      <RemovePictureModal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        onConfirm={handleRemovePicture}
      />
    </main>
  )
}
