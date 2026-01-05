'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faUsers,
  faCog,
  faChartLine,
  faEnvelope,
  faHandPaper,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'

interface QuickActionsData {
  pendingInvitesCount: number
  pendingRequestsCount: number
  groupsCount: number
}

export default function QuickActionsPanel() {
  const [data, setData] = useState<QuickActionsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/quick-actions')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setData(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setError('Failed to load quick actions')
        setIsLoading(false)
        console.error('Error fetching quick actions:', err)
      })
  }, [])

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Quick Actions</h2>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    // Show basic actions even on error
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/groups/create"
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black rounded-lg hover:from-yellow-600 hover:to-yellow-500 transition-all shadow-sm hover:shadow font-semibold"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faPlus} />
            </div>
            <div>
              <div className="font-bold">Create Group</div>
              <div className="text-xs opacity-80">Start a new listening group</div>
            </div>
          </Link>
          <Link
            href="/groups"
            className="flex items-center gap-3 p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <div>
              <div className="font-semibold text-gray-900">View All Groups</div>
            </div>
          </Link>
        </div>
      </div>
    )
  }

  const { pendingInvitesCount, pendingRequestsCount, groupsCount } = data
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          href="/groups/create"
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black rounded-lg hover:from-yellow-600 hover:to-yellow-500 transition-all shadow-sm hover:shadow font-semibold"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <FontAwesomeIcon icon={faPlus} />
          </div>
          <div>
            <div className="font-bold">Create Group</div>
            <div className="text-xs opacity-80">Start a new listening group</div>
          </div>
        </Link>

        <Link
          href="/groups"
          className="flex items-center gap-3 p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div>
            <div className="font-semibold text-gray-900">View All Groups</div>
            <div className="text-xs text-gray-600">{groupsCount} {groupsCount === 1 ? 'group' : 'groups'}</div>
          </div>
        </Link>

        {pendingInvitesCount > 0 && (
          <Link
            href="/groups"
            className="flex items-center gap-3 p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors border border-yellow-200"
          >
            <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-700 relative">
              <FontAwesomeIcon icon={faEnvelope} />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {pendingInvitesCount}
              </span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Pending Invites</div>
              <div className="text-xs text-gray-600">{pendingInvitesCount} {pendingInvitesCount === 1 ? 'invite' : 'invites'}</div>
            </div>
          </Link>
        )}

        {pendingRequestsCount > 0 && (
          <Link
            href="/groups"
            className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
          >
            <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 relative">
              <FontAwesomeIcon icon={faHandPaper} />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {pendingRequestsCount}
              </span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Join Requests</div>
              <div className="text-xs text-gray-600">{pendingRequestsCount} {pendingRequestsCount === 1 ? 'request' : 'requests'}</div>
            </div>
          </Link>
        )}

        <Link
          href="/profile"
          className="flex items-center gap-3 p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
            <FontAwesomeIcon icon={faCog} />
          </div>
          <div>
            <div className="font-semibold text-gray-900">Edit Profile</div>
            <div className="text-xs text-gray-600">Update your settings</div>
          </div>
        </Link>
      </div>
    </div>
  )
}

