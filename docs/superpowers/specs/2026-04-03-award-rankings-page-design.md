# Award Rankings Page Design

## Overview

Add a page where users can see how every group member ranks for each of the 6 displayed member awards. Accessible from both individual award cards (pre-selecting that award) and a section header link.

## Constraints

- No schema changes. Rankings stored in the existing `GroupRecords.records` JSON field.
- Only the 6 currently displayed awards: VS Virtuoso, Play Powerhouse, Chart Connoisseur, Hidden Gem Hunter, One Track Mind, Taste Maker.
- All group members appear in rankings, including those with zero values.

## Data Layer

### New Types

```typescript
interface UserRanking {
  userId: string
  name: string
  value: number
}

interface UserOneTrackMindRanking extends UserRanking {
  entryName: string
  entryArtist: string | null
}
```

### New Fields in GroupRecordsData

```typescript
userMostVSRankings: UserRanking[]
userMostPlaysRankings: UserRanking[]
userMostEntriesRankings: UserRanking[]
userLeastEntriesRankings: UserRanking[]
userOneTrackMindRankings: UserOneTrackMindRanking[]
userTasteMakerRankings: UserRanking[]
```

### Calculation Changes (lib/group-records.ts, phase 6)

Each existing award query currently uses `LIMIT 1`. For each of the 6 awards:

1. Run the same query without `LIMIT 1` to get all members with non-zero values.
2. Query all current group members.
3. Members not in the query results get value 0 (and for One Track Mind, no entry info).
4. Store the full ranked array in the new `*Rankings` field.
5. The existing winner fields (`userMostVS`, etc.) continue to be derived from index 0 of the rankings, keeping backward compatibility.

**One Track Mind special handling:** For each member, find their personal highest single-entry VS. The query groups by `userId, entryKey, chartType`, then we pick each user's top row. Members with no VS get `{value: 0, entryName: '', entryArtist: null}`.

**Hidden Gem Hunter sorting:** Rankings sorted ascending by value. Members with zero entries are placed last (they don't qualify — the award requires at least 1 entry).

## Page & Routing

### Route

`/groups/[id]/records/awards`

### Server Component

`app/[locale]/groups/[id]/records/awards/page.tsx`

Responsibilities:
- Fetch group access (auth check)
- Fetch records data from database
- Enrich user records with profile images and lastfmUsernames (same pattern as main records page)
- Pass data to client component

### Client Component

`app/[locale]/groups/[id]/records/awards/AwardsRankingsClient.tsx`

Responsibilities:
- Tab selector for 6 awards (reads hash fragment on mount for pre-selection)
- Rankings table for selected award
- Updates URL hash on tab change (no page reload)

## Navigation

### From Award Cards

Each award card on the records page links to `/groups/[id]/records/awards#[award-slug]`.

Award slug mapping:
- VS Virtuoso → `#vs-virtuoso`
- Play Powerhouse → `#play-powerhouse`
- Chart Connoisseur → `#chart-connoisseur`
- Hidden Gem Hunter → `#hidden-gem-hunter`
- One Track Mind → `#one-track-mind`
- Taste Maker → `#taste-maker`

### From Section Header

The "Member Awards" section heading on the records page gets a "View All Rankings" link to `/groups/[id]/records/awards` (no hash, defaults to first tab).

## UI Design

### Tab Selector

6 tabs, one per award, using each award's existing color scheme. Active tab is highlighted with the award's accent color. Tabs are horizontally scrollable on mobile.

### Rankings Table

Follows the same visual pattern as `RecordDetailClient.tsx`:

| Column | Description |
|--------|-------------|
| Rank | Numeric rank (ties share the same number) |
| Member | Profile image (circular) + display name, linked to `/u/[lastfmUsername]` |
| Value | Award-specific formatted value |

### Value Formatting

| Award | Format | Example |
|-------|--------|---------|
| VS Virtuoso | `{value} VS` | "1,234 VS" |
| Play Powerhouse | `{value} plays` | "8,421 plays" |
| Chart Connoisseur | `{value} entries` | "47 entries" |
| Hidden Gem Hunter | `{value} entries` | "12 entries" |
| One Track Mind | `{value} VS` + entry subtitle | "142 VS · Bohemian Rhapsody — Queen" |
| Taste Maker | `{value} entries` | "3 entries" |

### Winner Highlight

Rank 1 row gets a subtle background tint using the award's color scheme.

### Tied Ranks

Members with identical values share the same rank number. The next rank skips accordingly (1, 2, 2, 4).

## i18n

New translations under `records.awards` namespace in both `messages/en.json` and `messages/pt.json`:
- Page title
- Tab labels (reuse existing award name translations)
- Value suffixes ("VS", "plays", "entries")
- "View All Rankings" link text
- Column headers ("Rank", "Member", "Value")

## Files to Create/Modify

### New Files
- `app/[locale]/groups/[id]/records/awards/page.tsx` — server component
- `app/[locale]/groups/[id]/records/awards/AwardsRankingsClient.tsx` — client component

### Modified Files
- `lib/group-records.ts` — extend phase 6 to compute full rankings, update `GroupRecordsData` type
- `app/[locale]/groups/[id]/records/RecordsClient.tsx` — add "View All Rankings" link to member awards section header, update award card links
- `components/records/RecordBlock.tsx` — add link support for user award cards (to awards page with hash)
- `app/api/groups/[id]/records/route.ts` — enrich rankings with user images/lastfmUsernames
- `messages/en.json` — add `records.awards` translations
- `messages/pt.json` — add `records.awards` translations
