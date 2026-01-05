import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActivityFeed } from '@/lib/dashboard-queries'

export async function GET() {
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

  try {
    const activities = await getActivityFeed(user.id, 10)
    
    // Convert Date objects to ISO strings for JSON serialization
    return NextResponse.json(
      activities.map((activity) => ({
        ...activity,
        timestamp: activity.timestamp.toISOString(),
      }))
    )
  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}

