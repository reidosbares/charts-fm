import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'

const TIER_ORDER = ['gold', 'platinum', 'diamond'] as const
type Tier = typeof TIER_ORDER[number]

function getThresholdForTier(
  group: {
    certTrackGoldThreshold: number; certTrackPlatinumThreshold: number; certTrackDiamondThreshold: number
    certAlbumGoldThreshold: number; certAlbumPlatinumThreshold: number; certAlbumDiamondThreshold: number
  },
  tier: Tier,
  chartType: string
): number {
  const isAlbum = chartType === 'albums'
  switch (tier) {
    case 'gold': return isAlbum ? group.certAlbumGoldThreshold : group.certTrackGoldThreshold
    case 'platinum': return isAlbum ? group.certAlbumPlatinumThreshold : group.certTrackPlatinumThreshold
    case 'diamond': return isAlbum ? group.certAlbumDiamondThreshold : group.certTrackDiamondThreshold
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await checkGroupAccessForAPI(params.id)

    const url = new URL(request.url)
    const chartType = url.searchParams.get('chartType')
    const entryKey = url.searchParams.get('entryKey')

    const where: any = { groupId: group.id }
    if (chartType) where.chartType = chartType
    if (entryKey) where.entryKey = entryKey

    const certifications = await prisma.certification.findMany({
      where,
      include: {
        awardedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { awardedAt: 'asc' },
    })

    return NextResponse.json(certifications)
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching certifications:', error)
    return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await checkGroupAccessForAPI(params.id)

    // Fetch certification settings (may not be in group object from checkGroupAccessForAPI)
    const groupSettings = await prisma.group.findUnique({
      where: { id: group.id },
      select: {
        creatorId: true,
        certificationsEnabled: true,
        certTrackGoldThreshold: true,
        certTrackPlatinumThreshold: true,
        certTrackDiamondThreshold: true,
        certAlbumGoldThreshold: true,
        certAlbumPlatinumThreshold: true,
        certAlbumDiamondThreshold: true,
      },
    })

    if (!groupSettings) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check certifications are enabled
    if (!groupSettings.certificationsEnabled) {
      return NextResponse.json({ error: 'Certifications are disabled for this group' }, { status: 400 })
    }

    const body = await request.json()
    const { chartType, entryKey, tier } = body

    // Validate inputs
    if (!['tracks', 'albums'].includes(chartType)) {
      return NextResponse.json({ error: 'Invalid chart type. Must be tracks or albums.' }, { status: 400 })
    }
    if (!TIER_ORDER.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier. Must be gold, platinum, or diamond.' }, { status: 400 })
    }
    if (!entryKey || typeof entryKey !== 'string') {
      return NextResponse.json({ error: 'Entry key is required' }, { status: 400 })
    }

    // Check entry exists in ChartEntryStats
    const entryStats = await prisma.chartEntryStats.findFirst({
      where: { groupId: group.id, chartType, entryKey },
    })
    if (!entryStats) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Check authorization: creator, entry's major driver, or artist's major driver
    const isCreator = groupSettings.creatorId === user!.id
    const isEntryDriver = entryStats.majorDriverUserId === user!.id

    let isArtistDriver = false
    if (!isCreator && !isEntryDriver) {
      // For tracks/albums, check if user is the major driver of the artist
      const entry = await prisma.groupChartEntry.findFirst({
        where: { groupId: group.id, chartType, entryKey },
        select: { artist: true },
      })
      if (entry?.artist) {
        const artistStats = await prisma.chartEntryStats.findFirst({
          where: { groupId: group.id, chartType: 'artists', entryKey: entry.artist.toLowerCase().trim() },
          select: { majorDriverUserId: true },
        })
        isArtistDriver = artistStats?.majorDriverUserId === user!.id
      }
    }

    if (!isCreator && !isEntryDriver && !isArtistDriver) {
      return NextResponse.json({ error: 'Only the group creator or major chart driver can award certifications' }, { status: 403 })
    }

    // Check VS threshold
    const threshold = getThresholdForTier(groupSettings, tier as Tier, chartType)
    const totalVS = Number(entryStats.totalVS ?? 0)
    if (totalVS < threshold) {
      return NextResponse.json({ error: `Entry has not reached the ${tier} threshold (${totalVS.toFixed(1)} / ${threshold} VS)` }, { status: 400 })
    }

    // Check tier not already awarded
    const existing = await prisma.certification.findUnique({
      where: {
        groupId_chartType_entryKey_tier: {
          groupId: group.id,
          chartType,
          entryKey,
          tier,
        },
      },
    })
    if (existing) {
      return NextResponse.json({ error: `${tier} certification already awarded` }, { status: 400 })
    }

    // Check previous tiers are awarded
    const tierIndex = TIER_ORDER.indexOf(tier as Tier)
    if (tierIndex > 0) {
      const previousTier = TIER_ORDER[tierIndex - 1]
      const previousCert = await prisma.certification.findUnique({
        where: {
          groupId_chartType_entryKey_tier: {
            groupId: group.id,
            chartType,
            entryKey,
            tier: previousTier,
          },
        },
      })
      if (!previousCert) {
        return NextResponse.json({ error: `Must award ${previousTier} before ${tier}` }, { status: 400 })
      }
    }

    // Award the certification
    const certification = await prisma.certification.create({
      data: {
        groupId: group.id,
        chartType,
        entryKey,
        tier,
        awardedById: user!.id,
        thresholdAtAward: threshold,
      },
      include: {
        awardedBy: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(certification)
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error awarding certification:', error)
    return NextResponse.json({ error: 'Failed to award certification' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await checkGroupAccessForAPI(params.id)

    const groupSettings = await prisma.group.findUnique({
      where: { id: group.id },
      select: { creatorId: true },
    })

    if (!groupSettings) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const body = await request.json()
    const { chartType, entryKey, tier } = body

    if (!['tracks', 'albums'].includes(chartType)) {
      return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })
    }
    if (!TIER_ORDER.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }
    if (!entryKey || typeof entryKey !== 'string') {
      return NextResponse.json({ error: 'Entry key is required' }, { status: 400 })
    }

    // Check authorization: creator, entry's major driver, or artist's major driver
    const isCreator = groupSettings.creatorId === user!.id
    let canRevoke = isCreator

    if (!canRevoke) {
      const entryStats = await prisma.chartEntryStats.findFirst({
        where: { groupId: group.id, chartType, entryKey },
        select: { majorDriverUserId: true },
      })
      canRevoke = entryStats?.majorDriverUserId === user!.id

      if (!canRevoke) {
        const entry = await prisma.groupChartEntry.findFirst({
          where: { groupId: group.id, chartType, entryKey },
          select: { artist: true },
        })
        if (entry?.artist) {
          const artistStats = await prisma.chartEntryStats.findFirst({
            where: { groupId: group.id, chartType: 'artists', entryKey: entry.artist.toLowerCase().trim() },
            select: { majorDriverUserId: true },
          })
          canRevoke = artistStats?.majorDriverUserId === user!.id
        }
      }
    }

    if (!canRevoke) {
      return NextResponse.json({ error: 'Only the group creator or major chart driver can revoke certifications' }, { status: 403 })
    }

    // Cannot revoke a tier if a higher tier is still awarded
    const tierIndex = TIER_ORDER.indexOf(tier as Tier)
    if (tierIndex < TIER_ORDER.length - 1) {
      const higherTier = TIER_ORDER[tierIndex + 1]
      const higherCert = await prisma.certification.findUnique({
        where: {
          groupId_chartType_entryKey_tier: {
            groupId: group.id,
            chartType,
            entryKey,
            tier: higherTier,
          },
        },
      })
      if (higherCert) {
        return NextResponse.json(
          { error: `Must revoke ${higherTier} before revoking ${tier}` },
          { status: 400 }
        )
      }
    }

    const deleted = await prisma.certification.deleteMany({
      where: {
        groupId: group.id,
        chartType,
        entryKey,
        tier,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error revoking certification:', error)
    return NextResponse.json({ error: 'Failed to revoke certification' }, { status: 500 })
  }
}
