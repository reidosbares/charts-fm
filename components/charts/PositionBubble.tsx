'use client'

import { memo, useMemo } from 'react'
import { Link } from '@/i18n/routing'
import { formatWeekDate, formatWeekLabel } from '@/lib/weekly-utils'
import Tooltip from '@/components/Tooltip'

interface PositionBubbleProps {
  position: number
  weekStart: Date
  groupId: string
  chartType: 'artists' | 'tracks' | 'albums'
  isOut?: boolean
}

function PositionBubble({
  position,
  weekStart,
  groupId,
  chartType,
  isOut = false,
}: PositionBubbleProps) {
  // Memoize expensive calculations
  const { weekDateStr, href, sizeClass, colorClass, formattedDate, baseStyles } = useMemo(() => {
    const weekDateStr = formatWeekDate(weekStart)
    const href = `/groups/${groupId}/charts?week=${weekDateStr}&type=${chartType}`
    
    // Size based on position (higher position = smaller, but we want top positions to be larger)
    // Position 1-3 get larger sizes, 4-10 get progressively smaller
    // Responsive sizes for mobile
    let sizeClass: string
    if (isOut) {
      sizeClass = 'w-10 h-10 md:w-12 md:h-12 text-xs md:text-sm'
    } else if (position <= 3) {
      sizeClass = 'w-12 h-12 md:w-16 md:h-16 text-sm md:text-lg'
    } else if (position <= 6) {
      sizeClass = 'w-11 h-11 md:w-14 md:h-14 text-xs md:text-base'
    } else {
      sizeClass = 'w-10 h-10 md:w-12 md:h-12 text-xs md:text-sm'
    }

    // Color based on position
    let colorClass: string
    if (isOut) {
      colorClass = 'text-gray-600'
    } else if (position === 1) {
      colorClass = 'text-yellow-600'
    } else if (position === 2) {
      colorClass = 'text-gray-500'
    } else if (position === 3) {
      colorClass = 'text-amber-600'
    } else {
      colorClass = 'text-gray-700'
    }

    const formattedDate = formatWeekLabel(weekStart)

    const baseStyles = {
      background: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(8px) saturate(180%)',
      WebkitBackdropFilter: 'blur(8px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      willChange: 'transform',
    }

    return { weekDateStr, href, sizeClass, colorClass, formattedDate, baseStyles }
  }, [weekStart, groupId, chartType, position, isOut])

  const bubbleClassName = `
    ${sizeClass}
    ${colorClass}
    rounded-full font-bold
    flex items-center justify-center
    ${isOut ? '' : 'transition-transform duration-150 hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer'}
    relative z-10
    inline-block
  `

  return (
    <Tooltip content={formattedDate} position="top">
      {isOut ? (
        <div className={bubbleClassName} style={baseStyles}>
          OUT
        </div>
      ) : (
        <Link href={href} className={bubbleClassName} style={baseStyles}>
          #{position}
        </Link>
      )}
    </Tooltip>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(PositionBubble)

