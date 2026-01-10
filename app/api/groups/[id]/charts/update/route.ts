import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireGroupMembership } from '@/lib/group-auth'
import { getLastChartWeek } from '@/lib/group-service'
import { getWeekStartForDay, getWeekEndForDay } from '@/lib/weekly-utils'

const LOCK_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

// GET - Check generation status
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireGroupMembership(params.id)

    // Fetch group with the new fields
    const group = await prisma.group.findFirst({
      where: {
        id: params.id,
        OR: [
          { creatorId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      select: {
        id: true,
        trackingDayOfWeek: true,
        chartGenerationInProgress: true,
        chartGenerationProgress: true,
        lastChartGenerationFailedUsers: true,
        lastChartGenerationAborted: true,
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
    const now = new Date()
    const currentWeekStart = getWeekStartForDay(now, trackingDayOfWeek)
    const currentWeekEnd = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
    
    // Check if there are missing weeks
    const lastChartWeek = await getLastChartWeek(group.id)
    let canUpdate = false
    
    if (!lastChartWeek) {
      // No charts exist, can update
      canUpdate = true
    } else {
      // Check if current week has finished (currentWeekEnd is in the past)
      if (currentWeekEnd < now) {
        // Check if we need to generate the current finished week
        const nextExpectedWeek = new Date(lastChartWeek)
        nextExpectedWeek.setUTCDate(nextExpectedWeek.getUTCDate() + 7)
        
        // If next expected week is before or equal to current finished week, we can update
        if (nextExpectedWeek <= currentWeekStart) {
          canUpdate = true
        }
      }
    }

    const inProgress = group.chartGenerationInProgress || false
    
    // Get failed users info if generation just completed
    let failedUsers: string[] = []
    let aborted = false
    if (!inProgress && group.lastChartGenerationFailedUsers) {
      failedUsers = Array.isArray(group.lastChartGenerationFailedUsers) 
        ? (group.lastChartGenerationFailedUsers as string[])
        : []
      aborted = group.lastChartGenerationAborted || false
      
      // Clear the failed users info after reading it
      await prisma.group.update({
        where: { id: group.id },
        data: {
          lastChartGenerationFailedUsers: Prisma.JsonNull,
          lastChartGenerationAborted: null,
        },
      }).catch((err) => {
        console.error('Error clearing failed users info:', err)
      })
    }

    // Parse progress information
    let progress: { currentWeek: number; totalWeeks: number; stage: string } | null = null
    if (group.chartGenerationProgress) {
      try {
        const progressData = group.chartGenerationProgress as any
        if (progressData && typeof progressData.currentWeek === 'number' && typeof progressData.totalWeeks === 'number') {
          progress = {
            currentWeek: progressData.currentWeek,
            totalWeeks: progressData.totalWeeks,
            stage: progressData.stage || 'processing',
          }
        }
      } catch (err) {
        console.error('Error parsing progress:', err)
      }
    }

    return NextResponse.json({
      inProgress,
      canUpdate: canUpdate && !inProgress,
      failedUsers: failedUsers.length > 0 ? failedUsers : undefined,
      aborted: failedUsers.length > 0 ? aborted : undefined,
      progress,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error checking chart update status:', error)
    return NextResponse.json(
      { error: 'Failed to check update status' },
      { status: 500 }
    )
  }
}

// POST - Trigger chart update (fire-and-forget)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const groupId = group.id
    const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
    const chartSize = group.chartSize || 10
    // @ts-ignore - Prisma client will be regenerated after migration
    const chartMode = (group.chartMode || 'plays_only') as 'vs' | 'vs_weighted' | 'plays_only'

    // Check and acquire lock
    const now = new Date()
    
    // Check if lock exists and handle timeout
    if (group.chartGenerationInProgress && group.chartGenerationStartedAt) {
      const lockAge = now.getTime() - group.chartGenerationStartedAt.getTime()
      if (lockAge > LOCK_TIMEOUT_MS) {
        // Lock timed out, reset it
        await prisma.group.update({
          where: { id: groupId },
          data: {
            chartGenerationInProgress: false,
            chartGenerationStartedAt: null,
          },
        })
      } else {
        // Lock is still valid, return error
        return NextResponse.json(
          { error: 'Chart generation is already in progress' },
          { status: 409 }
        )
      }
    }

    // Acquire lock (we'll set progress after calculating weeks)
    const updatedGroup = await prisma.group.update({
      where: {
        id: groupId,
        chartGenerationInProgress: false, // Optimistic locking
      },
      data: {
        chartGenerationInProgress: true,
        chartGenerationStartedAt: now,
      },
    })

    if (!updatedGroup) {
      // Lock acquisition failed (another process got it)
      return NextResponse.json(
        { error: 'Chart generation is already in progress' },
        { status: 409 }
      )
    }

    // Trigger chart generation via separate API endpoint
    // This ensures the generation runs in its own execution context
    // and won't be terminated when this request completes (important for serverless)
    try {
      // Get base URL from environment or request
      let baseUrl = process.env.NEXT_PUBLIC_APP_URL
      if (!baseUrl) {
        if (process.env.VERCEL_URL) {
          baseUrl = `https://${process.env.VERCEL_URL}`
        } else {
          // Try to get from request headers (for local development)
          const origin = request.headers.get('origin')
          const host = request.headers.get('host')
          baseUrl = origin || (host ? `https://${host}` : 'http://localhost:3000')
        }
      }
      
      const generateUrl = `${baseUrl}/api/groups/${groupId}/charts/generate`
      
      // Call the generation endpoint (fire-and-forget)
      fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingDayOfWeek,
          chartSize,
          chartMode,
        }),
      }).catch((error) => {
        console.error('[Chart Update] Error triggering generation endpoint:', error)
        // Release lock on error
        prisma.group.update({
          where: { id: groupId },
          data: {
            chartGenerationInProgress: false,
            chartGenerationStartedAt: null,
          },
        }).catch((err) => {
          console.error('[Chart Update] Error releasing lock:', err)
        })
      })
    } catch (err) {
      console.error('[Chart Update] Error setting up generation endpoint call:', err)
      // Release lock on error
      await prisma.group.update({
        where: { id: groupId },
        data: {
          chartGenerationInProgress: false,
          chartGenerationStartedAt: null,
        },
      }).catch((updateErr) => {
        console.error('[Chart Update] Error releasing lock:', updateErr)
      })
      return NextResponse.json(
        { error: 'Failed to start chart generation' },
        { status: 500 }
      )
    }

    // Return immediately
    return NextResponse.json({ success: true, message: 'Chart generation started' })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error starting chart update:', error)
    return NextResponse.json(
      { error: 'Failed to start chart update' },
      { status: 500 }
    )
  }
}


