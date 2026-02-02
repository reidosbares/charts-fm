import { NextResponse } from 'next/server'
import { requireSuperuserApi } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Check superuser access
    await requireSuperuserApi()

    // Clear all cached major driver data from chartEntryStats
    // This will force recalculation on next access
    const result = await prisma.chartEntryStats.updateMany({
      where: {
        majorDriverUserId: { not: null },
      },
      data: {
        majorDriverUserId: null,
        majorDriverName: null,
        majorDriverVS: null,
        majorDriverPlays: null,
        majorDriverLastUpdated: null,
      },
    })

    return NextResponse.json({
      success: true,
      clearedCount: result.count,
    })
  } catch (error) {
    console.error('Major driver cache cleanup error:', error)
    
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
            : 'Failed to clear major driver cache',
      },
      { status: 500 }
    )
  }
}
