import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCaretUp,
  faCaretDown,
  faMinus,
  faStar,
  faArrowRotateLeft,
} from '@fortawesome/free-solid-svg-icons'

interface PositionMovementIconProps {
  positionChange: number | null | undefined
  entryType?: string | null
  className?: string
}

export default function PositionMovementIcon({ positionChange, entryType, className = '' }: PositionMovementIconProps) {
  if (positionChange === null || positionChange === undefined) {
    if (entryType === 're-entry') {
      return (
        <span className={`inline-flex items-center justify-center text-blue-500 ${className}`} title="Returned to chart">
          <FontAwesomeIcon icon={faArrowRotateLeft} />
        </span>
      )
    }
    return (
      <span className={`inline-flex items-center justify-center text-amber-500 ${className}`} title="New entry">
        <FontAwesomeIcon icon={faStar} />
      </span>
    )
  }

  if (positionChange < 0) {
    return (
      <span className={`inline-flex items-center justify-center text-green-600 ${className}`} title={`Moved up ${Math.abs(positionChange)} position${Math.abs(positionChange) !== 1 ? 's' : ''}`}>
        <FontAwesomeIcon icon={faCaretUp} />
      </span>
    )
  }

  if (positionChange > 0) {
    return (
      <span className={`inline-flex items-center justify-center text-red-600 ${className}`} title={`Moved down ${positionChange} position${positionChange !== 1 ? 's' : ''}`}>
        <FontAwesomeIcon icon={faCaretDown} />
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center justify-center text-[var(--text-muted)] ${className}`} title="No change">
      <FontAwesomeIcon icon={faMinus} />
    </span>
  )
}
