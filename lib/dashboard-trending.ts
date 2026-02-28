// Dashboard "Charting Everywhere" banner – trending entries across public groups

import { prisma } from './prisma'
import { generateSlug, ChartType } from './chart-slugs'
import { getWeekStartNWeeksAgo } from './weekly-utils'
import { getGroupImageUrl } from './group-image-utils'
import { getSelectedArtistImage } from './artist-images'
import { getPersonalListeningStats } from './dashboard-queries'

const RECENT_WEEKS = 12
/** Groups with no chart entry in this many weeks are considered inactive and excluded from the banner. */
const ACTIVE_GROUP_CUTOFF_WEEKS = 8
const DEFAULT_GLOBAL_LIMIT = 6
const DEFAULT_SAMPLE_GROUPS = 3

export interface TrendingBannerGroup {
  id: string
  name: string
  image: string | null
}

export interface TrendingBannerItem {
  chartType: ChartType
  entryKey: string
  name: string
  artist: string | null
  slug: string
  imageUrl: string | null
  groupCount: number
  groups: TrendingBannerGroup[]
  forYou?: boolean
  subtitleKey?: string
}

/** Normalize artist name to entryKey format (matches chart storage) */
function artistToEntryKey(name: string): string {
  return (name || '').trim().toLowerCase()
}

/** Build track/album entryKey from name and artist */
function trackOrAlbumToEntryKey(name: string, artist: string): string {
  return `${(name || '').trim()}|${(artist || '').trim()}`.toLowerCase()
}

/**
 * Public, non-solo groups that have at least one chart entry in the last ACTIVE_GROUP_CUTOFF_WEEKS.
 * Inactive groups are excluded from the entire trending flow.
 */
async function getActivePublicGroupIds(): Promise<string[]> {
  const cutoff = getWeekStartNWeeksAgo(ACTIVE_GROUP_CUTOFF_WEEKS)
  const rows = await prisma.groupChartEntry.findMany({
    where: {
      weekStart: { gte: cutoff },
      group: {
        isPrivate: false,
        isSolo: false,
      },
    },
    select: { groupId: true },
    distinct: ['groupId'],
  })
  return rows.map((r) => r.groupId)
}

/**
 * Get the latest weekStart that has at least one GroupChartEntry in an active public group.
 */
async function getLatestPublicChartWeek(activeGroupIds: string[]): Promise<Date | null> {
  if (activeGroupIds.length === 0) return null
  const latest = await prisma.groupChartEntry.findFirst({
    where: {
      groupId: { in: activeGroupIds },
    },
    orderBy: { weekStart: 'desc' },
    select: { weekStart: true },
  })
  return latest?.weekStart ?? null
}

/**
 * Get active public group IDs where this entry has charted in the last RECENT_WEEKS.
 */
async function getPublicGroupIdsWhereEntryCharted(
  chartType: ChartType,
  entryKey: string,
  activeGroupIds: string[]
): Promise<string[]> {
  if (activeGroupIds.length === 0) return []
  const weekStartCutoff = getWeekStartNWeeksAgo(RECENT_WEEKS)
  const rows = await prisma.groupChartEntry.findMany({
    where: {
      chartType,
      entryKey,
      weekStart: { gte: weekStartCutoff },
      groupId: { in: activeGroupIds },
    },
    select: { groupId: true },
    distinct: ['groupId'],
  })
  return rows.map((r) => r.groupId)
}

/**
 * Enrich group IDs with name and image (public groups only).
 */
async function getGroupsWithImages(
  groupIds: string[],
  take: number
): Promise<TrendingBannerGroup[]> {
  if (groupIds.length === 0) return []
  const ids = groupIds.slice(0, take)
  const groups = await prisma.group.findMany({
    where: {
      id: { in: ids },
      isPrivate: false,
      isSolo: false,
    },
    select: {
      id: true,
      name: true,
      image: true,
      dynamicIconEnabled: true,
      dynamicIconSource: true,
    },
  })
  const order = new Map(ids.map((id, i) => [id, i]))
  const sorted = [...groups].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  const result: TrendingBannerGroup[] = []
  for (const g of sorted) {
    const image = await getGroupImageUrl({
      id: g.id,
      image: g.image,
      dynamicIconEnabled: g.dynamicIconEnabled,
      dynamicIconSource: g.dynamicIconSource,
    })
    result.push({ id: g.id, name: g.name, image })
  }
  return result
}

/**
 * Resolve image URL for a banner entry (artist image for artists; artist image for tracks/albums as fallback).
 */
async function getEntryImageUrl(
  chartType: ChartType,
  name: string,
  artist: string | null
): Promise<string | null> {
  if (chartType === 'artists') {
    return getSelectedArtistImage(name)
  }
  if (artist) {
    return getSelectedArtistImage(artist)
  }
  return null
}

/**
 * Global trending: entries that chart in the most active public groups for the latest week.
 */
export async function getGlobalTrendingEntries(
  limit: number = DEFAULT_GLOBAL_LIMIT,
  sampleGroupsPerEntry: number = DEFAULT_SAMPLE_GROUPS
): Promise<TrendingBannerItem[]> {
  const activeGroupIds = await getActivePublicGroupIds()
  const latestWeek = await getLatestPublicChartWeek(activeGroupIds)
  if (!latestWeek) return []

  const entries = await prisma.groupChartEntry.findMany({
    where: {
      weekStart: latestWeek,
      groupId: { in: activeGroupIds },
    },
    select: {
      groupId: true,
      chartType: true,
      entryKey: true,
      name: true,
      artist: true,
      slug: true,
    },
  })

  // Group by (chartType, entryKey), count distinct groupId
  const byKey = new Map<string, { name: string; artist: string | null; slug: string | null; groupIds: Set<string> }>()
  for (const e of entries) {
    const key = `${e.chartType}\t${e.entryKey}`
    const existing = byKey.get(key)
    const slug = e.slug ?? generateSlug(e.entryKey, e.chartType as ChartType)
    if (existing) {
      existing.groupIds.add(e.groupId)
    } else {
      byKey.set(key, {
        name: e.name,
        artist: e.artist,
        slug,
        groupIds: new Set([e.groupId]),
      })
    }
  }

  const sorted = [...byKey.entries()]
    .map(([k, v]) => {
      const [chartType, entryKey] = k.split('\t') as [ChartType, string]
      return { chartType, entryKey, ...v, groupCount: v.groupIds.size }
    })
    .sort((a, b) => b.groupCount - a.groupCount)
    .slice(0, limit)

  const result: TrendingBannerItem[] = []
  for (const row of sorted) {
    const groupIds = await getPublicGroupIdsWhereEntryCharted(row.chartType, row.entryKey, activeGroupIds)
    const groups = await getGroupsWithImages(groupIds, sampleGroupsPerEntry)
    const slug = row.slug ?? generateSlug(row.entryKey, row.chartType)
    const imageUrl = await getEntryImageUrl(row.chartType, row.name, row.artist)
    result.push({
      chartType: row.chartType,
      entryKey: row.entryKey,
      name: row.name,
      artist: row.artist,
      slug,
      imageUrl,
      groupCount: groupIds.length,
      groups,
    })
  }
  return result
}

/**
 * For-you trending: user's top artist (and optionally top track) with public groups where they chart.
 */
export async function getForYouTrendingEntries(
  userId: string,
  limit: number = 2,
  sampleGroupsPerEntry: number = DEFAULT_SAMPLE_GROUPS
): Promise<TrendingBannerItem[]> {
  const activeGroupIds = await getActivePublicGroupIds()
  if (activeGroupIds.length === 0) return []

  const stats = await getPersonalListeningStats(userId)
  const currentWeek = stats?.currentWeek
  if (!currentWeek) return []

  const result: TrendingBannerItem[] = []

  // Top artist
  if (currentWeek.topArtists?.length > 0 && result.length < limit) {
    const artist = currentWeek.topArtists[0]
    const entryKey = artistToEntryKey(artist.name)
    const groupIds = await getPublicGroupIdsWhereEntryCharted('artists', entryKey, activeGroupIds)
    if (groupIds.length > 0) {
      const groups = await getGroupsWithImages(groupIds, sampleGroupsPerEntry)
      const imageUrl = await getSelectedArtistImage(artist.name)
      result.push({
        chartType: 'artists',
        entryKey,
        name: artist.name,
        artist: null,
        slug: generateSlug(entryKey, 'artists'),
        imageUrl,
        groupCount: groupIds.length,
        groups,
        forYou: true,
        subtitleKey: 'yourTopArtist',
      })
    }
  }

  // Optionally one top track
  if (currentWeek.topTracks?.length > 0 && result.length < limit) {
    const track = currentWeek.topTracks[0]
    const entryKey = trackOrAlbumToEntryKey(track.name, track.artist)
    const groupIds = await getPublicGroupIdsWhereEntryCharted('tracks', entryKey, activeGroupIds)
    if (groupIds.length > 0) {
      const groups = await getGroupsWithImages(groupIds, sampleGroupsPerEntry)
      const imageUrl = track.artist ? await getSelectedArtistImage(track.artist) : null
      result.push({
        chartType: 'tracks',
        entryKey,
        name: track.name,
        artist: track.artist,
        slug: generateSlug(entryKey, 'tracks'),
        imageUrl,
        groupCount: groupIds.length,
        groups,
        forYou: true,
        subtitleKey: 'yourTopTrack',
      })
    }
  }

  return result.slice(0, limit)
}
