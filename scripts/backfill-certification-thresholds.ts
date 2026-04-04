import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const GOLD_BASE = 4
const PLATINUM_BASE = 8
const DIAMOND_BASE = 20

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
        certGoldThreshold: GOLD_BASE * memberCount,
        certPlatinumThreshold: PLATINUM_BASE * memberCount,
        certDiamondThreshold: DIAMOND_BASE * memberCount,
      },
    })
  }

  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
