'use client'

import { useState } from 'react'
import { getDefaultGroupImage } from '@/lib/default-images'

interface SafeImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  defaultImage?: string
}

export default function SafeImage({ 
  src, 
  alt, 
  className = '', 
  defaultImage 
}: SafeImageProps) {
  const defaultImg = defaultImage || getDefaultGroupImage()
  const [imgSrc, setImgSrc] = useState(src || defaultImg)

  const handleError = () => {
    setImgSrc(defaultImg)
  }

  // Use key prop to force remount when src changes, bypassing browser cache
  return (
    <img
      key={src || 'default'}
      src={src || defaultImg}
      alt={alt}
      className={className}
      onError={handleError}
    />
  )
}
