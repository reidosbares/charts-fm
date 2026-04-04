import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getRecordTypeFieldMapping, isRecordTypeSupported, isArtistSpecificRecordType, getArtistAggregationRecords } from '@/lib/group-records'
import { ChartType } from '@/lib/chart-slugs'
import { calculateEntryStatsBatch } from '@/lib/chart-deep-dive'

export async function GET(
  request: Request,
  { params }: { params: { id: string; recordType: string } }
) {
  try {
    const { group } = await checkGroupAccessForAPI(params.id)

    // Validate record type
    if (!isRecordTypeSupported(params.recordType)) {
      return NextResponse.json({ error: 'Unsupported record type' }, { status: 400 })
    }

    // Handle artist-specific record types
    if (isArtistSpecificRecordType(params.recordType)) {
      // Check cache first
      // Use findFirst because Prisma doesn't allow null in composite unique constraints with findUnique
      const cached = await prisma.groupRecordDetailCache.findFirst({
        where: {
          groupId: group.id,
          recordType: params.recordType,
          entryType: null,
        },
      })

      if (cached) {
        return NextResponse.json({
          recordType: params.recordType,
          entryType: 'artists',
          entries: cached.entries as any,
        })
      }

      // Cache miss - calculate and store
      const entries = await getArtistAggregationRecords(group.id, params.recordType, 100)
      
      // Store in cache
      // Use findFirst + create/update because Prisma doesn't allow null in composite unique constraints with upsert
      const existing = await prisma.groupRecordDetailCache.findFirst({
        where: {
          groupId: group.id,
          recordType: params.recordType,
          entryType: null,
        },
      })

      if (existing) {
        await prisma.groupRecordDetailCache.update({
          where: { id: existing.id },
          data: {
            entries: entries as any,
            lastUpdated: new Date(),
          },
        })
      } else {
        await prisma.groupRecordDetailCache.create({
          data: {
            groupId: group.id,
            recordType: params.recordType,
            entryType: null,
            entries: entries as any,
          },
        })
      }
      
      return NextResponse.json({
        recordType: params.recordType,
        entryType: 'artists', // Artist-specific records always return artists
        entries,
      })
    }

    const fieldName = getRecordTypeFieldMapping(params.recordType)
    if (!fieldName) {
      return NextResponse.json({ error: 'Invalid record type mapping' }, { status: 400 })
    }

    // Get query params for entry type filter
    const url = new URL(request.url)
    const entryType = url.searchParams.get('type') || 'artists'
    const chartTypes: ChartType[] = ['artists', 'tracks', 'albums']
    
    if (!chartTypes.includes(entryType as ChartType)) {
      return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })
    }

    // Check cache first
    const cached = await prisma.groupRecordDetailCache.findUnique({
      where: {
        groupId_recordType_entryType: {
          groupId: group.id,
          recordType: params.recordType,
          entryType: entryType,
        },
      },
    })

    if (cached) {
      return NextResponse.json({
        recordType: params.recordType,
        entryType,
        entries: cached.entries as any,
      })
    }

    // Peak weekly records: each entry+week combo is its own row
    const isPeakWeeklyRecord = params.recordType === 'most-vs-in-single-week' || params.recordType === 'most-plays-in-single-week'

    let rankedEntries: Array<{
      rank: number
      entryKey: string
      name: string
      artist: string | null
      slug: string
      value: number
      weekStart?: string
    }>

    if (isPeakWeeklyRecord) {
      const orderField = params.recordType === 'most-vs-in-single-week' ? 'vibeScore' : 'playcount'
      const whereFilter = params.recordType === 'most-vs-in-single-week'
        ? { vibeScore: { not: null, gt: 0 } as any }
        : { playcount: { gt: 0 } }

      const rows = await prisma.groupChartEntry.findMany({
        where: {
          groupId: group.id,
          chartType: entryType as ChartType,
          ...whereFilter,
        },
        orderBy: { [orderField]: 'desc' },
        take: 100,
        select: {
          entryKey: true,
          name: true,
          artist: true,
          slug: true,
          weekStart: true,
          vibeScore: true,
          playcount: true,
        },
      })

      rankedEntries = rows.map((row, index) => ({
        rank: index + 1,
        entryKey: row.entryKey,
        name: row.name,
        artist: row.artist,
        slug: row.slug || '',
        value: orderField === 'vibeScore' ? Math.round((row.vibeScore as number) * 100) / 100 : row.playcount,
        weekStart: row.weekStart.toISOString(),
      }))
    } else {
      // Standard records: use ChartEntryStats for per-entry aggregation

      // First, get a rough estimate of top entries (even if stats are stale)
      const roughTopEntries = await prisma.chartEntryStats.findMany({
        where: {
          groupId: group.id,
          chartType: entryType as ChartType,
        },
        orderBy: {
          [fieldName]: 'desc',
        },
        take: 150,
        select: {
          entryKey: true,
          statsStale: true,
        },
      })

      const entryKeysWithStats = new Set(roughTopEntries.map(e => e.entryKey))
      const staleEntryKeys = roughTopEntries
        .filter(e => e.statsStale)
        .map(e => e.entryKey)

      let missingEntryKeys: string[] = []
      if (entryKeysWithStats.size > 0) {
        const entriesWithoutStats = await prisma.groupChartEntry.findMany({
          where: {
            groupId: group.id,
            chartType: entryType as ChartType,
            entryKey: { notIn: Array.from(entryKeysWithStats) },
          },
          select: {
            entryKey: true,
          },
          distinct: ['entryKey'],
        })

        if (entriesWithoutStats.length > 0) {
          const entryKeysArray = entriesWithoutStats.map(e => e.entryKey)
          const topEntriesByWeeks = await prisma.$queryRaw<Array<{
            entryKey: string
          }>>`
            SELECT
              "entryKey",
              COUNT(DISTINCT "weekStart")::bigint as weeks_count
            FROM "group_chart_entries"
            WHERE "groupId" = ${group.id}::text
              AND "chartType" = ${entryType}
              AND "entryKey" = ANY(${entryKeysArray}::text[])
            GROUP BY "entryKey"
            ORDER BY weeks_count DESC
            LIMIT 50
          `
          missingEntryKeys = topEntriesByWeeks.map(e => e.entryKey)
        }
      } else {
        const topEntriesByWeeks = await prisma.$queryRaw<Array<{
          entryKey: string
        }>>`
          SELECT
            "entryKey",
            COUNT(DISTINCT "weekStart")::bigint as weeks_count
          FROM "group_chart_entries"
          WHERE "groupId" = ${group.id}::text
            AND "chartType" = ${entryType}
          GROUP BY "entryKey"
          ORDER BY weeks_count DESC
          LIMIT 50
        `
        missingEntryKeys = topEntriesByWeeks.map(e => e.entryKey)
      }

      const allEntryKeysToCalculate = Array.from(new Set([
        ...staleEntryKeys,
        ...missingEntryKeys,
      ]))

      if (allEntryKeysToCalculate.length > 0) {
        await calculateEntryStatsBatch(group.id, entryType as ChartType, allEntryKeysToCalculate)
      }

      // For nullable fields (totalVS, peakWeeklyVS, peakWeeklyPlays), exclude NULLs
      // to avoid them sorting first in DESC order
      const nullableFields = ['totalVS', 'peakWeeklyVS', 'peakWeeklyPlays']
      const fieldFilter = nullableFields.includes(fieldName)
        ? { [fieldName]: { not: null } }
        : {}
      const stats = await prisma.chartEntryStats.findMany({
        where: {
          groupId: group.id,
          chartType: entryType as ChartType,
          ...fieldFilter,
        },
        orderBy: {
          [fieldName]: 'desc',
        },
        take: 100,
        select: {
          entryKey: true,
          slug: true,
          [fieldName]: true,
        },
      })

      const entryKeys = stats.map(s => s.entryKey)
      const entries = await prisma.groupChartEntry.findMany({
        where: {
          groupId: group.id,
          chartType: entryType as ChartType,
          entryKey: { in: entryKeys },
        },
        select: {
          entryKey: true,
          name: true,
          artist: true,
        },
        distinct: ['entryKey'],
      })

      const entryMap = new Map(entries.map(e => [e.entryKey, e]))

      rankedEntries = stats
        .map((stat) => {
          const entry = entryMap.get(stat.entryKey)
          if (!entry) return null

          const value = stat[fieldName as keyof typeof stat] as number
          if (value === 0 || value === null || value === undefined) {
            return null
          }

          return {
            rank: 0,
            entryKey: stat.entryKey,
            name: entry.name,
            artist: entry.artist,
            slug: stat.slug,
            value,
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }))
    }

    // Store in cache
    await prisma.groupRecordDetailCache.upsert({
      where: {
        groupId_recordType_entryType: {
          groupId: group.id,
          recordType: params.recordType,
          entryType: entryType,
        },
      },
      create: {
        groupId: group.id,
        recordType: params.recordType,
        entryType: entryType,
        entries: rankedEntries as any,
      },
      update: {
        entries: rankedEntries as any,
        lastUpdated: new Date(),
      },
    })

    return NextResponse.json({
      recordType: params.recordType,
      entryType,
      entries: rankedEntries,
    })
  } catch (error) {
    console.error('Error fetching record details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch record details' },
      { status: 500 }
    )
  }
}

