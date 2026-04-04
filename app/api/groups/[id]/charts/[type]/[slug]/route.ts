import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import {
  getEntryStats,
  getEntryMajorDriver,
  getEntryTotals,
  getArtistChartEntries,
  getArtistNumberOnes,
} from '@/lib/chart-deep-dive'
import { ChartType } from '@/lib/chart-slugs'

export async function GET(
  request: Request,
  { params }: { params: { id: string; type: string; slug: string } }
) {
  try {
    const { group } = await checkGroupAccessForAPI(params.id)

    const chartType = params.type as ChartType
    if (!['artists', 'tracks', 'albums'].includes(chartType)) {
      return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })
    }

    // Find entry by slug to get entryKey
    let entry = await prisma.groupChartEntry.findFirst({
      where: {
        groupId: group.id,
        chartType,
        slug: params.slug,
      },
      select: {
        entryKey: true,
        name: true,
        artist: true,
      },
      orderBy: {
        weekStart: 'desc',
      },
    })

    // Fallback: if not found by slug, try to find by matching entryKey pattern
    // This handles cases where the slug field might not be set or doesn't match exactly
    if (!entry) {
      const { generateSlug } = await import('@/lib/chart-slugs')
      // Try to find entries where the slug would match the entryKey
      const allEntries = await prisma.groupChartEntry.findMany({
        where: {
          groupId: group.id,
          chartType,
        },
        select: {
          entryKey: true,
          name: true,
          artist: true,
        },
        orderBy: {
          weekStart: 'desc',
        },
      })

      // Find entry where slug would match entryKey
      for (const e of allEntries) {
        const expectedSlug = generateSlug(e.entryKey, chartType)
        if (expectedSlug === params.slug) {
          entry = e
          break
        }
      }
    }

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Check if this is a solo group - skip major driver for solo groups
    const memberCount = await prisma.groupMember.count({
      where: { groupId: group.id },
    })
    const isSoloGroup = memberCount <= 1

    // Fetch all data in parallel
    const [stats, majorDriverResult, totals, artistEntries, numberOnes, certifications, certSettings] = await Promise.all([
      getEntryStats(group.id, chartType, entry.entryKey),
      // Skip major driver calculation for solo groups
      isSoloGroup
        ? Promise.resolve({ majorDriver: null, newlyCalculated: false })
        : getEntryMajorDriver(group.id, chartType, entry.entryKey, group.chartMode || 'vs'),
      getEntryTotals(group.id, chartType, entry.entryKey),
      chartType === 'artists' ? getArtistChartEntries(group.id, entry.name) : Promise.resolve(null),
      chartType === 'artists' ? getArtistNumberOnes(group.id, entry.name) : Promise.resolve(null),
      prisma.certification.findMany({
        where: { groupId: group.id, chartType, entryKey: entry.entryKey },
        include: { awardedBy: { select: { id: true, name: true } } },
        orderBy: { awardedAt: 'asc' },
      }),
      prisma.group.findUnique({
        where: { id: group.id },
        select: {
          certificationsEnabled: true,
          certTrackGoldThreshold: true,
          certTrackPlatinumThreshold: true,
          certTrackDiamondThreshold: true,
          certAlbumGoldThreshold: true,
          certAlbumPlatinumThreshold: true,
          certAlbumDiamondThreshold: true,
        },
      }),
    ])

    // For tracks/albums, fetch the artist's major driver so they can also certify
    let artistMajorDriverUserId: string | null = null
    if (chartType !== 'artists' && entry.artist) {
      const artistStats = await prisma.chartEntryStats.findFirst({
        where: { groupId: group.id, chartType: 'artists', entryKey: entry.artist.toLowerCase().trim() },
        select: { majorDriverUserId: true },
      })
      artistMajorDriverUserId = artistStats?.majorDriverUserId ?? null
    }

    // Fetch certifications for all artist track/album entries (needs artistEntries result)
    let artistCertifications: { entryKey: string; chartType: string; tier: string }[] | null = null
    if (chartType === 'artists' && artistEntries) {
      const allEntryKeys = [
        ...artistEntries.tracks.map(e => e.entryKey),
        ...artistEntries.albums.map(e => e.entryKey),
      ]
      if (allEntryKeys.length > 0) {
        artistCertifications = await prisma.certification.findMany({
          where: {
            groupId: group.id,
            chartType: { in: ['tracks', 'albums'] },
            entryKey: { in: allEntryKeys },
          },
          select: { entryKey: true, chartType: true, tier: true, awardedAt: true },
        })
      }
    }

    return NextResponse.json({
      stats,
      majorDriver: majorDriverResult.majorDriver,
      majorDriverNewlyClaimed: majorDriverResult.newlyCalculated && majorDriverResult.majorDriver !== null,
      totals,
      artistEntries: chartType === 'artists' ? artistEntries : null,
      numberOnes: chartType === 'artists' ? numberOnes : null,
      artistCertifications: chartType === 'artists' ? artistCertifications : null,
      artistMajorDriverUserId,
      certifications,
      certificationThresholds: certSettings ? {
        enabled: certSettings.certificationsEnabled,
        trackGold: certSettings.certTrackGoldThreshold,
        trackPlatinum: certSettings.certTrackPlatinumThreshold,
        trackDiamond: certSettings.certTrackDiamondThreshold,
        albumGold: certSettings.certAlbumGoldThreshold,
        albumPlatinum: certSettings.certAlbumPlatinumThreshold,
        albumDiamond: certSettings.certAlbumDiamondThreshold,
      } : null,
    })
  } catch (error) {
    console.error('Error fetching deep dive data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deep dive data' },
      { status: 500 }
    )
  }
}

