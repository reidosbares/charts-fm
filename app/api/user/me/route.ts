import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use user ID from session instead of email to avoid issues with stale session data
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lastfmUsername: true,
      isSuperuser: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const payload: {
    user: typeof user
    impersonating?: boolean
    realUser?: { id: string; name: string | null; email: string | null; isSuperuser: boolean }
  } = { user }

  if (session.impersonating && session.realUser) {
    payload.impersonating = true
    const realUserFromDb = await prisma.user.findUnique({
      where: { id: session.realUser.id },
      select: { id: true, name: true, email: true, isSuperuser: true },
    })
    if (realUserFromDb) {
      payload.realUser = {
        id: realUserFromDb.id,
        name: realUserFromDb.name,
        email: realUserFromDb.email,
        isSuperuser: realUserFromDb.isSuperuser,
      }
    }
  }

  return NextResponse.json(payload)
}

