/**
 * Script to delete all GroupChartEntry, UserChartEntryVS, UserWeeklyStats, and GroupWeeklyStats records
 * 
 * Usage:
 *   npx tsx scripts/delete-chart-entries.ts
 */

import { prisma } from '../lib/prisma'

async function deleteChartEntries() {
  console.log('\n🗑️  Starting deletion of chart entries...\n')

  // Count existing records
  const groupChartEntryCount = await prisma.groupChartEntry.count()
  const userChartEntryVSCount = await prisma.userChartEntryVS.count()
  const userWeeklyStatsCount = await prisma.userWeeklyStats.count()
  const groupWeeklyStatsCount = await prisma.groupWeeklyStats.count()

  console.log(`📊 Current counts:`)
  console.log(`   GroupChartEntry: ${groupChartEntryCount}`)
  console.log(`   UserChartEntryVS: ${userChartEntryVSCount}`)
  console.log(`   UserWeeklyStats: ${userWeeklyStatsCount}`)
  console.log(`   GroupWeeklyStats: ${groupWeeklyStatsCount}`)
  console.log(`   Total: ${groupChartEntryCount + userChartEntryVSCount + userWeeklyStatsCount + groupWeeklyStatsCount}\n`)

  if (groupChartEntryCount === 0 && userChartEntryVSCount === 0 && userWeeklyStatsCount === 0 && groupWeeklyStatsCount === 0) {
    console.log('✅ No records to delete.')
    return
  }

  // Delete GroupChartEntry records
  if (groupChartEntryCount > 0) {
    console.log(`🗑️  Deleting ${groupChartEntryCount} GroupChartEntry records...`)
    const deleteGroupResult = await prisma.groupChartEntry.deleteMany({})
    console.log(`   ✅ Deleted ${deleteGroupResult.count} GroupChartEntry records`)
  }

  // Delete UserChartEntryVS records
  if (userChartEntryVSCount > 0) {
    console.log(`🗑️  Deleting ${userChartEntryVSCount} UserChartEntryVS records...`)
    const deleteUserResult = await prisma.userChartEntryVS.deleteMany({})
    console.log(`   ✅ Deleted ${deleteUserResult.count} UserChartEntryVS records`)
  }

  // Delete UserWeeklyStats records
  if (userWeeklyStatsCount > 0) {
    console.log(`🗑️  Deleting ${userWeeklyStatsCount} UserWeeklyStats records...`)
    const deleteWeeklyStatsResult = await prisma.userWeeklyStats.deleteMany({})
    console.log(`   ✅ Deleted ${deleteWeeklyStatsResult.count} UserWeeklyStats records`)
  }

  // Delete GroupWeeklyStats records
  if (groupWeeklyStatsCount > 0) {
    console.log(`🗑️  Deleting ${groupWeeklyStatsCount} GroupWeeklyStats records...`)
    const deleteGroupWeeklyStatsResult = await prisma.groupWeeklyStats.deleteMany({})
    console.log(`   ✅ Deleted ${deleteGroupWeeklyStatsResult.count} GroupWeeklyStats records`)
  }

  // Verify deletion
  const remainingGroupCount = await prisma.groupChartEntry.count()
  const remainingUserCount = await prisma.userChartEntryVS.count()
  const remainingWeeklyStatsCount = await prisma.userWeeklyStats.count()
  const remainingGroupWeeklyStatsCount = await prisma.groupWeeklyStats.count()

  console.log(`\n📊 Remaining counts:`)
  console.log(`   GroupChartEntry: ${remainingGroupCount}`)
  console.log(`   UserChartEntryVS: ${remainingUserCount}`)
  console.log(`   UserWeeklyStats: ${remainingWeeklyStatsCount}`)
  console.log(`   GroupWeeklyStats: ${remainingGroupWeeklyStatsCount}`)

  if (remainingGroupCount === 0 && remainingUserCount === 0 && remainingWeeklyStatsCount === 0 && remainingGroupWeeklyStatsCount === 0) {
    console.log('\n✅ All chart entries deleted successfully!')
  } else {
    console.log('\n⚠️  Warning: Some records may still remain')
  }
}

// Main execution
deleteChartEntries()
  .then(() => {
    console.log('\n✅ Deletion complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })

