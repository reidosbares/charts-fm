import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { getMVPByWeekList } from '@/lib/group-week-mvp'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await checkGroupAccessForAPI(params.id)
    const list = await getMVPByWeekList(group.id)
    return NextResponse.json(list)
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string }
    if (err.status === 401 || err.status === 403 || err.status === 404) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Error fetching MVP by week:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MVP by week' },
      { status: 500 }
    )
  }
}
