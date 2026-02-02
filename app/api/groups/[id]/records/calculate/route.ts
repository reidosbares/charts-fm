import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateGroupRecords } from '@/lib/group-records'
import { calculateTopMajorDrivers } from '@/lib/chart-deep-dive'
import type { ChartType } from '@/lib/chart-slugs'

/**
 * POST - Calculate records for a group
 * This endpoint is called after chart generation to calculate records in a separate execution context.
 * This ensures the calculation completes even in serverless environments where the parent request may terminate.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const body = await request.json().catch(() => ({}))
    const newEntries = body.newEntries as Array<{ entryKey: string; chartType: ChartType; position: number }> | undefined

    // Check if records exist and are in calculating state
    const existing = await prisma.groupRecords.findUnique({
      where: { groupId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'GroupRecords not found. They must be created before calculation.' },
        { status: 404 }
      )
    }

    if (existing.status !== 'calculating') {
      return NextResponse.json(
        { error: `Records not in calculating state. Current status: ${existing.status}` },
        { status: 400 }
      )
    }

    // Calculate records
    const records = await calculateGroupRecords(groupId, newEntries)
    
    // Update records with completed status
    await prisma.groupRecords.update({
      where: { groupId },
      data: {
        status: 'completed',
        records: records as any,
        updatedAt: new Date(),
      },
    })

    // Check if this is a solo group (only 1 member)
    const memberCount = await prisma.groupMember.count({
      where: { groupId },
    })

    // Skip major driver calculation for solo groups - no impact section needed
    if (memberCount <= 1) {
      return NextResponse.json({
        success: true,
        message: 'Records calculation completed (solo group - skipped major drivers)',
        majorDrivers: { processed: 0, byChartType: { artists: 0, tracks: 0, albums: 0 }, skipped: true },
      })
    }

    // Calculate major drivers for TOP 10 entries of each chart type
    // This ensures the "impact" section on the records page has accurate data
    // for the most prominent entries. Less important entries will have their
    // major drivers calculated on-demand when users visit drill-down pages.
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { chartMode: true },
    })
    const chartMode = group?.chartMode || 'vs'

    const driverResult = await calculateTopMajorDrivers(groupId, chartMode)
    
    return NextResponse.json({
      success: true,
      message: 'Records calculation completed',
      majorDrivers: {
        processed: driverResult.processed,
        byChartType: driverResult.byChartType,
      },
    })
  } catch (error: any) {
    console.error(`[Records] Error during calculation for group ${params.id}:`, error)
    
    // Update status to failed
    try {
      await prisma.groupRecords.update({
        where: { groupId: params.id },
        data: { status: 'failed' },
      })
    } catch (updateError) {
      console.error('[Records] Error updating records status to failed:', updateError)
    }
    
    return NextResponse.json(
      { error: 'Failed to calculate records', details: error.message },
      { status: 500 }
    )
  }
}

