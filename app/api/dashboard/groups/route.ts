import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGroupQuickViews } from '@/lib/dashboard-queries'

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
    const groups = await getGroupQuickViews(user.id)
    
    // Convert Date objects to ISO strings for JSON serialization
    return NextResponse.json(
      groups.map((group) => ({
        ...group,
        latestWeek: group.latestWeek
          ? {
              ...group.latestWeek,
              weekStart: group.latestWeek.weekStart.toISOString(),
            }
          : null,
      }))
    )
  } catch (error) {
    console.error('Error fetching group quick views:', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}

