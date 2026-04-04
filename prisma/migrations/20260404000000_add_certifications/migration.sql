-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "certDiamondThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "certGoldThreshold" DOUBLE PRECISION NOT NULL DEFAULT 20,
ADD COLUMN     "certPlatinumThreshold" DOUBLE PRECISION NOT NULL DEFAULT 40,
ADD COLUMN     "certificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "chartType" TEXT NOT NULL,
    "entryKey" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awardedById" TEXT NOT NULL,
    "thresholdAtAward" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certifications_groupId_idx" ON "certifications"("groupId");

-- CreateIndex
CREATE INDEX "certifications_groupId_chartType_entryKey_idx" ON "certifications"("groupId", "chartType", "entryKey");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_groupId_chartType_entryKey_tier_key" ON "certifications"("groupId", "chartType", "entryKey", "tier");

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
