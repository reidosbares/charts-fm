/**
 * MVP per week cache (GroupWeekMVP). Computed from chart data; backfilled on first access.
 */

import { prisma } from './prisma'

const CHART_TYPES = ['artists', 'tracks', 'albums'] as const

export interface MVPForWeek {
  mvpUserId: string | null
  totalVS: number
  totalPlays: number
}

/**
 * Compute who was MVP for a given group and week (same rule as MemberGroupStats:
 * member with highest VS, or playcount if chart mode is plays).
 */
export async function computeMVPForWeek(
  groupId: string,
  weekStart: Date
): Promise<MVPForWeek> {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { chartMode: true },
  })
  const chartMode = (group?.chartMode || 'vs') as string
  const useVS = chartMode === 'vs' || chartMode === 'vs_weighted'

  const chartEntries = await prisma.groupChartEntry.findMany({
    where: { groupId, weekStart: normalizedWeekStart },
    select: { entryKey: true, chartType: true, position: true },
  })
  if (chartEntries.length === 0) {
    return { mvpUserId: null, totalVS: 0, totalPlays: 0 }
  }

  const chartEntryMap = new Map<string, { position: number }>()
  for (const e of chartEntries) {
    chartEntryMap.set(`${e.chartType}|${e.entryKey}`, { position: e.position })
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  })

  let bestUserId: string | null = null
  let bestVS = 0
  let bestPlays = 0

  for (const { userId } of members) {
    const userVS = await prisma.userChartEntryVS.findMany({
      where: {
        userId,
        weekStart: normalizedWeekStart,
        chartType: { in: [...CHART_TYPES] },
      },
      select: { chartType: true, entryKey: true, vibeScore: true, playcount: true },
    })

    let deltaVS = 0
    let deltaPlays = 0
    for (const uv of userVS) {
      const key = `${uv.chartType}|${uv.entryKey}`
      if (!chartEntryMap.has(key)) continue
      deltaVS += useVS ? (uv.vibeScore ?? 0) : uv.playcount
      deltaPlays += uv.playcount
    }

    if (deltaVS > bestVS) {
      bestVS = deltaVS
      bestPlays = deltaPlays
      bestUserId = userId
    }
  }

  return {
    mvpUserId: bestUserId,
    totalVS: bestVS,
    totalPlays: bestPlays,
  }
}

/**
 * Persist MVP for a single week (e.g. when charts are generated). Call while
 * UserChartEntryVS for that week still exists so MVP is stored before any cleanup.
 */
export async function persistMVPForWeek(groupId: string, weekStart: Date): Promise<void> {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)
  const { mvpUserId, totalVS, totalPlays } = await computeMVPForWeek(groupId, normalizedWeekStart)
  await prisma.groupWeekMVP.upsert({
    where: {
      groupId_weekStart: { groupId, weekStart: normalizedWeekStart },
    },
    create: {
      groupId,
      weekStart: normalizedWeekStart,
      mvpUserId,
      totalVS,
      totalPlays,
    },
    update: {
      mvpUserId,
      totalVS,
      totalPlays,
    },
  })
}

/**
 * Ensure GroupWeekMVP is filled for this group. If the table is empty, compute MVP
 * for every week that has chart data and upsert. Idempotent.
 */
export async function ensureMVPByWeekFilled(groupId: string): Promise<number> {
  const existing = await prisma.groupWeekMVP.count({ where: { groupId } })
  if (existing > 0) return existing

  const weeks = await prisma.groupChartEntry.findMany({
    where: { groupId },
    select: { weekStart: true },
    distinct: ['weekStart'],
    orderBy: { weekStart: 'asc' },
  })

  for (const { weekStart } of weeks) {
    const { mvpUserId, totalVS, totalPlays } = await computeMVPForWeek(groupId, weekStart)
    await prisma.groupWeekMVP.upsert({
      where: {
        groupId_weekStart: { groupId, weekStart },
      },
      create: {
        groupId,
        weekStart,
        mvpUserId,
        totalVS,
        totalPlays,
      },
      update: {
        mvpUserId,
        totalVS,
        totalPlays,
      },
    })
  }

  return weeks.length
}

/**
 * Get weeks-as-MVP count per user from GroupWeekMVP (ensures table filled).
 * Used so "weeks as MVP" everywhere matches the MVP-per-week table.
 */
export async function getMVPCountsByUser(groupId: string): Promise<Map<string, number>> {
  await ensureMVPByWeekFilled(groupId)
  const rows = await prisma.groupWeekMVP.findMany({
    where: { groupId, mvpUserId: { not: null } },
    select: { mvpUserId: true },
  })
  const map = new Map<string, number>()
  for (const row of rows) {
    const uid = row.mvpUserId!
    map.set(uid, (map.get(uid) ?? 0) + 1)
  }
  return map
}

/**
 * User with the most weeks as MVP and their count (from GroupWeekMVP table).
 */
export async function getMostWeeksAsMVPFromTable(
  groupId: string
): Promise<{ userId: string; count: number } | null> {
  const counts = await getMVPCountsByUser(groupId)
  let best: { userId: string; count: number } | null = null
  for (const [userId, count] of counts) {
    if (count > 0 && (!best || count > best.count)) best = { userId, count }
  }
  return best
}

/**
 * Weeks-as-MVP count for a single user (from GroupWeekMVP table).
 */
export async function getWeeksAsMVPCountForUser(groupId: string, userId: string): Promise<number> {
  const counts = await getMVPCountsByUser(groupId)
  return counts.get(userId) ?? 0
}

export interface MVPByWeekRow {
  weekStart: string
  weekNumber: number
  mvpUserId: string | null
  mvpName: string | null
  mvpImage: string | null
  mvpLastfmUsername: string | null
  totalVS: number
  totalPlays: number
}

/**
 * Get MVP-by-week list for a group (weekStart desc). Ensures cache is filled first.
 */
export async function getMVPByWeekList(groupId: string): Promise<MVPByWeekRow[]> {
  await ensureMVPByWeekFilled(groupId)

  const rows = await prisma.groupWeekMVP.findMany({
    where: { groupId },
    orderBy: { weekStart: 'desc' },
    include: {
      mvpUser: {
        select: { id: true, name: true, image: true, lastfmUsername: true },
      },
    },
  })

  const totalWeeks = rows.length
  return rows.map((row: { weekStart: Date; mvpUserId: string | null; mvpUser: { name: string | null; lastfmUsername: string; image: string | null } | null; totalVS: number; totalPlays: number }, index: number) => ({
    weekStart: row.weekStart.toISOString(),
    weekNumber: totalWeeks - index,
    mvpUserId: row.mvpUserId,
    mvpName: row.mvpUser?.name ?? row.mvpUser?.lastfmUsername ?? null,
    mvpImage: row.mvpUser?.image ?? null,
    mvpLastfmUsername: row.mvpUser?.lastfmUsername ?? null,
    totalVS: row.totalVS,
    totalPlays: row.totalPlays,
  }))
}
