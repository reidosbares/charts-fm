'use client'

import { useState } from 'react'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface CombinedChartImageDownloadButtonProps {
  groupId: string
  weekStart: Date
}

export default function CombinedChartImageDownloadButton({
  groupId,
  weekStart,
}: CombinedChartImageDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const t = useSafeTranslations('charts')

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      // Format weekStart as ISO string
      const weekStartStr = weekStart.toISOString().split('T')[0]
      const url = `/api/groups/${groupId}/charts/export-image-combined?weekStart=${weekStartStr}`
      
      // Fetch the file
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to download file')
      }

      // Get the blob
      const blob = await response.blob()
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `charts_combined_${weekStartStr}.png`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Create download link and trigger download
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert(t('imageDownloadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LiquidGlassButton
      onClick={handleDownload}
      disabled={isLoading}
      variant="primary"
      size="sm"
      fullWidth
    >
      {isLoading ? t('generatingImage') : t('downloadCombinedImage')}
    </LiquidGlassButton>
  )
}
