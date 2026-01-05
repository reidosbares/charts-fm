import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserGroupInvites } from '@/lib/group-queries'

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
    const [invites, ownedGroups] = await Promise.all([
      getUserGroupInvites(user.id),
      prisma.group.findMany({
        where: { creatorId: user.id },
        select: { id: true },
      }),
    ])

    const pendingRequestsCount =
      ownedGroups.length > 0
        ? await prisma.groupJoinRequest.count({
            where: {
              groupId: { in: ownedGroups.map((g) => g.id) },
              status: 'pending',
            },
          })
        : 0

    // Get total groups count
    const groupsCount = await prisma.group.count({
      where: {
        OR: [{ creatorId: user.id }, { members: { some: { userId: user.id } } }],
      },
    })

    return NextResponse.json({
      pendingInvitesCount: invites.length,
      pendingRequestsCount,
      groupsCount,
    })
  } catch (error) {
    console.error('Error fetching quick actions data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quick actions data' },
      { status: 500 }
    )
  }
}

