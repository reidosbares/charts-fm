interface PositionMovementIconProps {
  positionChange: number | null | undefined
  entryType?: string | null
  className?: string
}

export default function PositionMovementIcon({ positionChange, entryType, className = '' }: PositionMovementIconProps) {
  if (positionChange === null || positionChange === undefined) {
    // Determine if it's a new entry or re-entry
    if (entryType === 're-entry') {
      return (
        <span className={`inline-flex items-center justify-center ${className}`} title="Returned to chart">
          🔄
        </span>
      )
    }
    // New entry - show star
    return (
      <span className={`inline-flex items-center justify-center ${className}`} title="New entry">
        ⭐
      </span>
    )
  }
  
  if (positionChange < 0) {
    // Moved up (negative change means better position, e.g., from 5 to 3 = -2)
    return (
      <span className={`inline-flex items-center justify-center text-green-600 ${className}`} title={`Moved up ${Math.abs(positionChange)} position${Math.abs(positionChange) !== 1 ? 's' : ''}`}>
        ↑
      </span>
    )
  }
  
  if (positionChange > 0) {
    // Moved down (positive change means worse position, e.g., from 3 to 5 = +2)
    return (
      <span className={`inline-flex items-center justify-center text-red-600 ${className}`} title={`Moved down ${positionChange} position${positionChange !== 1 ? 's' : ''}`}>
        ↓
      </span>
    )
  }
  
  // No change (positionChange === 0) - show equal sign
  return (
    <span className={`inline-flex items-center justify-center text-gray-500 ${className}`} title="No change">
      =
    </span>
  )
}

