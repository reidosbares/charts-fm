import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get all pending invites for a group (owner only)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const groupId = params.id

  // Check if group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Verify user is the group owner
  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group owner can view invites' },
      { status: 403 }
    )
  }

  // Get all pending invites with user details
  const invites = await prisma.groupInvite.findMany({
    where: {
      groupId,
      status: 'pending',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json({ invites })
}

// DELETE - Revoke an invite (owner can revoke pending invites)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const groupId = params.id
  const { searchParams } = new URL(request.url)
  const inviteId = searchParams.get('inviteId')

  if (!inviteId) {
    return NextResponse.json(
      { error: 'Invite ID is required' },
      { status: 400 }
    )
  }

  // Check if group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Verify user is the group owner
  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group owner can revoke invites' },
      { status: 403 }
    )
  }

  // Validate invite exists and belongs to the group
  const invite = await prisma.groupInvite.findUnique({
    where: { id: inviteId },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.groupId !== groupId) {
    return NextResponse.json(
      { error: 'Invite does not belong to this group' },
      { status: 400 }
    )
  }

  if (invite.status !== 'pending') {
    return NextResponse.json(
      { error: 'Can only revoke pending invites' },
      { status: 400 }
    )
  }

  // Delete the invite
  await prisma.groupInvite.delete({
    where: { id: inviteId },
  })

  return NextResponse.json({ success: true })
}

