'use client'

import { useState, useRef, useEffect } from 'react'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export interface TabItem {
  id: string
  label: string
  icon?: IconDefinition
  badge?: number
  count?: number
}

interface LiquidGlassTabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
  fullWidth?: boolean
  /** Use "dark" only on the group page hero area for white text on dark glass; other pages use default. */
  variant?: 'default' | 'dark'
}

export default function LiquidGlassTabs({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  fullWidth = false,
  variant = 'default',
}: LiquidGlassTabsProps) {
  const [bubbleStyle, setBubbleStyle] = useState({ left: 0, width: 0 })
  const tabsRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const isDark = variant === 'dark'

  useEffect(() => {
    const updateBubblePosition = () => {
      const activeButton = tabRefs.current.get(activeTab)
      const container = tabsRef.current

      if (activeButton && container) {
        const containerRect = container.getBoundingClientRect()
        const buttonRect = activeButton.getBoundingClientRect()

        setBubbleStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
        })
      }
    }

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      updateBubblePosition()
      // Also run after a small delay to catch any layout shifts
      setTimeout(updateBubblePosition, 50)
    })

    window.addEventListener('resize', updateBubblePosition)

    return () => {
      window.removeEventListener('resize', updateBubblePosition)
    }
  }, [activeTab, tabs])

  const navStyle = isDark
    ? {
        background: 'rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
      }
    : {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
      }

  const bubbleStyleObj = isDark
    ? {
        left: `${bubbleStyle.left}px`,
        width: `${bubbleStyle.width}px`,
        background: 'rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(12px) saturate(200%)',
        WebkitBackdropFilter: 'blur(12px) saturate(200%)',
        boxShadow: `
          0 4px 6px -1px rgba(0, 0, 0, 0.15),
          0 2px 4px -1px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.35),
          inset 0 -1px 0 0 rgba(255, 255, 255, 0.08)
        `,
        border: '1px solid rgba(255, 255, 255, 0.35)',
      }
    : {
        left: `${bubbleStyle.left}px`,
        width: `${bubbleStyle.width}px`,
        background: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(12px) saturate(200%)',
        WebkitBackdropFilter: 'blur(12px) saturate(200%)',
        boxShadow: `
          0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.6),
          inset 0 -1px 0 0 rgba(255, 255, 255, 0.2)
        `,
        border: '1px solid rgba(255, 255, 255, 0.6)',
      }

  const textClass = isActive =>
    isDark
      ? isActive
        ? 'text-white'
        : 'text-white/80 hover:text-white'
      : isActive
        ? 'text-[var(--theme-primary-dark)]'
        : 'text-gray-600 hover:text-[var(--theme-text)]'

  const countBadgeClass = isDark
    ? 'bg-white/25 text-white'
    : 'bg-gray-500/30 text-gray-700'

  return (
    <nav
      ref={tabsRef}
      className={`relative flex items-center gap-2 p-1.5 rounded-full ${className}`}
      style={navStyle}
      aria-label="Tabs"
    >
      {/* Liquid glass bubble - slides behind active tab */}
      {bubbleStyle.width > 0 && (
        <div
          className="absolute top-1.5 bottom-1.5 rounded-full transition-all duration-300 ease-out"
          style={bubbleStyleObj}
        />
      )}

      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) {
                tabRefs.current.set(tab.id, el)
              } else {
                tabRefs.current.delete(tab.id)
              }
            }}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative z-10 py-2.5 px-3 md:px-5 font-semibold text-sm rounded-full
              flex items-center justify-center gap-2 transition-all duration-300
              ${fullWidth ? 'flex-1' : ''}
              ${textClass(isActive)}
            `}
            aria-label={tab.label}
          >
            {tab.icon && <FontAwesomeIcon icon={tab.icon} className="text-lg flex-shrink-0" />}
            {/* Show text only for active tab on mobile, always show on desktop */}
            <span className={isActive ? '' : 'hidden md:inline'}>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${countBadgeClass}`}>
                {tab.count}
              </span>
            )}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

