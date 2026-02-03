import { NextResponse } from 'next/server'
import { requireGroupMembership, requireGroupCreator } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getSuperuser } from '@/lib/admin'
import { fetchLastFMData } from '@/lib/lastfm'

const MAX_GROUP_MEMBERS = 100

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupCreator(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const body = await request.json()
    const { lastfmUsername } = body

    if (!lastfmUsername || typeof lastfmUsername !== 'string') {
      return NextResponse.json(
        { error: 'Last.fm username is required' },
        { status: 400 }
      )
    }

    const trimmedUsername = lastfmUsername.trim()

    // Check if the current user is a superuser
    const superuser = await getSuperuser()
    const isSuperuser = superuser !== null && superuser.id === user.id

    // Find the user by lastfmUsername
    let invitee = await prisma.user.findUnique({
      where: { lastfmUsername: trimmedUsername },
    })

    // Track if we just created this user account
    let wasJustCreated = false

    // If user doesn't exist and requester is a superuser, create a mostly-empty account
    if (!invitee && isSuperuser) {
      // Verify the Last.fm username exists by trying to fetch user info
      const apiKey = process.env.LASTFM_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: 'Last.fm API key not configured' },
          { status: 500 }
        )
      }

      try {
        // Try to fetch user info to verify the username exists
        await fetchLastFMData('user.getInfo', trimmedUsername, apiKey)
      } catch (error: any) {
        // If the API call fails, the user likely doesn't exist
        return NextResponse.json(
          { error: `Last.fm user "${trimmedUsername}" not found or invalid` },
          { status: 404 }
        )
      }

      // Generate a unique email for the new user
      // Use a pattern similar to bulk-generate: {username}@chartsfm.local
      const baseEmail = `${trimmedUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}@chartsfm.local`
      let email = baseEmail
      let emailCounter = 1

      // Ensure email is unique
      while (await prisma.user.findUnique({ where: { email } })) {
        email = `${baseEmail.split('@')[0]}${emailCounter}@chartsfm.local`
        emailCounter++
      }

      // Create a mostly-empty account
      invitee = await prisma.user.create({
        data: {
          email,
          name: trimmedUsername,
          password: null,
          lastfmUsername: trimmedUsername,
          lastfmSessionKey: null,
          image: null,
          emailVerified: false, // They'll need to verify if they want to log in
          isSuperuser: false,
        },
      })
      wasJustCreated = true
    } else if (!invitee) {
      // User doesn't exist and requester is not a superuser
      return NextResponse.json(
        { error: 'User with this Last.fm username not found' },
        { status: 404 }
      )
    }

    // Check if user is trying to invite themselves
    if (invitee.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot invite yourself to the group' },
        { status: 400 }
      )
    }

    // Check if group has reached the maximum member limit
    const memberCount = await prisma.groupMember.count({
      where: { groupId: group.id },
    })

    if (memberCount >= MAX_GROUP_MEMBERS) {
      return NextResponse.json(
        { error: `Group has reached the maximum limit of ${MAX_GROUP_MEMBERS} members` },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: invitee.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this group' },
        { status: 400 }
      )
    }

    // If this is a superuser adding a newly created user, add them directly to the group
    // Otherwise, create an invite as usual

    // Check if there's already a pending invite
    const existingInvite = await prisma.groupInvite.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: invitee.id,
        },
      },
    })

    if (existingInvite) {
      if (existingInvite.status === 'pending') {
        // If superuser is adding a newly created user, delete the invite and add directly
        if (wasJustCreated) {
          await prisma.groupInvite.delete({
            where: { id: existingInvite.id },
          })
        } else {
          return NextResponse.json(
            { error: 'User already has a pending invite' },
            { status: 400 }
          )
        }
      } else {
        // If there's a rejected/accepted invite, we can create a new one
        // Delete the old invite first
        await prisma.groupInvite.delete({
          where: { id: existingInvite.id },
        })
      }
    }

    // If superuser just created the account, add them directly to the group
    if (wasJustCreated) {
      const member = await prisma.groupMember.create({
        data: {
          groupId: group.id,
          userId: invitee.id,
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

      return NextResponse.json(
        {
          success: true,
          member: {
            id: member.id,
            userId: member.userId,
            joinedAt: member.joinedAt.toISOString(),
            user: {
              id: member.user.id,
              name: member.user.name,
              lastfmUsername: member.user.lastfmUsername,
              image: member.user.image,
            },
          },
          accountCreated: true,
        },
        { status: 201 }
      )
    }

    // Otherwise, create the invite as usual
    const invite = await prisma.groupInvite.create({
      data: {
        groupId: group.id,
        userId: invitee.id,
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

    return NextResponse.json(
      {
        success: true,
        invite: {
          id: invite.id,
          userId: invite.userId,
          createdAt: invite.createdAt.toISOString(),
          user: {
            id: invite.user.id,
            name: invite.user.name,
            lastfmUsername: invite.user.lastfmUsername,
            image: invite.user.image,
          },
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error creating invite:', error)
    
    // Handle Prisma validation errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Invite already exists' },
        { status: 400 }
      )
    }
    
    // Handle Prisma invalid ID format errors
    if (error.message && error.message.includes('did not match the expected pattern')) {
      return NextResponse.json(
        { error: 'Invalid group ID format' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create invite' },
      { status: 500 }
    )
  }
}

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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('userId')

    // No userId = current user is leaving the group (require membership only)
    if (!userIdParam || userIdParam.trim() === '') {
      const { user, group } = await requireGroupMembership(params.id)

      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }

      if (user.id === group.creatorId) {
        return NextResponse.json(
          { error: "Group owner can't leave; transfer ownership or delete the group" },
          { status: 400 }
        )
      }

      await prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: user.id,
          },
        },
      })

      return NextResponse.json({ success: true })
    }

    // userId provided = owner removing another member (require creator)
    const { user, group } = await requireGroupCreator(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const userId = userIdParam.trim()

    // Prevent removing the creator
    if (userId === group.creatorId) {
      return NextResponse.json(
        { error: 'Cannot remove the group creator' },
        { status: 400 }
      )
    }

    // Check if the member exists
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found in this group' },
        { status: 404 }
      )
    }

    // Remove the member
    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error removing member:', error)
    
    // Handle Prisma validation errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }
    
    // Handle Prisma invalid ID format errors
    if (error.message && error.message.includes('did not match the expected pattern')) {
      return NextResponse.json(
        { error: 'Invalid group ID or user ID format' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to remove member' },
      { status: 500 }
    )
  }
}
