'use client'

import { useState } from 'react'

interface CleanupResult {
  deletedCount: number
  cutoffDate: string
}

interface RecalculateResult {
  groupsProcessed: number
  totalWeeksProcessed: number
  details: Array<{ groupId: string; groupName: string; weeksProcessed: number }>
}

interface MajorDriverCacheResult {
  clearedCount: number
}

interface RecalculateMajorDriversResult {
  totalGroupsProcessed: number
  totalGroupsSkipped: number
  totalEntriesProcessed: number
  details: Array<{
    groupId: string
    groupName: string
    entriesProcessed: number
    skipped: boolean
    reason?: string
  }>
}

type CleanupType = 'userChartEntryVS' | 'userWeeklyStats' | null

export default function CleanupTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [isClearingMajorDriverCache, setIsClearingMajorDriverCache] = useState(false)
  const [isRecalculatingMajorDrivers, setIsRecalculatingMajorDrivers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ type: CleanupType; result: CleanupResult } | null>(null)
  const [recalculateSuccess, setRecalculateSuccess] = useState<RecalculateResult | null>(null)
  const [majorDriverCacheSuccess, setMajorDriverCacheSuccess] = useState<MajorDriverCacheResult | null>(null)
  const [majorDriversRecalculateSuccess, setMajorDriversRecalculateSuccess] = useState<RecalculateMajorDriversResult | null>(null)

  const clearAllSuccess = () => {
    setSuccess(null)
    setRecalculateSuccess(null)
    setMajorDriverCacheSuccess(null)
    setMajorDriversRecalculateSuccess(null)
  }

  const handleCleanup = async (type: 'userChartEntryVS' | 'userWeeklyStats') => {
    const typeName = type === 'userChartEntryVS' ? 'UserChartEntryVS' : 'UserWeeklyStats'
    if (!confirm(`Are you sure you want to delete ${typeName} entries older than 10 weeks? This action cannot be undone.`)) {
      return
    }

    setError(null)
    clearAllSuccess()
    setIsLoading(true)

    try {
      const endpoint = type === 'userChartEntryVS' 
        ? '/api/admin/cleanup/user-chart-entry-vs'
        : '/api/admin/cleanup/user-weekly-stats'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to cleanup ${typeName} entries`)
      }

      setSuccess({ type, result: data })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecalculateMemberStats = async () => {
    if (!confirm('Are you sure you want to recalculate member impact stats for all groups? This may take a while for groups with many weeks of data.')) {
      return
    }

    setError(null)
    clearAllSuccess()
    setIsRecalculating(true)

    try {
      const response = await fetch('/api/admin/recalculate-member-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate member stats')
      }

      setRecalculateSuccess(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleClearMajorDriverCache = async () => {
    if (!confirm('Are you sure you want to clear all cached major driver data? The values will be recalculated on next access.')) {
      return
    }

    setError(null)
    clearAllSuccess()
    setIsClearingMajorDriverCache(true)

    try {
      const response = await fetch('/api/admin/cleanup/major-driver-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear major driver cache')
      }

      setMajorDriverCacheSuccess(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsClearingMajorDriverCache(false)
    }
  }

  const handleRecalculateCurrentMajorDrivers = async () => {
    if (!confirm('This will recalculate major drivers for currently charting entries of all groups. This may take a while. Continue?')) {
      return
    }

    setError(null)
    clearAllSuccess()
    setIsRecalculatingMajorDrivers(true)

    try {
      const response = await fetch('/api/admin/recalculate-current-major-drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate major drivers')
      }

      setMajorDriversRecalculateSuccess(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsRecalculatingMajorDrivers(false)
    }
  }

  // Calculate cutoff date (10 weeks ago)
  const cutoffDate = new Date()
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - (10 * 7))
  cutoffDate.setUTCHours(0, 0, 0, 0)
  const cutoffDateString = cutoffDate.toISOString().split('T')[0]

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Database Cleanup</h2>
        <p className="text-gray-600">
          Remove database entries older than 10 weeks. These entries are no longer needed 
          since charts can only be regenerated for up to 10 weeks in the past, and the 
          aggregated data is already stored in GroupChartEntry and GroupWeeklyStats.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <p className="font-semibold mb-2">Cleanup completed successfully!</p>
          <p>
            Deleted {success.result.deletedCount.toLocaleString()} {success.type === 'userChartEntryVS' ? 'UserChartEntryVS' : 'UserWeeklyStats'} 
            {' '}entries older than {success.result.cutoffDate}.
          </p>
        </div>
      )}

      {recalculateSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <p className="font-semibold mb-2">Recalculation completed successfully!</p>
          <p className="mb-2">
            Processed {recalculateSuccess.groupsProcessed} groups, {recalculateSuccess.totalWeeksProcessed} total weeks.
          </p>
          {recalculateSuccess.details.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium">View details</summary>
              <ul className="mt-2 text-sm space-y-1 max-h-48 overflow-y-auto">
                {recalculateSuccess.details.map((d) => (
                  <li key={d.groupId}>
                    {d.groupName}: {d.weeksProcessed} weeks
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {majorDriverCacheSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <p className="font-semibold mb-2">Major driver cache cleared successfully!</p>
          <p>
            Cleared cached data for {majorDriverCacheSuccess.clearedCount.toLocaleString()} chart entries.
            Values will be recalculated on next access.
          </p>
        </div>
      )}

      {majorDriversRecalculateSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <p className="font-semibold mb-2">Major drivers recalculated successfully!</p>
          <p className="mb-2">
            Processed {majorDriversRecalculateSuccess.totalGroupsProcessed} groups, 
            {majorDriversRecalculateSuccess.totalEntriesProcessed.toLocaleString()} entries.
            {majorDriversRecalculateSuccess.totalGroupsSkipped > 0 && (
              <> Skipped {majorDriversRecalculateSuccess.totalGroupsSkipped} groups (solo or no data).</>
            )}
          </p>
          {majorDriversRecalculateSuccess.details.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium">View details</summary>
              <ul className="mt-2 text-sm space-y-1 max-h-48 overflow-y-auto">
                {majorDriversRecalculateSuccess.details.map((d) => (
                  <li key={d.groupId} className={d.skipped ? 'text-gray-500' : ''}>
                    {d.groupName}: {d.skipped ? `Skipped (${d.reason})` : `${d.entriesProcessed} entries`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* UserChartEntryVS Cleanup */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">UserChartEntryVS Cleanup</h3>
            <p className="text-sm text-gray-600 mb-3">
              Remove UserChartEntryVS entries older than 10 weeks. These entries store per-user 
              Vibe Score contributions and are used for chart generation and member records calculation.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li>Entries older than 10 weeks will be deleted</li>
              <li>Cutoff date: <strong>{cutoffDateString}</strong></li>
              <li>Safe to delete because charts can only be regenerated for up to 10 weeks in the past</li>
              <li>Member records now use a rolling 10-week window</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleCleanup('userChartEntryVS')}
              disabled={isLoading}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Cleaning up...' : 'Cleanup UserChartEntryVS Entries'}
            </button>
          </div>
        </div>
      </div>

      {/* UserWeeklyStats Cleanup */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">UserWeeklyStats Cleanup</h3>
            <p className="text-sm text-gray-600 mb-3">
              Remove UserWeeklyStats entries older than 10 weeks. These entries cache user's 
              weekly listening data from Last.fm to avoid re-fetching during chart generation.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li>Entries older than 10 weeks will be deleted</li>
              <li>Cutoff date: <strong>{cutoffDateString}</strong></li>
              <li>Safe to delete because charts can only be regenerated for up to 10 weeks in the past</li>
              <li>If needed, data will be re-fetched from Last.fm API</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleCleanup('userWeeklyStats')}
              disabled={isLoading}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Cleaning up...' : 'Cleanup UserWeeklyStats Entries'}
            </button>
          </div>
        </div>
      </div>

      {/* Recalculate Member Impact Stats */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recalculate Member Impact Stats</h3>
            <p className="text-sm text-gray-600 mb-3">
              Rebuild the all-time member contribution statistics (MemberGroupStats) for all groups 
              from scratch. This recalculates total VS, entries helped debut, weeks at #1 contributed, 
              and weeks as MVP for every member.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li>Deletes existing stats and recomputes from historical chart data</li>
              <li>Use after fixing bugs in accumulation logic or after data migrations</li>
              <li>May take a while for groups with many weeks of chart history</li>
              <li>Safe to run at any time - does not affect chart data</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleRecalculateMemberStats}
              disabled={isRecalculating || isLoading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRecalculating ? 'Recalculating...' : 'Recalculate All Member Stats'}
            </button>
          </div>
        </div>
      </div>

      {/* Clear Major Driver Cache */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Clear Major Driver Cache</h3>
            <p className="text-sm text-gray-600 mb-3">
              Clear the cached &quot;Major Chart Driver&quot; data for all chart entries. This forces 
              recalculation of the major driver (top contributor) when drill-down pages are accessed.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li>Clears cached major driver user, name, VS, and plays values</li>
              <li>Use after fixing bugs in major driver calculation logic</li>
              <li>Values will be lazily recalculated on next page access</li>
              <li>Safe to run at any time - does not affect chart data</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClearMajorDriverCache}
              disabled={isClearingMajorDriverCache || isLoading || isRecalculating || isRecalculatingMajorDrivers}
              className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearingMajorDriverCache ? 'Clearing cache...' : 'Clear Major Driver Cache'}
            </button>
          </div>
        </div>
      </div>

      {/* Recalculate Current Major Drivers */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recalculate Current Major Drivers</h3>
            <p className="text-sm text-gray-600 mb-3">
              Calculate major drivers for all entries currently charting across all groups. 
              This is useful after deploying the feature or to populate data for the impact section on records pages.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li>Processes entries from the most recent chart week of each group</li>
              <li>Skips solo groups (no major driver needed)</li>
              <li>May take a while depending on total number of entries</li>
              <li>Safe to run at any time - does not affect chart data</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleRecalculateCurrentMajorDrivers}
              disabled={isRecalculatingMajorDrivers || isLoading || isRecalculating || isClearingMajorDriverCache}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRecalculatingMajorDrivers ? 'Recalculating...' : 'Recalculate Current Major Drivers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
