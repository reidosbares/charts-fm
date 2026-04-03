// Utilities for weekly date calculations (Sunday to Sunday, UTC)

/**
 * Get the start of a week (Sunday 00:00:00 UTC) for a given date
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = d.getUTCDay()
  
  // Subtract days to get to Sunday
  d.setUTCDate(d.getUTCDate() - dayOfWeek)
  
  return d
}

/**
 * Get the end of a week (next Sunday 00:00:00 UTC) for a given date
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const weekStart = getWeekStart(date)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)
  return weekEnd
}

/**
 * Get the start date for N weeks ago
 */
export function getWeekStartNWeeksAgo(weeksAgo: number): Date {
  const weekStart = getWeekStart()
  const targetDate = new Date(weekStart)
  targetDate.setUTCDate(targetDate.getUTCDate() - (weeksAgo * 7))
  return targetDate
}

/**
 * Get an array of week start dates for the last N weeks
 */
export function getLastNWeeks(n: number): Date[] {
  const weeks: Date[] = []
  for (let i = 0; i < n; i++) {
    weeks.push(getWeekStartNWeeksAgo(i))
  }
  return weeks
}

/**
 * Get an array of week start dates for the last N finished weeks
 * Excludes the current week (which is still in progress)
 */
export function getLastNFinishedWeeks(n: number): Date[] {
  const weeks: Date[] = []
  // Start from 1 week ago (skip current week, which is 0)
  for (let i = 1; i <= n; i++) {
    weeks.push(getWeekStartNWeeksAgo(i))
  }
  return weeks
}

/**
 * Format a date as YYYY-MM-DD for display
 */
export function formatWeekDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Convert a UTC date to a local date representing the same calendar day
 * This is useful for calendar components that expect local dates
 */
export function utcToLocalDate(utcDate: Date): Date {
  const year = utcDate.getUTCFullYear()
  const month = utcDate.getUTCMonth()
  const day = utcDate.getUTCDate()
  return new Date(year, month, day)
}

/**
 * Format a date as "Month Day, Year" (e.g., "Dec 30, 2025")
 * Uses UTC date components to avoid timezone issues
 */
export function formatWeekLabel(date: Date): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = monthNames[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  return `${month} ${day}, ${year}`
}

/**
 * Get the start of a week for a specific day of week (00:00:00 UTC)
 * @param date - The date to calculate the week start for
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export function getWeekStartForDay(date: Date = new Date(), dayOfWeek: number): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  
  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const currentDayOfWeek = d.getUTCDay()
  
  // Calculate days to subtract to get to the target day of week
  let daysToSubtract = currentDayOfWeek - dayOfWeek
  if (daysToSubtract < 0) {
    daysToSubtract += 7
  }
  
  d.setUTCDate(d.getUTCDate() - daysToSubtract)
  
  return d
}

/**
 * Get the end of a week for a specific day of week (next week start, 00:00:00 UTC)
 * @param date - The date to calculate the week end for
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export function getWeekEndForDay(date: Date = new Date(), dayOfWeek: number): Date {
  const weekStart = getWeekStartForDay(date, dayOfWeek)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)
  return weekEnd
}

/**
 * Get the start date for N weeks ago for a specific tracking day
 * @param weeksAgo - Number of weeks ago
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export function getWeekStartNWeeksAgoForDay(weeksAgo: number, dayOfWeek: number): Date {
  const weekStart = getWeekStartForDay(new Date(), dayOfWeek)
  const targetDate = new Date(weekStart)
  targetDate.setUTCDate(targetDate.getUTCDate() - (weeksAgo * 7))
  return targetDate
}

/**
 * Get an array of week start dates for the last N finished weeks for a specific tracking day
 * Excludes the current week (which is still in progress)
 * @param n - Number of weeks to get
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export function getLastNFinishedWeeksForDay(n: number, dayOfWeek: number): Date[] {
  const weeks: Date[] = []
  // Start from 1 week ago (skip current week, which is 0)
  for (let i = 1; i <= n; i++) {
    weeks.push(getWeekStartNWeeksAgoForDay(i, dayOfWeek))
  }
  return weeks
}

// ── Chart week label (day charts are associated with / generated) ─────────────
// Stored `weekStart` is the first day of the tracking window (UTC midnight).
// We refer to that chart week by the following calendar day: the day after the
// last day of tracking — i.e. weekStart + 7 days UTC.

/**
 * Calendar day (UTC midnight) used as the public "chart week" label and in ?week= URLs.
 */
export function getChartWeekReferenceDate(weekStart: Date): Date {
  const d = new Date(weekStart)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + 7)
  return d
}

/** Inverse of getChartWeekReferenceDate (for parsing ?week=). */
export function weekStartFromChartReferenceDate(chartReferenceDate: Date): Date {
  const d = new Date(chartReferenceDate)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - 7)
  return d
}

/** YYYY-MM-DD for URLs and keys — chart reference day, not tracking start. */
export function formatChartWeekDate(weekStart: Date): string {
  return formatWeekDate(getChartWeekReferenceDate(weekStart))
}

/** Short label e.g. "Jan 3, 2026" (UTC) for the chart reference day. */
export function formatChartWeekLabel(weekStart: Date): string {
  return formatWeekLabel(getChartWeekReferenceDate(weekStart))
}

const WRITTEN_MONTH_NAMES = [
  'Jan.',
  'Feb.',
  'Mar.',
  'Apr.',
  'May',
  'Jun.',
  'Jul.',
  'Aug.',
  'Sep.',
  'Oct.',
  'Nov.',
  'Dec.',
] as const

/** "Jan. 3, 2026" style (UTC) — chart reference day. */
export function formatChartWeekDateWritten(weekStart: Date): string {
  const d = getChartWeekReferenceDate(weekStart)
  const month = WRITTEN_MONTH_NAMES[d.getUTCMonth()]
  const day = d.getUTCDate()
  const year = d.getUTCFullYear()
  return `${month} ${day}, ${year}`
}

/**
 * Resolve `?week=` value to stored tracking weekStart.
 * New URLs use chart reference day; legacy URLs used tracking week start.
 */
export function weekStartFromWeekQueryParam(
  param: string,
  availableTrackingWeekStarts: Date[]
): Date {
  if (availableTrackingWeekStarts.length === 0) {
    return new Date()
  }

  const normalize = (dt: Date) => {
    const x = new Date(dt)
    x.setUTCHours(0, 0, 0, 0)
    return x
  }

  const availableSet = new Set(
    availableTrackingWeekStarts.map((w) => formatWeekDate(normalize(w)))
  )

  const parts = param.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return normalize(availableTrackingWeekStarts[0])
  }

  const [y, m, day] = parts
  const parsed = new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0))

  const fromChart = weekStartFromChartReferenceDate(parsed)
  if (availableSet.has(formatWeekDate(fromChart))) {
    return fromChart
  }

  if (availableSet.has(formatWeekDate(parsed))) {
    return parsed
  }

  return normalize(availableTrackingWeekStarts[0])
}

