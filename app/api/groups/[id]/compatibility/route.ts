import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCachedCompatibilityScore, getOrCalculateCompatibilityScore } from '@/lib/group-compatibility'

const API_KEY = process.env.LASTFM_API_KEY!

// GET - Check if compatibility score exists (without calculating)
// POST - Calculate compatibility score on demand
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

  // Check if group exists and is public
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      isPrivate: true,
      creatorId: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.isPrivate) {
    return NextResponse.json({ error: 'Group is private' }, { status: 403 })
  }

  // Check if user is a member (don't show compatibility for own groups)
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id,
      },
    },
  })

  if (membership || group.creatorId === user.id) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
  }

  try {
    // Only check cache, don't calculate
    const score = await getCachedCompatibilityScore(user.id, groupId)

    if (!score) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
      exists: true,
      score: score.score,
      components: {
        artistOverlap: score.artistOverlap,
        trackOverlap: score.trackOverlap,
        genreOverlap: score.genreOverlap,
        patternScore: score.patternScore,
      },
    })
  } catch (error) {
    console.error('Error checking compatibility score:', error)
    return NextResponse.json(
      { error: 'Failed to check compatibility score' },
      { status: 500 }
    )
  }
}

// POST - Calculate compatibility score on demand
export async function POST(
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

  // Check if group exists and is public
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      isPrivate: true,
      creatorId: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.isPrivate) {
    return NextResponse.json({ error: 'Group is private' }, { status: 403 })
  }

  // Check if user is a member (don't show compatibility for own groups)
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id,
      },
    },
  })

  if (membership || group.creatorId === user.id) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
  }

  try {
    const score = await getOrCalculateCompatibilityScore(user.id, groupId, API_KEY)

    return NextResponse.json({
      score: score.score,
      components: {
        artistOverlap: score.artistOverlap,
        trackOverlap: score.trackOverlap,
        genreOverlap: score.genreOverlap,
        patternScore: score.patternScore,
      },
    })
  } catch (error) {
    console.error('Error calculating compatibility score:', error)
    return NextResponse.json(
      { error: 'Failed to calculate compatibility score' },
      { status: 500 }
    )
  }
}

