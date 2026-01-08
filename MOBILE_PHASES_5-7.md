# Mobile Responsiveness Plan - Phases 5-7

## Phase 5: Trends Page

### Files to Update:

1. **app/[locale]/groups/[id]/trends/page.tsx**
   - Update padding: `px-4 md:px-6 lg:px-12 xl:px-24` (mobile-first)
   - Ensure error states are responsive

2. **app/[locale]/groups/[id]/trends/TrendsClient.tsx**
   - Make headings responsive (`text-2xl md:text-3xl`)
   - Reduce padding on cards and containers (`p-4 md:p-6`)
   - Make stat cards responsive
   - Ensure tabs work well with LiquidGlassTabs mobile optimization
   - Make entry lists responsive (new entries, climbers, fallers, exits)
   - Make fun facts section responsive
   - Ensure member spotlight sections are mobile-friendly
   - Make grids responsive (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
   - Reduce gaps on mobile (`gap-3 md:gap-4`)

3. **components/groups/GroupPageHero.tsx** (shared component)
   - Make breadcrumb text responsive (`text-xs md:text-sm`)
   - Make group icon responsive (`w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12`)
   - Make heading responsive (`text-xl md:text-2xl`)
   - Make subheader text responsive (`text-xs md:text-sm`)
   - Reduce padding on mobile (`p-3 md:p-4`)
   - Ensure action button is touch-friendly

### Key Components in TrendsClient:
- Quick stats cards
- Category tabs (Members, Artists, Tracks, Albums)
- New entries lists
- Biggest climbers/fallers
- Exits
- Fun facts
- Member spotlights

---

## Phase 6: Records Page

### Files to Update:

1. **app/[locale]/groups/[id]/records/page.tsx**
   - Update padding: `px-4 md:px-6 lg:px-12 xl:px-24` (mobile-first)
   - Ensure error states are responsive

2. **app/[locale]/groups/[id]/records/RecordsClient.tsx**
   - Make headings responsive (`text-2xl md:text-3xl`)
   - Reduce padding on containers (`p-4 md:p-6`)
   - Make preview section responsive (top records cards)
   - Ensure tabs work well with LiquidGlassTabs mobile optimization
   - Make record blocks responsive
   - Make user record cards responsive
   - Make chart record tables responsive (horizontal scroll if needed)
   - Make grids responsive (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
   - Reduce gaps on mobile (`gap-3 md:gap-4`)
   - Ensure image loading states are mobile-friendly

3. **components/records/RecordBlock.tsx**
   - Make record block responsive
   - Ensure text sizes are appropriate for mobile
   - Make links and buttons touch-friendly
   - Ensure images scale properly

4. **components/groups/GroupPageHero.tsx** (shared component - same as Phase 5)

### Key Components in RecordsClient:
- Preview section (top records)
- Tabs (Artists, Tracks, Albums, Users)
- Record blocks (chart records)
- User record cards
- Status indicators

---

## Phase 7: Drilldown Page (Deep Dive)

### Files to Update:

1. **app/[locale]/groups/[id]/charts/artist/[slug]/page.tsx**
   - Update padding: `px-4 md:px-6 lg:px-12 xl:px-24` (mobile-first)

2. **app/[locale]/groups/[id]/charts/track/[slug]/page.tsx**
   - Update padding: `px-4 md:px-6 lg:px-12 xl:px-24` (mobile-first)

3. **app/[locale]/groups/[id]/charts/album/[slug]/page.tsx**
   - Update padding: `px-4 md:px-6 lg:px-12 xl:px-24` (mobile-first)

4. **app/[locale]/groups/[id]/charts/[type]/[slug]/DeepDiveClient.tsx**
   - Make headings responsive
   - Reduce padding on containers (`p-4 md:p-6`)
   - Make stats cards responsive
   - Ensure chart history timeline is mobile-friendly
   - Make entry tables responsive (horizontal scroll if needed)
   - Make tabs work well with LiquidGlassTabs mobile optimization
   - Make grids responsive
   - Reduce gaps on mobile

5. **components/charts/DeepDiveHero.tsx**
   - Uses GroupPageHero (already covered in Phase 5)
   - Ensure action button is touch-friendly

6. **components/charts/ChartHistoryTimeline.tsx**
   - Make timeline responsive
   - Ensure position bubbles are touch-friendly
   - Make gap indicators readable on mobile
   - Ensure horizontal scrolling works if needed
   - Make tooltips mobile-friendly

7. **components/charts/EntryStatsTable.tsx** (already done in Phase 1)
   - Verify mobile responsiveness is working

8. **components/charts/ArtistEntriesTable.tsx** (already done in Phase 1)
   - Verify mobile responsiveness is working

9. **components/charts/DeepDiveHero.tsx**
   - Uses GroupPageHero component (covered in Phase 5)

### Key Components in DeepDiveClient:
- Entry stats table
- Chart history timeline
- Artist entries table (for tracks/albums)
- Tabs for different views
- Quick stats cards

---

## Implementation Notes:

### Common Patterns:
1. **Padding**: Use `px-4 md:px-6 lg:px-12 xl:px-24` for main containers
2. **Headings**: Use `text-2xl md:text-3xl` for main headings, `text-xl md:text-2xl` for subheadings
3. **Text**: Use `text-xs md:text-sm` for small text, `text-sm md:text-base` for body text
4. **Gaps**: Use `gap-3 md:gap-4` for grids and flex containers
5. **Cards**: Use `p-4 md:p-6` for card padding
6. **Icons**: Scale icons appropriately (`text-base md:text-lg` for icons)
7. **Buttons**: Ensure minimum 44x44px touch targets
8. **Tables**: Wrap in `overflow-x-auto` containers for horizontal scrolling

### Testing Checklist (applies to all phases):
- [ ] Page has appropriate padding on mobile
- [ ] All headings are readable and properly sized
- [ ] Cards and containers are properly sized
- [ ] Grids stack to 1 column on mobile
- [ ] Tables scroll horizontally if needed
- [ ] Touch targets are at least 44x44px
- [ ] No horizontal scrolling (except intentional table scroll)
- [ ] Text is readable without zooming
- [ ] Images scale appropriately
- [ ] Tabs work correctly with icon-only inactive tabs

