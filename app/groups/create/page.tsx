'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const CHART_SIZES = [10, 20, 50, 100]

export default function CreateGroupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    chartSize: 10,
    trackingDayOfWeek: 0,
    isPrivate: false,
    allowFreeJoin: false,
  })

  // If group becomes private, disable allowFreeJoin
  const handlePrivateChange = (newIsPrivate: boolean) => {
    setFormData({
      ...formData,
      isPrivate: newIsPrivate,
      allowFreeJoin: newIsPrivate ? false : formData.allowFreeJoin,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          allowFreeJoin: formData.isPrivate ? false : formData.allowFreeJoin, // Only allow free join for public groups
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create group')
      }

      // Redirect to the new group
      router.push(`/groups/${data.group.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8">Create Group</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="My Music Group"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Optional description for your group"
                rows={4}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                Group Icon (Image URL)
              </label>
              <input
                type="url"
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="https://example.com/icon.png"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Enter a URL to an image for your group icon
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-left focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-lg p-2 -m-2"
                disabled={isLoading}
              >
                <span className="text-sm font-medium text-gray-700">Advanced Settings</span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${showAdvanced ? 'transform rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-6">
                  <div>
                    <label htmlFor="chartSize" className="block text-sm font-medium text-gray-700 mb-2">
                      Chart Size
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      Number of items to display in each chart (Top 10, Top 20, Top 50, or Top 100)
                    </p>
                    <div className="flex gap-4">
                      {CHART_SIZES.map((size) => (
                        <label
                          key={size}
                          className={`flex items-center px-4 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
                            formData.chartSize === size
                              ? 'border-yellow-500 bg-yellow-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="chartSize"
                            value={size}
                            checked={formData.chartSize === size}
                            onChange={(e) => setFormData({ ...formData, chartSize: Number(e.target.value) })}
                            className="sr-only"
                            disabled={isLoading}
                          />
                          <span className="font-medium">Top {size}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="trackingDayOfWeek" className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking Day of Week
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      The day of the week when charts are calculated and when the week starts. For example, if set to Wednesday, weeks will run from Wednesday to Wednesday and charts will be calculated on Wednesdays.
                    </p>
                    <select
                      id="trackingDayOfWeek"
                      value={formData.trackingDayOfWeek}
                      onChange={(e) => setFormData({ ...formData, trackingDayOfWeek: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      disabled={isLoading}
                    >
                      {DAYS_OF_WEEK.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Privacy Settings
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isPrivate"
                        checked={formData.isPrivate}
                        onChange={(e) => handlePrivateChange(e.target.checked)}
                        className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                        disabled={isLoading}
                      />
                      <label htmlFor="isPrivate" className="text-sm text-gray-700">
                        Private Group
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Private groups are not viewable publicly and require approval to join
                    </p>
                  </div>

                  {!formData.isPrivate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Join Settings
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="allowFreeJoin"
                          checked={formData.allowFreeJoin}
                          onChange={(e) => setFormData({ ...formData, allowFreeJoin: e.target.checked })}
                          className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                          disabled={isLoading}
                        />
                        <label htmlFor="allowFreeJoin" className="text-sm text-gray-700">
                          Users can join freely
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        When enabled, users can join this group directly from the public page without requiring approval
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Group'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

