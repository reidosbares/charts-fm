import { NextResponse } from 'next/server'
import { requireSuperuserApi } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Check superuser access
    await requireSuperuserApi()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    // Build search conditions
    const where: any = {}
    
    if (query) {
      where.OR = [
        { email: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { lastfmUsername: { contains: query, mode: 'insensitive' } },
      ]
    }

    // Fetch users with their groups
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        lastfmUsername: true,
        emailVerified: true,
        isSuperuser: true,
        createdAt: true,
        lastAccessedAt: true,
        groupsCreated: {
          select: {
            id: true,
            name: true,
          },
        },
        groupMemberships: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit results
    })

    // Transform the data to include owned groups and member groups separately
    const transformedUsers = users.map(user => {
      const ownedGroups = user.groupsCreated.map(g => ({ id: g.id, name: g.name }))
      const memberGroups = user.groupMemberships
        .map(m => ({ id: m.group.id, name: m.group.name }))
        .filter(g => !ownedGroups.some(og => og.id === g.id)) // Exclude groups they own

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        lastfmUsername: user.lastfmUsername,
        emailVerified: user.emailVerified,
        isSuperuser: user.isSuperuser,
        createdAt: user.createdAt,
        lastAccessedAt: user.lastAccessedAt,
        ownedGroups,
        memberGroups,
      }
    })

    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    console.error('Admin user search error:', error)
    
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
            : 'Failed to search users',
      },
      { status: 500 }
    )
  }
}
