import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'

interface BreadcrumbSegment {
  label: string
  href?: string
}

interface GroupPageHeroProps {
  group: {
    id: string
    name: string
    image: string | null
  }
  breadcrumbs: BreadcrumbSegment[]
  subheader: string | React.ReactNode
  actionButton?: React.ReactNode
  narrow?: boolean
}

export default function GroupPageHero({ group, breadcrumbs, subheader, actionButton, narrow = false }: GroupPageHeroProps) {
  return (
    <div className={narrow ? "mb-3 md:mb-4" : "mb-4 md:mb-6"}>
      <div className={`bg-[var(--theme-background-from)] rounded-xl shadow-lg border border-theme ${narrow ? 'p-2 md:p-3' : 'p-3 md:p-4'}`}>
        <nav className={`flex items-center flex-wrap gap-1 md:gap-2 text-xs md:text-sm ${narrow ? 'mb-1 md:mb-2' : 'mb-2 md:mb-3'}`}>
          {breadcrumbs.map((segment, index) => (
            <span key={index} className="flex items-center gap-1 md:gap-2">
              {segment.href ? (
                <Link
                  href={segment.href}
                  className="text-gray-500 hover:text-[var(--theme-text)] transition-colors break-words"
                >
                  {segment.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium break-words">{segment.label}</span>
              )}
              {index < breadcrumbs.length - 1 && <span className="text-gray-400 flex-shrink-0">/</span>}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <div className={`relative flex-shrink-0 ${narrow ? 'w-8 h-8 md:w-10 md:h-10' : 'w-10 h-10 md:w-12 md:h-12'}`}>
            <div className={`${narrow ? 'w-8 h-8 md:w-10 md:h-10' : 'w-10 h-10 md:w-12 md:h-12'} rounded-lg overflow-hidden shadow-md ring-2 ring-[var(--theme-ring)]/30 bg-[var(--theme-primary-lighter)]`}>
              <SafeImage
                src={group.image}
                alt={group.name}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`font-bold text-[var(--theme-primary-dark)] ${narrow ? 'text-lg md:text-xl mb-0.5' : 'text-xl md:text-2xl mb-0.5 md:mb-1'} break-words`}>
              {group.name}
            </h1>
            {typeof subheader === 'string' ? (
              <p className={`text-gray-500 ${narrow ? 'text-xs mt-0.5' : 'text-xs md:text-sm mt-0.5 md:mt-1'}`}>{subheader}</p>
            ) : (
              <div className={`text-gray-500 ${narrow ? 'text-xs mt-0.5' : 'text-xs md:text-sm mt-0.5 md:mt-1'}`}>{subheader}</div>
            )}
          </div>
          {actionButton && (
            <div className="flex-shrink-0 hidden sm:block">
              {actionButton}
            </div>
          )}
        </div>
        {actionButton && (
          <div className="flex-shrink-0 mt-2 sm:hidden">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  )
}

