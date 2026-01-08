/**
 * Script to fix Prisma migration checksum mismatch
 * 
 * This script resolves the issue where a migration file was modified after
 * it was applied to the database. It updates the checksum in the database
 * to match the current migration file.
 * 
 * Usage:
 *   npx tsx scripts/fix-migration-checksum.ts
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function calculateChecksum(filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function main() {
  const migrationName = '20260107212231_add_locale_to_users';
  const migrationPath = path.join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    migrationName,
    'migration.sql'
  );

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  // Calculate the current checksum of the migration file
  const currentChecksum = await calculateChecksum(migrationPath);
  console.log(`Current migration file checksum: ${currentChecksum}`);

  // Check what's in the database
  const migrationRecord = await prisma.$queryRaw<Array<{
    migration_name: string;
    checksum: string;
    finished_at: Date | null;
    applied_steps_count: number;
  }>>`
    SELECT migration_name, checksum, finished_at, applied_steps_count
    FROM _prisma_migrations
    WHERE migration_name = ${migrationName}
  `;

  if (migrationRecord.length === 0) {
    console.error(`Migration ${migrationName} not found in database.`);
    console.log('This migration may not have been applied yet.');
    process.exit(1);
  }

  const dbRecord = migrationRecord[0];
  console.log(`Database checksum: ${dbRecord.checksum}`);
  console.log(`Migration finished at: ${dbRecord.finished_at}`);
  console.log(`Applied steps count: ${dbRecord.applied_steps_count}`);

  if (dbRecord.checksum === currentChecksum) {
    console.log('✅ Checksums already match! No action needed.');
    await prisma.$disconnect();
    return;
  }

  if (!dbRecord.finished_at) {
    console.error('⚠️  Migration is not marked as finished in the database.');
    console.log('This might indicate the migration was not fully applied.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Update the checksum in the database
  console.log('\n🔄 Updating checksum in database...');
  await prisma.$executeRaw`
    UPDATE _prisma_migrations
    SET checksum = ${currentChecksum}
    WHERE migration_name = ${migrationName}
  `;

  console.log('✅ Checksum updated successfully!');
  console.log('\nYou can now run `prisma migrate deploy` or `prisma migrate status` to verify.');
  
  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

