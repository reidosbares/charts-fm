import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const isOwner = user.id === group.creatorId

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

    // Get pending invites for the group (owner only)
    let pendingInvites: any[] = []
    if (isOwner) {
      pendingInvites = await prisma.groupInvite.findMany({
        where: {
          groupId: group.id,
          status: 'pending',
        },
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
      })
    }

    // Get pending request count for group owner
    let requestCount = 0
    if (isOwner) {
      requestCount = await prisma.groupJoinRequest.count({
        where: {
          groupId: group.id,
          status: 'pending',
        },
      })
    }

    return NextResponse.json({
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
      pendingInvites: pendingInvites.map((invite) => ({
        id: invite.id,
        userId: invite.userId,
        createdAt: invite.createdAt.toISOString(),
        user: {
          id: invite.user.id,
          name: invite.user.name,
          lastfmUsername: invite.user.lastfmUsername,
          image: invite.user.image,
        },
      })),
      isOwner,
      requestCount,
      creatorId: group.creatorId,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
