import { requireGroupMembership } from '@/lib/group-auth'
import { getTrendsForGroup } from '@/lib/group-trends'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import TrendsClient from './TrendsClient'

// Helper function to format date as "Dec. 28, 2025"
function formatDateWritten(date: Date): string {
  const monthNames = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']
  const month = monthNames[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  return `${month} ${day}, ${year}`
}

export default async function TrendsPage({ params }: { params: { id: string } }) {
  const { user, group } = await requireGroupMembership(params.id)

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <Link href="/groups" className="text-gray-600 hover:underline">
            Back to Groups
          </Link>
        </div>
      </main>
    )
  }

  // Get color theme
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get trends data
  const trends = await getTrendsForGroup(group.id)

  if (!trends) {
    return (
      <main className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
        <div className="max-w-7xl w-full mx-auto">
          <div className="mb-6">
            <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-4 border border-theme">
              <nav className="mb-3 flex items-center gap-2 text-sm">
                <Link 
                  href="/groups" 
                  className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
                >
                  Groups
                </Link>
                <span className="text-gray-400">/</span>
                <Link 
                  href={`/groups/${group.id}`}
                  className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
                >
                  {group.name}
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Trends</span>
              </nav>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">No trends available yet.</p>
            <p className="text-gray-500 text-sm">Generate charts to see weekly trends and insights!</p>
          </div>
        </div>
      </main>
    )
  }

  const weekStartFormatted = formatDateWritten(trends.weekStart)
  const weekEndFormatted = formatDateWritten(trends.weekEnd)

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <div className="bg-[var(--theme-background-from)] rounded-xl shadow-lg p-4 border border-theme">
            <nav className="mb-3 flex items-center gap-2 text-sm">
              <Link 
                href="/groups" 
                className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
              >
                Groups
              </Link>
              <span className="text-gray-400">/</span>
              <Link 
                href={`/groups/${group.id}`}
                className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
              >
                {group.name}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Trends</span>
            </nav>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0">
                <div className="w-12 h-12 rounded-lg overflow-hidden shadow-md ring-2 ring-[var(--theme-ring)]/30 bg-[var(--theme-primary-lighter)]">
                  <SafeImage
                    src={group.image}
                    alt={group.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-[var(--theme-primary-dark)] mb-1">
                  {group.name}
                </h1>
                <p className="text-sm text-gray-600">
                  Week of {weekStartFormatted}
                  <span className="text-xs italic text-gray-500 ml-1">
                    (from {weekStartFormatted} to {weekEndFormatted})
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trends Content - Client Component */}
        <TrendsClient trends={trends} groupId={group.id} userId={user.id} />
      </div>
    </main>
  )
}

