import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { signOut } from 'next-auth/react'
import { handleGroupsDuringDeletion, anonymizeUserInTrends, anonymizeUserComments } from '@/lib/account-deletion'

export async function DELETE() {
  try {
    const session = await getSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        lastfmUsername: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent superuser deletion (optional safety check)
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isSuperuser: true },
    })

    if (fullUser?.isSuperuser) {
      return NextResponse.json(
        { error: 'Superuser accounts cannot be deleted' },
        { status: 403 }
      )
    }

    const userName = user.name || user.lastfmUsername || 'User'

    // Step 1: Handle groups (delete if only member, transfer ownership if owner)
    const { deletedGroups, transferredGroups } = await handleGroupsDuringDeletion(user.id)

    // Step 2: Anonymize user data in GroupTrends JSON
    await anonymizeUserInTrends(user.id, userName)

    // Step 3: Set ChartEntryStats.majorDriverUserId to null where user was major driver
    await prisma.chartEntryStats.updateMany({
      where: { majorDriverUserId: user.id },
      data: {
        majorDriverUserId: null,
        majorDriverName: null,
        majorDriverLastUpdated: null, // Mark as stale for recalculation
      },
    })

    // Step 4: Anonymize GroupComment entries (set userId to null)
    await anonymizeUserComments(user.id)

    // Step 5: UserChartEntryVS entries are preserved (onDelete: SetNull handles this)
    // No action needed - they will be preserved with userId = null

    // Step 6: Delete user-owned data (cascade handles most, but we need to handle some manually)
    // GroupMember entries - cascade will handle
    // UserWeeklyStats - cascade will handle
    // ListeningStat - cascade will handle
    // Friendship entries - cascade will handle
    // GroupJoinRequest and GroupInvite - cascade will handle
    // GroupCompatibilityScore - cascade will handle
    // GroupRecommendationRejection - cascade will handle
    // GroupRecommendationCache - cascade will handle
    // UserCommentBan entries - cascade will handle
    // GroupShoutboxPermission entries - cascade will handle

    // Step 7: Delete the user account
    await prisma.user.delete({
      where: { id: user.id },
    })

    // Return success response
    // Note: Session invalidation will happen automatically when the user is deleted
    // because the session callback checks if user exists
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
      deletedGroups: deletedGroups.length,
      transferredGroups: transferredGroups.length,
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete account',
      },
      { status: 500 }
    )
  }
}

