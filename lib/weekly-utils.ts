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

