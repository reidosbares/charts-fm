import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { deleteFile } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

// DELETE - Remove group picture
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    // Check if user is the creator
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        creatorId: true,
        image: true,
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the group creator can remove the icon' },
        { status: 403 }
      )
    }

    // If group has no image, nothing to delete
    if (!group.image) {
      return NextResponse.json({ 
        message: 'No group picture to remove',
        success: true 
      })
    }

    // Delete the file from storage
    try {
      await deleteFile(group.image, 'group-pictures')
    } catch (error) {
      // Log error but continue - we still want to remove the URL from database
      console.error('Error deleting file from storage:', error)
    }

    // Update group's image to null in database
    await prisma.group.update({
      where: { id: groupId },
      data: { image: null },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Group picture removed successfully' 
    })
  } catch (error) {
    console.error('Error removing group picture:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to remove group picture' 
      },
      { status: 500 }
    )
  }
}

