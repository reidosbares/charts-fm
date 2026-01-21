import { NextResponse } from 'next/server'
import { requireSuperuserApi } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Check superuser access
    await requireSuperuserApi()

    const body = await request.json()
    const { emailVerified } = body

    // Validate that emailVerified is a boolean
    if (typeof emailVerified !== 'boolean') {
      return NextResponse.json(
        { error: 'emailVerified must be a boolean' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user's verification status
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: { emailVerified },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Admin user update error:', error)
    
    // Handle unauthorized error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Superuser access required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update user',
      },
      { status: 500 }
    )
  }
}
