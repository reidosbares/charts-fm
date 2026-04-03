# Award Rankings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a page showing how all group members rank for each of the 6 displayed member awards, accessible from award cards and a section header link.

**Architecture:** Extend phase 6 of records calculation to store full rankings arrays in the existing JSON field. New `/groups/[id]/records/awards` page with tab selector (one per award) and a rankings table. Navigation from both individual award cards (hash-selected) and a "View All Rankings" section header link.

**Tech Stack:** Next.js App Router, Prisma raw SQL, SWR, next-intl, LiquidGlassTabs component

---

### Task 1: Add ranking types and extend phase 6 calculation

**Files:**
- Modify: `lib/group-records.ts` (GroupRecordsData interface ~line 25, calculatePhase6Records ~line 1020)

- [ ] **Step 1: Add ranking types to GroupRecordsData interface**

In `lib/group-records.ts`, after the existing `RecordHolder` interface (~line 23), add:

```typescript
export interface UserRanking {
  userId: string
  name: string
  value: number
}

export interface UserOneTrackMindRanking extends UserRanking {
  entryName: string
  entryArtist: string | null
}
```

Then extend the `GroupRecordsData` interface (after the `userPeakPerformer` field, ~line 135) with:

```typescript
  // User rankings (full member rankings for each displayed award)
  userMostVSRankings?: UserRanking[]
  userMostPlaysRankings?: UserRanking[]
  userMostEntriesRankings?: UserRanking[]
  userLeastEntriesRankings?: UserRanking[]
  userOneTrackMindRankings?: UserOneTrackMindRanking[]
  userTasteMakerRankings?: UserRanking[]
```

- [ ] **Step 2: Fetch all group members at start of phase 6**

In `calculatePhase6Records`, after the `tenWeekCutoff` setup and before the first query (~line 1060), add a query to get all current group members:

```typescript
  // Fetch all current group members for rankings
  const allMembers = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, lastfmUsername: true } } },
  })
  const memberMap = new Map(allMembers.map(m => [m.userId, m.user.name || m.user.lastfmUsername || 'Unknown']))
```

- [ ] **Step 3: Extend userMostVS query to return all members**

After the existing `userMostVS` LIMIT 1 query and result processing (~line 1097), add a rankings query:

```typescript
  // Rankings: all members ranked by total VS
  const allUserVS = await prisma.$queryRaw<Array<{ userId: string; total_vs: number }>>(`
    SELECT ucvs."userId", COALESCE(SUM(ucvs."vibeScore"), 0)::float as total_vs
    FROM "group_members" gm
    LEFT JOIN "user_chart_entry_vs" ucvs ON ucvs."userId" = gm."userId"
      AND ucvs."weekStart" >= ${tenWeekCutoff}::timestamp
    LEFT JOIN "group_chart_entries" gce ON
      gce."groupId" = ${groupId}::text AND
      gce."weekStart" = ucvs."weekStart" AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey"
    WHERE gm."groupId" = ${groupId}::text
    GROUP BY ucvs."userId", gm."userId"
    ORDER BY total_vs DESC
  `)
  const userMostVSRankings: UserRanking[] = allMembers.map(m => {
    const row = allUserVS.find(r => r.userId === m.userId)
    return { userId: m.userId, name: memberMap.get(m.userId) || 'Unknown', value: row ? Math.round(row.total_vs) : 0 }
  }).sort((a, b) => b.value - a.value)
```

- [ ] **Step 4: Extend userMostPlays query to return all members**

After the existing `userMostPlays` result processing (~line 1131), add:

```typescript
  // Rankings: all members ranked by total plays
  const allUserPlays = await prisma.$queryRaw<Array<{ userId: string; total_plays: bigint }>>(`
    SELECT ucvs."userId", COALESCE(SUM(ucvs.playcount), 0)::bigint as total_plays
    FROM "group_members" gm
    LEFT JOIN "user_chart_entry_vs" ucvs ON ucvs."userId" = gm."userId"
      AND ucvs."weekStart" >= ${tenWeekCutoff}::timestamp
    LEFT JOIN "group_chart_entries" gce ON
      gce."groupId" = ${groupId}::text AND
      gce."weekStart" = ucvs."weekStart" AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey"
    WHERE gm."groupId" = ${groupId}::text
    GROUP BY ucvs."userId", gm."userId"
    ORDER BY total_plays DESC
  `)
  const userMostPlaysRankings: UserRanking[] = allMembers.map(m => {
    const row = allUserPlays.find(r => r.userId === m.userId)
    return { userId: m.userId, name: memberMap.get(m.userId) || 'Unknown', value: row ? Number(row.total_plays) : 0 }
  }).sort((a, b) => b.value - a.value)
```

- [ ] **Step 5: Extend userMostEntries and userLeastEntries queries**

After the existing `userMostEntries` result processing (~line 1165), add:

```typescript
  // Rankings: all members ranked by distinct entries (used for both Chart Connoisseur and Hidden Gem Hunter)
  const allUserEntries = await prisma.$queryRaw<Array<{ userId: string; distinct_entries: bigint }>>(`
    SELECT gm."userId", COUNT(DISTINCT CASE WHEN ucvs."entryKey" IS NOT NULL THEN CONCAT(ucvs."entryKey", '|', ucvs."chartType") END)::bigint as distinct_entries
    FROM "group_members" gm
    LEFT JOIN "user_chart_entry_vs" ucvs ON ucvs."userId" = gm."userId"
      AND ucvs."weekStart" >= ${tenWeekCutoff}::timestamp
    LEFT JOIN "group_chart_entries" gce ON
      gce."groupId" = ${groupId}::text AND
      gce."weekStart" = ucvs."weekStart" AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey"
    WHERE gm."groupId" = ${groupId}::text
    GROUP BY gm."userId"
    ORDER BY distinct_entries DESC
  `)
  const userMostEntriesRankings: UserRanking[] = allMembers.map(m => {
    const row = allUserEntries.find(r => r.userId === m.userId)
    return { userId: m.userId, name: memberMap.get(m.userId) || 'Unknown', value: row ? Number(row.distinct_entries) : 0 }
  }).sort((a, b) => b.value - a.value)

  // Hidden Gem Hunter rankings: ascending sort, zeros last
  const userLeastEntriesRankings: UserRanking[] = [...userMostEntriesRankings].sort((a, b) => {
    if (a.value === 0 && b.value === 0) return 0
    if (a.value === 0) return 1
    if (b.value === 0) return -1
    return a.value - b.value
  })
```

- [ ] **Step 6: Extend userOneTrackMind query to return all members**

After the existing `userOneTrackMind` result processing (~line 1285), add:

```typescript
  // Rankings: each member's top single-entry VS
  const allUserOneTrack = await prisma.$queryRaw<Array<{ userId: string; entryKey: string; chartType: string; total_vs: number }>>(`
    SELECT DISTINCT ON (ucvs."userId")
      ucvs."userId", ucvs."entryKey", ucvs."chartType", SUM(ucvs."vibeScore")::float as total_vs
    FROM "user_chart_entry_vs" ucvs
    INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
    INNER JOIN "group_chart_entries" gce ON
      gce."groupId" = ${groupId}::text AND
      gce."weekStart" = ucvs."weekStart" AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey"
    WHERE gm."groupId" = ${groupId}::text
      AND ucvs."userId" IS NOT NULL
      AND ucvs."weekStart" >= ${tenWeekCutoff}::timestamp
    GROUP BY ucvs."userId", ucvs."entryKey", ucvs."chartType"
    ORDER BY ucvs."userId", total_vs DESC
  `)

  // Look up entry names for each member's top entry
  const oneTrackEntryKeys = allUserOneTrack.map(r => r.entryKey)
  const oneTrackEntries = oneTrackEntryKeys.length > 0 ? await prisma.groupChartEntry.findMany({
    where: { groupId, entryKey: { in: oneTrackEntryKeys } },
    distinct: ['entryKey'],
    select: { entryKey: true, name: true, artist: true },
  }) : []
  const entryNameMap = new Map(oneTrackEntries.map(e => [e.entryKey, { name: e.name, artist: e.artist }]))

  const userOneTrackMindRankings: UserOneTrackMindRanking[] = allMembers.map(m => {
    const row = allUserOneTrack.find(r => r.userId === m.userId)
    const entry = row ? entryNameMap.get(row.entryKey) : null
    return {
      userId: m.userId,
      name: memberMap.get(m.userId) || 'Unknown',
      value: row ? Math.round(row.total_vs) : 0,
      entryName: entry?.name || '',
      entryArtist: entry?.artist || null,
    }
  }).sort((a, b) => b.value - a.value)
```

- [ ] **Step 7: Extend userTasteMaker query to return all members**

After the existing `userTasteMaker` result processing (~line 1341), add:

```typescript
  // Rankings: all members ranked by taste maker count
  const allUserTasteMaker = await prisma.$queryRaw<Array<{ userId: string; taste_maker_count: bigint }>>(`
    WITH first_appearances AS (
      SELECT "entryKey", "chartType", MIN("weekStart") as first_week
      FROM "group_chart_entries"
      WHERE "groupId" = ${groupId}::text
        AND "weekStart" >= ${tenWeekCutoff}::timestamp
      GROUP BY "entryKey", "chartType"
    ),
    number_ones AS (
      SELECT DISTINCT "entryKey", "chartType"
      FROM "group_chart_entries"
      WHERE "groupId" = ${groupId}::text
        AND position = 1
        AND "weekStart" >= ${tenWeekCutoff}::timestamp
    )
    SELECT gm."userId", COUNT(DISTINCT ucvs."entryKey")::bigint as taste_maker_count
    FROM "group_members" gm
    LEFT JOIN "user_chart_entry_vs" ucvs ON ucvs."userId" = gm."userId"
      AND ucvs."weekStart" >= ${tenWeekCutoff}::timestamp
    LEFT JOIN first_appearances fa ON
      ucvs."entryKey" = fa."entryKey" AND
      ucvs."chartType" = fa."chartType" AND
      ucvs."weekStart" = fa.first_week
    LEFT JOIN number_ones no ON
      fa."entryKey" = no."entryKey" AND
      fa."chartType" = no."chartType"
    WHERE gm."groupId" = ${groupId}::text
      AND (ucvs."userId" IS NULL OR (fa."entryKey" IS NOT NULL AND no."entryKey" IS NOT NULL))
    GROUP BY gm."userId"
    ORDER BY taste_maker_count DESC
  `)
  const userTasteMakerRankings: UserRanking[] = allMembers.map(m => {
    const row = allUserTasteMaker.find(r => r.userId === m.userId)
    return { userId: m.userId, name: memberMap.get(m.userId) || 'Unknown', value: row ? Number(row.taste_maker_count) : 0 }
  }).sort((a, b) => b.value - a.value)
```

- [ ] **Step 8: Include rankings in the returned records object**

In the return statement of `calculatePhase6Records` (where it returns `{ userMostVS, userMostPlays, ... }`), add the ranking arrays:

```typescript
    userMostVSRankings,
    userMostPlaysRankings,
    userMostEntriesRankings,
    userLeastEntriesRankings,
    userOneTrackMindRankings,
    userTasteMakerRankings,
```

- [ ] **Step 9: Commit**

```bash
git add lib/group-records.ts
git commit -m "feat: extend phase 6 to compute full member rankings for awards"
```

---

### Task 2: Enrich rankings with user data in API route

**Files:**
- Modify: `app/api/groups/[id]/records/route.ts` (~lines 45-90)

- [ ] **Step 1: Extend enrichment to include rankings arrays**

In the GET handler of `app/api/groups/[id]/records/route.ts`, after the existing user enrichment block (~line 90), add enrichment for rankings. The existing code already collects `userIds` from winner fields. Extend it to also collect user IDs from rankings:

```typescript
      // Also collect user IDs from rankings
      const rankingsFields = [
        'userMostVSRankings',
        'userMostPlaysRankings',
        'userMostEntriesRankings',
        'userLeastEntriesRankings',
        'userOneTrackMindRankings',
        'userTasteMakerRankings',
      ]
      
      rankingsFields.forEach((field) => {
        const rankings = recordsData[field] as any[]
        if (Array.isArray(rankings)) {
          rankings.forEach((r: any) => {
            if (r?.userId) userIds.add(r.userId)
          })
        }
      })
```

Then, after the existing `userRecordFields.forEach` enrichment loop, add enrichment for rankings:

```typescript
      // Enrich rankings with fresh user data
      rankingsFields.forEach((field) => {
        const rankings = recordsData[field] as any[]
        if (Array.isArray(rankings)) {
          rankings.forEach((r: any) => {
            if (r?.userId) {
              const userData = userDataMap.get(r.userId)
              if (userData) {
                r.image = userData.image || null
                r.name = userData.name || userData.lastfmUsername
                r.lastfmUsername = userData.lastfmUsername
              }
            }
          })
        }
      })
```

- [ ] **Step 2: Commit**

```bash
git add app/api/groups/[id]/records/route.ts
git commit -m "feat: enrich award rankings with user images and lastfmUsernames"
```

---

### Task 3: Add i18n translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/pt.json`

- [ ] **Step 1: Add English translations**

In `messages/en.json`, inside the `records` object, add a new `awards` key:

```json
    "awards": {
      "title": "Member Award Rankings",
      "breadcrumb": "Awards",
      "viewAllRankings": "View All Rankings",
      "rank": "Rank",
      "member": "Member",
      "value": "Value",
      "vs": "VS",
      "plays": "plays",
      "entry": "entry",
      "entries": "entries",
      "noEntry": "—"
    }
```

- [ ] **Step 2: Add Portuguese translations**

In `messages/pt.json`, inside the `records` object, add:

```json
    "awards": {
      "title": "Ranking de Premia\u00e7\u00f5es",
      "breadcrumb": "Premia\u00e7\u00f5es",
      "viewAllRankings": "Ver Ranking Completo",
      "rank": "Pos.",
      "member": "Membro",
      "value": "Valor",
      "vs": "VS",
      "plays": "plays",
      "entry": "item",
      "entries": "itens",
      "noEntry": "\u2014"
    }
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/pt.json
git commit -m "feat: add i18n translations for award rankings page"
```

---

### Task 4: Create the awards rankings page (server component)

**Files:**
- Create: `app/[locale]/groups/[id]/records/awards/page.tsx`

- [ ] **Step 1: Create the server component**

Create `app/[locale]/groups/[id]/records/awards/page.tsx`:

```typescript
import { getGroupAccess } from '@/lib/group-auth'
import { getGroupRecords } from '@/lib/group-records'
import { Link } from '@/i18n/routing'
import AwardsRankingsClient from './AwardsRankingsClient'
import GroupPageHero from '@/components/groups/GroupPageHero'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getGroupImageUrl } from '@/lib/group-image-utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id, locale } = await params
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com'
  const defaultOgImage = `${siteUrl}/social-preview.png`
  const t = await getTranslations('records')
  const tAwards = await getTranslations('records.awards')
  const tSite = await getTranslations('site')

  try {
    const { group } = await getGroupAccess(id)
    const tGroups = await getTranslations('groups')
    return {
      title: `${tAwards('title')} - ${group?.name || tGroups('title')} - ${t('title')}`,
      openGraph: {
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: {
        images: [defaultOgImage],
      },
    }
  } catch {
    return {
      title: tAwards('title'),
      openGraph: {
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: {
        images: [defaultOgImage],
      },
    }
  }
}

export default async function AwardsPage({ params }: { params: { id: string; locale: string } }) {
  const { user, group } = await getGroupAccess(params.id)
  const t = await getTranslations('records')
  const tGroups = await getTranslations('groups')
  const tAwards = await getTranslations('records.awards')

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-24">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">{t('notFound')}</h1>
          <Link href="/groups" className="text-gray-600 hover:underline text-sm md:text-base">
            {t('backToGroups')}
          </Link>
        </div>
      </main>
    )
  }

  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  const records = await getGroupRecords(group.id)

  // Enrich rankings with user images
  if (records && records.status === 'completed' && records.records) {
    const recordsData = records.records as any
    const userIds = new Set<string>()

    const rankingsFields = [
      'userMostVSRankings',
      'userMostPlaysRankings',
      'userMostEntriesRankings',
      'userLeastEntriesRankings',
      'userOneTrackMindRankings',
      'userTasteMakerRankings',
    ]

    rankingsFields.forEach((field) => {
      const rankings = recordsData[field] as any[]
      if (Array.isArray(rankings)) {
        rankings.forEach((r: any) => {
          if (r?.userId) userIds.add(r.userId)
        })
      }
    })

    if (userIds.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, image: true, name: true, lastfmUsername: true },
      })

      const userDataMap = new Map(users.map(u => [u.id, u]))

      rankingsFields.forEach((field) => {
        const rankings = recordsData[field] as any[]
        if (Array.isArray(rankings)) {
          rankings.forEach((r: any) => {
            if (r?.userId) {
              const userData = userDataMap.get(r.userId)
              if (userData) {
                r.image = userData.image || null
                r.name = userData.name || userData.lastfmUsername
                r.lastfmUsername = userData.lastfmUsername
              }
            }
          })
        }
      })
    }
  }

  const dynamicGroupImage = await getGroupImageUrl({
    id: group.id,
    image: group.image,
    dynamicIconEnabled: group.dynamicIconEnabled,
    dynamicIconSource: group.dynamicIconSource,
  })

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: dynamicGroupImage,
          }}
          breadcrumbs={[
            { label: tGroups('hero.breadcrumb'), href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: t('breadcrumb'), href: `/groups/${group.id}/records` },
            { label: tAwards('breadcrumb') },
          ]}
          subheader={t('subheader')}
        />

        <AwardsRankingsClient
          groupId={group.id}
          records={records}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/groups/\[id\]/records/awards/page.tsx
git commit -m "feat: add awards rankings server component page"
```

---

### Task 5: Create the awards rankings client component

**Files:**
- Create: `app/[locale]/groups/[id]/records/awards/AwardsRankingsClient.tsx`

- [ ] **Step 1: Create the client component**

Create `app/[locale]/groups/[id]/records/awards/AwardsRankingsClient.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'

interface UserRanking {
  userId: string
  name: string
  value: number
  image?: string | null
  lastfmUsername?: string
}

interface UserOneTrackMindRanking extends UserRanking {
  entryName: string
  entryArtist: string | null
}

interface AwardsRankingsClientProps {
  groupId: string
  records: {
    status: string
    records: any
  } | null
}

// Award definitions with slugs, data keys, and color schemes
const AWARDS = [
  {
    slug: 'vs-virtuoso',
    translationKey: 'vsVirtuoso',
    dataKey: 'userMostVSRankings',
    formatValue: (v: number, t: any) => `${v.toLocaleString()} ${t('vs')}`,
    bgGradient: 'from-amber-50 to-yellow-50',
    borderColor: 'border-amber-300',
    activeTabBg: 'bg-amber-100',
    activeTabText: 'text-amber-800',
    activeTabBorder: 'border-amber-400',
    highlightBg: 'bg-amber-50',
    ribbonColor: 'bg-amber-500',
  },
  {
    slug: 'play-powerhouse',
    translationKey: 'playPowerhouse',
    dataKey: 'userMostPlaysRankings',
    formatValue: (v: number, t: any) => `${v.toLocaleString()} ${t('plays')}`,
    bgGradient: 'from-red-50 to-rose-50',
    borderColor: 'border-red-300',
    activeTabBg: 'bg-red-100',
    activeTabText: 'text-red-800',
    activeTabBorder: 'border-red-400',
    highlightBg: 'bg-red-50',
    ribbonColor: 'bg-red-500',
  },
  {
    slug: 'chart-connoisseur',
    translationKey: 'chartConnoisseur',
    dataKey: 'userMostEntriesRankings',
    formatValue: (v: number, t: any) => `${v} ${v === 1 ? t('entry') : t('entries')}`,
    bgGradient: 'from-sky-50 to-blue-50',
    borderColor: 'border-sky-300',
    activeTabBg: 'bg-sky-100',
    activeTabText: 'text-sky-800',
    activeTabBorder: 'border-sky-400',
    highlightBg: 'bg-sky-50',
    ribbonColor: 'bg-sky-500',
  },
  {
    slug: 'hidden-gem-hunter',
    translationKey: 'hiddenGemHunter',
    dataKey: 'userLeastEntriesRankings',
    formatValue: (v: number, t: any) => `${v} ${v === 1 ? t('entry') : t('entries')}`,
    bgGradient: 'from-teal-50 to-cyan-50',
    borderColor: 'border-teal-300',
    activeTabBg: 'bg-teal-100',
    activeTabText: 'text-teal-800',
    activeTabBorder: 'border-teal-400',
    highlightBg: 'bg-teal-50',
    ribbonColor: 'bg-teal-500',
  },
  {
    slug: 'one-track-mind',
    translationKey: 'oneTrackMind',
    dataKey: 'userOneTrackMindRankings',
    formatValue: (v: number, t: any) => `${v.toLocaleString()} ${t('vs')}`,
    bgGradient: 'from-violet-50 to-purple-50',
    borderColor: 'border-violet-300',
    activeTabBg: 'bg-violet-100',
    activeTabText: 'text-violet-800',
    activeTabBorder: 'border-violet-400',
    highlightBg: 'bg-violet-50',
    ribbonColor: 'bg-violet-500',
  },
  {
    slug: 'taste-maker',
    translationKey: 'tasteMaker',
    dataKey: 'userTasteMakerRankings',
    formatValue: (v: number, t: any) => `${v} ${v === 1 ? t('entry') : t('entries')}`,
    bgGradient: 'from-pink-50 to-fuchsia-50',
    borderColor: 'border-pink-300',
    activeTabBg: 'bg-pink-100',
    activeTabText: 'text-pink-800',
    activeTabBorder: 'border-pink-400',
    highlightBg: 'bg-pink-50',
    ribbonColor: 'bg-pink-500',
  },
] as const

function assignRanks(rankings: UserRanking[]): (UserRanking & { rank: number })[] {
  let currentRank = 1
  return rankings.map((r, idx) => {
    if (idx > 0 && r.value !== rankings[idx - 1].value) {
      currentRank = idx + 1
    }
    return { ...r, rank: currentRank }
  })
}

export default function AwardsRankingsClient({ groupId, records }: AwardsRankingsClientProps) {
  const tUserRecords = useSafeTranslations('records.userRecords')
  const tAwards = useSafeTranslations('records.awards')
  const tAwardDescriptions = useSafeTranslations('records.userRecords.awardDescriptions')
  const tStatus = useSafeTranslations('records.status')

  const [activeAward, setActiveAward] = useState(AWARDS[0].slug)

  // Read hash on mount to pre-select award
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const match = AWARDS.find(a => a.slug === hash)
      if (match) setActiveAward(match.slug)
    }
  }, [])

  // Update hash when tab changes
  const handleTabChange = (slug: string) => {
    setActiveAward(slug)
    window.history.replaceState(null, '', `#${slug}`)
  }

  if (!records || records.status !== 'completed' || !records.records) {
    return (
      <div className="text-center py-8 md:py-12">
        <p className="text-sm md:text-base text-gray-600">{tStatus('noRecordsForCategory')}</p>
      </div>
    )
  }

  const recordsData = records.records as any
  const currentAwardDef = AWARDS.find(a => a.slug === activeAward) || AWARDS[0]
  const rankings = (recordsData[currentAwardDef.dataKey] || []) as (UserRanking | UserOneTrackMindRanking)[]
  const rankedList = assignRanks(rankings)

  return (
    <div className="mt-6">
      {/* Tab selector */}
      <div className="mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 min-w-max">
          {AWARDS.map((award) => {
            const isActive = activeAward === award.slug
            return (
              <button
                key={award.slug}
                onClick={() => handleTabChange(award.slug)}
                className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? `${award.activeTabBg} ${award.activeTabText} ${award.activeTabBorder}`
                    : 'bg-white/80 text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tUserRecords(award.translationKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Award description */}
      <p className="text-sm text-gray-500 mb-4">
        {tAwardDescriptions(currentAwardDef.translationKey)}
      </p>

      {/* Rankings table */}
      <div
        className="bg-white rounded-lg shadow-lg overflow-hidden mx-2 md:mx-0"
        style={{
          backgroundColor: '#ffffff',
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12 sm:w-24 md:w-32">
                  {tAwards('rank')}
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {tAwards('member')}
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-24 sm:w-32 md:w-48">
                  {tAwards('value')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rankedList.map((member) => {
                const isWinner = member.rank === 1
                const isOneTrackMind = currentAwardDef.slug === 'one-track-mind'
                const oneTrackData = isOneTrackMind ? (member as UserOneTrackMindRanking & { rank: number }) : null
                return (
                  <tr
                    key={member.userId}
                    className={`transition-colors ${isWinner ? currentAwardDef.highlightBg : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm">
                      <span className={`font-bold ${isWinner ? 'text-gray-900' : 'text-gray-500'}`}>
                        #{member.rank}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                          <SafeImage
                            src={(member as any).image || ''}
                            alt={member.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          {(member as any).lastfmUsername ? (
                            <Link
                              href={`/u/${encodeURIComponent((member as any).lastfmUsername)}`}
                              className={`font-medium hover:text-[var(--theme-primary-dark)] transition-colors block truncate ${isWinner ? 'text-gray-900' : 'text-gray-700'}`}
                            >
                              {member.name}
                            </Link>
                          ) : (
                            <span className={`font-medium block truncate ${isWinner ? 'text-gray-900' : 'text-gray-700'}`}>
                              {member.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm text-right">
                      <span className={`font-medium ${isWinner ? 'text-gray-900' : 'text-gray-600'}`}>
                        {currentAwardDef.formatValue(member.value, tAwards)}
                      </span>
                      {isOneTrackMind && oneTrackData && oneTrackData.value > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px] sm:max-w-[200px] md:max-w-none ml-auto">
                          {oneTrackData.entryArtist
                            ? `${oneTrackData.entryName} — ${oneTrackData.entryArtist}`
                            : oneTrackData.entryName || tAwards('noEntry')}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/groups/\[id\]/records/awards/AwardsRankingsClient.tsx
git commit -m "feat: add awards rankings client component with tabs and table"
```

---

### Task 6: Add navigation links from records page

**Files:**
- Modify: `app/[locale]/groups/[id]/records/RecordsClient.tsx` (~lines 794-798, ~800-811)
- Modify: `components/records/RecordBlock.tsx` (~lines 220-230, ~289-303)

- [ ] **Step 1: Add "View All Rankings" link to section header in RecordsClient.tsx**

In `RecordsClient.tsx`, find the member awards section header block (~lines 794-798):

```typescript
            {activeTab === 'users' && (
              <div className="mb-4">
                <h3 className="text-lg md:text-xl font-bold text-gray-900">{tUserRecords('sectionTitle')}</h3>
                <p className="text-sm text-gray-500">{tUserRecords('sectionSubtitle')}</p>
              </div>
            )}
```

Replace with:

```typescript
            {activeTab === 'users' && (
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">{tUserRecords('sectionTitle')}</h3>
                  <p className="text-sm text-gray-500">{tUserRecords('sectionSubtitle')}</p>
                </div>
                <Link
                  href={`/groups/${groupId}/records/awards`}
                  className="text-xs md:text-sm text-[var(--theme-primary)] hover:underline whitespace-nowrap mt-1"
                >
                  {tAwards('viewAllRankings')} →
                </Link>
              </div>
            )}
```

Also, add the `tAwards` translation hook. Find where translations are initialized (near the top of the component) and add:

```typescript
  const tAwards = useSafeTranslations('records.awards')
```

- [ ] **Step 2: Add award link support to RecordBlock.tsx**

In `RecordBlock.tsx`, the user award cards currently link to the user's profile page. We need to also make the title link to the awards page with the correct hash.

First, add a mapping from award translation keys to slugs. After the `getRecordTypeFromTitle` function (~line 105), add:

```typescript
// Map user award title to awards page hash slug
function getAwardSlugFromTitle(title: string, tUserRecords: (key: string) => string): string | null {
  const titleToSlug: Record<string, string> = {
    [tUserRecords('vsVirtuoso')]: 'vs-virtuoso',
    [tUserRecords('playPowerhouse')]: 'play-powerhouse',
    [tUserRecords('chartConnoisseur')]: 'chart-connoisseur',
    [tUserRecords('hiddenGemHunter')]: 'hidden-gem-hunter',
    [tUserRecords('oneTrackMind')]: 'one-track-mind',
    [tUserRecords('tasteMaker')]: 'taste-maker',
  }
  return titleToSlug[title] || null
}
```

Then, in the component body, after the existing `detailPageLink` logic (~line 217), add:

```typescript
  // Build awards page link for user awards
  const awardSlug = isUser ? getAwardSlugFromTitle(title, tUserRecords) : null
  const awardsPageLink = awardSlug ? `/groups/${groupId}/records/awards#${awardSlug}` : null
```

Add a `tUserRecords` translation hook at the top of the component (alongside the existing translation hooks):

```typescript
  const tUserRecords = useSafeTranslations('records.userRecords')
```

Finally, update the title rendering to link to the awards page for user awards. Find the title rendering block (~lines 289-303):

```typescript
        <div className="flex items-center gap-2 mb-2 md:mb-3 relative z-10">
          {hasDetailPage && detailPageLink ? (
            <Link
              href={detailPageLink}
              className={`flex items-center gap-1.5 text-xs md:text-sm font-semibold ${colorScheme.titleColor} hover:underline transition-colors cursor-pointer`}
            >
              {title}
              <FontAwesomeIcon 
                icon={faChevronRight} 
                className="text-[10px] md:text-xs opacity-70"
              />
            </Link>
          ) : (
            <h4 className={`text-xs md:text-sm font-semibold ${colorScheme.titleColor}`}>{title}</h4>
          )}
        </div>
```

Replace with:

```typescript
        <div className="flex items-center gap-2 mb-2 md:mb-3 relative z-10">
          {hasDetailPage && detailPageLink ? (
            <Link
              href={detailPageLink}
              className={`flex items-center gap-1.5 text-xs md:text-sm font-semibold ${colorScheme.titleColor} hover:underline transition-colors cursor-pointer`}
            >
              {title}
              <FontAwesomeIcon 
                icon={faChevronRight} 
                className="text-[10px] md:text-xs opacity-70"
              />
            </Link>
          ) : awardsPageLink ? (
            <Link
              href={awardsPageLink}
              className={`flex items-center gap-1.5 text-xs md:text-sm font-semibold ${colorScheme.titleColor} hover:underline transition-colors cursor-pointer`}
            >
              {title}
              <FontAwesomeIcon 
                icon={faChevronRight} 
                className="text-[10px] md:text-xs opacity-70"
              />
            </Link>
          ) : (
            <h4 className={`text-xs md:text-sm font-semibold ${colorScheme.titleColor}`}>{title}</h4>
          )}
        </div>
```

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/groups/\[id\]/records/RecordsClient.tsx components/records/RecordBlock.tsx
git commit -m "feat: add navigation links from records page to awards rankings"
```

---

### Task 7: Verify and test

- [ ] **Step 1: Run the dev server and verify compilation**

```bash
npm run dev
```

Verify no TypeScript or build errors.

- [ ] **Step 2: Trigger records recalculation for a test group**

Delete existing records to force a full recalculation that includes the new rankings fields:

```sql
UPDATE "group_records" SET status = 'failed', "chartsGeneratedAt" = NOW() - INTERVAL '2 hours' WHERE "groupId" = '<test-group-id>';
```

Then visit the records page and click "Retry Calculation".

- [ ] **Step 3: Verify the awards page**

Navigate to `/groups/<test-group-id>/records/awards` and verify:
- All 6 tabs render with correct colors
- Rankings table shows all group members
- Winner row is highlighted
- Tied values share the same rank number
- One Track Mind tab shows entry names
- Hidden Gem Hunter sorts ascending with zeros last
- Hash fragments work (direct URL with `#taste-maker` pre-selects that tab)

- [ ] **Step 4: Verify navigation**

- Click an award card title on the records page → should navigate to awards page with correct tab
- Click "View All Rankings" link → should navigate to awards page (first tab)

- [ ] **Step 5: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete award rankings page implementation"
```
