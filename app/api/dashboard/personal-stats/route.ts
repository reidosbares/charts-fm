import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPersonalListeningStats } from '@/lib/dashboard-queries'

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
    const stats = await getPersonalListeningStats(user.id)
    
    // Convert Date objects to ISO strings for JSON serialization
    return NextResponse.json({
      ...stats,
      weekStart: stats.weekStart.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching personal stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personal stats' },
      { status: 500 }
    )
  }
}

