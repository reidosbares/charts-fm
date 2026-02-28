import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPersonalListeningStats, StatsRange } from '@/lib/dashboard-queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lastfmUsername: string }> }
) {
  const { lastfmUsername } = await params
  const username = decodeURIComponent(lastfmUsername).trim()

  if (!username) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: {
      id: true,
      profilePublic: true,
      showProfileStats: true,
    },
  })

  if (!user || !user.profilePublic || !user.showProfileStats) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const rangeParam = request.nextUrl.searchParams.get('range')
  const range: StatsRange =
    rangeParam === '4weeks' || rangeParam === 'alltime' ? rangeParam : 'week'

  try {
    const stats = await getPersonalListeningStats(user.id, range)
    return NextResponse.json({
      ...stats,
      weekStart: stats.weekStart.toISOString(),
      periodEnd: stats.periodEnd?.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching public personal stats:', error)
    return NextResponse.json({ error: 'Failed to fetch personal stats' }, { status: 500 })
  }
}

