import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getGroupChartEntries } from '@/lib/group-queries'
import { GROUP_THEMES, type ThemeName } from '@/lib/group-themes'
import { formatWeekLabel } from '@/lib/weekly-utils'
import { getArtistImage } from '@/lib/lastfm'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get('weekStart')
    
    if (!weekStartParam) {
      return NextResponse.json({ error: 'weekStart parameter is required' }, { status: 400 })
    }

    // Parse date string as UTC (YYYY-MM-DD format)
    const [year, month, day] = weekStartParam.split('-').map(Number)
    const requestedWeekStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

    // Verify the week exists
    const weeklyStats = await prisma.groupWeeklyStats.findFirst({
      where: {
        groupId: group.id,
        weekStart: requestedWeekStart,
      },
      select: {
        weekStart: true,
      },
    })

    if (!weeklyStats) {
      return NextResponse.json({ error: 'No charts found for the specified week' }, { status: 404 })
    }

    // Use the exact weekStart from the database
    const normalizedWeekStart = new Date(weeklyStats.weekStart)
    normalizedWeekStart.setUTCHours(0, 0, 0, 0)

    // Get chart entries for artists (top 10)
    const chartEntries = await getGroupChartEntries(
      group.id,
      normalizedWeekStart,
      'artists'
    )

    if (chartEntries.length === 0) {
      return NextResponse.json({ error: 'No chart entries found' }, { status: 404 })
    }

    // Get top 10 entries
    const topEntries = chartEntries.slice(0, 10).map(entry => ({
      position: entry.position,
      name: entry.name,
      playcount: entry.playcount,
      vibeScore: entry.vibeScore,
    }))

    // Get theme colors
    const colorTheme = ((group as any).colorTheme || 'white') as ThemeName
    const themeColors = GROUP_THEMES[colorTheme]

    // Get chart mode
    const chartMode = (group.chartMode || 'plays_only') as string
    const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

    // Get artist image for #1 entry
    let topArtistImage: string | null = null
    if (topEntries.length > 0) {
      const apiKey = process.env.LASTFM_API_KEY || ''
      topArtistImage = await getArtistImage(topEntries[0].name, apiKey)
    }

    // Format week label
    const weekLabel = formatWeekLabel(normalizedWeekStart)

    // Generate HTML
    const html = generateChartHTML(
      group.name,
      weekLabel,
      topEntries,
      themeColors,
      showVS,
      topArtistImage
    )

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generating chart HTML template:', error)
    return NextResponse.json(
      { error: 'Failed to generate chart HTML template' },
      { status: 500 }
    )
  }
}

function generateChartHTML(
  groupName: string,
  weekLabel: string,
  entries: Array<{ position: number; name: string; playcount: number; vibeScore: number | null }>,
  themeColors: typeof GROUP_THEMES.white,
  showVS: boolean,
  topArtistImage: string | null
): string {
  const width = 1200
  const height = 1200
  const footerHeight = 45

  // Escape HTML
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // Convert RGB to RGBA (handles both rgb(234 179 8) and rgb(234, 179, 8) formats)
  const rgbToRgba = (rgb: string, alpha: number): string => {
    const match = rgb.match(/rgb\((\d+)\s+(\d+)\s+(\d+)\)/)
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`
    }
    // Fallback for comma-separated format
    const match2 = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match2) {
      return `rgba(${match2[1]}, ${match2[2]}, ${match2[3]}, ${alpha})`
    }
    return rgb
  }

  const headerTextColor = themeColors.buttonText === 'white' ? 'white' : themeColors.primaryDark

  // Generate entries HTML
  const entriesHTML = entries.map((entry, index) => {
    const isFirst = index === 0
    const fontSize = isFirst ? '40px' : '30px'
    const badgeSize = isFirst ? '70px' : '60px'
    const badgeFontSize = isFirst ? '28px' : '24px'
    const padding = isFirst ? '36px 0' : '28px 0'
    
    const value = showVS && entry.vibeScore !== null 
      ? entry.vibeScore.toFixed(2) 
      : entry.playcount.toString()
    const valueLabel = showVS && entry.vibeScore !== null ? 'VS' : 'Plays'
    const valueFontSize = isFirst ? '32px' : '26px'

    return `
      <div style="
        display: flex;
        align-items: center;
        padding: ${padding};
        border-bottom: ${index < entries.length - 1 ? `1px solid ${themeColors.border}30` : 'none'};
      ">
        <div style="
          width: ${badgeSize};
          height: ${badgeSize};
          border-radius: 50%;
          background: ${themeColors.primary};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: ${badgeFontSize};
          color: ${headerTextColor};
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 3px ${themeColors.primaryLight}50;
        ">${entry.position}</div>
        <div style="flex: 1; margin-left: 32px; min-width: 0;">
          <div style="
            font-size: ${fontSize};
            font-weight: bold;
            color: ${themeColors.primaryDark};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            letter-spacing: ${isFirst ? '-1px' : '-0.6px'};
            line-height: 1.2;
          ">${escapeHtml(entry.name)}</div>
        </div>
        <div style="text-align: right; margin-left: 32px; flex-shrink: 0;">
          <div style="
            font-size: ${valueFontSize};
            font-weight: bold;
            color: ${themeColors.primaryDark};
            margin-bottom: 6px;
          ">${value}</div>
          <div style="
            font-size: ${isFirst ? '18px' : '16px'};
            color: ${themeColors.text};
            font-weight: 500;
          ">${valueLabel}</div>
        </div>
      </div>
    `
  }).join('')

  // Top artist image section
  const topArtistSection = topArtistImage && entries.length > 0 ? `
    <div style="
      position: absolute;
      top: 80px;
      right: 50px;
      width: 240px;
      height: 240px;
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3), 0 0 0 4px ${themeColors.primary}50;
      border: 4px solid ${themeColors.primary};
      background: ${themeColors.primaryLighter};
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    ">
      <img 
        src="${escapeHtml(topArtistImage)}" 
        alt="${escapeHtml(entries[0].name)}"
        style="width: 100%; height: 100%; object-fit: cover;"
        onerror="this.style.display='none'; this.parentElement.style.background='${themeColors.primaryLighter}';"
      />
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chart Export</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: ${width}px;
      height: ${height}px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      overflow: hidden;
      background: 
        radial-gradient(circle at 20% 30%, ${rgbToRgba(themeColors.primaryLighter, 0.4)}, transparent 50%),
        radial-gradient(circle at 80% 70%, ${rgbToRgba(themeColors.primaryLight, 0.3)}, transparent 50%),
        linear-gradient(135deg, ${themeColors.backgroundFrom} 0%, ${rgbToRgba(themeColors.primaryLighter, 0.2)} 25%, ${themeColors.backgroundTo} 50%, ${rgbToRgba(themeColors.primaryLighter, 0.15)} 75%, ${themeColors.backgroundFrom} 100%);
      position: relative;
    }
    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  </style>
</head>
<body>
  <!-- Content Area -->
  <div style="
    position: relative;
    height: ${height - footerHeight}px;
    overflow: hidden;
    padding: 60px 50px 40px 50px;
  ">
    ${topArtistSection}
    
    <!-- Title with Gradient Text -->
    <div style="
      margin-bottom: 60px;
      padding-bottom: 0.1em;
    ">
      <h1 style="
        font-size: 80px;
        font-weight: bold;
        line-height: 1.2;
        background-image: linear-gradient(to right, ${themeColors.primaryDarker}, ${themeColors.primary}, ${themeColors.primaryLight});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 20px;
        overflow: visible;
        letter-spacing: -2px;
      ">${escapeHtml(groupName)}</h1>
      <div style="
        font-size: 36px;
        color: ${themeColors.text};
        font-weight: 600;
        margin-bottom: 12px;
      ">Top Artists</div>
      <div style="
        font-size: 24px;
        color: ${themeColors.text};
        opacity: 0.85;
        font-weight: 500;
      ">Week of ${escapeHtml(weekLabel)}</div>
    </div>
    
    <!-- Chart Entries (no bubble/card, displayed over gradient) -->
    <div style="
      margin-right: ${topArtistImage ? '300px' : '0'};
    ">
      ${entriesHTML}
    </div>
  </div>

  <!-- Footer -->
  <div style="
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: ${footerHeight}px;
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
  ">
    <div style="
      width: 120px;
      height: 35px;
      display: flex;
      align-items: center;
    ">
      <img 
        src="/logo-transparent.png" 
        alt="ChartsFM"
        style="max-width: 100%; max-height: 100%; object-fit: contain;"
        onerror="this.style.display='none'"
      />
    </div>
    <div style="
      color: white;
      font-size: 14px;
      font-weight: 500;
    ">Create yours on chartsfm.greatwhiteshark.dev</div>
  </div>
</body>
</html>`
}
