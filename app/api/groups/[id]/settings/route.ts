import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { THEME_NAMES, type ThemeName } from '@/lib/group-themes'

// GET - Get group settings
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const groupId = params.id

  // Get group with settings
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      creatorId: true,
      chartSize: true,
      chartMode: true,
      trackingDayOfWeek: true,
      colorTheme: true,
      certificationsEnabled: true,
      certGoldThreshold: true,
      certPlatinumThreshold: true,
      certDiamondThreshold: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Only owner can view settings
  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group owner can view settings' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    chartSize: group.chartSize || 10,
    chartMode: group.chartMode || 'plays_only',
    trackingDayOfWeek: group.trackingDayOfWeek ?? 0,
    colorTheme: (group as any).colorTheme || 'white',
    certificationsEnabled: group.certificationsEnabled,
    certGoldThreshold: group.certGoldThreshold,
    certPlatinumThreshold: group.certPlatinumThreshold,
    certDiamondThreshold: group.certDiamondThreshold,
  })
}

// PATCH - Update group settings
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const groupId = params.id

  // Get current group settings
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      creatorId: true,
      chartSize: true,
      chartMode: true,
      trackingDayOfWeek: true,
      colorTheme: true,
      certificationsEnabled: true,
      certGoldThreshold: true,
      certPlatinumThreshold: true,
      certDiamondThreshold: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Only owner can update settings
  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group owner can update settings' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { chartSize, chartMode, trackingDayOfWeek, colorTheme } = body
  const { certificationsEnabled, certGoldThreshold, certPlatinumThreshold, certDiamondThreshold } = body

  // Validate chartSize
  if (chartSize !== undefined) {
    if (![10, 20, 50].includes(chartSize)) {
      return NextResponse.json(
        { error: 'chartSize must be 10, 20, or 50' },
        { status: 400 }
      )
    }
  }

  // Validate chartMode
  if (chartMode !== undefined) {
    if (!['vs', 'vs_weighted', 'plays_only'].includes(chartMode)) {
      return NextResponse.json(
        { error: 'chartMode must be "vs", "vs_weighted", or "plays_only"' },
        { status: 400 }
      )
    }
  }

  // Validate trackingDayOfWeek (only Sunday=0 and Friday=5 are allowed)
  if (trackingDayOfWeek !== undefined) {
    if (typeof trackingDayOfWeek !== 'number' || ![0, 5].includes(trackingDayOfWeek)) {
      return NextResponse.json(
        { error: 'trackingDayOfWeek must be either 0 (Sunday) or 5 (Friday)' },
        { status: 400 }
      )
    }
  }

  // Validate colorTheme
  if (colorTheme !== undefined) {
    if (!THEME_NAMES.includes(colorTheme as ThemeName)) {
      return NextResponse.json(
        { error: `colorTheme must be one of: ${THEME_NAMES.join(', ')}` },
        { status: 400 }
      )
    }
  }

  // Validate certification thresholds (resolve against existing values for partial updates)
  if (certGoldThreshold !== undefined || certPlatinumThreshold !== undefined || certDiamondThreshold !== undefined) {
    const finalGold = certGoldThreshold ?? group.certGoldThreshold
    const finalPlatinum = certPlatinumThreshold ?? group.certPlatinumThreshold
    const finalDiamond = certDiamondThreshold ?? group.certDiamondThreshold

    if (typeof finalGold !== 'number' || typeof finalPlatinum !== 'number' || typeof finalDiamond !== 'number' ||
        finalGold <= 0 || finalPlatinum <= 0 || finalDiamond <= 0) {
      return NextResponse.json(
        { error: 'Thresholds must be positive numbers' },
        { status: 400 }
      )
    }

    if (finalGold >= finalPlatinum || finalPlatinum >= finalDiamond) {
      return NextResponse.json(
        { error: 'Thresholds must be in ascending order: Gold < Platinum < Diamond' },
        { status: 400 }
      )
    }
  }

  const newTrackingDayOfWeek = trackingDayOfWeek !== undefined ? trackingDayOfWeek : (group.trackingDayOfWeek ?? 0)

  // Update group settings
  const updatedGroup = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(chartSize !== undefined && { chartSize }),
      ...(chartMode !== undefined && { chartMode }),
      ...(trackingDayOfWeek !== undefined && { trackingDayOfWeek: newTrackingDayOfWeek }),
      ...(colorTheme !== undefined && { colorTheme }),
      ...(certificationsEnabled !== undefined && { certificationsEnabled }),
      ...(certGoldThreshold !== undefined && { certGoldThreshold }),
      ...(certPlatinumThreshold !== undefined && { certPlatinumThreshold }),
      ...(certDiamondThreshold !== undefined && { certDiamondThreshold }),
    },
    select: {
      chartSize: true,
      chartMode: true,
      trackingDayOfWeek: true,
      colorTheme: true,
    },
  })

  // Revalidate the cache for the group page and settings page
  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/settings`)

  return NextResponse.json({
    chartSize: updatedGroup.chartSize || 10,
    chartMode: updatedGroup.chartMode || 'plays_only',
    trackingDayOfWeek: updatedGroup.trackingDayOfWeek ?? 0,
    colorTheme: (updatedGroup as any).colorTheme || 'white',
  })
}

