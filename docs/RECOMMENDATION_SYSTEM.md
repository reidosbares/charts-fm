# Group Recommendation & Compatibility Score System

This document explains the group recommendation system and compatibility score calculation that helps users discover groups that match their musical taste.

## Overview

The recommendation system matches users to groups based on their listening history, calculating a compatibility score (0-100) that indicates how well a user's music taste aligns with a group's collective taste.

**Key Features:**
- On-demand compatibility score calculation
- Three-stage optimization for efficient recommendations
- Caching system for performance
- Rejection system to hide unwanted recommendations
- Genre-based matching using Last.fm API

## Compatibility Score Components

The compatibility score is calculated from four components, each weighted differently:

### 1. Genre Overlap (45% weight) - Most Important

**How it works:**
- Fetches genres for user's top 30 artists and group's top 30 artists from Last.fm API
- Builds genre frequency vectors for both user and group
- Calculates cosine similarity between genre vectors
- Genres are cached for 30 days to minimize API calls

**Why it matters:**
- Genre preferences are more stable indicators of musical taste
- Two users can have different favorite artists but share genre preferences
- More forgiving than exact artist/track matching

**Example:**
- User listens to: Indie Rock, Alternative, Pop
- Group listens to: Indie Rock, Alternative, Folk
- High genre overlap despite different specific artists

### 2. Artist Overlap (25% weight)

**How it works:**
- Compares user's top artists (from recent 4-8 weeks) with group's all-time top artists
- Uses weighted Jaccard similarity
- Artists are weighted by their playcount rank (higher position = higher weight)
- Normalized artist names for matching

**Calculation:**
```
Weighted Jaccard = intersection(weighted sets) / union(weighted sets)
```

**Example:**
- User's top artists: Radiohead, The Beatles, Pink Floyd
- Group's top artists: Radiohead, The Beatles, Led Zeppelin
- 2 out of 3 artists match = high artist overlap

### 3. Track Overlap (20% weight) - With Non-Linear Transformation

**How it works:**
- Compares user's top tracks with group's all-time top tracks
- Uses weighted Jaccard similarity (same as artists)
- **Important:** Applies non-linear transformation to boost small overlaps

**Non-Linear Transformation:**
Track overlap uses a square root curve (exponent 0.6) to make small overlaps more valuable:

```
transformed = rawOverlap^0.6
```

**Why the transformation:**
- Exact track matches are rare (people listen to different tracks even if they like the same artists)
- Small track overlaps (0.1-0.3) are still meaningful and should contribute more
- Prevents low track overlap from dragging scores down too much

**Transformation Examples:**
- Raw overlap 0.1 → Transformed ~0.25 (boosted)
- Raw overlap 0.2 → Transformed ~0.35 (boosted)
- Raw overlap 0.5 → Transformed ~0.66 (moderate boost)
- Raw overlap 1.0 → Transformed 1.0 (unchanged)

### 4. Listening Patterns (10% weight)

**How it works:**
Combines three sub-factors:

1. **Diversity:** Ratio of unique artists/tracks to total listening
   - Higher diversity = more varied listening habits
   - Normalized to 0-1 scale

2. **Consistency:** Variance in weekly listening volume
   - Lower variance = more consistent listening
   - Measured as: `1 - (stdDev / avgPlays)`

3. **Recency:** Weighted average of recent weeks (exponential decay)
   - Recent weeks weighted more heavily
   - 30-day half-life for decay

**Final Pattern Score:**
```
patternScore = (diversity × 0.33) + (consistency × 0.33) + (recency × 0.34)
```

## Final Score Calculation

The final compatibility score (0-100) is calculated as:

```
score = (
  genreOverlap × 0.45 +
  artistOverlap × 0.25 +
  transformTrackOverlap(trackOverlap) × 0.20 +
  patternScore × 0.10
) × 100
```

**Score Interpretation:**
- **70-100%:** Excellent match - high compatibility
- **50-69%:** Good match - solid compatibility
- **30-49%:** Moderate match - some shared taste
- **0-29%:** Low match - limited overlap

## Recommendation System Architecture

### Three-Stage Optimization

To efficiently calculate recommendations without processing all groups, the system uses a three-stage approach:

#### Stage 1: Pre-Filtering (Fast)
Quick database queries to filter out:
- Private groups
- Groups user is already a member of
- Groups user has rejected
- Groups with fewer than 2-3 members
- Groups without stats (no weekly or all-time data)
- Groups created less than 1 week ago

**Result:** Reduces from potentially hundreds/thousands to a manageable set

#### Stage 2: Candidate Selection (Medium Speed)
Uses artist overlap as a quick filter:
- Gets user's top 20-30 artists from recent weeks
- Finds groups that have at least 1 overlapping artist in their all-time stats
- Uses database JSON queries for efficient filtering

**Result:** Further reduces to 20-50 candidate groups

#### Stage 3: Full Compatibility Calculation (Slower, but only for candidates)
- Calculates full compatibility scores only for filtered candidates
- Processes in batches (10 groups at a time) to show progress
- Caches all results in database

**Result:** Top 3-5 recommendations displayed to user

### Benefits of Three-Stage Approach

- **Performance:** Reduces calculation from hundreds to 20-50 groups
- **User Experience:** Typically 10-30 seconds instead of minutes
- **Efficiency:** Only expensive calculations for promising groups
- **Scalability:** Works even as the number of groups grows

## Caching Strategy

### Compatibility Score Caching

**Cache Duration:** 7 days

**When scores are cached:**
- After user-triggered calculation from dashboard
- After on-demand calculation for public group pages
- All calculated scores stored immediately in `GroupCompatibilityScore` table

**Cache Lookup:**
- Public group pages: Check cache first; if found and fresh (<7 days), use it
- Dashboard recommendations: Use cached scores if available
- Stale scores (>7 days) are recalculated on next request

### Genre Data Caching

**Cache Duration:** 30 days

**Storage:** Separate `ArtistGenre` table
- One genre fetch per artist benefits all users/groups
- Normalized artist names (lowercase) for matching
- Fetched on-demand during compatibility calculation
- Cached to avoid repeated Last.fm API calls

**Cache Strategy:**
- Always check cache first
- Only fetch from Last.fm if: artist not in cache OR `lastFetched` > 30 days
- Batch API calls with delays to respect rate limits

## User Experience

### Dashboard Recommendations

**"Groups You Might Like" Section:**
- User clicks "Find Groups You Might Like" button
- System calculates compatibility for candidate groups
- Shows loading state with progress indicator
- Displays top 3-5 groups with compatibility scores
- Each group card shows:
  - Group name, image, member count
  - Compatibility score (e.g., "85% Match")
  - "View Group" button
  - "Not Interested" button (rejects recommendation)

**Rejection System:**
- Users can reject recommendations they don't like
- Rejected groups are stored in `GroupRecommendationRejection` table
- Rejected groups are excluded from future recommendations
- Helps improve recommendation quality over time

### Public Group Pages

**Compatibility Score Badge:**
- Shows compatibility score for logged-in users who aren't members
- On-demand calculation: User clicks "Check Match" button
- If score exists and is fresh, shows immediately
- If missing or stale, calculates on button click
- Score badge shows percentage with color coding:
  - Green: 70%+ (excellent match)
  - Yellow: 50-69% (good match)
  - Gray: <50% (moderate/low match)

**Score Breakdown:**
- Click info icon to see detailed breakdown
- Shows individual component scores:
  - Artist Overlap percentage
  - Track Overlap percentage
  - Genre Overlap percentage
  - Listening Patterns percentage

## API Endpoints

### GET `/api/groups/[id]/compatibility`
**Purpose:** Check if compatibility score exists (without calculating)

**Response:**
```json
{
  "exists": true,
  "score": 85.5,
  "components": {
    "artistOverlap": 45.2,
    "trackOverlap": 12.8,
    "genreOverlap": 78.5,
    "patternScore": 65.0
  }
}
```

Or if no score exists:
```json
{
  "exists": false
}
```

### POST `/api/groups/[id]/compatibility`
**Purpose:** Calculate compatibility score on demand

**Response:**
```json
{
  "score": 85.5,
  "components": {
    "artistOverlap": 45.2,
    "trackOverlap": 12.8,
    "genreOverlap": 78.5,
    "patternScore": 65.0
  }
}
```

### POST `/api/dashboard/recommendations`
**Purpose:** Calculate and return group recommendations

**Response:**
```json
{
  "groups": [
    {
      "group": {
        "id": "...",
        "name": "Indie Rock Lovers",
        "image": "...",
        "colorTheme": "yellow",
        "creator": {...},
        "_count": { "members": 15 }
      },
      "score": 87.3,
      "components": {
        "artistOverlap": 52.1,
        "trackOverlap": 15.2,
        "genreOverlap": 82.5,
        "patternScore": 70.0
      }
    }
  ],
  "isCalculating": false,
  "progress": 1
}
```

### POST `/api/groups/recommendations/reject`
**Purpose:** Reject a group recommendation

**Request:**
```json
{
  "groupId": "..."
}
```

**Response:**
```json
{
  "success": true
}
```

## Database Schema

### GroupCompatibilityScore
Stores calculated compatibility scores:

```prisma
model GroupCompatibilityScore {
  id            String   @id @default(cuid())
  userId        String
  groupId       String
  score         Float    // 0-100 compatibility score
  artistOverlap Float    // Component score (0-100)
  trackOverlap  Float    // Component score (0-100)
  genreOverlap  Float    // Component score (0-100)
  patternScore  Float    // Component score (0-100)
  lastCalculated DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([userId, groupId])
  @@index([userId, score])
  @@index([groupId])
}
```

### GroupRecommendationRejection
Tracks rejected recommendations:

```prisma
model GroupRecommendationRejection {
  id        String   @id @default(cuid())
  userId    String
  groupId   String
  createdAt DateTime @default(now())
  
  @@unique([userId, groupId])
  @@index([userId])
}
```

### ArtistGenre
Caches genre data from Last.fm:

```prisma
model ArtistGenre {
  id          String   @id @default(cuid())
  artistName  String   @unique // Normalized: toLowerCase()
  genres      Json     // Array of genre strings from Last.fm
  lastFetched DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([artistName])
}
```

## Performance Considerations

### Last.fm API Rate Limits
- Genre data cached aggressively (30 days)
- Batch API calls with 200ms delays between requests
- Cache-first strategy minimizes API calls

### Database Indexes
- `GroupCompatibilityScore`: Indexed on `userId` and `score` for fast queries
- `GroupRecommendationRejection`: Indexed on `userId` for quick filtering
- `ArtistGenre`: Indexed on `artistName` for fast lookups

### Calculation Optimization
- Three-stage filtering reduces candidate set dramatically
- Batch processing (10 groups at a time) prevents timeouts
- Caching prevents redundant calculations

## Future Enhancements

Potential improvements (not currently implemented):

- **Machine Learning Model:** Train a model on user behavior to improve predictions
- **Collaborative Filtering:** Use "users with similar tastes" to find groups
- **Time-Based Recommendations:** Show trending or newly active groups
- **Personalized Explanations:** Explain why a group was recommended
- **A/B Testing:** Test different weight combinations to optimize scores
- **Artist Similarity:** Use Last.fm's artist similarity API for better matching

## Code References

- Compatibility Calculation: `lib/group-compatibility.ts`
- Genre Fetching: `lib/artist-genres.ts`
- Candidate Selection: `lib/group-compatibility-candidates.ts`
- Pre-Filtering: `lib/group-compatibility-filters.ts`
- API Endpoints: `app/api/groups/[id]/compatibility/route.ts`, `app/api/dashboard/recommendations/route.ts`
- UI Components: `components/dashboard/GroupsYouMightLike.tsx`, `app/groups/[id]/public/CompatibilityScore.tsx`

## Related Documentation

- [Vibe Score System](./VIBE_SCORE_SYSTEM.md) - How group charts are calculated
- [Signup Implementation](./SIGNUP_IMPLEMENTATION.md) - Last.fm authentication flow

