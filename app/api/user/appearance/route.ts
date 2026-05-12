import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_APPEARANCES = ['light', 'dark', 'system'] as const

export async function POST(request: Request) {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const appearance = (body as { appearance?: unknown })?.appearance
  if (typeof appearance !== 'string' || !VALID_APPEARANCES.includes(appearance as typeof VALID_APPEARANCES[number])) {
    return NextResponse.json({ error: 'appearance must be one of: light, dark, system' }, { status: 400 })
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: { appearancePreference: appearance },
  })

  return NextResponse.json({ success: true, appearance })
}
