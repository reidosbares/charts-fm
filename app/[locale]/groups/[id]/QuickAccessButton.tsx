'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faMinus, faSpinner } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import QuickAccessConfirmModal from './QuickAccessConfirmModal'

interface QuickAccessButtonProps {
  groupId: string
}

export default function QuickAccessButton({ groupId }: QuickAccessButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const { data: quickAccessData, isLoading, mutate: mutateQuickAccess } = useSWR<{
    group?: { id: string; name: string } | null
  }>('/api/user/quick-access')

  const currentQuickAccessGroup = quickAccessData?.group ?? null
  const isInQuickAccess = currentQuickAccessGroup?.id === groupId

  const handleToggle = async () => {
    if (isUpdating) return // Prevent multiple clicks
    
    if (isInQuickAccess) {
      // Remove from quick access
      setIsUpdating(true)
      try {
        const res = await fetch('/api/user/quick-access', {
          method: 'DELETE',
        })
        if (res.ok) {
          mutateQuickAccess({ group: null }, false)
          // Trigger navbar refresh by dispatching a custom event
          window.dispatchEvent(new Event('quickAccessUpdated'))
        }
      } catch (err) {
        console.error('Error removing quick access:', err)
      } finally {
        setIsUpdating(false)
      }
    } else {
      // Add to quick access
      // Check if another group is already in quick access
      if (currentQuickAccessGroup && currentQuickAccessGroup.id !== groupId) {
        // Show confirmation modal immediately
        setShowConfirmModal(true)
      } else {
        // No existing group, add directly
        handleConfirmReplace()
      }
    }
  }

  const handleConfirmReplace = async () => {
    setIsUpdating(true)
    setShowConfirmModal(false)
    try {
      const res = await fetch('/api/user/quick-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      })
      if (res.ok) {
        const data = await res.json()
        mutateQuickAccess({ group: data.group }, false)
        // Trigger navbar refresh
        window.dispatchEvent(new Event('quickAccessUpdated'))
      }
    } catch (err) {
      console.error('Error adding quick access:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelReplace = () => {
    setShowConfirmModal(false)
  }

  if (isLoading) {
    return null
  }

  return (
    <>
      <LiquidGlassButton
        onClick={handleToggle}
        variant="primary"
        size="sm"
        useTheme
        disabled={isUpdating}
        className="!px-2 !py-1.5 md:!px-3 md:!py-2"
        icon={
          <FontAwesomeIcon
            icon={isUpdating ? faSpinner : (isInQuickAccess ? faMinus : faPlus)}
            className={`text-xs md:text-sm ${isUpdating ? 'animate-spin' : ''}`}
          />
        }
        aria-label={isUpdating 
          ? (isInQuickAccess ? 'Removing...' : 'Adding...')
          : (isInQuickAccess ? 'Remove from quick access' : 'Add to quick access')
        }
      />
      <QuickAccessConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmReplace}
        onCancel={handleCancelReplace}
      />
    </>
  )
}

