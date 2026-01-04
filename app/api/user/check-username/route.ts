import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Check if a user exists by Last.fm username
export async function GET(request: Request) {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lastfmUsername = searchParams.get('lastfmUsername')

  if (!lastfmUsername || typeof lastfmUsername !== 'string') {
    return NextResponse.json(
      { error: 'Last.fm username is required' },
      { status: 400 }
    )
  }

  // Find user by Last.fm username (case-insensitive)
  // Use findFirst with case-insensitive comparison since findUnique requires exact match
  const user = await prisma.user.findFirst({
    where: {
      lastfmUsername: {
        equals: lastfmUsername.trim(),
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      name: true,
      lastfmUsername: true,
    },
  })

  if (!user) {
    return NextResponse.json(
      { exists: false, error: 'User with this Last.fm username not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ exists: true, user })
}

