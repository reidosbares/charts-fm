import { NextResponse } from 'next/server'
import { getGroupAccess, checkGroupAccessForAPI } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getGroupImageUrl } from '@/lib/group-image-utils'
import {
  getOtherGroupIdsWhereEntryChartedRecently,
  getEntryStatsForOtherGroup,
} from '@/lib/chart-deep-dive'
import { ChartType } from '@/lib/chart-slugs'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string; type: string; slug: string } }
) {
  try {
    const { user, group } = await checkGroupAccessForAPI(params.id)

    const chartType = params.type as ChartType
    if (!['artists', 'tracks', 'albums'].includes(chartType)) {
      return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })
    }

    // Resolve slug to entryKey (same logic as main deep-dive route)
    let entry = await prisma.groupChartEntry.findFirst({
      where: {
        groupId: group.id,
        chartType,
        slug: params.slug,
      },
      select: { entryKey: true },
      orderBy: { weekStart: 'desc' },
    })

    if (!entry) {
      const { generateSlug } = await import('@/lib/chart-slugs')
      const allEntries = await prisma.groupChartEntry.findMany({
        where: { groupId: group.id, chartType },
        select: { entryKey: true },
        orderBy: { weekStart: 'desc' },
      })
      for (const e of allEntries) {
        if (generateSlug(e.entryKey, chartType) === params.slug) {
          entry = e
          break
        }
      }
    }

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const allOtherGroupIds = await getOtherGroupIdsWhereEntryChartedRecently(
      group.id,
      chartType,
      entry.entryKey
    )
    const otherGroupIds = allOtherGroupIds.slice(0, 5)

    const otherGroups: Array<{
      id: string
      name: string
      image: string | null
      stats: {
        peakPosition: number
        totalWeeksCharting: number
        totalVS: number
        totalPlays: number
      }
    }> = []

    for (const otherId of otherGroupIds) {
      const access = await getGroupAccess(otherId)
      if (!access.group) continue
      // Only show public groups in this widget (do not expose private groups)
      if (access.group.isPrivate) continue

      const [stats, image] = await Promise.all([
        getEntryStatsForOtherGroup(otherId, chartType, entry.entryKey),
        getGroupImageUrl({
          id: access.group.id,
          image: access.group.image,
          dynamicIconEnabled: access.group.dynamicIconEnabled,
          dynamicIconSource: access.group.dynamicIconSource,
        }),
      ])

      otherGroups.push({
        id: access.group.id,
        name: access.group.name,
        image,
        stats: {
          peakPosition: stats.peakPosition,
          totalWeeksCharting: stats.totalWeeksCharting,
          totalVS: stats.totalVS,
          totalPlays: stats.totalPlays,
        },
      })
    }

    return NextResponse.json({ otherGroups })
  } catch (error) {
    console.error('Error fetching other groups for entry:', error)
    return NextResponse.json(
      { error: 'Failed to fetch other groups' },
      { status: 500 }
    )
  }
}
