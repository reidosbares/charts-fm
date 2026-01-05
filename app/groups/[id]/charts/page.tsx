import { requireGroupMembership } from '@/lib/group-auth'
import { getGroupChartEntries, getGroupAvailableWeeks } from '@/lib/group-queries'
import { formatWeekDate, formatWeekLabel } from '@/lib/weekly-utils'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import ChartsClient from './ChartsClient'
import { getCachedChartEntries } from '@/lib/group-chart-metrics'

// Helper function to format date as "Dec. 28, 2025"
function formatDateWritten(date: Date): string {
  const monthNames = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']
  const month = monthNames[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  return `${month} ${day}, ${year}`
}

// Helper function to get week end date (6 days after week start)
function getWeekEndDate(weekStart: Date): Date {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  return weekEnd
}

type ChartType = 'artists' | 'tracks' | 'albums'

export default async function ChartsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { week?: string; type?: string }
}) {
  const { user, group } = await requireGroupMembership(params.id)

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <Link href="/groups" className="text-yellow-600 hover:underline">
            Back to Groups
          </Link>
        </div>
      </main>
    )
  }

  // Get available weeks
  const availableWeeks = await getGroupAvailableWeeks(group.id)

  if (availableWeeks.length === 0) {
    return (
      <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl w-full mx-auto">
          {/* Slim Hero Section */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-yellow-50 via-yellow-100/50 to-white rounded-xl shadow-lg p-4 border border-yellow-200/50">
              <nav className="mb-3 flex items-center gap-2 text-sm">
                <Link 
                  href="/groups" 
                  className="text-gray-500 hover:text-yellow-600 transition-colors"
                >
                  Groups
                </Link>
                <span className="text-gray-400">/</span>
                <Link 
                  href={`/groups/${group.id}`}
                  className="text-gray-500 hover:text-yellow-600 transition-colors"
                >
                  {group.name}
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Charts</span>
              </nav>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden shadow-md ring-2 ring-yellow-300/30 bg-gradient-to-br from-yellow-100 to-yellow-200">
                    <SafeImage
                      src={group.image}
                      alt={group.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-800 bg-clip-text text-transparent">
                    {group.name}
                  </h1>
                  <p className="text-sm text-gray-600">Charts</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No charts available yet.</p>
          </div>
        </div>
      </main>
    )
  }

  // Parse selected week (default to latest)
  const selectedWeekStr = searchParams.week || formatWeekDate(availableWeeks[0].weekStart)
  // Parse the date string (YYYY-MM-DD) and create a Date object
  const [year, month, day] = selectedWeekStr.split('-').map(Number)
  const selectedWeek = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

  // Parse selected chart type (default to artists)
  const selectedType = (searchParams.type || 'artists') as ChartType

  // Load all three chart types for instant switching
  const [artists, tracks, albums] = await Promise.all([
    getCachedChartEntries(group.id, selectedWeek, 'artists'),
    getCachedChartEntries(group.id, selectedWeek, 'tracks'),
    getCachedChartEntries(group.id, selectedWeek, 'albums'),
  ])

  const weekStartFormatted = formatDateWritten(selectedWeek)
  const weekEndDate = getWeekEndDate(selectedWeek)
  const weekEndFormatted = formatDateWritten(weekEndDate)

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl w-full mx-auto">
        {/* Slim Hero Section */}
        <div className="mb-6">
          <div className="bg-gradient-to-br from-yellow-50 via-yellow-100/50 to-white rounded-xl shadow-lg p-4 border border-yellow-200/50">
            <nav className="mb-3 flex items-center gap-2 text-sm">
              <Link 
                href="/groups" 
                className="text-gray-500 hover:text-yellow-600 transition-colors"
              >
                Groups
              </Link>
              <span className="text-gray-400">/</span>
              <Link 
                href={`/groups/${group.id}`}
                className="text-gray-500 hover:text-yellow-600 transition-colors"
              >
                {group.name}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Charts</span>
            </nav>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0">
                <div className="w-12 h-12 rounded-lg overflow-hidden shadow-md ring-2 ring-yellow-300/30 bg-gradient-to-br from-yellow-100 to-yellow-200">
                  <SafeImage
                    src={group.image}
                    alt={group.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-800 bg-clip-text text-transparent mb-1">
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

        <ChartsClient
          weeks={availableWeeks}
          currentWeek={selectedWeek}
          trackingDayOfWeek={group.trackingDayOfWeek ?? 0}
          initialType={selectedType}
          artists={artists}
          tracks={tracks}
          albums={albums}
        />
      </div>
    </main>
  )
}

