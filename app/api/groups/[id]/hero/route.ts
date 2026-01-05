import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getWeekStartForDay, getWeekEndForDay, formatWeekLabel } from '@/lib/weekly-utils'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Fetch members with images
    const membersWithImages = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastfmUsername: true,
            image: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    })

    const isOwner = user.id === group.creatorId
    const chartMode = (group.chartMode || 'plays_only') as string
    const colorTheme = (group.colorTheme || 'yellow') as string
    const trackingDayOfWeek = group.trackingDayOfWeek ?? 0

    // Calculate tracking day info and next chart date
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const trackingDayName = dayNames[trackingDayOfWeek]
    
    const now = new Date()
    const currentWeekStart = getWeekStartForDay(now, trackingDayOfWeek)
    const nextChartDate = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
    const nextChartDateFormatted = formatWeekLabel(nextChartDate)
    const daysUntilNextChart = Math.ceil((nextChartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        image: group.image,
        colorTheme,
        chartMode,
        trackingDayOfWeek,
        trackingDayName,
        creator: {
          id: group.creator.id,
          name: group.creator.name,
          lastfmUsername: group.creator.lastfmUsername,
        },
        memberCount: group._count.members,
      },
      isOwner,
      members: membersWithImages.map((m) => ({
        id: m.id,
        userId: m.userId,
        joinedAt: m.joinedAt.toISOString(),
        user: {
          id: m.user.id,
          name: m.user.name,
          lastfmUsername: m.user.lastfmUsername,
          image: m.user.image,
        },
      })),
      daysUntilNextChart,
      nextChartDateFormatted,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching group hero data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group data' },
      { status: 500 }
    )
  }
}

