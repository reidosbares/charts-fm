// Service functions for group operations and weekly stats

import { prisma } from './prisma'
import { getWeeklyStats } from './lastfm-weekly'
import { getWeekStart, getLastNFinishedWeeks, getWeekStartForDay, getWeekEndForDay, getLastNFinishedWeeksForDay } from './weekly-utils'
import { aggregateGroupStats, aggregateGroupStatsWithVS } from './group-stats'
import { TopItem } from './lastfm-weekly'
import { cacheChartMetrics } from './group-chart-metrics'
import { recalculateAllTimeStats } from './group-alltime-stats'
import { ChartMode, calculateUserVS, getUserVSForWeek, aggregateGroupStatsVS } from './vibe-score'
import { ChartGenerationLogger } from './chart-generation-logger'
import { getArtistImage, getAlbumImage } from './lastfm'

const API_KEY = process.env.LASTFM_API_KEY!
const API_SECRET = process.env.LASTFM_API_SECRET!

/**
 * Get entry key for an item (same format as GroupChartEntry)
 */
function getEntryKey(item: { name: string; artist?: string }, chartType: 'artists' | 'tracks' | 'albums'): string {
  if (chartType === 'artists') {
    return item.name.toLowerCase()
  }
  return `${item.name}|${item.artist || ''}`.toLowerCase()
}

/**
 * Calculate and store VS for a user's weekly stats
 * VS is calculated using top 100 entries and stored in UserChartEntryVS
 */
async function calculateAndStoreUserVS(
  userId: string,
  weekStart: Date,
  topTracks: TopItem[],
  topArtists: TopItem[],
  topAlbums: TopItem[]
): Promise<void> {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  // Calculate VS for top 100 entries
  const tracksVS = calculateUserVS(topTracks)
  const artistsVS = calculateUserVS(topArtists)
  const albumsVS = calculateUserVS(topAlbums)

  // Prepare entries to upsert
  const entriesToUpsert: Array<{
    userId: string
    weekStart: Date
    chartType: string
    entryKey: string
    vibeScore: number
    playcount: number
  }> = []

  // Add tracks
  for (const { item, vibeScore } of tracksVS) {
    if (vibeScore === 0) continue // Skip items beyond top 100
    entriesToUpsert.push({
      userId,
      weekStart: normalizedWeekStart,
      chartType: 'tracks',
      entryKey: getEntryKey(item, 'tracks'),
      vibeScore,
      playcount: item.playcount,
    })
  }

  // Add artists
  for (const { item, vibeScore } of artistsVS) {
    if (vibeScore === 0) continue // Skip items beyond top 100
    entriesToUpsert.push({
      userId,
      weekStart: normalizedWeekStart,
      chartType: 'artists',
      entryKey: getEntryKey(item, 'artists'),
      vibeScore,
      playcount: item.playcount,
    })
  }

  // Add albums
  for (const { item, vibeScore } of albumsVS) {
    if (vibeScore === 0) continue // Skip items beyond top 100
    entriesToUpsert.push({
      userId,
      weekStart: normalizedWeekStart,
      chartType: 'albums',
      entryKey: getEntryKey(item, 'albums'),
      vibeScore,
      playcount: item.playcount,
    })
  }

  // Delete existing entries for this user/week (for regeneration)
  await prisma.userChartEntryVS.deleteMany({
    where: {
      userId,
      weekStart: normalizedWeekStart,
    },
  })

  // Insert all entries
  if (entriesToUpsert.length > 0) {
    await prisma.userChartEntryVS.createMany({
      data: entriesToUpsert,
      skipDuplicates: true,
    })
  }
}

/**
 * Fetch and store weekly stats for a user
 * Returns existing stats if they already exist, otherwise fetches from Last.fm
 * Automatically calculates and stores VS for top 100 entries
 */
export async function fetchOrGetUserWeeklyStats(
  userId: string,
  lastfmUsername: string,
  sessionKey: string | null,
  weekStart: Date,
  logger?: ChartGenerationLogger
): Promise<{
  topTracks: TopItem[]
  topArtists: TopItem[]
  topAlbums: TopItem[]
}> {
  // Check if stats already exist
  const existing = await prisma.userWeeklyStats.findUnique({
    where: {
      userId_weekStart: {
        userId,
        weekStart,
      },
    },
  })

  const stats = existing
    ? {
        topTracks: (existing.topTracks as unknown as TopItem[]) || [],
        topArtists: (existing.topArtists as unknown as TopItem[]) || [],
        topAlbums: (existing.topAlbums as unknown as TopItem[]) || [],
      }
    : await getWeeklyStats(
        lastfmUsername,
        weekStart,
        API_KEY,
        API_SECRET,
        sessionKey || undefined
      )

  // If stats were just fetched, store them
  if (!existing) {
    await prisma.userWeeklyStats.create({
      data: {
        userId,
        weekStart,
        weekEnd: getWeekStart(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)),
        topTracks: stats.topTracks as any,
        topArtists: stats.topArtists as any,
        topAlbums: stats.topAlbums as any,
      },
    })
  }

  // Calculate and store VS for top 100 entries (always recalculate to ensure consistency)
  await calculateAndStoreUserVS(userId, weekStart, stats.topTracks, stats.topArtists, stats.topAlbums)

  return stats
}

/**
 * Check if two week ranges overlap
 */
export function weeksOverlap(
  weekStart1: Date,
  weekEnd1: Date,
  weekStart2: Date,
  weekEnd2: Date
): boolean {
  // Two weeks overlap if one starts before the other ends
  return weekStart1 < weekEnd2 && weekStart2 < weekEnd1
}

/**
 * Get the week start of the most recent chart for a group
 */
export async function getLastChartWeek(groupId: string): Promise<Date | null> {
  const lastChart = await prisma.groupWeeklyStats.findFirst({
    where: { groupId },
    orderBy: { weekStart: 'desc' },
    select: { weekStart: true },
  })
  return lastChart ? lastChart.weekStart : null
}

/**
 * Delete charts that overlap with a given week range
 * Optimized to use direct database queries instead of fetching all charts
 */
export async function deleteOverlappingCharts(
  groupId: string,
  newWeekStart: Date,
  newWeekEnd: Date
): Promise<void> {
  // Find overlapping charts using a single query
  // Two weeks overlap if: newWeekStart < chartWeekEnd AND chartWeekStart < newWeekEnd
  const overlappingCharts = await prisma.groupWeeklyStats.findMany({
    where: {
      groupId,
      AND: [
        {
          weekStart: {
            lt: newWeekEnd,
          },
        },
        {
          weekEnd: {
            gt: newWeekStart,
          },
        },
      ],
    },
    select: {
      id: true,
      weekStart: true,
    },
  })

  // Delete overlapping charts and associated data in batches
  if (overlappingCharts.length > 0) {
    const weekStarts = overlappingCharts.map((chart) => chart.weekStart)
    const chartIds = overlappingCharts.map((chart) => chart.id)

    // Delete in parallel
    await Promise.all([
      // Delete group weekly stats
      prisma.groupWeeklyStats.deleteMany({
        where: {
          id: {
            in: chartIds,
          },
        },
      }),
      // Delete associated chart entries
      prisma.groupChartEntry.deleteMany({
        where: {
          groupId,
          weekStart: {
            in: weekStarts,
          },
        },
      }),
      // Note: UserChartEntryVS is now user-specific (no groupId), so we don't delete it here
      // VS entries are shared across all groups and will be recalculated when needed
    ])
  }
}


/**
 * Calculate and store group weekly stats
 * @param groupId - The group ID
 * @param weekStart - The week start date (should already be calculated based on group's trackingDayOfWeek)
 * @param chartSize - The chart size to use (from group settings)
 * @param trackingDayOfWeek - The tracking day of week (for calculating weekEnd)
 * @param chartMode - The chart mode to use (from group settings)
 * @param logger - Optional logger for performance tracking
 * @param members - Optional pre-fetched group members (to avoid redundant queries)
 */
export async function calculateGroupWeeklyStats(
  groupId: string,
  weekStart: Date,
  chartSize: number,
  trackingDayOfWeek: number,
  chartMode: ChartMode,
  logger?: ChartGenerationLogger,
  members?: Array<{
    user: {
      id: string
      lastfmUsername: string
      lastfmSessionKey: string | null
    }
  }>
): Promise<void> {
  // Get all group members (use provided members if available)
  let membersToUse = members
  if (!membersToUse) {
    membersToUse = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            lastfmUsername: true,
            lastfmSessionKey: true,
          },
        },
      },
    })
  }

  if (membersToUse.length === 0) {
    return
  }

  // Fetch or get stats for all members (this also calculates and stores VS automatically)
  const userStatsArray = await Promise.all(
    membersToUse.map((member) =>
      fetchOrGetUserWeeklyStats(
        member.user.id,
        member.user.lastfmUsername,
        member.user.lastfmSessionKey,
        weekStart,
        logger
      )
    )
  )

  // Fetch pre-calculated VS data for all members
  const userVSDataPromises = membersToUse.map((member) =>
    getUserVSForWeek(member.user.id, weekStart, prisma)
  )

  const userVSDataArray = await Promise.all(userVSDataPromises)

  // Prepare VS data with userId and original stats for aggregation
  const userVSData = userVSDataArray.map((vsData: { topTracks: any[]; topArtists: any[]; topAlbums: any[] }, index: number) => ({
    userId: membersToUse[index].user.id,
    ...vsData,
    originalStats: userStatsArray[index], // Include original stats for name lookup
  }))

  // Aggregate stats using pre-calculated VS
  const aggregated = aggregateGroupStatsVS(userVSData, chartSize, chartMode)

  // Calculate week end based on tracking day
  const weekEnd = getWeekEndForDay(weekStart, trackingDayOfWeek)

  // Prepare stats for storage (remove vibeScore from JSON, it will be stored in GroupChartEntry)
  const statsForStorage = {
    topTracks: aggregated.topTracks.map(({ vibeScore: _vibeScore, ...item }) => item),
    topArtists: aggregated.topArtists.map(({ vibeScore: _vibeScore, ...item }) => item),
    topAlbums: aggregated.topAlbums.map(({ vibeScore: _vibeScore, ...item }) => item),
  }

  // Store or update group stats
  await prisma.groupWeeklyStats.upsert({
    where: {
      groupId_weekStart: {
        groupId,
        weekStart,
      },
    },
    create: {
      groupId,
      weekStart,
      weekEnd,
      topTracks: statsForStorage.topTracks,
      topArtists: statsForStorage.topArtists,
      topAlbums: statsForStorage.topAlbums,
    },
    update: {
      weekEnd,
      topTracks: statsForStorage.topTracks,
      topArtists: statsForStorage.topArtists,
      topAlbums: statsForStorage.topAlbums,
    },
  })

  // Fetch previous weeks stats once (to share across all chart types)
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)
  const previousWeeksStats = await prisma.groupWeeklyStats.findMany({
    where: {
      groupId,
      weekStart: {
        lt: normalizedWeekStart,
      },
    },
    orderBy: {
      weekStart: 'asc',
    },
  })

  // Cache metrics for all chart types (with vibeScore) - share previousWeeksStats
  await Promise.all([
    cacheChartMetrics(groupId, weekStart, 'artists', aggregated.topArtists, trackingDayOfWeek, logger, previousWeeksStats),
    cacheChartMetrics(groupId, weekStart, 'tracks', aggregated.topTracks, trackingDayOfWeek, logger, previousWeeksStats),
    cacheChartMetrics(groupId, weekStart, 'albums', aggregated.topAlbums, trackingDayOfWeek, logger, previousWeeksStats),
  ])
}

/**
 * Initialize group with historical data (last 5 finished weeks)
 */
export async function initializeGroupWithHistory(groupId: string): Promise<void> {
  // Get group settings
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { 
      chartSize: true, 
      trackingDayOfWeek: true,
      chartMode: true,
    },
  })

  if (!group) {
    return
  }

  const chartSize = group.chartSize || 10
  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
  const chartMode = (group.chartMode || 'plays_only') as ChartMode

  // Use the group's tracking day to calculate weeks
  const weeks = getLastNFinishedWeeksForDay(5, trackingDayOfWeek)
  
  // Reverse to process from oldest to newest so previous week comparisons work correctly
  const weeksInOrder = [...weeks].reverse()
  
  // Fetch group members once (to reuse across all weeks)
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          lastfmUsername: true,
          lastfmSessionKey: true,
        },
      },
    },
  })

  // Process weeks sequentially to avoid overwhelming the API
  for (const weekStart of weeksInOrder) {
    await calculateGroupWeeklyStats(groupId, weekStart, chartSize, trackingDayOfWeek, chartMode, undefined, members)
    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Recalculate all-time stats once after all weeks are processed
  await recalculateAllTimeStats(groupId)
}

/**
 * Update group icon based on the latest weekly chart
 * Fetches image from Last.fm API based on the group's dynamicIconSource setting
 */
export async function updateGroupIconFromChart(groupId: string): Promise<void> {
  // Get group settings
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      dynamicIconEnabled: true,
      dynamicIconSource: true,
      image: true,
    },
  })

  if (!group) {
    return
  }

  // Check if dynamic icon is enabled
  if (!group.dynamicIconEnabled || !group.dynamicIconSource) {
    return
  }

  // Get the latest weekly stats
  const latestStats = await prisma.groupWeeklyStats.findFirst({
    where: { groupId },
    orderBy: { weekStart: 'desc' },
  })

  if (!latestStats) {
    // No charts yet, keep existing icon
    return
  }

  let imageUrl: string | null = null

    try {
    // Extract the appropriate item based on source type
    if (group.dynamicIconSource === 'top_artist') {
      const topArtists = latestStats.topArtists as unknown as TopItem[]
      if (topArtists && topArtists.length > 0) {
        const topArtist = topArtists[0]
        if (topArtist.name) {
          imageUrl = await getArtistImage(topArtist.name, API_KEY)
        }
      }
    } else if (group.dynamicIconSource === 'top_album') {
      const topAlbums = latestStats.topAlbums as unknown as TopItem[]
      if (topAlbums && topAlbums.length > 0) {
        const topAlbum = topAlbums[0]
        if (topAlbum.name && topAlbum.artist) {
          imageUrl = await getAlbumImage(topAlbum.artist, topAlbum.name, API_KEY)
        }
      }
    } else if (group.dynamicIconSource === 'top_track_artist') {
      const topTracks = latestStats.topTracks as unknown as TopItem[]
      if (topTracks && topTracks.length > 0) {
        const topTrack = topTracks[0]
        if (topTrack.artist) {
          imageUrl = await getArtistImage(topTrack.artist, API_KEY)
        }
      }
    }
  } catch (error) {
    console.error(`Error updating group icon for group ${groupId}:`, error)
    // Keep existing icon on error
    return
  }

  // Only update if we got a valid image URL
  if (imageUrl) {
    await prisma.group.update({
      where: { id: groupId },
      data: { image: imageUrl },
    })
  }
  // If imageUrl is null, keep the existing icon (don't update)
}

