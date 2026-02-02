import { NextResponse } from 'next/server'
import { getSuperuser } from '@/lib/admin'
import { recalculateAllMemberGroupStats } from '@/lib/member-group-stats'

/**
 * POST - Recalculate member impact stats (MemberGroupStats) for all groups.
 * Admin-only endpoint.
 */
export async function POST() {
  try {
    const superuser = await getSuperuser()
    if (!superuser) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const result = await recalculateAllMemberGroupStats()

    return NextResponse.json({
      success: true,
      groupsProcessed: result.groupsProcessed,
      totalWeeksProcessed: result.totalWeeksProcessed,
      details: result.details,
    })
  } catch (error) {
    console.error('Error recalculating member stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to recalculate member stats' },
      { status: 500 }
    )
  }
}
