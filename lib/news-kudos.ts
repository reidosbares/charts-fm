import 'server-only'
import { prisma } from '@/lib/prisma'

export interface KudosState {
  count: number
  given: boolean
}

export async function getKudos(slug: string, userId: string | null): Promise<KudosState> {
  const [count, given] = await Promise.all([
    prisma.newsPostKudos.count({ where: { slug } }),
    userId
      ? prisma.newsPostKudos.findUnique({
          where: { slug_userId: { slug, userId } },
          select: { id: true },
        }).then((row) => row !== null)
      : Promise.resolve(false),
  ])
  return { count, given }
}

export async function getKudosForSlugs(
  slugs: string[],
  userId: string | null
): Promise<Record<string, KudosState>> {
  if (slugs.length === 0) return {}

  const [counts, given] = await Promise.all([
    prisma.newsPostKudos.groupBy({
      by: ['slug'],
      where: { slug: { in: slugs } },
      _count: { _all: true },
    }),
    userId
      ? prisma.newsPostKudos.findMany({
          where: { slug: { in: slugs }, userId },
          select: { slug: true },
        })
      : Promise.resolve([]),
  ])

  const givenSet = new Set(given.map((g) => g.slug))
  const result: Record<string, KudosState> = {}
  for (const slug of slugs) {
    result[slug] = { count: 0, given: givenSet.has(slug) }
  }
  for (const row of counts) {
    result[row.slug] = {
      count: row._count._all,
      given: givenSet.has(row.slug),
    }
  }
  return result
}

export async function giveKudos(slug: string, userId: string): Promise<KudosState> {
  await prisma.newsPostKudos.upsert({
    where: { slug_userId: { slug, userId } },
    create: { slug, userId },
    update: {},
  })
  return getKudos(slug, userId)
}
