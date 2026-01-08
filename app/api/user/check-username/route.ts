import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSuperuser } from '@/lib/admin'

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

  // Check if the current user is a superuser
  const superuser = await getSuperuser()
  const isSuperuser = superuser !== null

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
    // If user doesn't exist but requester is a superuser, allow them to proceed
    // The members endpoint will create the account
    if (isSuperuser) {
      return NextResponse.json({
        exists: false,
        canProceed: true,
        error: 'User with this Last.fm username not found, but you can add them as a superuser',
      })
    }
    
    return NextResponse.json(
      { exists: false, error: 'User with this Last.fm username not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ exists: true, user })
}

