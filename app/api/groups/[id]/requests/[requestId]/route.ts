import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH - Accept a join request
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; requestId: string } }
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
  const requestId = params.requestId

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
      { error: 'Only the group owner can accept requests' },
      { status: 403 }
    )
  }

  // Validate request exists and belongs to the group
  const joinRequest = await prisma.groupJoinRequest.findUnique({
    where: { id: requestId },
  })

  if (!joinRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  if (joinRequest.groupId !== groupId) {
    return NextResponse.json(
      { error: 'Request does not belong to this group' },
      { status: 400 }
    )
  }

  if (joinRequest.status !== 'pending') {
    return NextResponse.json(
      { error: 'Request is not pending' },
      { status: 400 }
    )
  }

  // Check if user is not already a member (race condition protection)
  const existingMember = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: joinRequest.userId,
      },
    },
  })

  if (existingMember) {
    // User is already a member, just delete the request
    await prisma.groupJoinRequest.delete({
      where: { id: requestId },
    })
    return NextResponse.json({ success: true })
  }

  // Update request status to accepted and create GroupMember entry
  await prisma.$transaction([
    prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: { status: 'accepted' },
    }),
    prisma.groupMember.create({
      data: {
        groupId,
        userId: joinRequest.userId,
      },
    }),
  ])

  return NextResponse.json({ success: true })
}

// DELETE - Reject a join request (delete it)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; requestId: string } }
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
  const requestId = params.requestId

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
      { error: 'Only the group owner can reject requests' },
      { status: 403 }
    )
  }

  // Validate request exists and belongs to the group
  const joinRequest = await prisma.groupJoinRequest.findUnique({
    where: { id: requestId },
  })

  if (!joinRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  if (joinRequest.groupId !== groupId) {
    return NextResponse.json(
      { error: 'Request does not belong to this group' },
      { status: 400 }
    )
  }

  // Delete the request
  await prisma.groupJoinRequest.delete({
    where: { id: requestId },
  })

  return NextResponse.json({ success: true })
}

