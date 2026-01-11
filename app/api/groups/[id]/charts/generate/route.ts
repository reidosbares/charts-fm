import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { calculateGroupWeeklyStats, deleteOverlappingCharts, updateGroupIconFromChart, getLastChartWeek, canUpdateCharts } from '@/lib/group-service'
import { getWeekStartForDay, getWeekEndForDay, getLastNFinishedWeeksForDay } from '@/lib/weekly-utils'
import { recalculateAllTimeStats } from '@/lib/group-alltime-stats'
import { invalidateEntryStatsCacheBatch } from '@/lib/chart-deep-dive'
import { calculateGroupTrends } from '@/lib/group-trends'
import { calculateGroupRecords, getGroupRecords } from '@/lib/group-records'
import { ChartType } from '@/lib/chart-slugs'

/**
 * POST - Generate charts for a group
 * This endpoint is called to generate charts in a separate execution context.
 * This ensures the generation completes even in serverless environments where the parent request may terminate.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const body = await request.json().catch(() => ({}))
    const { trackingDayOfWeek, chartSize, chartMode } = body as {
      trackingDayOfWeek: number
      chartSize: number
      chartMode: 'vs' | 'vs_weighted' | 'plays_only'
    }

    if (trackingDayOfWeek === undefined || chartSize === undefined || !chartMode) {
      return NextResponse.json(
        { error: 'Missing required parameters: trackingDayOfWeek, chartSize, chartMode' },
        { status: 400 }
      )
    }

    // Verify the group exists and generation is in progress
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        chartGenerationInProgress: true,
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (!group.chartGenerationInProgress) {
      return NextResponse.json(
        { error: 'Chart generation is not in progress' },
        { status: 400 }
      )
    }

    // Get last chart week
    const lastChartWeek = await getLastChartWeek(groupId)
    const now = new Date()
    
    let weeksToGenerate: Date[] = []

    if (!lastChartWeek) {
      // No charts exist, generate last 10 finished weeks
      weeksToGenerate = getLastNFinishedWeeksForDay(10, trackingDayOfWeek)
      console.log(`[Chart Generate] No previous charts found. Generated ${weeksToGenerate.length} weeks to process.`)
    } else {
      // Check if charts can be updated (at least next day of week since last chart)
      if (canUpdateCharts(lastChartWeek, trackingDayOfWeek, now)) {
        // Calculate next expected week (last chart week end = last chart + 7 days)
        const lastChartWeekEnd = getWeekEndForDay(lastChartWeek, trackingDayOfWeek)
        const nextExpectedWeek = new Date(lastChartWeekEnd)
        nextExpectedWeek.setUTCHours(0, 0, 0, 0)
        
        // Get the most recent finished week
        const currentWeekStart = getWeekStartForDay(now, trackingDayOfWeek)
        const currentWeekEnd = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
        
        // Most recent finished week is currentWeekStart if current week has finished,
        // otherwise it's the previous week (currentWeekStart - 7 days)
        const mostRecentFinishedWeek = new Date(currentWeekEnd < now ? currentWeekStart : currentWeekStart)
        if (currentWeekEnd >= now) {
          mostRecentFinishedWeek.setUTCDate(mostRecentFinishedWeek.getUTCDate() - 7)
        }
        mostRecentFinishedWeek.setUTCHours(0, 0, 0, 0)
        
        // Generate weeks from nextExpectedWeek to mostRecentFinishedWeek (inclusive)
        // But limit to maximum 10 weeks
        const weeks: Date[] = []
        let weekToCheck = new Date(mostRecentFinishedWeek)
        weekToCheck.setUTCHours(0, 0, 0, 0)
        
        // Work backwards from most recent finished week, collecting up to 10 weeks
        while (weeks.length < 10 && weekToCheck >= nextExpectedWeek) {
          weeks.push(new Date(weekToCheck))
          // Move back 7 days
          weekToCheck.setUTCDate(weekToCheck.getUTCDate() - 7)
        }
        
        // Reverse to get oldest to newest order
        weeksToGenerate = weeks.reverse()
      }
    }

    if (weeksToGenerate.length === 0) {
      // No weeks to generate, release lock and return
      await prisma.group.update({
        where: { id: groupId },
        data: {
          chartGenerationInProgress: false,
          chartGenerationStartedAt: null,
          chartGenerationProgress: Prisma.JsonNull,
        },
      })
      return NextResponse.json({ success: true, message: 'No weeks to generate' })
    }

    const totalWeeks = weeksToGenerate.length

    // Initialize progress
    await prisma.group.update({
      where: { id: groupId },
      data: {
        chartGenerationProgress: {
          currentWeek: 0,
          totalWeeks: totalWeeks,
          stage: 'initializing',
        },
      },
    })

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

    // Sort weeks from oldest to newest
    weeksToGenerate.sort((a, b) => a.getTime() - b.getTime())
    
    console.log(`[Chart Generate] Processing ${weeksToGenerate.length} weeks for group ${groupId}`)
    weeksToGenerate.forEach((week, idx) => {
      console.log(`[Chart Generate] Week ${idx + 1}: ${week.toISOString().split('T')[0]}`)
    })

    // Process each week sequentially
    // Collect entries for deferred cache invalidation
    const allEntriesForInvalidation: Array<{
      entryKey: string
      vibeScore: number | null
      playcount: number
      weekStart: Date
      chartType: 'artists' | 'tracks' | 'albums'
    }> = []
    
    // Track failed users across all weeks - once a user fails, skip them for all subsequent weeks
    const allFailedUsers = new Set<string>()
    let shouldAbortGeneration = false
    
    try {
      // Update progress to fetching stage
      await prisma.group.update({
        where: { id: groupId },
        data: {
          chartGenerationProgress: {
            currentWeek: 0,
            totalWeeks: totalWeeks,
            stage: 'fetching',
          },
        },
      })

      for (let weekIndex = 0; weekIndex < weeksToGenerate.length; weekIndex++) {
        const weekStart = weeksToGenerate[weekIndex]
        const weekEnd = getWeekEndForDay(weekStart, trackingDayOfWeek)
        const currentWeekNumber = weekIndex + 1
        
        // Update progress to show current week being processed
        await prisma.group.update({
          where: { id: groupId },
          data: {
            chartGenerationProgress: {
              currentWeek: currentWeekNumber,
              totalWeeks: totalWeeks,
              stage: 'processing',
            },
          },
        }).catch((err) => {
          console.error('Error updating progress:', err)
          // Continue even if progress update fails
        })
        
        // Delete overlapping charts (handles tracking date changes automatically)
        await deleteOverlappingCharts(groupId, weekStart, weekEnd)
        
        // Generate chart for the week (skip trends, collect entries for invalidation)
        const result = await calculateGroupWeeklyStats(
          groupId,
          weekStart,
          chartSize,
          trackingDayOfWeek,
          chartMode,
          members,
          true, // skipTrends = true
          allFailedUsers // Pass failed users to skip them for this week
        )
        
        // Collect failed users - add them to the set so they're skipped in future weeks
        result.failedUsers.forEach(username => allFailedUsers.add(username))
        
        // Check if we should abort
        if (result.shouldAbort) {
          shouldAbortGeneration = true
        }
        
        // Collect entries for batch invalidation at the end
        allEntriesForInvalidation.push(...result.entries)
        
        // Small delay between weeks
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // If generation should be aborted, store failed users info before throwing
      if (shouldAbortGeneration) {
        await prisma.group.update({
          where: { id: groupId },
          data: {
            lastChartGenerationFailedUsers: Array.from(allFailedUsers),
            lastChartGenerationAborted: true,
          },
        }).catch((err) => {
          console.error('Error storing failed users info:', err)
        })
        throw new Error(`Chart generation aborted: Too many user failures (${allFailedUsers.size} users)`)
      }
      
      // Store failed users info if there are any (even if not aborted)
      if (allFailedUsers.size > 0) {
        await prisma.group.update({
          where: { id: groupId },
          data: {
            lastChartGenerationFailedUsers: Array.from(allFailedUsers),
            lastChartGenerationAborted: false,
          },
        }).catch((err) => {
          console.error('Error storing failed users info:', err)
        })
      }

      // Update progress to finalizing stage
      await prisma.group.update({
        where: { id: groupId },
        data: {
          chartGenerationProgress: {
            currentWeek: totalWeeks,
            totalWeeks: totalWeeks,
            stage: 'finalizing',
          },
        },
      }).catch((err) => {
        console.error('Error updating progress:', err)
      })

      // Recalculate all-time stats once after all weeks are processed
      await recalculateAllTimeStats(groupId)

      // Batch invalidate cache for all entries from all weeks (deferred for performance)
      if (allEntriesForInvalidation.length > 0) {
        await invalidateEntryStatsCacheBatch(groupId, allEntriesForInvalidation)
      }

      // Invalidate record detail caches since charts have been regenerated
      const { invalidateRecordDetailCaches } = await import('@/lib/group-records')
      await invalidateRecordDetailCaches(groupId)

      // Calculate trends only for the latest week (all previous calculations were wasted)
      if (weeksToGenerate.length > 0) {
        const latestWeek = weeksToGenerate[weeksToGenerate.length - 1] // Last week is the latest
        await calculateGroupTrends(groupId, latestWeek, trackingDayOfWeek)
      }
    } catch (error: any) {
      console.error('Error generating charts:', error)
      
      // If we have failed users info, store it before handling the error
      if (allFailedUsers && allFailedUsers.size > 0) {
        await prisma.group.update({
          where: { id: groupId },
          data: {
            lastChartGenerationFailedUsers: Array.from(allFailedUsers),
            lastChartGenerationAborted: shouldAbortGeneration,
          },
        }).catch((err) => {
          console.error('Error storing failed users info:', err)
        })
      }
      
      // Handle Prisma validation errors
      if (error.message && error.message.includes('did not match the expected pattern')) {
        // Don't throw - we want to release the lock even on validation errors
      } else {
        // Re-throw other errors
        throw error
      }
    }
    
    // Update group icon if dynamic icon is enabled (don't await - let it run in background)
    updateGroupIconFromChart(groupId).catch((error) => {
      console.error('Error updating group icon after chart generation:', error)
    })

    // Trigger records calculation after charts are generated
    if (weeksToGenerate.length > 0) {
      // Collect all entries that appeared in newly generated week(s)
      const newEntries = await prisma.groupChartEntry.findMany({
        where: {
          groupId,
          weekStart: { in: weeksToGenerate },
        },
        select: {
          entryKey: true,
          chartType: true,
          position: true,
        },
      })

      // Extract unique entryKey + chartType combinations (for incremental calculation)
      // We only need to check each entry once, not per week
      const uniqueEntriesMap = new Map<string, {
        entryKey: string
        chartType: ChartType
        position: number
      }>()

      for (const entry of newEntries) {
        const key = `${entry.entryKey}|${entry.chartType}`
        if (!uniqueEntriesMap.has(key)) {
          // Use the best (lowest) position for this entry across all new weeks
          uniqueEntriesMap.set(key, {
            entryKey: entry.entryKey,
            chartType: entry.chartType as ChartType,
            position: entry.position,
          })
        } else {
          // Update if this position is better (lower)
          const existing = uniqueEntriesMap.get(key)!
          if (entry.position < existing.position) {
            existing.position = entry.position
          }
        }
      }

      const uniqueEntries = Array.from(uniqueEntriesMap.values())

      // Check if GroupRecords exists
      const existingRecords = await getGroupRecords(groupId)
      const useIncremental = existingRecords && existingRecords.status === 'completed'

      // Delete existing GroupRecords if exists (for fresh calculation)
      if (existingRecords) {
        try {
          await prisma.groupRecords.delete({
            where: { groupId },
          })
        } catch (err) {
          console.error('[Records] Error deleting existing records:', err)
        }
      }

      // Create new GroupRecords with status "calculating"
      try {
        await prisma.groupRecords.create({
          data: {
            groupId,
            status: 'calculating',
            calculationStartedAt: new Date(),
            chartsGeneratedAt: new Date(),
            records: {},
          },
        })
      } catch (err) {
        console.error('[Records] Error creating GroupRecords:', err)
        // Don't proceed if we can't create the record
        return NextResponse.json({ success: true, message: 'Charts generated but records calculation failed to start' })
      }

      // Trigger records calculation via separate API endpoint
      // This ensures the calculation runs in its own execution context
      // and won't be terminated when this request completes (important for serverless)
      try {
        // Get base URL from environment or request
        // Note: In background functions, we may not have access to the request object
        // So we'll use environment variables primarily
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
          'http://localhost:3000'
        
        const calculateUrl = `${baseUrl}/api/groups/${groupId}/records/calculate`
        
        // Call the calculation endpoint (fire-and-forget)
        fetch(calculateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newEntries: useIncremental ? uniqueEntries : undefined }),
        }).catch((error) => {
          console.error('[Records] Error triggering calculation endpoint:', error)
          // Update status to failed if we can't even trigger the calculation
          prisma.groupRecords.update({
            where: { groupId },
            data: { status: 'failed' },
          }).catch((err) => {
            console.error('[Records] Error updating records status to failed:', err)
          })
        })
      } catch (err) {
        console.error('[Records] Error setting up calculation endpoint call:', err)
        // Update status to failed
        prisma.groupRecords.update({
          where: { groupId },
          data: { status: 'failed' },
        }).catch((updateErr) => {
          console.error('[Records] Error updating records status to failed:', updateErr)
        })
      }
    }

    // Release lock (failed users info already stored above if needed)
    await prisma.group.update({
      where: { id: groupId },
      data: {
        chartGenerationInProgress: false,
        chartGenerationStartedAt: null,
        chartGenerationProgress: Prisma.JsonNull,
      },
    })

    return NextResponse.json({ success: true, message: 'Chart generation completed' })
  } catch (error: any) {
    console.error(`[Chart Generate] Error during generation for group ${params.id}:`, error)
    
    // Release lock on error
    try {
      await prisma.group.update({
        where: { id: params.id },
        data: {
          chartGenerationInProgress: false,
          chartGenerationStartedAt: null,
          chartGenerationProgress: Prisma.JsonNull,
        },
      })
    } catch (updateError) {
      console.error('[Chart Generate] Error releasing lock:', updateError)
    }
    
    return NextResponse.json(
      { error: 'Failed to generate charts', details: error.message },
      { status: 500 }
    )
  }
}

