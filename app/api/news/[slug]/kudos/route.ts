import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAllSlugs } from '@/lib/news'
import { giveKudos } from '@/lib/news-kudos'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const validSlugs = await getAllSlugs()
  if (!validSlugs.includes(slug)) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  try {
    const state = await giveKudos(slug, session.user.id)
    return NextResponse.json(state)
  } catch (error) {
    console.error('Error giving kudos:', error)
    return NextResponse.json({ error: 'Failed to give kudos' }, { status: 500 })
  }
}
