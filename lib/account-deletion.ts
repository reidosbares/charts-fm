import { prisma } from './prisma'

/**
 * Handle groups during account deletion:
 * - If user is only member, delete the group
 * - If user owns group and has other members, transfer ownership to oldest member
 * - If user doesn't own group, membership removal is handled by cascade
 */
export async function handleGroupsDuringDeletion(userId: string): Promise<{
  deletedGroups: string[]
  transferredGroups: Array<{ groupId: string; newOwnerId: string }>
}> {
  const deletedGroups: string[] = []
  const transferredGroups: Array<{ groupId: string; newOwnerId: string }> = []

  // Get all groups where user is a member
  const userMemberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          members: {
            orderBy: {
              joinedAt: 'asc',
            },
          },
        },
      },
    },
  })

  for (const membership of userMemberships) {
    const group = membership.group
    const isOwner = group.creatorId === userId
    const memberCount = group.members.length

    if (memberCount === 1) {
      // User is the only member - delete the group
      await prisma.group.delete({
        where: { id: group.id },
      })
      deletedGroups.push(group.id)
    } else if (isOwner) {
      // User owns the group and there are other members - transfer ownership
      // Find the oldest member (excluding the current user)
      const otherMembers = group.members.filter(m => m.userId !== userId)
      if (otherMembers.length > 0) {
        const oldestMember = otherMembers[0] // Already sorted by joinedAt asc
        await prisma.group.update({
          where: { id: group.id },
          data: { creatorId: oldestMember.userId },
        })
        transferredGroups.push({
          groupId: group.id,
          newOwnerId: oldestMember.userId,
        })
      }
    }
    // If user is not owner and there are other members, cascade will handle membership removal
  }

  return { deletedGroups, transferredGroups }
}

/**
 * Anonymize user data in GroupTrends JSON fields
 */
export async function anonymizeUserInTrends(userId: string, userName: string): Promise<void> {
  // Get all groups where user is/was a member
  const userGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  })

  if (userGroups.length === 0) {
    return
  }

  const groupIds = userGroups.map(g => g.groupId)

  // Get all trends for these groups
  const trends = await prisma.groupTrends.findMany({
    where: { groupId: { in: groupIds } },
  })

  for (const trend of trends) {
    const updates: {
      topContributors?: any
      memberSpotlight?: any
    } = {}
    let hasUpdates = false

    // Update topContributors if user appears there
    if (trend.topContributors && Array.isArray(trend.topContributors)) {
      const topContributors = trend.topContributors as Array<{
        userId: string
        name: string
        [key: string]: any
      }>

      const userInContributors = topContributors.some(c => c.userId === userId)
      if (userInContributors) {
        const updatedContributors = topContributors.map(contributor => {
          if (contributor.userId === userId) {
            return { ...contributor, userId: null, name: 'Deleted User' }
          }
          return contributor
        })
        updates.topContributors = updatedContributors
        hasUpdates = true
      }
    }

    // Update memberSpotlight if user is the spotlighted member
    if (trend.memberSpotlight) {
      const memberSpotlight = trend.memberSpotlight as {
        userId: string
        name: string
        [key: string]: any
      }

      if (memberSpotlight.userId === userId) {
        updates.memberSpotlight = {
          ...memberSpotlight,
          userId: null,
          name: 'Deleted User',
        }
        hasUpdates = true
      }
    }

    // Only update if changes were made
    if (hasUpdates) {
      await prisma.groupTrends.update({
        where: { id: trend.id },
        data: updates,
      })
    }
  }
}

/**
 * Anonymize user's comments by setting userId to null
 * Uses raw SQL because Prisma doesn't allow updating foreign key fields in updateMany
 */
export async function anonymizeUserComments(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE group_comments
    SET "userId" = NULL
    WHERE "userId" = ${userId}
  `
}

