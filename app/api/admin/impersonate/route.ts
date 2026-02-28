import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireSuperuserApi } from '@/lib/admin'
import { IMPERSONATE_COOKIE } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireSuperuserApi()

    const body = await request.json()
    const userId = typeof body.userId === 'string' ? body.userId.trim() : null
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isSuperuser: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (targetUser.isSuperuser) {
      return NextResponse.json(
        { error: 'Cannot impersonate another superuser' },
        { status: 403 }
      )
    }

    const cookieStore = await cookies()
    cookieStore.set(IMPERSONATE_COOKIE, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Superuser access required' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Impersonation failed' },
      { status: 500 }
    )
  }
}
