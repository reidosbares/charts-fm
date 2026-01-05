import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { getGroupWeeklyStats } from '@/lib/group-queries'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const weeklyStats = await getGroupWeeklyStats(group.id)
    const chartMode = (group.chartMode || 'plays_only') as string

    // Calculate total plays for latest week
    let totalPlaysThisWeek = 0
    if (weeklyStats.length > 0) {
      const latestWeek = weeklyStats[0]
      const artists = (latestWeek.topArtists as any[]) || []
      const tracks = (latestWeek.topTracks as any[]) || []
      const albums = (latestWeek.topAlbums as any[]) || []
      
      totalPlaysThisWeek = artists.reduce((sum, a) => sum + (a.playcount || 0), 0) +
                          tracks.reduce((sum, t) => sum + (t.playcount || 0), 0) +
                          albums.reduce((sum, a) => sum + (a.playcount || 0), 0)
    }

    return NextResponse.json({
      totalPlaysThisWeek,
      weeksTracked: weeklyStats.length,
      chartMode,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching quick stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quick stats' },
      { status: 500 }
    )
  }
}

