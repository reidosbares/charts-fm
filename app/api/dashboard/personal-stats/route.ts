import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPersonalListeningStats, StatsRange } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const rangeParam = request.nextUrl.searchParams.get('range')
  const range: StatsRange =
    rangeParam === '4weeks' || rangeParam === 'alltime' ? rangeParam : 'week'

  try {
    const stats = await getPersonalListeningStats(user.id, range)
    return NextResponse.json(
      {
        ...stats,
        weekStart: stats.weekStart.toISOString(),
        periodEnd: stats.periodEnd?.toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching personal stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personal stats' },
      { status: 500 }
    )
  }
}

