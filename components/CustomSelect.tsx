'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string | number
  label: string
}

interface CustomSelectProps {
  options: SelectOption[]
  value: string | number
  onChange: (value: string | number) => void
  id?: string
  disabled?: boolean
  className?: string
  placeholder?: string
}

interface DropdownPosition {
  top: number
  left: number
  width: number
}

export default function CustomSelect({
  options,
  value,
  onChange,
  id,
  disabled = false,
  className = '',
  placeholder = 'Select an option...',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  // Calculate dropdown position based on button location
  const getDropdownPosition = useCallback((): DropdownPosition | null => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      return {
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      }
    }
    return null
  }, [])

  // Update position when dropdown opens
  const openDropdown = useCallback(() => {
    const position = getDropdownPosition()
    setDropdownPosition(position)
    setIsOpen(true)
  }, [getDropdownPosition])

  // Update position on scroll/resize when open
  useEffect(() => {
    if (!isOpen) return

    const handleScrollOrResize = () => {
      const position = getDropdownPosition()
      setDropdownPosition(position)
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen, getDropdownPosition])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedButton = buttonRef.current?.contains(target)
      const clickedDropdown = dropdownRef.current?.contains(target)
      
      if (!clickedButton && !clickedDropdown) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0) {
      const optionElement = dropdownRef.current?.querySelector(
        `[data-option-index="${highlightedIndex}"]`
      ) as HTMLElement
      optionElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(options[highlightedIndex].value)
        } else if (isOpen) {
          setIsOpen(false)
        } else {
          openDropdown()
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          openDropdown()
        } else {
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : prev
          )
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        buttonRef.current?.focus()
        break
    }
  }

  const handleSelect = (selectedValue: string | number) => {
    onChange(selectedValue)
    setIsOpen(false)
    setHighlightedIndex(-1)
    buttonRef.current?.focus()
  }

  // Render dropdown via portal to avoid overflow/z-index issues
  const renderDropdown = () => {
    if (!isOpen || disabled || !dropdownPosition) return null
    if (typeof document === 'undefined') return null

    return createPortal(
      <div
        ref={dropdownRef}
        className="fixed z-[9999] bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
        role="listbox"
      >
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            data-option-index={index}
            onClick={() => handleSelect(option.value)}
            onMouseEnter={() => setHighlightedIndex(index)}
            className={`
              w-full px-4 py-2 text-left transition-colors
              ${option.value === value
                ? 'bg-yellow-50 text-yellow-900 font-medium'
                : 'text-gray-900 hover:bg-yellow-100'
              }
              ${highlightedIndex === index ? 'bg-yellow-100' : ''}
              ${index === 0 ? 'rounded-t-lg' : ''}
              ${index === options.length - 1 ? 'rounded-b-lg' : ''}
            `}
            role="option"
            aria-selected={option.value === value}
          >
            {option.label}
          </button>
        ))}
      </div>,
      document.body
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        onClick={() => {
          if (disabled) return
          if (isOpen) {
            setIsOpen(false)
          } else {
            openDropdown()
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full px-4 py-2 text-left bg-white border-2 rounded-lg
          transition-all duration-200
          flex items-center justify-between
          ${disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
            : 'border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500'
          }
          ${isOpen ? 'border-yellow-500 ring-2 ring-yellow-500' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={id ? `${id}-label` : undefined}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          } ${disabled ? 'text-gray-400' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {renderDropdown()}
    </div>
  )
}
