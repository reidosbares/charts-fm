import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserGroups } from '@/lib/group-queries'
import { initializeGroupWithHistory } from '@/lib/group-service'

// GET - List user's groups
export async function GET() {
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

  const groups = await getUserGroups(user.id)

  return NextResponse.json({ groups })
}

// POST - Create a new group
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
  const { name, description, image, chartSize, trackingDayOfWeek, isPrivate, allowFreeJoin } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Group name is required' },
      { status: 400 }
    )
  }

  // Validate chartSize if provided
  if (chartSize !== undefined && ![10, 20, 50, 100].includes(Number(chartSize))) {
    return NextResponse.json(
      { error: 'Chart size must be 10, 20, 50, or 100' },
      { status: 400 }
    )
  }

  // Validate trackingDayOfWeek if provided
  if (trackingDayOfWeek !== undefined && (Number(trackingDayOfWeek) < 0 || Number(trackingDayOfWeek) > 6)) {
    return NextResponse.json(
      { error: 'Tracking day of week must be between 0 (Sunday) and 6 (Saturday)' },
      { status: 400 }
    )
  }

  // Create group
  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      image: image?.trim() || null,
      chartSize: chartSize !== undefined ? Number(chartSize) : 10,
      trackingDayOfWeek: trackingDayOfWeek !== undefined ? Number(trackingDayOfWeek) : 0,
      isPrivate: isPrivate === true,
      allowFreeJoin: isPrivate === true ? false : (allowFreeJoin === true), // Only allow free join for public groups
      creatorId: user.id,
      members: {
        create: {
          userId: user.id, // Creator is automatically a member
        },
      },
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastfmUsername: true,
            },
          },
        },
      },
    },
  })

  // Initialize with historical data (async, don't wait)
  initializeGroupWithHistory(group.id).catch(console.error)

  return NextResponse.json({ group }, { status: 201 })
}

