import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Reject a group recommendation
export async function POST(request: Request) {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const { groupId } = body

  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json(
      { error: 'groupId is required' },
      { status: 400 }
    )
  }

  // Check if group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Create or update rejection
  try {
    await prisma.groupRecommendationRejection.upsert({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId,
        },
      },
      create: {
        userId: user.id,
        groupId,
      },
      update: {
        // Just update timestamp if already exists
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error rejecting recommendation:', error)
    return NextResponse.json(
      { error: 'Failed to reject recommendation' },
      { status: 500 }
    )
  }
}

