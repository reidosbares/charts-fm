// SVG generation utilities for chart image exports

import fs from 'fs'
import path from 'path'
import { ThemeColors } from './group-themes'
import { formatWeekLabel } from './weekly-utils'

export type ChartType = 'artists' | 'tracks' | 'albums'

interface ChartEntry {
  position: number
  name: string
  artist?: string | null
  playcount: number
  vibeScore: number | null
}

/**
 * Load logo from public directory and convert to base64 data URI
 */
export function loadLogoAsBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-transparent.png')
    const fileData = fs.readFileSync(logoPath)
    const base64String = Buffer.from(fileData).toString('base64')
    return `data:image/png;base64,${base64String}`
  } catch (error) {
    console.error('Error loading logo:', error)
    // Return empty string if logo can't be loaded
    return ''
  }
}

/**
 * Escape XML/SVG special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Truncate text to fit within a maximum width
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Generate SVG for a single chart type
 */
export function generateChartSVG(
  entries: ChartEntry[],
  groupName: string,
  weekStart: Date,
  chartType: ChartType,
  chartMode: string,
  themeColors: ThemeColors,
  logoBase64: string
): string {
  const width = 1200
  const height = 1200
  const footerHeight = 45
  const contentHeight = height - footerHeight
  
  const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'
  const weekLabel = formatWeekLabel(weekStart)
  
  // Chart type labels
  const chartTypeLabels: Record<ChartType, string> = {
    artists: 'Top Artists',
    tracks: 'Top Tracks',
    albums: 'Top Albums',
  }
  
  const chartTypeLabel = chartTypeLabels[chartType]
  
  // Header styling
  const headerHeight = 120
  const headerBg = themeColors.primary
  const headerTextColor = themeColors.buttonText === 'white' ? 'white' : themeColors.primaryDark
  
  // Table styling
  const tableTop = headerHeight + 40
  const rowHeight = 60
  const maxRows = 10
  const tableHeight = Math.min(entries.length, maxRows) * rowHeight
  
  // Position badge styling
  const badgeRadius = 18
  const badgeColor = themeColors.primary
  const badgeTextColor = themeColors.buttonText === 'white' ? 'white' : themeColors.primaryDark
  
  // Generate table rows
  const topEntries = entries.slice(0, maxRows)
  const rows = topEntries.map((entry, index) => {
    const y = tableTop + index * rowHeight
    const isEven = index % 2 === 0
    const rowBg = isEven ? 'white' : themeColors.primaryLighter
    
    const value = showVS && entry.vibeScore !== null 
      ? entry.vibeScore.toFixed(2) 
      : entry.playcount.toString()
    const valueLabel = showVS && entry.vibeScore !== null ? 'VS' : 'Plays'
    
    const nameText = escapeXml(truncateText(entry.name, 40))
    const artistText = entry.artist ? escapeXml(truncateText(entry.artist, 30)) : ''
    
    return `
      <rect x="0" y="${y}" width="${width}" height="${rowHeight}" fill="${rowBg}"/>
      <circle cx="${badgeRadius + 30}" cy="${y + rowHeight / 2}" r="${badgeRadius}" fill="${badgeColor}"/>
      <text x="${badgeRadius + 30}" y="${y + rowHeight / 2 + 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="${badgeTextColor}">${entry.position}</text>
      <text x="${badgeRadius * 2 + 60}" y="${y + rowHeight / 2 - 8}" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${themeColors.primaryDark}">${nameText}</text>
      ${entry.artist ? `<text x="${badgeRadius * 2 + 60}" y="${y + rowHeight / 2 + 18}" font-family="Arial, sans-serif" font-size="16" fill="${themeColors.text}">${artistText}</text>` : ''}
      <text x="${width - 150}" y="${y + rowHeight / 2 - 8}" text-anchor="end" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="${themeColors.primaryDark}">${value}</text>
      <text x="${width - 150}" y="${y + rowHeight / 2 + 18}" text-anchor="end" font-family="Arial, sans-serif" font-size="14" fill="${themeColors.text}">${valueLabel}</text>
      <line x1="0" y1="${y + rowHeight}" x2="${width}" y2="${y + rowHeight}" stroke="${themeColors.border}" stroke-width="1"/>
    `
  }).join('')
  
  // Footer bar
  const footerY = height - footerHeight
  const logoHeight = 35
  const logoAspectRatio = 180 / 60 // Original logo dimensions
  const logoWidth = logoHeight * logoAspectRatio
  const logoX = 20
  const logoY = footerY + (footerHeight - logoHeight) / 2
  
  const footerText = 'Create yours on chartsfm.greatwhiteshark.dev'
  const footerTextX = width - 20
  const footerTextY = footerY + footerHeight / 2 + 6
  
  const footerBar = `
    <rect x="0" y="${footerY}" width="${width}" height="${footerHeight}" fill="#000000"/>
    ${logoBase64 ? `<image href="${logoBase64}" x="${logoX}" y="${logoY}" width="${logoWidth}" height="${logoHeight}"/>` : ''}
    <text x="${footerTextX}" y="${footerTextY}" text-anchor="end" font-family="Arial, sans-serif" font-size="14" fill="white">${escapeXml(footerText)}</text>
  `
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${themeColors.backgroundFrom};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${themeColors.backgroundTo};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${contentHeight}" fill="url(#bgGradient)"/>
  
  <!-- Header -->
  <rect x="0" y="0" width="${width}" height="${headerHeight}" fill="${headerBg}"/>
  <text x="${width / 2}" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="${headerTextColor}">${escapeXml(groupName)}</text>
  <text x="${width / 2}" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="${headerTextColor}">${chartTypeLabel}</text>
  <text x="${width / 2}" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="${headerTextColor}">Week of ${escapeXml(weekLabel)}</text>
  
  <!-- Table -->
  ${rows}
  
  <!-- Footer Bar -->
  ${footerBar}
</svg>`
}

/**
 * Generate SVG for combined charts (all three chart types)
 */
export function generateCombinedChartSVG(
  artists: ChartEntry[],
  tracks: ChartEntry[],
  albums: ChartEntry[],
  groupName: string,
  weekStart: Date,
  chartMode: string,
  themeColors: ThemeColors,
  logoBase64: string
): string {
  const width = 1200
  const height = 1800
  const footerHeight = 45
  const contentHeight = height - footerHeight
  
  const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'
  const weekLabel = formatWeekLabel(weekStart)
  
  // Header styling
  const headerHeight = 100
  const headerBg = themeColors.primary
  const headerTextColor = themeColors.buttonText === 'white' ? 'white' : themeColors.primaryDark
  
  // Section styling
  const sectionSpacing = 20
  const sectionHeaderHeight = 50
  const rowHeight = 50
  const maxRowsPerSection = 10
  
  // Position badge styling
  const badgeRadius = 15
  const badgeColor = themeColors.primary
  const badgeTextColor = themeColors.buttonText === 'white' ? 'white' : themeColors.primaryDark
  
  let currentY = headerHeight + 30
  
  // Helper function to generate section
  const generateSection = (entries: ChartEntry[], title: string): string => {
    const sectionStartY = currentY
    const topEntries = entries.slice(0, maxRowsPerSection)
    const sectionHeight = sectionHeaderHeight + (topEntries.length * rowHeight)
    
    // Section header
    const sectionHeader = `
      <rect x="0" y="${sectionStartY}" width="${width}" height="${sectionHeaderHeight}" fill="${themeColors.primaryLight}"/>
      <text x="30" y="${sectionStartY + 35}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${headerTextColor}">${escapeXml(title)}</text>
    `
    
    // Section rows
    const sectionRows = topEntries.map((entry, index) => {
      const y = sectionStartY + sectionHeaderHeight + index * rowHeight
      const isEven = index % 2 === 0
      const rowBg = isEven ? 'white' : themeColors.primaryLighter
      
      const value = showVS && entry.vibeScore !== null 
        ? entry.vibeScore.toFixed(2) 
        : entry.playcount.toString()
      const valueLabel = showVS && entry.vibeScore !== null ? 'VS' : 'Plays'
      
      const nameText = escapeXml(truncateText(entry.name, 35))
      const artistText = entry.artist ? escapeXml(truncateText(entry.artist, 25)) : ''
      
      return `
        <rect x="0" y="${y}" width="${width}" height="${rowHeight}" fill="${rowBg}"/>
        <circle cx="${badgeRadius + 25}" cy="${y + rowHeight / 2}" r="${badgeRadius}" fill="${badgeColor}"/>
        <text x="${badgeRadius + 25}" y="${y + rowHeight / 2 + 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${badgeTextColor}">${entry.position}</text>
        <text x="${badgeRadius * 2 + 50}" y="${y + rowHeight / 2 - 6}" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="${themeColors.primaryDark}">${nameText}</text>
        ${entry.artist ? `<text x="${badgeRadius * 2 + 50}" y="${y + rowHeight / 2 + 14}" font-family="Arial, sans-serif" font-size="14" fill="${themeColors.text}">${artistText}</text>` : ''}
        <text x="${width - 120}" y="${y + rowHeight / 2 - 6}" text-anchor="end" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${themeColors.primaryDark}">${value}</text>
        <text x="${width - 120}" y="${y + rowHeight / 2 + 14}" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="${themeColors.text}">${valueLabel}</text>
        <line x1="0" y1="${y + rowHeight}" x2="${width}" y2="${y + rowHeight}" stroke="${themeColors.border}" stroke-width="1"/>
      `
    }).join('')
    
    currentY += sectionHeight + sectionSpacing
    
    return sectionHeader + sectionRows
  }
  
  // Generate all sections
  const artistsSection = generateSection(artists, 'Top Artists')
  const tracksSection = generateSection(tracks, 'Top Tracks')
  const albumsSection = generateSection(albums, 'Top Albums')
  
  // Footer bar
  const footerY = height - footerHeight
  const logoHeight = 35
  const logoAspectRatio = 180 / 60
  const logoWidth = logoHeight * logoAspectRatio
  const logoX = 20
  const logoY = footerY + (footerHeight - logoHeight) / 2
  
  const footerText = 'Create yours on chartsfm.greatwhiteshark.dev'
  const footerTextX = width - 20
  const footerTextY = footerY + footerHeight / 2 + 6
  
  const footerBar = `
    <rect x="0" y="${footerY}" width="${width}" height="${footerHeight}" fill="#000000"/>
    ${logoBase64 ? `<image href="${logoBase64}" x="${logoX}" y="${logoY}" width="${logoWidth}" height="${logoHeight}"/>` : ''}
    <text x="${footerTextX}" y="${footerTextY}" text-anchor="end" font-family="Arial, sans-serif" font-size="14" fill="white">${escapeXml(footerText)}</text>
  `
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${themeColors.backgroundFrom};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${themeColors.backgroundTo};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${contentHeight}" fill="url(#bgGradient)"/>
  
  <!-- Header -->
  <rect x="0" y="0" width="${width}" height="${headerHeight}" fill="${headerBg}"/>
  <text x="${width / 2}" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${headerTextColor}">${escapeXml(groupName)}</text>
  <text x="${width / 2}" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${headerTextColor}">Week of ${escapeXml(weekLabel)}</text>
  
  <!-- Charts Sections -->
  ${artistsSection}
  ${tracksSection}
  ${albumsSection}
  
  <!-- Footer Bar -->
  ${footerBar}
</svg>`
}
