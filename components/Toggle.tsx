'use client'

interface ToggleProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
}

export default function Toggle({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  description,
}: ToggleProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={label ? `${id}-label` : undefined}
          id={id}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2
            ${checked ? 'bg-yellow-500' : 'bg-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
              ${checked ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        {label && (
          <label
            id={`${id}-label`}
            htmlFor={id}
            className={`text-sm font-medium text-gray-700 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
            onClick={() => !disabled && onChange(!checked)}
          >
            {label}
          </label>
        )}
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-1 ml-[3.5rem]">
          {description}
        </p>
      )}
    </div>
  )
}

