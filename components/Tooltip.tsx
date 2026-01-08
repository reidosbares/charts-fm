'use client'

import { ReactNode, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ 
  content, 
  children, 
  position = 'top' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    zIndex: 99999,
    pointerEvents: 'none',
    opacity: 0,
  })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Detect mobile device and track viewport width
  useEffect(() => {
    const checkMobile = () => {
      // Check if device has touch capability and screen width is mobile
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMobileWidth = window.innerWidth < 768 // md breakpoint
      setIsMobile(hasTouch && isMobileWidth)
      setViewportWidth(window.innerWidth)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isVisible || !triggerRef.current) {
      // Hide tooltip when not visible
      setTooltipStyle({
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        zIndex: 99999,
        pointerEvents: 'none',
        opacity: 0,
      })
      return
    }

    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return

      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      
      // Don't calculate if tooltip hasn't been measured yet - retry if needed
      if (tooltipRect.width === 0 || tooltipRect.height === 0) {
        // Retry after a short delay if not measured yet
        setTimeout(updatePosition, 10)
        return
      }
      
      let top = 0
      let left = 0

      // On mobile, center the tooltip or position it above/below
      if (isMobile) {
        // Center tooltip on mobile screen with padding
        const mobilePadding = 16
        const availableWidth = viewportWidth || window.innerWidth
        const maxTooltipWidth = availableWidth - (mobilePadding * 2)
        const actualTooltipWidth = Math.min(tooltipRect.width, maxTooltipWidth)
        left = mobilePadding + (maxTooltipWidth - actualTooltipWidth) / 2
        
        // Position above trigger if there's space, otherwise below
        // If neither fits well, center vertically
        const spaceAbove = triggerRect.top
        const spaceBelow = window.innerHeight - triggerRect.bottom
        
        if (spaceAbove > tooltipRect.height + 20) {
          // Position above
          top = triggerRect.top - tooltipRect.height - 12
        } else if (spaceBelow > tooltipRect.height + 20) {
          // Position below
          top = triggerRect.bottom + 12
        } else {
          // Center vertically if neither position has enough space
          top = (window.innerHeight - tooltipRect.height) / 2
        }
      } else {
        // Desktop positioning
        switch (position) {
          case 'top':
            top = triggerRect.top - tooltipRect.height - 6
            left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
            break
          case 'bottom':
            top = triggerRect.bottom + 6
            left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
            break
          case 'left':
            top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
            left = triggerRect.left - tooltipRect.width - 6
            break
          case 'right':
            top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
            left = triggerRect.right + 6
            break
        }
      }

      // Keep tooltip within viewport
      const padding = isMobile ? 16 : 8
      const viewportW = viewportWidth || window.innerWidth
      const actualWidth = isMobile ? Math.min(tooltipRect.width, viewportW - (padding * 2)) : tooltipRect.width
      
      if (left < padding) left = padding
      if (left + actualWidth > viewportW - padding) {
        left = viewportW - actualWidth - padding
      }
      if (top < padding) top = padding
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding
      }

      setTooltipStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 99999,
        pointerEvents: isMobile ? 'auto' : 'none',
        opacity: 1,
        ...(isMobile && {
          maxWidth: `${viewportW - (padding * 2)}px`,
          width: 'auto',
        }),
      })
    }

    // First render tooltip off-screen, then measure and position
    // Use multiple attempts to ensure tooltip is measured
    requestAnimationFrame(() => {
      updatePosition()
    })
    setTimeout(() => {
      updatePosition()
    }, 0)
    setTimeout(() => {
      updatePosition()
    }, 10)

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible, position, isMobile])

  // Close tooltip when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !isVisible) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        tooltipRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false)
      }
    }

    // Use a small delay to avoid immediate closing when opening
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isMobile, isVisible])

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent',
  }

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMobile) {
      e.preventDefault()
      e.stopPropagation()
      setIsVisible(!isVisible)
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsVisible(false)
  }

  const tooltipContent = isVisible && typeof document !== 'undefined' ? (
    createPortal(
      <>
        {/* Backdrop for mobile */}
        {isMobile && (
          <div
            className="fixed inset-0 bg-black/20 z-[99998]"
            onClick={() => setIsVisible(false)}
          />
        )}
        <div
          ref={tooltipRef}
          className="transition-opacity duration-200"
          style={tooltipStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`relative bg-gray-900 text-white ${isMobile ? 'text-sm' : 'text-xs'} rounded-lg ${isMobile ? 'py-3 px-4' : 'py-2 px-3'} shadow-lg ${isMobile ? 'whitespace-normal' : 'whitespace-nowrap'}`}>
            {isMobile && (
              <button
                onClick={handleClose}
                className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>
            )}
            <div className={isMobile ? 'pr-6' : ''}>{content}</div>
            {!isMobile && (
              <div
                className={`
                  absolute ${arrowClasses[position]}
                  border-4
                `}
              />
            )}
          </div>
        </div>
      </>,
      document.body
    )
  ) : null

  return (
    <>
      <div 
        ref={triggerRef}
        className={`inline-block ${isMobile ? 'cursor-pointer touch-manipulation' : ''}`}
        onMouseEnter={() => !isMobile && setIsVisible(true)}
        onMouseLeave={() => !isMobile && setIsVisible(false)}
        onClick={handleToggle}
        onTouchEnd={(e) => {
          // Prevent click event from firing after touch
          if (isMobile) {
            e.preventDefault()
            handleToggle(e)
          }
        }}
      >
        {children}
      </div>
      {tooltipContent}
    </>
  )
}

