'use client'

import { useState } from 'react'

interface CleanupResult {
  deletedCount: number
  cutoffDate: string
}

export default function CleanupTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<CleanupResult | null>(null)

  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to delete UserChartEntryVS entries older than 10 weeks? This action cannot be undone.')) {
      return
    }

    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/cleanup/user-chart-entry-vs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup UserChartEntryVS entries')
      }

      setSuccess(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
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
        <h2 className="text-3xl font-bold mb-2">Cleanup UserChartEntryVS</h2>
        <p className="text-gray-600">
          Remove UserChartEntryVS entries older than 10 weeks. After charts are generated, 
          these entries are no longer needed as the aggregated data is stored in GroupChartEntry 
          and GroupWeeklyStats.
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
          <p>Deleted {success.deletedCount.toLocaleString()} UserChartEntryVS entries older than {success.cutoffDate}.</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cleanup Information</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Entries older than 10 weeks will be deleted</li>
              <li>Cutoff date: <strong>{cutoffDateString}</strong></li>
              <li>This action is safe because charts can only be regenerated for up to 10 weeks in the past</li>
              <li>Aggregated data is already stored in GroupChartEntry and GroupWeeklyStats</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCleanup}
              disabled={isLoading}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Cleaning up...' : 'Cleanup UserChartEntryVS Entries'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
