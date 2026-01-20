import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getGroupChartEntries } from '@/lib/group-queries'
import { GROUP_THEMES, type ThemeName } from '@/lib/group-themes'
import { generateCombinedChartSVG, loadLogoAsBase64 } from '@/lib/chart-image-generator'
import sharp from 'sharp'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get('weekStart')
    
    if (!weekStartParam) {
      return NextResponse.json({ error: 'weekStart parameter is required' }, { status: 400 })
    }

    // Parse date string as UTC (YYYY-MM-DD format)
    const [year, month, day] = weekStartParam.split('-').map(Number)
    const requestedWeekStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

    // Verify the week exists in GroupWeeklyStats and use the exact weekStart from database
    const weeklyStats = await prisma.groupWeeklyStats.findFirst({
      where: {
        groupId: group.id,
        weekStart: requestedWeekStart,
      },
      select: {
        weekStart: true,
      },
    })

    if (!weeklyStats) {
      return NextResponse.json({ error: 'No charts found for the specified week' }, { status: 404 })
    }

    // Use the exact weekStart from the database to ensure perfect matching
    const normalizedWeekStart = new Date(weeklyStats.weekStart)
    normalizedWeekStart.setUTCHours(0, 0, 0, 0)

    // Get chart entries for all three types (top 10 each)
    const [artistsEntries, tracksEntries, albumsEntries] = await Promise.all([
      getGroupChartEntries(group.id, normalizedWeekStart, 'artists'),
      getGroupChartEntries(group.id, normalizedWeekStart, 'tracks'),
      getGroupChartEntries(group.id, normalizedWeekStart, 'albums'),
    ])

    if (artistsEntries.length === 0 && tracksEntries.length === 0 && albumsEntries.length === 0) {
      return NextResponse.json({ error: 'No chart entries found for the specified week' }, { status: 404 })
    }

    // Get top 10 entries for each type
    const topArtists = artistsEntries.slice(0, 10).map(entry => ({
      position: entry.position,
      name: entry.name,
      artist: entry.artist,
      playcount: entry.playcount,
      vibeScore: entry.vibeScore,
    }))

    const topTracks = tracksEntries.slice(0, 10).map(entry => ({
      position: entry.position,
      name: entry.name,
      artist: entry.artist,
      playcount: entry.playcount,
      vibeScore: entry.vibeScore,
    }))

    const topAlbums = albumsEntries.slice(0, 10).map(entry => ({
      position: entry.position,
      name: entry.name,
      artist: entry.artist,
      playcount: entry.playcount,
      vibeScore: entry.vibeScore,
    }))

    // Get theme colors
    const colorTheme = ((group as any).colorTheme || 'white') as ThemeName
    const themeColors = GROUP_THEMES[colorTheme]

    // Get chart mode
    const chartMode = (group.chartMode || 'plays_only') as string

    // Load logo
    const logoBase64 = loadLogoAsBase64()

    // Generate SVG
    const svgString = generateCombinedChartSVG(
      topArtists,
      topTracks,
      topAlbums,
      group.name,
      normalizedWeekStart,
      chartMode,
      themeColors,
      logoBase64
    )

    // Convert SVG to PNG using Sharp
    const svgBuffer = Buffer.from(svgString)
    const pngBuffer = await sharp(svgBuffer)
      .resize(1200, 1800)
      .png()
      .toBuffer()

    // Create filename
    const weekStr = normalizedWeekStart.toISOString().split('T')[0]
    const groupName = group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `${groupName}_combined_${weekStr}.png`

    // Return PNG file
    return new NextResponse(pngBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating combined chart image export:', error)
    return NextResponse.json(
      { error: 'Failed to generate combined chart image export' },
      { status: 500 }
    )
  }
}
