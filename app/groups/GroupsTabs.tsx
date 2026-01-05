'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'

interface Group {
  id: string
  name: string
  image: string | null
  creator: {
    id: string
    name: string | null
    lastfmUsername: string
  }
  _count: {
    members: number
  }
  createdAt: Date
}

interface Invite {
  id: string
  groupId: string
  group: Group
  createdAt: Date
}

interface GroupsTabsProps {
  ownedGroups: Group[]
  memberGroups: Group[]
  invites: Invite[]
  userId: string
}

export default function GroupsTabs({ ownedGroups, memberGroups, invites, userId }: GroupsTabsProps) {
  const [activeTab, setActiveTab] = useState<'groups' | 'invites'>('groups')
  
  // Merge groups with owned groups first
  const allGroups = [...ownedGroups, ...memberGroups]
  const [rejectedInviteIds, setRejectedInviteIds] = useState<Set<string>>(new Set())
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null)
  const router = useRouter()

  const handleAcceptInvite = async (inviteId: string, groupId: string) => {
    setProcessingInviteId(inviteId)
    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invite')
      }

      // Refresh the page
      router.refresh()
    } catch (err) {
      console.error('Failed to accept invite:', err)
      setProcessingInviteId(null)
    }
  }

  const handleRejectInvite = async (inviteId: string, groupId: string) => {
    setProcessingInviteId(inviteId)
    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject invite')
      }

      // Grey out the card
      setRejectedInviteIds((prev) => new Set(prev).add(inviteId))
      setProcessingInviteId(null)
    } catch (err) {
      console.error('Failed to reject invite:', err)
      setProcessingInviteId(null)
    }
  }

  const renderGroupCard = (group: Group, href: string) => {
    const isOwner = group.creator.id === userId
    
    return (
      <Link
        key={group.id}
        href={href}
        className="bg-gradient-to-br from-white to-yellow-50/30 rounded-xl shadow-lg p-6 border border-yellow-200/50 hover:shadow-xl hover:border-yellow-300/50 transition-all group"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <div className="w-20 h-20 rounded-xl overflow-hidden shadow-md ring-2 ring-yellow-300/30 bg-gradient-to-br from-yellow-100 to-yellow-200 group-hover:ring-yellow-400/50 transition-all">
              <SafeImage
                src={group.image}
                alt={group.name}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold text-gray-900 group-hover:text-yellow-700 transition-colors truncate">
                {group.name}
              </h3>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="flex items-center gap-2 flex-wrap">
                <span>Owner:</span>
                <span className="font-semibold text-gray-900">{group.creator.name || group.creator.lastfmUsername}</span>
                {isOwner && (
                  <span className="text-xs bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-2 py-0.5 rounded-full font-bold shadow-sm">
                    YOU
                  </span>
                )}
              </p>
              <p className="flex items-center gap-2">
                <span className="text-yellow-600 font-medium">👥</span>
                <span>{group._count.members} {group._count.members === 1 ? 'member' : 'members'}</span>
              </p>
              <p className="text-xs text-gray-500">
                Created {new Date(group.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  const renderInviteCard = (invite: Invite) => {
    const isRejected = rejectedInviteIds.has(invite.id)
    const isProcessing = processingInviteId === invite.id

    return (
      <div
        key={invite.id}
        className={`bg-gradient-to-br from-white to-blue-50/30 rounded-xl shadow-lg p-6 border border-blue-200/50 transition-all ${
          isRejected ? 'opacity-50' : 'hover:shadow-xl hover:border-blue-300/50'
        }`}
      >
        <Link
          href={`/groups/${invite.groupId}/public`}
          className="block mb-4"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <div className="w-20 h-20 rounded-xl overflow-hidden shadow-md ring-2 ring-blue-300/30 bg-gradient-to-br from-blue-100 to-blue-200">
                <SafeImage
                  src={invite.group.image}
                  alt={invite.group.name}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-2xl font-bold text-gray-900 truncate">{invite.group.name}</h3>
                <span className="flex-shrink-0 text-xs bg-gradient-to-r from-blue-400 to-blue-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                  Invited
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span>Owner:</span>
                  <span className="font-semibold text-gray-900 ml-1">{invite.group.creator.name || invite.group.creator.lastfmUsername}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-blue-600 font-medium">👥</span>
                  <span>{invite.group._count.members} {invite.group._count.members === 1 ? 'member' : 'members'}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Created {new Date(invite.group.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </Link>
        <div className="flex gap-2 mt-4">
          <button
            onClick={(e) => {
              e.preventDefault()
              handleAcceptInvite(invite.id, invite.groupId)
            }}
            disabled={isProcessing || isRejected}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-400 hover:to-green-500 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
          >
            {isProcessing ? 'Processing...' : 'Accept'}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              handleRejectInvite(invite.id, invite.groupId)
            }}
            disabled={isProcessing || isRejected}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-400 hover:to-red-500 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
          >
            {isProcessing ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b-2 border-yellow-200/50">
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-6 py-4 font-semibold text-sm transition-all rounded-t-lg flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'border-b-2 border-yellow-500 text-yellow-700 bg-gradient-to-b from-yellow-50 to-transparent shadow-sm'
              : 'border-transparent text-gray-600 hover:text-yellow-600 hover:bg-yellow-50/50'
          }`}
        >
          <span className="text-lg">👥</span>
          My Groups
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`px-6 py-4 font-semibold text-sm transition-all rounded-t-lg flex items-center gap-2 ${
            activeTab === 'invites'
              ? 'border-b-2 border-yellow-500 text-yellow-700 bg-gradient-to-b from-yellow-50 to-transparent shadow-sm'
              : 'border-transparent text-gray-600 hover:text-yellow-600 hover:bg-yellow-50/50'
          }`}
        >
          <span className="text-lg">✉️</span>
          Invites {invites.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-yellow-500 text-black rounded-full text-xs font-bold">
              {invites.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'groups' && (
        <div>
          {allGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allGroups.map((group) => renderGroupCard(group, `/groups/${group.id}`))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-white to-yellow-50 rounded-xl shadow-lg p-12 text-center border border-yellow-200/50">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-gray-700 text-lg mb-2 font-medium">You don't have any groups yet.</p>
              <p className="text-gray-500 text-sm mb-6">Create your first group to start tracking listening habits together!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'invites' && (
        <div>
          {invites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invites.map((invite) => renderInviteCard(invite))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-12 text-center border border-blue-200/50">
              <div className="text-6xl mb-4">✉️</div>
              <p className="text-gray-700 text-lg mb-2 font-medium">You don't have any pending invites.</p>
              <p className="text-gray-500 text-sm">When someone invites you to a group, it will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

