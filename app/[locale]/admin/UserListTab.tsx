'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

interface User {
  id: string
  email: string
  name: string | null
  lastfmUsername: string
  emailVerified: boolean
  isSuperuser: boolean
  createdAt: string
  lastAccessedAt: string | null
  ownedGroups: Array<{ id: string; name: string }>
  memberGroups: Array<{ id: string; name: string }>
}

type SortColumn = 'name' | 'email' | 'lastfmUsername' | 'emailVerified' | 'isSuperuser' | 'createdAt' | 'lastAccessedAt' | 'ownedGroups' | 'memberGroups'
type SortDirection = 'asc' | 'desc'

export default function UserListTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<SortColumn>('lastAccessedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const searchUsers = useCallback(async (query: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const url = query
        ? `/api/admin/users/search?q=${encodeURIComponent(query)}`
        : '/api/admin/users/search'
      
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search users')
      }

      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    searchUsers(debouncedQuery)
  }, [debouncedQuery, searchUsers])

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    setUpdatingUsers(prev => new Set(prev).add(userId))
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailVerified: !currentStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update verification status')
      }

      // Update the user in the local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, emailVerified: !currentStatus }
            : user
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update verification status')
    } finally {
      setUpdatingUsers(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedUsers = useMemo(() => {
    const sorted = [...users]
    sorted.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case 'name':
          aValue = (a.name || a.email || '').toLowerCase()
          bValue = (b.name || b.email || '').toLowerCase()
          break
        case 'email':
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case 'lastfmUsername':
          aValue = a.lastfmUsername.toLowerCase()
          bValue = b.lastfmUsername.toLowerCase()
          break
        case 'emailVerified':
          aValue = a.emailVerified ? 1 : 0
          bValue = b.emailVerified ? 1 : 0
          break
        case 'isSuperuser':
          aValue = a.isSuperuser ? 1 : 0
          bValue = b.isSuperuser ? 1 : 0
          break
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'lastAccessedAt':
          // Handle null values - users who never accessed should be sorted last
          if (!a.lastAccessedAt && !b.lastAccessedAt) return 0
          if (!a.lastAccessedAt) return 1 // a goes to end
          if (!b.lastAccessedAt) return -1 // b goes to end
          aValue = new Date(a.lastAccessedAt).getTime()
          bValue = new Date(b.lastAccessedAt).getTime()
          break
        case 'ownedGroups':
          aValue = a.ownedGroups.length
          bValue = b.ownedGroups.length
          break
        case 'memberGroups':
          aValue = a.memberGroups.length
          bValue = b.memberGroups.length
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [users, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400 ml-1">↕</span>
    }
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  return (
    <div className="max-w-full mx-auto w-full">
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by email, name, or Last.fm username..."
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
        />
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-600 text-sm py-4">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-gray-600 text-sm py-4">
          {searchQuery ? 'No users found' : 'Enter a search query to find users'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th 
                  className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  Name / Email
                  <SortIcon column="name" />
                </th>
                <th 
                  className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('lastfmUsername')}
                >
                  Last.fm
                  <SortIcon column="lastfmUsername" />
                </th>
                <th 
                  className="text-center p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('emailVerified')}
                >
                  Verified
                  <SortIcon column="emailVerified" />
                </th>
                <th 
                  className="text-center p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('isSuperuser')}
                >
                  Superuser
                  <SortIcon column="isSuperuser" />
                </th>
                <th 
                  className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('ownedGroups')}
                >
                  Owns
                  <SortIcon column="ownedGroups" />
                </th>
                <th 
                  className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('memberGroups')}
                >
                  Member
                  <SortIcon column="memberGroups" />
                </th>
                <th 
                  className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('createdAt')}
                >
                  Created
                  <SortIcon column="createdAt" />
                </th>
                <th 
                  className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('lastAccessedAt')}
                >
                  Last Access
                  <SortIcon column="lastAccessedAt" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-2">
                    <div className="font-medium text-gray-900">{user.name || '—'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="p-2 text-gray-700">{user.lastfmUsername}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => toggleVerification(user.id, user.emailVerified)}
                      disabled={updatingUsers.has(user.id)}
                      className={`cursor-pointer hover:opacity-70 transition-opacity ${
                        user.emailVerified ? 'text-green-600' : 'text-yellow-600'
                      } ${updatingUsers.has(user.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={user.emailVerified ? 'Click to unverify' : 'Click to verify'}
                    >
                      {updatingUsers.has(user.id) ? (
                        <span className="text-gray-400">...</span>
                      ) : user.emailVerified ? (
                        <span>✓</span>
                      ) : (
                        <span>✗</span>
                      )}
                    </button>
                  </td>
                  <td className="p-2 text-center">
                    {user.isSuperuser ? (
                      <span className="text-purple-600">✓</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-2">
                    {user.ownedGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.ownedGroups.map((group) => (
                          <span
                            key={group.id}
                            className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded"
                            title={group.name}
                          >
                            {group.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-2">
                    {user.memberGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.memberGroups.map((group) => (
                          <span
                            key={group.id}
                            className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded"
                            title={group.name}
                          >
                            {group.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-2 text-gray-600 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-2 text-gray-600 text-xs">
                    {user.lastAccessedAt 
                      ? new Date(user.lastAccessedAt).toLocaleString()
                      : <span className="text-gray-400">Never</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
