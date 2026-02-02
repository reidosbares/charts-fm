import { NextResponse } from 'next/server'
import { requireSuperuserApi } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { getEntryMajorDriver } from '@/lib/chart-deep-dive'
import type { ChartType } from '@/lib/chart-slugs'

interface GroupResult {
  groupId: string
  groupName: string
  entriesProcessed: number
  skipped: boolean
  reason?: string
}

/**
 * POST - Recalculate major drivers for currently charting entries of all groups
 * This is useful to populate major driver data after deploying the feature
 * or to refresh data after fixing calculation bugs.
 */
export async function POST() {
  try {
    // Check superuser access
    await requireSuperuserApi()

    // Get all groups that have chart data, excluding solo groups
    const groups = await prisma.group.findMany({
      where: {
        chartEntries: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        chartMode: true,
        _count: {
          select: { members: true },
        },
      },
    })

    const results: GroupResult[] = []
    let totalEntriesProcessed = 0

    for (const group of groups) {
      // Skip solo groups
      if (group._count.members <= 1) {
        results.push({
          groupId: group.id,
          groupName: group.name,
          entriesProcessed: 0,
          skipped: true,
          reason: 'Solo group',
        })
        continue
      }

      // Get the most recent week with chart entries for this group
      const latestWeek = await prisma.groupChartEntry.findFirst({
        where: { groupId: group.id },
        orderBy: { weekStart: 'desc' },
        select: { weekStart: true },
      })

      if (!latestWeek) {
        results.push({
          groupId: group.id,
          groupName: group.name,
          entriesProcessed: 0,
          skipped: true,
          reason: 'No chart entries',
        })
        continue
      }

      // Get all entries from the most recent chart week
      const currentEntries = await prisma.groupChartEntry.findMany({
        where: {
          groupId: group.id,
          weekStart: latestWeek.weekStart,
        },
        select: {
          chartType: true,
          entryKey: true,
        },
        distinct: ['chartType', 'entryKey'],
      })

      const chartMode = group.chartMode || 'vs'
      let entriesProcessed = 0

      // Process entries in batches
      const BATCH_SIZE = 10
      for (let i = 0; i < currentEntries.length; i += BATCH_SIZE) {
        const batch = currentEntries.slice(i, i + BATCH_SIZE)
        
        await Promise.all(
          batch.map(async (entry) => {
            try {
              await getEntryMajorDriver(
                group.id,
                entry.chartType as ChartType,
                entry.entryKey,
                chartMode
              )
              entriesProcessed++
            } catch (error) {
              console.error(
                `[Admin] Error calculating major driver for ${group.name}/${entry.chartType}/${entry.entryKey}:`,
                error
              )
            }
          })
        )
      }

      results.push({
        groupId: group.id,
        groupName: group.name,
        entriesProcessed,
        skipped: false,
      })
      totalEntriesProcessed += entriesProcessed
    }

    return NextResponse.json({
      success: true,
      totalGroupsProcessed: results.filter(r => !r.skipped).length,
      totalGroupsSkipped: results.filter(r => r.skipped).length,
      totalEntriesProcessed,
      details: results,
    })
  } catch (error) {
    console.error('Recalculate current major drivers error:', error)
    
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
            : 'Failed to recalculate major drivers',
      },
      { status: 500 }
    )
  }
}
