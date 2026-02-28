import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireSuperuserApi } from '@/lib/admin'
import { IMPERSONATE_COOKIE } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await requireSuperuserApi()

    const cookieStore = await cookies()
    cookieStore.delete(IMPERSONATE_COOKIE)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Superuser access required' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stop impersonation failed' },
      { status: 500 }
    )
  }
}
