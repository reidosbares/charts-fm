import { NextResponse } from 'next/server'
import { requireSuperuserApi } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Check superuser access
    await requireSuperuserApi()

    // Calculate cutoff date (10 weeks ago)
    const cutoffDate = new Date()
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - (10 * 7))
    cutoffDate.setUTCHours(0, 0, 0, 0)

    // Delete UserWeeklyStats entries older than 10 weeks
    const result = await prisma.userWeeklyStats.deleteMany({
      where: {
        weekStart: {
          lt: cutoffDate,
        },
      },
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString().split('T')[0],
    })
  } catch (error) {
    console.error('UserWeeklyStats cleanup error:', error)
    
    // Handle unauthorized error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Superuser access required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to cleanup UserWeeklyStats entries',
      },
      { status: 500 }
    )
  }
}
