import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faMusic, faMicrophone, faCompactDisc, faUser } from '@fortawesome/free-solid-svg-icons'
import { ChartType } from '@/lib/chart-slugs'
import SafeImage from '@/components/SafeImage'

interface ChartEntryCardProps {
  name: string
  artist?: string | null
  value?: string | React.ReactNode
  icon?: IconDefinition
  chartType?: ChartType | 'user'
  href?: string | null
  className?: string
  onClick?: () => void
  children?: React.ReactNode
  variant?: 'default' | 'nested'
  userImage?: string | null
  /** Image URL for artist/track/album entries (same styling as user image; use imageShape for albums) */
  entryImage?: string | null
  /** 'circle' (default) or 'roundedSquare' for album art */
  imageShape?: 'circle' | 'roundedSquare'
  accentColor?: string
  openInNewTab?: boolean
}

export default function ChartEntryCard({
  name,
  artist,
  value,
  icon,
  chartType,
  href,
  className = '',
  onClick,
  children,
  variant = 'default',
  userImage,
  entryImage,
  imageShape = 'circle',
  accentColor,
  openInNewTab = false,
}: ChartEntryCardProps) {
  // Determine icon based on chartType if icon not provided
  const getIcon = () => {
    if (icon) return icon
    if (chartType === 'artists') return faMicrophone
    if (chartType === 'tracks') return faMusic
    if (chartType === 'albums') return faCompactDisc
    if (chartType === 'user') return faUser
    return faMusic
  }

  // Use accent color if provided, otherwise use theme primary
  const iconColorClass = accentColor || 'text-[var(--theme-primary)]'

  // Render icon, user image, or artist/track/album image
  const showEntryImage = entryImage !== undefined && (chartType === 'artists' || chartType === 'tracks' || chartType === 'albums')
  const entryImageShapeClass = imageShape === 'roundedSquare' ? 'rounded-lg' : 'rounded-full'

  const iconContent = chartType === 'user' ? (
    <div className="relative w-12 h-12 rounded-full ring-1 ring-black/10 bg-[var(--theme-primary-lighter)] shadow-sm flex-shrink-0 overflow-hidden">
      <SafeImage
        src={userImage}
        alt={name}
        className="object-cover w-full h-full"
      />
    </div>
  ) : showEntryImage ? (
    <div className={`relative w-12 h-12 ring-1 ring-black/10 bg-[var(--theme-primary-lighter)] shadow-sm flex-shrink-0 overflow-hidden flex items-center justify-center ${entryImageShapeClass}`}>
      {entryImage ? (
        <SafeImage
          src={entryImage}
          alt={name}
          className="object-cover w-full h-full"
        />
      ) : (
        <FontAwesomeIcon icon={getIcon()} className={`text-lg ${iconColorClass}`} />
      )}
    </div>
  ) : (
    <FontAwesomeIcon 
      icon={getIcon()} 
      className={`text-lg ${iconColorClass}`}
    />
  )
  
  // Wrap icon/avatar in link if href is provided and it's a user
  const iconElement = href && chartType === 'user' ? (
    <Link
      href={href}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className="flex-shrink-0 hover:opacity-80 transition-opacity"
    >
      {iconContent}
    </Link>
  ) : iconContent

  const baseClasses = 'flex items-center gap-3 p-3 rounded-lg transition-all'
  const variantClasses = variant === 'nested'
    ? 'bg-white/60 hover:bg-[var(--theme-primary-lighter)]/40 border border-[var(--theme-border)]/50'
    : 'bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 border border-[var(--theme-border)]'

  const content = (
    <div
      className={`relative ${baseClasses} ${variantClasses} ${className}`}
      onClick={onClick}
    >
      {iconElement}
      <div className="flex-1 min-w-0">
        {href ? (
          <Link
            href={href}
            target={openInNewTab ? "_blank" : undefined}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            className="font-semibold text-gray-900 break-words hover:text-[var(--theme-primary)] transition-colors"
          >
            {name}
            {artist && (
              <span className="text-sm font-normal text-gray-600"> by {artist}</span>
            )}
          </Link>
        ) : (
          <div className="font-semibold text-gray-900 break-words">
            {name}
            {artist && (
              <span className="text-sm font-normal text-gray-600"> by {artist}</span>
            )}
          </div>
        )}
        {value && (
          <div className={`text-sm ${accentColor || 'text-[var(--theme-primary)]'} font-semibold mt-1`}>
            {value}
          </div>
        )}
      </div>
      {children}
    </div>
  )

  return content
}

