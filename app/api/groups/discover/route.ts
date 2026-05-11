import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all public groups for discovery
export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() || ''
  const allowFreeJoinParam = searchParams.get('allowFreeJoin')
  const minMembersParam = searchParams.get('minMembers')
  const tagsParam = searchParams.get('tags')?.trim() || ''
  const sort = searchParams.get('sort') || 'newest'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10) || 20))
  const skip = (page - 1) * limit

  const where: any = {
    isPrivate: false,
    isSolo: false,
  }
  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }
  if (allowFreeJoinParam === 'true') {
    where.allowFreeJoin = true
  }

  const minMembers = minMembersParam
    ? Math.max(0, parseInt(minMembersParam, 10) || 0)
    : 0
  const searchTags = tagsParam
    ? tagsParam.split(/\s+/).map((t) => t.trim().toLowerCase()).filter(Boolean)
    : []

  // DB-level orderBy where possible. `most_active` is re-sorted in app
  // after enrichment because Prisma can't order by a related table's max().
  let orderBy: any
  switch (sort) {
    case 'oldest':
      orderBy = { createdAt: 'asc' }
      break
    case 'most_members':
      orderBy = { members: { _count: 'desc' } }
      break
    case 'least_members':
      orderBy = { members: { _count: 'asc' } }
      break
    case 'most_active':
    case 'newest':
    default:
      orderBy = { createdAt: 'desc' }
  }

  const selectShape = {
    id: true,
    name: true,
    image: true,
    colorTheme: true,
    allowFreeJoin: true,
    createdAt: true,
    tags: true,
    creator: {
      select: { id: true, name: true, lastfmUsername: true },
    },
    _count: { select: { members: true } },
  } as const

  // Filters/sorts that can't be expressed in Prisma's where/orderBy force a
  // full scan over base-matching candidates so filtering and pagination stay
  // consistent. Tags are stored as JSON with mixed case, minMembers needs a
  // _count predicate, most_active needs ORDER BY MAX(updatedAt) on a relation.
  const needsFullScan =
    minMembers > 0 || searchTags.length > 0 || sort === 'most_active'

  const fetchActivityMaps = async (ids: string[]) => {
    if (ids.length === 0) {
      return {
        lastChartByGroup: new Map<string, Date>(),
        weekCountByGroup: new Map<string, number>(),
      }
    }
    const [latestChartRows, weekCountRows] = await Promise.all([
      prisma.groupChartEntry.groupBy({
        by: ['groupId'],
        where: { groupId: { in: ids } },
        _max: { updatedAt: true },
      }),
      prisma.groupWeeklyStats.groupBy({
        by: ['groupId'],
        where: { groupId: { in: ids } },
        _count: { _all: true },
      }),
    ])
    const lastChartByGroup = new Map<string, Date>()
    for (const r of latestChartRows) {
      if (r._max.updatedAt) lastChartByGroup.set(r.groupId, r._max.updatedAt)
    }
    const weekCountByGroup = new Map(
      weekCountRows.map((r) => [r.groupId, r._count._all] as const)
    )
    return { lastChartByGroup, weekCountByGroup }
  }

  const enrich = (
    group: any,
    lastChartByGroup: Map<string, Date>,
    weekCountByGroup: Map<string, number>
  ) => {
    const groupTags = Array.isArray(group.tags)
      ? group.tags.map((t: unknown) => String(t).toLowerCase())
      : []
    const lastChartUpdate = lastChartByGroup.get(group.id)
    return {
      id: group.id,
      name: group.name,
      image: group.image,
      colorTheme: group.colorTheme,
      allowFreeJoin: group.allowFreeJoin,
      createdAt: group.createdAt.toISOString(),
      creator: group.creator,
      _count: group._count,
      lastChartUpdate: lastChartUpdate ? lastChartUpdate.toISOString() : null,
      weekCount: weekCountByGroup.get(group.id) ?? 0,
      tags: groupTags,
    }
  }

  let pageGroups: ReturnType<typeof enrich>[]
  let totalCount: number

  if (needsFullScan) {
    const allGroups = await prisma.group.findMany({
      where,
      select: selectShape,
      orderBy,
    })

    const { lastChartByGroup, weekCountByGroup } = await fetchActivityMaps(
      allGroups.map((g) => g.id)
    )

    let enriched = allGroups.map((g) =>
      enrich(g, lastChartByGroup, weekCountByGroup)
    )

    if (minMembers > 0) {
      enriched = enriched.filter((e) => e._count.members >= minMembers)
    }
    if (searchTags.length > 0) {
      enriched = enriched.filter((e) =>
        searchTags.some((st) => e.tags.includes(st))
      )
    }

    if (sort === 'most_active') {
      enriched.sort((a, b) => {
        const aT = a.lastChartUpdate ? new Date(a.lastChartUpdate).getTime() : 0
        const bT = b.lastChartUpdate ? new Date(b.lastChartUpdate).getTime() : 0
        return bT - aT
      })
    }

    totalCount = enriched.length
    pageGroups = enriched.slice(skip, skip + limit)
  } else {
    totalCount = await prisma.group.count({ where })

    const groups = await prisma.group.findMany({
      where,
      select: selectShape,
      orderBy,
      skip,
      take: limit,
    })

    const { lastChartByGroup, weekCountByGroup } = await fetchActivityMaps(
      groups.map((g) => g.id)
    )

    pageGroups = groups.map((g) =>
      enrich(g, lastChartByGroup, weekCountByGroup)
    )
  }

  const hasMore = skip + pageGroups.length < totalCount

  return NextResponse.json({
    groups: pageGroups,
    pagination: {
      page,
      limit,
      total: totalCount,
      hasMore,
    },
  })
}

