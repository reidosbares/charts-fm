/**
 * Long-running per-member-per-group statistics.
 * Updated each week when charts are generated; used for personalized member stats
 * (total VS contributed, entries helped onto charts at debut, weeks at #1 contributed, entries as main driver).
 */

import { prisma } from './prisma'
import type { ChartType } from './chart-slugs'

export interface MemberGroupStatsRow {
  groupId: string
  userId: string
  totalVS: number
  totalPlays: number
  entriesHelpedDebutArtists: number
  entriesHelpedDebutTracks: number
  entriesHelpedDebutAlbums: number
  weeksAtOneContributedArtists: number
  weeksAtOneContributedTracks: number
  weeksAtOneContributedAlbums: number
  weeksAsMVP: number
  lastUpdated: Date
}

export interface DriverEntry {
  chartType: ChartType
  entryKey: string
  name: string
  artist?: string | null
  slug: string
  /** True if this entry has ever reached #1 on the chart */
  reachedNumberOne: boolean
}

export interface PersonalizedMemberStats {
  totalVS: number
  totalPlays: number
  weeksAsMVP: number
  byChartType: {
    artists: {
      entriesHelpedDebut: number
      weeksAtOneContributed: number
      entriesAsMainDriver: number
    }
    tracks: {
      entriesHelpedDebut: number
      weeksAtOneContributed: number
      entriesAsMainDriver: number
    }
    albums: {
      entriesHelpedDebut: number
      weeksAtOneContributed: number
      entriesAsMainDriver: number
    }
  }
  driverEntries: DriverEntry[]
}

const CHART_TYPES: ChartType[] = ['artists', 'tracks', 'albums']

/**
 * Accumulate this week's member contributions into MemberGroupStats.
 * Call after chart for the week has been written (GroupChartEntry exists).
 */
export async function accumulateMemberGroupStats(
  groupId: string,
  weekStart: Date
): Promise<void> {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { chartMode: true },
  })
  const chartMode = (group?.chartMode || 'vs') as string
  const useVS = chartMode === 'vs' || chartMode === 'vs_weighted'

  // This week's chart entries: entryKey, chartType, position
  const chartEntries = await prisma.groupChartEntry.findMany({
    where: { groupId, weekStart: normalizedWeekStart },
    select: { entryKey: true, chartType: true, position: true },
  })
  if (chartEntries.length === 0) return

  // First appearance per (groupId, chartType, entryKey) - only for entries that exist in this group
  const firstAppearances = await prisma.$queryRaw<
    Array<{ chartType: string; entryKey: string; first_week: Date }>
  >`
    SELECT "chartType", "entryKey", MIN("weekStart") as first_week
    FROM "group_chart_entries"
    WHERE "groupId" = ${groupId}::text
    GROUP BY "chartType", "entryKey"
  `
  const firstWeekMap = new Map<string, Date>()
  for (const row of firstAppearances) {
    firstWeekMap.set(`${row.chartType}|${row.entryKey}`, row.first_week)
  }

  const chartEntryMap = new Map<string, { position: number }>()
  for (const e of chartEntries) {
    chartEntryMap.set(`${e.chartType}|${e.entryKey}`, { position: e.position })
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  })

  interface MemberDeltas {
    userId: string
    deltaVS: number
    deltaPlays: number
    deltaDebut: { artists: number; tracks: number; albums: number }
    deltaWeeksAtOne: { artists: number; tracks: number; albums: number }
  }
  const deltasByMember: MemberDeltas[] = []

  for (const { userId } of members) {
    const userVS = await prisma.userChartEntryVS.findMany({
      where: {
        userId,
        weekStart: normalizedWeekStart,
        chartType: { in: CHART_TYPES },
      },
      select: { chartType: true, entryKey: true, vibeScore: true, playcount: true },
    })

    let deltaVS = 0
    let deltaPlays = 0
    const deltaDebut = { artists: 0, tracks: 0, albums: 0 }
    const deltaWeeksAtOne = { artists: 0, tracks: 0, albums: 0 }

    for (const uv of userVS) {
      const key = `${uv.chartType}|${uv.entryKey}`
      const chartEntry = chartEntryMap.get(key)
      if (!chartEntry) continue

      const addVS = useVS ? uv.vibeScore : uv.playcount
      deltaVS += addVS
      deltaPlays += uv.playcount

      const firstWeek = firstWeekMap.get(key)
      const isDebut =
        firstWeek &&
        firstWeek.getTime() === normalizedWeekStart.getTime()
      if (isDebut) {
        if (uv.chartType === 'artists') deltaDebut.artists += 1
        else if (uv.chartType === 'tracks') deltaDebut.tracks += 1
        else if (uv.chartType === 'albums') deltaDebut.albums += 1
      }

      if (chartEntry.position === 1) {
        if (uv.chartType === 'artists') deltaWeeksAtOne.artists += 1
        else if (uv.chartType === 'tracks') deltaWeeksAtOne.tracks += 1
        else if (uv.chartType === 'albums') deltaWeeksAtOne.albums += 1
      }
    }

    deltasByMember.push({
      userId,
      deltaVS,
      deltaPlays,
      deltaDebut,
      deltaWeeksAtOne,
    })
  }

  // MVP for this week = member with highest VS contribution to this week's chart
  const mvpUserId =
    deltasByMember.length > 0
      ? deltasByMember.reduce((best, m) =>
          m.deltaVS > best.deltaVS ? m : best
        ).userId
      : null

  for (const d of deltasByMember) {
    const { userId, deltaVS, deltaPlays, deltaDebut, deltaWeeksAtOne } = d
    const isMVP = mvpUserId !== null && userId === mvpUserId && deltaVS > 0

    if (
      deltaVS === 0 &&
      deltaPlays === 0 &&
      deltaDebut.artists === 0 &&
      deltaDebut.tracks === 0 &&
      deltaDebut.albums === 0 &&
      deltaWeeksAtOne.artists === 0 &&
      deltaWeeksAtOne.tracks === 0 &&
      deltaWeeksAtOne.albums === 0 &&
      !isMVP
    ) {
      continue
    }

    await prisma.memberGroupStats.upsert({
      where: {
        groupId_userId: { groupId, userId },
      },
      create: {
        groupId,
        userId,
        totalVS: deltaVS,
        totalPlays: deltaPlays,
        entriesHelpedDebutArtists: deltaDebut.artists,
        entriesHelpedDebutTracks: deltaDebut.tracks,
        entriesHelpedDebutAlbums: deltaDebut.albums,
        weeksAtOneContributedArtists: deltaWeeksAtOne.artists,
        weeksAtOneContributedTracks: deltaWeeksAtOne.tracks,
        weeksAtOneContributedAlbums: deltaWeeksAtOne.albums,
        weeksAsMVP: isMVP ? 1 : 0,
      },
      update: {
        totalVS: { increment: deltaVS },
        totalPlays: { increment: deltaPlays },
        entriesHelpedDebutArtists: { increment: deltaDebut.artists },
        entriesHelpedDebutTracks: { increment: deltaDebut.tracks },
        entriesHelpedDebutAlbums: { increment: deltaDebut.albums },
        weeksAtOneContributedArtists: { increment: deltaWeeksAtOne.artists },
        weeksAtOneContributedTracks: { increment: deltaWeeksAtOne.tracks },
        weeksAtOneContributedAlbums: { increment: deltaWeeksAtOne.albums },
        ...(isMVP ? { weeksAsMVP: { increment: 1 } } : {}),
      },
    })
  }
}

/**
 * Get stored MemberGroupStats for a member (or all members) in a group.
 */
export async function getMemberGroupStats(
  groupId: string,
  userId?: string
): Promise<MemberGroupStatsRow | MemberGroupStatsRow[] | null> {
  if (userId) {
    const row = await prisma.memberGroupStats.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    return row
      ? {
          groupId: row.groupId,
          userId: row.userId,
          totalVS: row.totalVS,
          totalPlays: row.totalPlays,
          entriesHelpedDebutArtists: row.entriesHelpedDebutArtists,
          entriesHelpedDebutTracks: row.entriesHelpedDebutTracks,
          entriesHelpedDebutAlbums: row.entriesHelpedDebutAlbums,
          weeksAtOneContributedArtists: row.weeksAtOneContributedArtists,
          weeksAtOneContributedTracks: row.weeksAtOneContributedTracks,
          weeksAtOneContributedAlbums: row.weeksAtOneContributedAlbums,
          weeksAsMVP: row.weeksAsMVP,
          lastUpdated: row.lastUpdated,
        }
      : null
  }
  const rows = await prisma.memberGroupStats.findMany({
    where: { groupId },
  })
  return rows.map((row: { groupId: string; userId: string; totalVS: number; totalPlays: number; entriesHelpedDebutArtists: number; entriesHelpedDebutTracks: number; entriesHelpedDebutAlbums: number; weeksAtOneContributedArtists: number; weeksAtOneContributedTracks: number; weeksAtOneContributedAlbums: number; weeksAsMVP: number; lastUpdated: Date }) => ({
    groupId: row.groupId,
    userId: row.userId,
    totalVS: row.totalVS,
    totalPlays: row.totalPlays,
    entriesHelpedDebutArtists: row.entriesHelpedDebutArtists,
    entriesHelpedDebutTracks: row.entriesHelpedDebutTracks,
    entriesHelpedDebutAlbums: row.entriesHelpedDebutAlbums,
    weeksAtOneContributedArtists: row.weeksAtOneContributedArtists,
    weeksAtOneContributedTracks: row.weeksAtOneContributedTracks,
    weeksAtOneContributedAlbums: row.weeksAtOneContributedAlbums,
    weeksAsMVP: row.weeksAsMVP,
    lastUpdated: row.lastUpdated,
  }))
}

/**
 * Count entries where the user is the main chart driver (ChartEntryStats.majorDriverUserId).
 * Computed on read from ChartEntryStats.
 */
export async function getEntriesAsMainDriverCount(
  groupId: string,
  userId: string
): Promise<{ artists: number; tracks: number; albums: number }> {
  const counts = await prisma.chartEntryStats.groupBy({
    by: ['chartType'],
    where: {
      groupId,
      majorDriverUserId: userId,
    },
    _count: { id: true },
  })
  const result = { artists: 0, tracks: 0, albums: 0 }
  for (const c of counts) {
    if (c.chartType === 'artists') result.artists = c._count.id
    else if (c.chartType === 'tracks') result.tracks = c._count.id
    else if (c.chartType === 'albums') result.albums = c._count.id
  }
  return result
}

/**
 * List entries where the user is the main chart driver, with name/artist/slug for display and links.
 */
export async function getEntriesAsMainDriverList(
  groupId: string,
  userId: string
): Promise<DriverEntry[]> {
  const stats = await prisma.chartEntryStats.findMany({
    where: {
      groupId,
      majorDriverUserId: userId,
    },
    select: { chartType: true, entryKey: true, slug: true, weeksAtOne: true },
  })
  if (stats.length === 0) return []
  const keys = stats.map((s) => ({ chartType: s.chartType, entryKey: s.entryKey }))
  const latestEntries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      OR: keys.map((k) => ({ chartType: k.chartType, entryKey: k.entryKey })),
    },
    orderBy: { weekStart: 'desc' },
    select: { chartType: true, entryKey: true, name: true, artist: true },
  })
  const nameByKey = new Map<string, { name: string; artist: string | null }>()
  for (const e of latestEntries) {
    const key = `${e.chartType}|${e.entryKey}`
    if (!nameByKey.has(key)) nameByKey.set(key, { name: e.name, artist: e.artist })
  }
  return stats.map((s) => {
    const key = `${s.chartType}|${s.entryKey}`
    const { name, artist } = nameByKey.get(key) ?? { name: s.entryKey, artist: null }
    return {
      chartType: s.chartType as ChartType,
      entryKey: s.entryKey,
      name,
      artist,
      slug: s.slug ?? '',
      reachedNumberOne: (s.weeksAtOne ?? 0) > 0,
    }
  })
}

/**
 * Get full personalized member stats for a user in a group (stored + main driver count).
 */
export async function getPersonalizedMemberStats(
  groupId: string,
  userId: string
): Promise<PersonalizedMemberStats | null> {
  const stored = (await getMemberGroupStats(groupId, userId)) as MemberGroupStatsRow | null
  const mainDriver = await getEntriesAsMainDriverCount(groupId, userId)
  const driverEntries = await getEntriesAsMainDriverList(groupId, userId)
  const hasMainDriver =
    mainDriver.artists > 0 || mainDriver.tracks > 0 || mainDriver.albums > 0

  if (!stored) {
    if (!hasMainDriver) return null
    return {
      totalVS: 0,
      totalPlays: 0,
      weeksAsMVP: 0,
      byChartType: {
        artists: {
          entriesHelpedDebut: 0,
          weeksAtOneContributed: 0,
          entriesAsMainDriver: mainDriver.artists,
        },
        tracks: {
          entriesHelpedDebut: 0,
          weeksAtOneContributed: 0,
          entriesAsMainDriver: mainDriver.tracks,
        },
        albums: {
          entriesHelpedDebut: 0,
          weeksAtOneContributed: 0,
          entriesAsMainDriver: mainDriver.albums,
        },
      },
      driverEntries,
    }
  }

  return {
    totalVS: stored.totalVS,
    totalPlays: stored.totalPlays,
    weeksAsMVP: stored.weeksAsMVP,
    byChartType: {
      artists: {
        entriesHelpedDebut: stored.entriesHelpedDebutArtists,
        weeksAtOneContributed: stored.weeksAtOneContributedArtists,
        entriesAsMainDriver: mainDriver.artists,
      },
      tracks: {
        entriesHelpedDebut: stored.entriesHelpedDebutTracks,
        weeksAtOneContributed: stored.weeksAtOneContributedTracks,
        entriesAsMainDriver: mainDriver.tracks,
      },
      albums: {
        entriesHelpedDebut: stored.entriesHelpedDebutAlbums,
        weeksAtOneContributed: stored.weeksAtOneContributedAlbums,
        entriesAsMainDriver: mainDriver.albums,
      },
    },
    driverEntries,
  }
}

/**
 * Recalculate all MemberGroupStats for a single group from scratch.
 * Deletes existing stats and re-accumulates from all historical chart weeks.
 */
export async function recalculateMemberGroupStatsForGroup(
  groupId: string
): Promise<{ weeksProcessed: number }> {
  // Delete existing stats for this group
  await prisma.memberGroupStats.deleteMany({
    where: { groupId },
  })

  // Get all distinct weekStarts for this group, in chronological order
  const weeks = await prisma.groupChartEntry.findMany({
    where: { groupId },
    select: { weekStart: true },
    distinct: ['weekStart'],
    orderBy: { weekStart: 'asc' },
  })

  // Re-accumulate for each week
  for (const { weekStart } of weeks) {
    await accumulateMemberGroupStats(groupId, weekStart)
  }

  return { weeksProcessed: weeks.length }
}

/**
 * Recalculate MemberGroupStats for all groups.
 * Returns progress info for each group processed.
 */
export async function recalculateAllMemberGroupStats(): Promise<{
  groupsProcessed: number
  totalWeeksProcessed: number
  details: Array<{ groupId: string; groupName: string; weeksProcessed: number }>
}> {
  // Get all groups that have chart data
  const groups = await prisma.group.findMany({
    where: {
      chartEntries: {
        some: {},
      },
    },
    select: { id: true, name: true },
  })

  const details: Array<{ groupId: string; groupName: string; weeksProcessed: number }> = []
  let totalWeeksProcessed = 0

  for (const group of groups) {
    const result = await recalculateMemberGroupStatsForGroup(group.id)
    details.push({
      groupId: group.id,
      groupName: group.name,
      weeksProcessed: result.weeksProcessed,
    })
    totalWeeksProcessed += result.weeksProcessed
  }

  return {
    groupsProcessed: groups.length,
    totalWeeksProcessed,
    details,
  }
}
