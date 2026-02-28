import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getGlobalTrendingEntries,
  getForYouTrendingEntries,
} from '@/lib/dashboard-trending'

export const dynamic = 'force-dynamic'

const GLOBAL_LIMIT = 6
const FOR_YOU_LIMIT = 2
const SAMPLE_GROUPS_PER_ENTRY = 3

export async function GET() {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    const [globalItems, forYouItems] = await Promise.all([
      getGlobalTrendingEntries(GLOBAL_LIMIT, SAMPLE_GROUPS_PER_ENTRY),
      getForYouTrendingEntries(user.id, FOR_YOU_LIMIT, SAMPLE_GROUPS_PER_ENTRY),
    ])
    const items = [...forYouItems, ...globalItems]
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching trending across groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending data' },
      { status: 500 }
    )
  }
}
