import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH - Update group icon
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
  const body = await request.json()
  const { image } = body

  // Check if user is the creator
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group creator can update the icon' },
      { status: 403 }
    )
  }

  // Validate image URL if provided
  if (image !== undefined && image !== null) {
    if (typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image must be a string' },
        { status: 400 }
      )
    }
    const trimmedImage = image.trim()
    if (trimmedImage.length > 500) {
      return NextResponse.json(
        { error: 'Image URL cannot exceed 500 characters' },
        { status: 400 }
      )
    }
    // Basic URL validation - allow blob URLs from Vercel Blob
    if (trimmedImage && !trimmedImage.match(/^https?:\/\/.+/i) && !trimmedImage.startsWith('/') && !trimmedImage.startsWith('blob:')) {
      return NextResponse.json(
        { error: 'Image must be a valid URL or path' },
        { status: 400 }
      )
    }
  }

  const updatedGroup = await prisma.group.update({
    where: { id: groupId },
    data: {
      image: image?.trim() || null,
    },
  })

  // Revalidate the cache for the group page and settings page
  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/settings`)

  return NextResponse.json({ group: updatedGroup })
}

