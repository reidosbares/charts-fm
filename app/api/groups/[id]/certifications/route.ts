import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'

const TIER_ORDER = ['gold', 'platinum', 'diamond'] as const
type Tier = typeof TIER_ORDER[number]

function getThresholdForTier(group: { certGoldThreshold: number; certPlatinumThreshold: number; certDiamondThreshold: number }, tier: Tier): number {
  switch (tier) {
    case 'gold': return group.certGoldThreshold
    case 'platinum': return group.certPlatinumThreshold
    case 'diamond': return group.certDiamondThreshold
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
        certGoldThreshold: true,
        certPlatinumThreshold: true,
        certDiamondThreshold: true,
      },
    })

    if (!groupSettings) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Only group creator can award
    if (groupSettings.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the group creator can award certifications' }, { status: 403 })
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

    // Check VS threshold
    const threshold = getThresholdForTier(groupSettings, tier as Tier)
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
        awardedById: user.id,
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
