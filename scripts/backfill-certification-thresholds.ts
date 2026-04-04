import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TRACK_GOLD_BASE = 3
const TRACK_PLATINUM_BASE = 6
const TRACK_DIAMOND_BASE = 16

const ALBUM_GOLD_BASE = 4
const ALBUM_PLATINUM_BASE = 8
const ALBUM_DIAMOND_BASE = 20

async function main() {
  const groups = await prisma.group.findMany({
    select: {
      id: true,
      _count: { select: { members: true } },
    },
  })

  console.log(`Backfilling ${groups.length} groups...`)

  for (const group of groups) {
    const memberCount = Math.max(group._count.members, 1)
    await prisma.group.update({
      where: { id: group.id },
      data: {
        certTrackGoldThreshold: TRACK_GOLD_BASE * memberCount,
        certTrackPlatinumThreshold: TRACK_PLATINUM_BASE * memberCount,
        certTrackDiamondThreshold: TRACK_DIAMOND_BASE * memberCount,
        certAlbumGoldThreshold: ALBUM_GOLD_BASE * memberCount,
        certAlbumPlatinumThreshold: ALBUM_PLATINUM_BASE * memberCount,
        certAlbumDiamondThreshold: ALBUM_DIAMOND_BASE * memberCount,
      },
    })
  }

  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
