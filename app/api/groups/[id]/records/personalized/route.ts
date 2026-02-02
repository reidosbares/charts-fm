import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { getPersonalizedMemberStats } from '@/lib/member-group-stats'
import { prisma } from '@/lib/prisma'

/**
 * GET - Personalized member stats for a group member.
 * Requires the caller to be a member. Returns all-time contribution stats.
 * Query param: userId (optional) - member to load; if omitted, returns current user's stats.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params
    const { user, group, isMember } = await checkGroupAccessForAPI(groupId)

    if (!user || !isMember) {
      return NextResponse.json(
        { error: 'You must be a member to view contribution stats' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')
    const userIdToLoad = targetUserId && targetUserId.trim() !== '' ? targetUserId.trim() : user.id

    if (userIdToLoad !== user.id) {
      const isMemberOfGroup = await prisma.groupMember.findFirst({
        where: { groupId: group.id, userId: userIdToLoad },
      })
      if (!isMemberOfGroup) {
        return NextResponse.json(
          { error: 'User is not a member of this group' },
          { status: 403 }
        )
      }
    }

    const stats = await getPersonalizedMemberStats(group.id, userIdToLoad)

    if (!stats) {
      return NextResponse.json(
        {
          hasStats: false,
          totalVS: 0,
          totalPlays: 0,
          weeksAsMVP: 0,
          byChartType: {
            artists: { entriesHelpedDebut: 0, weeksAtOneContributed: 0, entriesAsMainDriver: 0 },
            tracks: { entriesHelpedDebut: 0, weeksAtOneContributed: 0, entriesAsMainDriver: 0 },
            albums: { entriesHelpedDebut: 0, weeksAtOneContributed: 0, entriesAsMainDriver: 0 },
          },
          driverEntries: [],
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    return NextResponse.json(
      { hasStats: true, ...stats },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status ?? 500
    const message = err instanceof Error ? err.message : 'Failed to load personalized stats'
    return NextResponse.json({ error: message }, { status })
  }
}
