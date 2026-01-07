# Records Calculation System

## Overview

The Records Calculation System automatically computes and caches various chart records and achievements for groups. These records highlight notable statistics like longest chart runs, most popular entries, user contributions, and more.

The system is designed to:
- Calculate records asynchronously after chart generation
- Cache results in the database for fast retrieval
- Support incremental updates for performance
- Provide comprehensive logging for debugging and performance analysis

## Records Calculated

### Shared Records (Artists, Tracks, Albums)

These records are calculated separately for each chart type (artists, tracks, albums):

1. **Most Weeks on Chart** - Entry with the highest total number of weeks charted
2. **Most Weeks at #1** - Entry that spent the most weeks at the top position
3. **Most Weeks in Top 10** - Entry that spent the most weeks in positions 1-10
4. **Most Consecutive Weeks** - Entry with the longest unbroken streak on the chart
5. **Most Consecutive Weeks at #1** - Entry with the longest unbroken streak at #1
6. **Most Consecutive Weeks in Top 10** - Entry with the longest unbroken streak in top 10
7. **Total All-Time VS Received** - Entry that accumulated the most vibe score points
8. **Most Plays Received** - Entry that received the most total plays
9. **Total Different Entries at #1** - Count of unique entries that reached #1
10. **Total Different Entries Charted** - Count of unique entries that appeared on the chart
11. **Most Popular** - Entry with the highest number of different members contributing VS (tie-breaker: total VS/plays)
12. **Longest Time Between Appearances** - Entry with the longest gap between chart appearances

### Artist-Specific Records

1. **Artist with Most #1 Songs** - Artist whose songs reached #1 most often
2. **Artist with Most #1 Albums** - Artist whose albums reached #1 most often
3. **Artist with Most Songs in Top 10** - Artist with the most songs reaching top 10
4. **Artist with Most Albums in Top 10** - Artist with the most albums reaching top 10
5. **Artist with Most Songs Charted** - Artist with the most songs appearing on charts
6. **Artist with Most Albums Charted** - Artist with the most albums appearing on charts

### User Records

1. **VS Virtuoso** - User with most contributed VS (vibe score)
2. **Play Powerhouse** - User with most plays contributed
3. **Chart Connoisseur** - Most mainstream user (most entries contributed to charts)
4. **Hidden Gem Hunter** - Least mainstream user (least songs contributed, but at least 1)
5. **Chart Dominator** - User with most #1 entries
6. **Consistency Champion** - User with most weeks contributing
7. **Taste Maker** - User who introduced most entries that later reached #1
8. **Peak Performer** - User with highest average VS per entry (minimum 5 entries)

## Architecture

### Database Schema

Records are stored in the `GroupRecords` model:

```prisma
model GroupRecords {
  id                    String   @id @default(cuid())
  groupId               String   @unique
  status                String   // "calculating" | "completed" | "failed"
  calculationStartedAt  DateTime?
  chartsGeneratedAt     DateTime? // When charts were last generated
  records               Json     // Stores all calculated records
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
}
```

**Key Points:**
- One record per group (enforced by unique constraint)
- Status tracks calculation state
- Records stored as JSON for flexibility
- Cascades on group deletion

### Calculation Flow

1. **Trigger**: Records calculation is automatically triggered after chart generation completes
2. **Status Update**: A `GroupRecords` entry is created with status "calculating"
3. **Background Processing**: Calculation runs asynchronously (fire-and-forget)
4. **Completion**: Status updated to "completed" with results stored in JSON
5. **Error Handling**: On failure, status set to "failed"

### Calculation Modes

#### Full Calculation
- Runs when no existing records exist (first time)
- Calculates all records from scratch
- Takes ~40 seconds for typical groups

#### Incremental Calculation
- Runs when records already exist
- Only checks entries that appeared in newly generated charts
- Much faster (~5 seconds expected)
- Merges new results with existing records

## Calculation Phases

The calculation is divided into 6 phases for performance and maintainability:

### Phase 1: ChartEntryStats Cache (8-11s)
**Purpose**: Leverage pre-calculated metrics from `ChartEntryStats` cache

**Records Calculated:**
- Most weeks on chart
- Most consecutive weeks
- Most weeks in top 10
- Most plays

**Performance**: Fast - uses existing cache, single query per chart type

### Phase 2: SQL Aggregations (4-5s)
**Purpose**: Use raw SQL for efficient database-level aggregations

**Records Calculated:**
- Most weeks at #1
- Total all-time VS received
- Total different entries at #1
- Total different entries charted

**Performance**: Good - efficient SQL queries with COUNT, SUM, GROUP BY

### Phase 3: Incremental Calculations (19-47s)
**Purpose**: Calculate streak-based records and time gaps

**Records Calculated:**
- Most consecutive weeks at #1
- Most consecutive weeks in top 10
- Longest time between appearances

**Performance**: 
- **Full mode**: ~19s (optimized with SQL window functions)
- **Incremental mode**: <5s (only checks new entries)

**Optimization**: Uses SQL window functions (`LAG()`) to avoid N+1 query problems

### Phase 4: User Contributions (1-2s)
**Purpose**: Find entries with most diverse member contributions

**Records Calculated:**
- Most popular (highest number of different members contributing VS)

**Performance**: Excellent - single optimized SQL query

### Phase 5: Artist Aggregations (<1s)
**Purpose**: Calculate artist-specific aggregations

**Records Calculated:**
- Artist with most #1 songs/albums
- Artist with most songs/albums in top 10
- Artist with most songs/albums charted

**Performance**: Excellent - efficient SQL aggregations

### Phase 6: User Records (4-5s)
**Purpose**: Calculate user-specific achievements

**Records Calculated:**
- All 8 user records (VS Virtuoso, Play Powerhouse, etc.)

**Performance**: Good - multiple SQL queries but optimized

## API Endpoints

### GET `/api/groups/[id]/records`
Fetches the current records for a group.

**Response:**
```json
{
  "status": "completed" | "calculating" | "failed" | "not_started",
  "records": GroupRecordsData | null,
  "calculationStartedAt": "2026-01-07T02:47:16.875Z" | null,
  "chartsGeneratedAt": "2026-01-07T02:47:16.875Z" | null
}
```

**Status Values:**
- `not_started`: No calculation has been run yet
- `calculating`: Calculation is currently in progress
- `completed`: Calculation finished successfully
- `failed`: Calculation encountered an error

### GET `/api/groups/[id]/records/preview`
Fetches preview data (top 3 records) for display in the All-Time Stats tab.

**Response:**
```json
{
  "artist": { "entryKey": "...", "name": "...", "value": 10, ... },
  "track": { "entryKey": "...", "name": "...", "value": 8, ... },
  "album": { "entryKey": "...", "name": "...", "value": 12, ... }
}
```

### POST `/api/groups/[id]/records`
Manually triggers a records calculation (group creator only).

**Use Cases:**
- Records failed and need recalculation
- More than 1 hour has passed since chart generation and records haven't completed
- Manual refresh needed

**Response:**
```json
{
  "success": true,
  "message": "Records calculation started"
}
```

**Error Responses:**
- `409`: Calculation already in progress or recently completed
- `403`: Only group creator can trigger
- `500`: Server error

## Automatic Triggering

Records calculation is automatically triggered after chart generation completes:

1. **Location**: `/app/api/groups/[id]/charts/route.ts`
2. **Timing**: After all charts are generated and all-time stats are recalculated
3. **Mode**: 
   - Full calculation if no records exist
   - Incremental if records exist (only checks new entries)
4. **Execution**: Asynchronous (fire-and-forget) - doesn't block chart generation response

## Performance Considerations

### Current Performance (After Optimizations)

**Full Calculation:**
- Total: ~40 seconds
- Phase 3: ~19 seconds (47% of total)
- Other phases: ~21 seconds combined

**Incremental Calculation:**
- Expected: <5 seconds total
- Only processes entries from newly generated charts

### Optimizations Applied

1. **SQL Window Functions**: Replaced N+1 queries with single SQL queries using `LAG()` for gap calculations
2. **ChartEntryStats Cache**: Leverages pre-calculated metrics instead of recalculating
3. **Incremental Updates**: Only processes new entries when records already exist
4. **Batch Processing**: Groups similar calculations together
5. **Raw SQL**: Uses database-level aggregations for efficiency

### Performance Monitoring

Log files are created in `/logs/` directory:
- Format: `records-calculation-{groupId}-{timestamp}.log`
- Contains: Step-by-step timing, phase breakdowns, summary statistics
- Console logging: Controlled by `ENABLE_RECORDS_CALCULATION_LOGS` environment variable

## Usage

### For Users

1. **Viewing Records**: Navigate to `/groups/[id]/records` from the All-Time Stats tab
2. **Preview**: See top 3 records (artist, track, album) in the All-Time Stats tab
3. **Status**: If records are calculating, a message is displayed
4. **Manual Trigger**: Group creators can manually trigger if needed (after 1 hour)

### For Developers

#### Triggering Calculation Programmatically

```typescript
import { triggerRecordsCalculation } from '@/lib/group-records'

// Check if calculation should run
const shouldRun = await triggerRecordsCalculation(groupId)

if (shouldRun) {
  // Calculation will start automatically
}
```

#### Getting Records

```typescript
import { getGroupRecords } from '@/lib/group-records'

const records = await getGroupRecords(groupId)

if (records?.status === 'completed') {
  const data = records.records as GroupRecordsData
  // Use records data
}
```

#### Manual Calculation

```typescript
import { calculateGroupRecords } from '@/lib/group-records'
import { RecordsCalculationLogger } from '@/lib/records-calculation-logger'

const logger = new RecordsCalculationLogger(groupId)
const records = await calculateGroupRecords(groupId, undefined, logger)
```

## Data Structure

### GroupRecordsData Interface

```typescript
interface GroupRecordsData {
  // Shared records (artists/tracks/albums)
  mostWeeksOnChart: { artists: RecordHolder | null, tracks: RecordHolder | null, albums: RecordHolder | null }
  mostWeeksAtOne: { artists: RecordHolder | null, tracks: RecordHolder | null, albums: RecordHolder | null }
  mostWeeksInTop10: { artists: RecordHolder | null, tracks: RecordHolder | null, albums: RecordHolder | null }
  mostConsecutiveWeeks: { artists: RecordHolder | null, tracks: RecordHolder | null, albums: RecordHolder | null }
  mostConsecutiveWeeksAtOne: { artists: RecordHolder | null, tracks: RecordHolder | null, albums: RecordHolder | null }
  mostConsecutiveWeeksInTop10: { artists: RecordHolder | null, tracks: RecordHolder | null, albums: RecordHolder | null }
  mostTotalVS: { artists: RecordHolder | null, tracks: RecordHolder | null, albums: RecordHolder | null }
  mostPlays: { artists: RecordHolder | null, tracks: RecordHolder | null, albums: RecordHolder | null }
  totalDifferentEntriesAtOne: { artists: number, tracks: number, albums: number }
  totalDifferentEntriesCharted: { artists: number, tracks: number, albums: number }
  mostPopular: { artists: RecordHolder | null, tracks: RecordHolder | null, albums: RecordHolder | null }
  longestTimeBetweenAppearances: { artists: RecordHolder | null, tracks: RecordHolder | null, albums: RecordHolder | null }
  
  // Artist-specific
  artistMostNumberOneSongs: RecordHolder | null
  artistMostNumberOneAlbums: RecordHolder | null
  artistMostSongsInTop10: RecordHolder | null
  artistMostAlbumsInTop10: RecordHolder | null
  artistMostSongsCharted: RecordHolder | null
  artistMostAlbumsCharted: RecordHolder | null
  
  // User records
  userMostVS: { userId: string, name: string, value: number } | null
  userMostPlays: { userId: string, name: string, value: number } | null
  userMostEntries: { userId: string, name: string, value: number } | null
  userLeastEntries: { userId: string, name: string, value: number } | null
  userMostNumberOnes: { userId: string, name: string, value: number } | null
  userMostWeeksContributing: { userId: string, name: string, value: number } | null
  userTasteMaker: { userId: string, name: string, value: number } | null
  userPeakPerformer: { userId: string, name: string, value: number } | null
}

interface RecordHolder {
  entryKey: string
  chartType: ChartType
  name: string
  artist?: string | null
  value: number
  slug: string
}
```

## Troubleshooting

### Records Not Calculating

1. **Check Status**: Query `/api/groups/[id]/records` to see current status
2. **Check Logs**: Look in `/logs/` directory for error messages
3. **Check Console**: Server console may have error details
4. **Manual Trigger**: Try POST to `/api/groups/[id]/records` (group creator only)

### Calculation Taking Too Long

1. **Check Logs**: Review phase timings in log files
2. **Full vs Incremental**: First calculation is always full (~40s), subsequent should be faster
3. **Database Performance**: Check database query performance
4. **Group Size**: Larger groups with more history take longer

### Records Status Stuck on "calculating"

1. **Check if process crashed**: Look for error logs
2. **Manual trigger**: After 1 hour, group creator can manually trigger
3. **Database check**: Verify `GroupRecords` table status
4. **Restart**: May need to restart the calculation

### Missing Records

1. **Check if calculation completed**: Verify status is "completed"
2. **Check data structure**: Ensure records JSON is valid
3. **Re-run calculation**: Manually trigger if needed

## Future Improvements

1. **Parallel Processing**: Run independent phases in parallel
2. **Caching**: Cache consecutive week calculations in ChartEntryStats
3. **Real-time Updates**: WebSocket updates for calculation progress
4. **More Records**: Additional interesting statistics
5. **Performance Monitoring**: Dashboard for calculation metrics

## Related Documentation

- [Performance Evaluation](./RECORDS_CALCULATION_PERFORMANCE_EVALUATION.md) - Initial performance analysis
- [Performance Update](./RECORDS_CALCULATION_PERFORMANCE_UPDATE.md) - Post-optimization results

