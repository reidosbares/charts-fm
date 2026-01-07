// Utility functions for checking group membership and access control

import { redirect } from 'next/navigation'
import { getSession } from './auth'
import { prisma } from './prisma'
import { getGroupById } from './group-queries'
import { routing } from '@/i18n/routing'

/**
 * Ensures the user is authenticated and is a member or creator of the group.
 * Redirects to public page if not a member, or shows "Group not found" if group doesn't exist.
 * 
 * @param groupId - The group ID to check
 * @returns Object with user and group if access is granted
 */
export async function requireGroupMembership(groupId: string) {
  const session = await getSession()
  
  if (!session?.user?.email) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      locale: true,
    },
  })

  if (!user) {
    redirect('/')
  }
  
  // Get user's locale or use default
  const userLocale = user.locale || routing.defaultLocale

  // First check if the group exists (without membership restriction)
  const groupExists = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true },
  })

  if (!groupExists) {
    // Group doesn't exist - this will be handled by the calling page
    return { user, group: null }
  }

  // Check if user is a member or creator
  const group = await getGroupById(groupId, user.id)
  
  // If group exists but user is not a member, redirect to public page with user's locale
  if (!group) {
    redirect(`/${userLocale}/groups/${groupId}/public`)
  }

  return { user, group }
}

/**
 * Ensures the user is authenticated and is the creator of the group.
 * Redirects to public page if not a member, or to group page if member but not creator.
 * 
 * @param groupId - The group ID to check
 * @returns Object with user and group if access is granted
 */
export async function requireGroupCreator(groupId: string) {
  const { user, group } = await requireGroupMembership(groupId)
  
  if (!group) {
    // Group doesn't exist - this will be handled by the calling page
    return { user, group: null }
  }

  // Check if user is the creator
  if (group.creatorId !== user.id) {
    // If they're a member but not creator, redirect to group page
    // Otherwise, requireGroupMembership would have already redirected to public
    redirect(`/groups/${groupId}`)
  }

  return { user, group }
}

