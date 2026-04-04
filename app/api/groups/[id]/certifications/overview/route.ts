import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { entryKeyToSlug, ChartType } from '@/lib/chart-slugs'

const TIER_ORDER = ['gold', 'platinum', 'diamond'] as const
type Tier = (typeof TIER_ORDER)[number]

interface ThresholdConfig {
  certTrackGoldThreshold: number
  certTrackPlatinumThreshold: number
  certTrackDiamondThreshold: number
  certAlbumGoldThreshold: number
  certAlbumPlatinumThreshold: number
  certAlbumDiamondThreshold: number
}

function getThresholdForTier(config: ThresholdConfig, tier: Tier, chartType: string): number {
  const isAlbum = chartType === 'albums'
  switch (tier) {
    case 'gold': return isAlbum ? config.certAlbumGoldThreshold : config.certTrackGoldThreshold
    case 'platinum': return isAlbum ? config.certAlbumPlatinumThreshold : config.certTrackPlatinumThreshold
    case 'diamond': return isAlbum ? config.certAlbumDiamondThreshold : config.certTrackDiamondThreshold
  }
}

function parseEntryKey(entryKey: string): { name: string; artist: string } {
  const parts = entryKey.split('|')
  return { name: parts[0] || entryKey, artist: parts[1] || '' }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await checkGroupAccessForAPI(params.id)

    const groupSettings = await prisma.group.findUnique({
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
    })

    if (!groupSettings || !groupSettings.certificationsEnabled) {
      return NextResponse.json({
        recentAwards: [],
        eligible: [],
        approaching: [],
        byArtist: [],
        thresholds: null,
      })
    }

    const [certifications, allEntryStats, chartEntries] = await Promise.all([
      prisma.certification.findMany({
        where: { groupId: group.id },
        include: { awardedBy: { select: { id: true, name: true } } },
        orderBy: { awardedAt: 'desc' },
      }),
      prisma.chartEntryStats.findMany({
        where: {
          groupId: group.id,
          chartType: { in: ['tracks', 'albums'] },
          totalWeeksCharting: { gt: 0 },
        },
        select: {
          entryKey: true,
          chartType: true,
          slug: true,
          totalVS: true,
        },
      }),
      // Fetch display names from chart entries (entryKey is lowercase, name/artist have proper casing)
      prisma.groupChartEntry.findMany({
        where: {
          groupId: group.id,
          chartType: { in: ['tracks', 'albums'] },
        },
        select: {
          entryKey: true,
          chartType: true,
          name: true,
          artist: true,
        },
        distinct: ['entryKey', 'chartType'],
      }),
    ])

    // Build display name lookup from chart entries (proper casing)
    const displayNameLookup = new Map<string, { name: string; artist: string }>()
    for (const entry of chartEntries) {
      const key = `${entry.chartType}|${entry.entryKey}`
      if (!displayNameLookup.has(key)) {
        displayNameLookup.set(key, { name: entry.name, artist: entry.artist || '' })
      }
    }

    function getDisplayNames(entryKey: string, chartType: string): { name: string; artist: string } {
      const display = displayNameLookup.get(`${chartType}|${entryKey}`)
      if (display) return display
      // Fallback to parsing entryKey
      return parseEntryKey(entryKey)
    }

    // Build certification lookup
    const certLookup = new Map<string, typeof certifications[number]>()
    for (const cert of certifications) {
      certLookup.set(`${cert.chartType}|${cert.entryKey}|${cert.tier}`, cert)
    }

    // Recent awards (top 10)
    const recentAwards = certifications.slice(0, 10).map(cert => {
      const { name, artist } = getDisplayNames(cert.entryKey, cert.chartType)
      return {
        certification: {
          id: cert.id,
          tier: cert.tier,
          awardedAt: cert.awardedAt,
          chartType: cert.chartType,
          entryKey: cert.entryKey,
        },
        entry: {
          name,
          artist,
          slug: entryKeyToSlug(cert.entryKey, cert.chartType as ChartType),
          chartType: cert.chartType,
        },
      }
    })

    // Compute eligible and approaching
    const eligible: Array<{
      entryKey: string; chartType: string; name: string; artist: string
      slug: string; tier: string; currentVS: number; threshold: number
    }> = []

    const approaching: Array<{
      entryKey: string; chartType: string; name: string; artist: string
      slug: string; nextTier: string; currentVS: number; threshold: number; percentage: number
    }> = []

    // Artist aggregation map
    const artistMap = new Map<string, {
      artistName: string
      artistSlug: string
      tracks: { awarded: any[]; eligible: any[] }
      albums: { awarded: any[]; eligible: any[] }
      totalCertifications: number
    }>()

    for (const entry of allEntryStats) {
      const totalVS = Number(entry.totalVS ?? 0)
      if (totalVS <= 0) continue

      const { name, artist } = getDisplayNames(entry.entryKey, entry.chartType)
      const slug = entry.slug || entryKeyToSlug(entry.entryKey, entry.chartType as ChartType)

      // Find the next unearned tier
      let nextUnearnedTier: Tier | null = null
      for (const tier of TIER_ORDER) {
        if (!certLookup.has(`${entry.chartType}|${entry.entryKey}|${tier}`)) {
          nextUnearnedTier = tier
          break
        }
      }

      if (nextUnearnedTier) {
        const threshold = getThresholdForTier(groupSettings, nextUnearnedTier, entry.chartType)
        const tierIndex = TIER_ORDER.indexOf(nextUnearnedTier)
        const previousTiersAwarded = tierIndex === 0 || certLookup.has(
          `${entry.chartType}|${entry.entryKey}|${TIER_ORDER[tierIndex - 1]}`
        )

        if (totalVS >= threshold && previousTiersAwarded) {
          eligible.push({
            entryKey: entry.entryKey, chartType: entry.chartType,
            name, artist, slug, tier: nextUnearnedTier,
            currentVS: totalVS, threshold,
          })
        } else if (previousTiersAwarded) {
          const percentage = (totalVS / threshold) * 100
          if (percentage >= 75) {
            approaching.push({
              entryKey: entry.entryKey, chartType: entry.chartType,
              name, artist, slug, nextTier: nextUnearnedTier,
              currentVS: totalVS, threshold, percentage: Math.round(percentage * 10) / 10,
            })
          }
        }
      }

      // Build byArtist data (normalize key to lowercase to avoid duplicates)
      if (artist) {
        const artistKey = artist.toLowerCase()
        if (!artistMap.has(artistKey)) {
          artistMap.set(artistKey, {
            artistName: artist,
            artistSlug: entryKeyToSlug(artist, 'artists'),
            tracks: { awarded: [], eligible: [] },
            albums: { awarded: [], eligible: [] },
            totalCertifications: 0,
          })
        }
        const artistData = artistMap.get(artistKey)!
        const chartTypeKey = entry.chartType as 'tracks' | 'albums'

        for (const tier of TIER_ORDER) {
          const cert = certLookup.get(`${entry.chartType}|${entry.entryKey}|${tier}`)
          if (cert) {
            artistData[chartTypeKey].awarded.push({
              certification: { id: cert.id, tier: cert.tier, awardedAt: cert.awardedAt },
              entry: { name, slug, entryKey: entry.entryKey },
            })
            artistData.totalCertifications++
          }
        }

        const eligibleEntry = eligible.find(
          e => e.entryKey === entry.entryKey && e.chartType === entry.chartType
        )
        if (eligibleEntry) {
          artistData[chartTypeKey].eligible.push({
            entryKey: entry.entryKey, tier: eligibleEntry.tier,
            currentVS: eligibleEntry.currentVS, threshold: eligibleEntry.threshold,
            name, slug,
          })
        }
      }
    }

    // Sort eligible by excess VS descending
    eligible.sort((a, b) => (b.currentVS - b.threshold) - (a.currentVS - a.threshold))
    // Sort approaching by percentage descending
    approaching.sort((a, b) => b.percentage - a.percentage)

    // Convert artist map to sorted array
    const tierWeight = { diamond: 0, platinum: 1, gold: 2 } as const
    const byArtist = Array.from(artistMap.values())
      .filter(a => a.totalCertifications > 0 || a.tracks.eligible.length > 0 || a.albums.eligible.length > 0)
      .sort((a, b) => a.artistName.localeCompare(b.artistName))

    for (const artist of byArtist) {
      for (const type of ['tracks', 'albums'] as const) {
        artist[type].awarded.sort((a: any, b: any) => {
          const tw = (tierWeight[a.certification.tier as keyof typeof tierWeight] ?? 3)
            - (tierWeight[b.certification.tier as keyof typeof tierWeight] ?? 3)
          if (tw !== 0) return tw
          return a.entry.name.localeCompare(b.entry.name)
        })
      }
    }

    return NextResponse.json({
      recentAwards,
      eligible,
      approaching,
      byArtist,
      thresholds: {
        trackGold: groupSettings.certTrackGoldThreshold,
        trackPlatinum: groupSettings.certTrackPlatinumThreshold,
        trackDiamond: groupSettings.certTrackDiamondThreshold,
        albumGold: groupSettings.certAlbumGoldThreshold,
        albumPlatinum: groupSettings.certAlbumPlatinumThreshold,
        albumDiamond: groupSettings.certAlbumDiamondThreshold,
      },
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching certifications overview:', error)
    return NextResponse.json({ error: 'Failed to fetch certifications overview' }, { status: 500 })
  }
}
