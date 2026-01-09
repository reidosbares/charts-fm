# Vibe Score System Documentation

This document explains the Vibe Score (VS) system that replaces simple play count aggregation with a customizable, rank-based scoring system for group charts.

## Overview

The Vibe Score system allows group owners to choose how charts are calculated and ranked. Instead of simply summing play counts across all users, VS uses a position-based scoring system that makes charts more dynamic and prevents heavy listeners from dominating group charts.

**Key Benefits:**
- More balanced representation of all group members' listening habits
- Customizable calculation modes per group
- Per-user contribution tracking for future features
- Dynamic charts that reflect diverse listening patterns

## Core Concepts

### Vibe Score (VS)

VS is a score calculated for each item (track, artist, or album) based on its position in each user's personal weekly chart. The score ranges from 0.00 to 2.00, with position 1 receiving special weighting of 2.00 VS.

### Calculation Formula

VS is now **standardized to always use top 100 entries** per user, regardless of group chart size. This makes VS user-specific and reusable across all groups.

For each user's top 100 items, VS uses a **three-tier system**:

1. **Position 1**: Gets special weighting of **2.00 VS**
2. **Positions 2-21**: Linear reduction by 0.05 per position
   - Formula: `VS = 2.00 - (0.05 × (position - 1))`
   - Position 21 reaches 1.00 VS
3. **Positions 22-100**: Linear interpolation from 1.00 to 0.00
   - Formula: `VS = 1.00 × (1 - ((position - 21) / 80))`
4. **Position 101+**: `0.00` (items beyond top 100 receive no VS)

**Examples:**
- Position 1: `2.00 VS` (special weighting)
- Position 2: `2.00 - (0.05 × 1) = 1.95 VS`
- Position 10: `2.00 - (0.05 × 9) = 1.55 VS`
- Position 21: `2.00 - (0.05 × 20) = 1.00 VS`
- Position 50: `1.00 × (1 - 29/80) = 0.64 VS`
- Position 100: `1.00 × (1 - 79/80) = 0.01 VS`
- Position 101+: `0.00` (items beyond top 100 receive no VS)

### Standardization Benefits

- **Consistency**: Same VS value for a user's item across all groups
- **Reusability**: VS calculated once per user/week, reused across all groups
- **Performance**: VS calculated once during weekly stats sync, not per-group
- **Simplicity**: Removes dependency on group chart size for VS calculation

**Note:** Group chart size (`chartSize`) still determines how many items appear in the final group chart, but VS calculation always uses top 100 per user.

## Chart Modes

Group owners can choose from three calculation modes:

### 1. VS Mode (`vs`)

**How it works:** Sums VS scores across all users for each item.

**Example:**
- User A's #1 track gets 2.00 VS
- User B's #5 track gets 1.80 VS (2.00 - 0.20)
- If both users listened to the same track, total VS = 3.80

**Best for:** Groups with diverse listening habits where you want to emphasize what's important to each member equally.

### 2. VS Weighted (`vs_weighted`)

**How it works:** Multiplies each user's VS by their play count, then sums across users.

**Formula:** `Sum(VS × playcount)` for each item

**Example:**
- User A's #1 track (2.00 VS) with 28 plays = 56.00 contribution
- User B's #1 track (2.00 VS) with 5 plays = 10.00 contribution
- Total VS = 66.00

**Best for:** Balancing ranking importance with listening volume. Rewards both high position and high play count.

### 3. Plays Only (`plays_only`)

**How it works:** Traditional mode - sums play counts across all users. VS equals total plays for consistency.

**Example:**
- User A: 28 plays
- User B: 19 plays
- Total VS = 47 (same as total plays)

**Best for:** Groups that prefer the traditional play count ranking system.

## Database Schema

### New Fields

#### Group Model
- `chartMode` (String, default: `"plays_only"`)
  - Values: `"vs"`, `"vs_weighted"`, or `"plays_only"`

#### GroupChartEntry Model
- `vibeScore` (Float, nullable)
  - Stores the aggregated VS for each chart entry
  - Used for ranking and display
  - Nullable to support existing entries before migration

#### Model: UserChartEntryVS

Stores per-user VS contributions calculated from top 100 entries. VS is now user-specific (no groupId), making it reusable across all groups.

```prisma
model UserChartEntryVS {
  id        String   @id @default(cuid())
  userId    String
  weekStart DateTime
  chartType String   // "artists" | "tracks" | "albums"
  entryKey  String   // Normalized key for matching
  vibeScore Float    // User's VS contribution (calculated from top 100)
  playcount Int      // User's playcount for reference
  createdAt DateTime
  updatedAt DateTime
  
  user  User  @relation(...)
  
  @@unique([userId, weekStart, chartType, entryKey])
  @@index([userId, weekStart])
  @@index([userId, weekStart, chartType])
}
```

**Purpose:** 
- Stores VS calculated from user's top 100 entries (standardized across all groups)
- Enables querying which users contributed to each chart entry and their individual VS scores
- VS is automatically calculated and stored when user weekly stats are fetched/stored

## Key Files

### Core Logic
- **`lib/vibe-score.ts`**
  - `calculateUserVS()`: Calculates VS for each item in a user's top 100 (standardized)
  - `getUserVSForWeek()`: Fetches pre-calculated VS from UserChartEntryVS
  - `aggregateGroupStatsVS()`: Aggregates pre-calculated VS across users based on mode
  - Type definitions: `ChartMode`, `UserVSContribution`

### Integration
- **`lib/group-stats.ts`**
  - `aggregateGroupStatsWithVS()`: Wrapper that calls VS aggregation
  - Maintains backward compatibility with legacy `aggregateGroupStats()`

- **`lib/group-service.ts`**
  - `fetchOrGetUserWeeklyStats()`: Automatically calculates and stores VS when weekly stats are fetched/stored
  - `calculateGroupWeeklyStats()`: Fetches pre-calculated VS and aggregates for group charts
  - Fetches `chartMode` from group settings

- **`lib/group-chart-metrics.ts`**
  - `cacheChartMetrics()`: Stores aggregated VS in `GroupChartEntry`
  - `getCachedChartEntries()`: Retrieves entries with VS and VS change tracking
  - `EnrichedChartItem`: Interface includes `vibeScore` and `vibeScoreChange`

### API & UI
- **`app/api/groups/[id]/settings/route.ts`**
  - GET: Returns `chartMode` in settings
  - PATCH: Validates and updates `chartMode`

- **`app/groups/[id]/settings/GroupSettingsForm.tsx`**
  - Chart mode selector with explanations
  - Radio buttons for each mode

- **`app/groups/[id]/charts/ChartTable.tsx`**
  - Displays VS column with 2 decimal places
  - Shows VS change (similar to plays change)

## Calculation Flow

```
1. User Weekly Stats (from Last.fm)
   ↓
2. Calculate VS per User (Automatic)
   - Take top 100 items (standardized, not based on group chartSize)
   - Calculate VS based on three-tier system:
     * Position 1: 2.00 VS
     * Positions 2-21: 2.00 - (0.05 × (position - 1))
     * Positions 22-100: 1.00 × (1 - ((position - 21) / 80))
   - Items beyond position 100 get 0.00 VS
   - Store in UserChartEntryVS (user-specific, no groupId)
   ↓
3. Group Chart Generation
   - Fetch pre-calculated VS from UserChartEntryVS for all group members
   - Aggregate by Mode:
     * VS mode: Sum VS across users
     * VS weighted: Sum (VS × playcount)
     * Plays-only: Sum playcount (stored as VS)
   ↓
4. Store Aggregated Results
   - Save to GroupChartEntry.vibeScore
   - Save to GroupWeeklyStats (JSON, without VS)
   - Slice to group.chartSize for final chart display
   ↓
5. Rank Charts
   - Sort by vibeScore (descending)
   - Tiebreaker: playcount (descending)
```

**Key Change:** VS is now calculated once per user/week when weekly stats are stored, and reused across all groups. This eliminates redundant calculations and ensures consistency.

## API Endpoints

### Group Settings
- **GET `/api/groups/[id]/settings`**
  - Returns: `{ chartSize, chartMode, trackingDayOfWeek }`

- **PATCH `/api/groups/[id]/settings`**
  - Body: `{ chartMode?: "vs" | "vs_weighted" | "plays_only" }`
  - Validates mode is one of the three allowed values
  - Note: Mode changes only affect future charts (historical charts keep original mode unless regenerated)

### Chart Generation
- **POST `/api/groups/[id]/charts`**
  - Regenerates last 5 finished weeks
  - Uses current `chartMode` from group settings
  - Deletes and recalculates all affected charts

## Chart Regeneration Behavior

**Important:** When charts are regenerated, they use the group's **current** `chartMode`, not the mode that was active when the chart was originally created.

**Example:**
1. Group created with `plays_only` mode
2. Charts generated for weeks 1-5 using `plays_only`
3. Owner changes mode to `vs`
4. Owner regenerates charts
5. All 5 weeks are recalculated using `vs` mode

This is intentional - regeneration explicitly recalculates with current settings. Historical charts are only preserved if not regenerated.

## Display

### Chart Table
- **VS Column**: Shows aggregated VS with 2 decimal places (e.g., "1.00", "0.95")
- **VS Change**: Shows change from previous week (e.g., "↑0.15", "↓0.05")
- **Plays Column**: Still displayed for reference
- **Ranking**: Charts are sorted by VS (descending), then by playcount as tiebreaker

### Settings UI
- Radio button selector for chart mode
- Each mode includes:
  - Label (e.g., "VS Mode")
  - Description explaining how it works
  - Visual indication of selected mode

## Future Features Enabled

The per-user VS storage (`UserChartEntryVS` model) enables:

1. **Individual Contribution Views**
   - Show which users contributed to each chart entry
   - Display each user's VS contribution
   - Highlight top contributors

2. **User-Specific Analytics**
   - "Your top contributions to this group"
   - "How your listening affected the charts"
   - Personal impact metrics

3. **Advanced Visualizations**
   - Heatmaps showing user contributions
   - Timeline of individual user influence
   - Comparison views between users

## Migration Notes

### Database Migration Required

After schema changes, run:
```bash
npx prisma migrate dev --name add_vibe_score_system
npx prisma generate
```

### Backward Compatibility

- Existing groups default to `plays_only` mode
- Historical charts keep their original calculation until regenerated
- `vibeScore` field is nullable to support existing entries
- Legacy `aggregateGroupStats()` function still available

### Data Population

- VS is calculated and stored automatically when user weekly stats are fetched/stored
- VS is calculated from top 100 entries (standardized across all groups)
- Existing charts will have `null` vibeScore until regenerated
- Per-user VS is stored in UserChartEntryVS (user-specific, no groupId)
- VS is reused across all groups for the same user/week

## Examples

### Example 1: VS Mode Calculation

**Group Settings:**
- Chart size: 20 (determines how many items appear in final chart)
- Mode: `vs`

**User A's Top Tracks (VS calculated from top 100):**
1. "Carnaval" - 28 plays → 2.00 VS (position 1 in top 100)
2. "Bad Romance" - 19 plays → 1.95 VS (position 2 in top 100)
3. "Alejandro" - 18 plays → 1.90 VS (position 3 in top 100)
...
100. "Berghain" - 4 plays → 0.01 VS (position 100 in top 100)

**User B's Top Tracks (VS calculated from top 100):**
1. "Bad Romance" - 15 plays → 2.00 VS (position 1 in top 100)
2. "Carnaval" - 12 plays → 1.95 VS (position 2 in top 100)

**Result:**
- "Carnaval": 2.00 (User A) + 1.95 (User B) = **3.95 VS**
- "Bad Romance": 1.95 (User A) + 2.00 (User B) = **3.95 VS**
- "Alejandro": 1.90 (User A) = **1.90 VS**

Both "Carnaval" and "Bad Romance" tie at 1.99 VS, ranked by playcount as tiebreaker. The top 20 items (based on group chartSize) appear in the final chart.

### Example 2: VS Weighted Mode

**Same users, VS Weighted mode:**

**Result:**
- "Carnaval": (2.00 × 28) + (1.95 × 12) = 56.00 + 23.40 = **79.40 VS**
- "Bad Romance": (1.95 × 19) + (2.00 × 15) = 37.05 + 30.00 = **67.05 VS**

"Carnaval" wins because User A's high play count (28) multiplied by high VS (2.00) creates a larger contribution.

## Testing Considerations

When testing the VS system:

1. **Test VS calculation**
   - Verify VS is always calculated from top 100 entries
   - Ensure items beyond position 100 get 0.00 VS
   - Verify VS is the same for a user across different groups

2. **Test all three modes**
   - VS mode: Verify simple summation
   - VS weighted: Verify multiplication then summation
   - Plays-only: Verify VS equals total plays

3. **Test mode switching**
   - Change mode and regenerate charts
   - Verify new mode is applied
   - Check historical charts (if not regenerated) keep old mode

4. **Test per-user VS storage**
   - Verify UserChartEntryVS records are created automatically when weekly stats are stored
   - Verify VS is user-specific (no groupId)
   - Check unique constraints work (userId, weekStart, chartType, entryKey)
   - Verify VS is reused across groups for the same user/week

5. **Test edge cases**
   - Single user groups
   - Groups with users who have no listening data
   - Ties in VS scores

## Troubleshooting

### VS is null for existing charts
- **Solution**: Regenerate charts using the "Generate Charts" button
- VS is only calculated during chart generation

### VS doesn't match expected values
- Check group's `chartMode` setting
- Verify VS is calculated from top 100 entries (standardized)
- Check that user's top 100 items include the item in question
- Note: Group `chartSize` only affects how many items appear in final chart, not VS calculation

### Per-user VS not stored
- Verify migration was run successfully (removed groupId from UserChartEntryVS)
- Check that VS is calculated automatically in `fetchOrGetUserWeeklyStats()`
- Review database for UserChartEntryVS records (should have userId, weekStart, chartType, entryKey - no groupId)

## Related Documentation

- [Signup Implementation](./SIGNUP_IMPLEMENTATION.md) - Last.fm authentication flow
- [README.md](../README.md) - Project overview and setup

## Code References

- VS Calculation: `lib/vibe-score.ts`
- Aggregation: `lib/group-stats.ts`
- Chart Generation: `lib/group-service.ts`
- Metrics Caching: `lib/group-chart-metrics.ts`
- Settings API: `app/api/groups/[id]/settings/route.ts`
- Settings UI: `app/groups/[id]/settings/GroupSettingsForm.tsx`
- Chart Display: `app/groups/[id]/charts/ChartTable.tsx`

