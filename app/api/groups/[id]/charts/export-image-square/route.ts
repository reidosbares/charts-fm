import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getGroupChartEntries } from '@/lib/group-queries'
import { GROUP_THEMES, type ThemeName } from '@/lib/group-themes'
import { formatWeekLabel } from '@/lib/weekly-utils'
import { getArtistImage, getAlbumImage } from '@/lib/lastfm'
import fs from 'fs'
import path from 'path'

// Chart HTML template configuration for square format
interface SquareChartHTMLConfig {
  groupName: string
  weekLabel: string
  entries: Array<{ position: number; name: string; playcount: number; vibeScore: number | null; artist?: string | null }>
  themeColors: typeof GROUP_THEMES.white
  showVS: boolean
  itemImages: Array<{ name: string; imageBase64: string | null }>
  logoBase64: string
  overlayType: 'position' | 'plays' | 'vs' | 'none'
  showName: boolean
  gridSize: '3x3' | '4x3' | '5x3'
}

// Generate HTML template for square chart export (1800x1800)
async function generateSquareChartHTML(config: SquareChartHTMLConfig): Promise<string> {
  const {
    groupName,
    weekLabel,
    entries,
    themeColors,
    showVS,
    itemImages,
    logoBase64,
    overlayType,
    showName,
    gridSize,
  } = config

  const width = 1800
  const height = 1800
  const headerHeight = 60
  const footerHeight = 50

  // Escape HTML
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // Parse grid size
  const [gridCols, gridRows] = gridSize.split('x').map(Number)
  const totalItems = gridCols * gridRows
  
  const availableWidth = width
  const availableHeight = height - headerHeight - footerHeight
  
  // Calculate image size to fill available space
  const imageWidth = availableWidth / gridCols
  const imageHeight = availableHeight / gridRows

  // Generate image grid HTML
  const imagesHTML = entries.slice(0, totalItems).map((entry, index) => {
    const row = Math.floor(index / gridCols)
    const col = index % gridCols
    const x = col * imageWidth
    const y = headerHeight + (row * imageHeight)

    const image = itemImages[index]
    const imageBase64 = image?.imageBase64 || null
    const hasImage = imageBase64 !== null

    // Determine overlay value based on overlayType
    let overlayValue = ''
    let showOverlay = overlayType !== 'none'
    
    if (overlayType === 'position') {
      overlayValue = `#${entry.position}`
    } else if (overlayType === 'plays') {
      overlayValue = `${entry.playcount} plays`
    } else if (overlayType === 'vs') {
      if (showVS && entry.vibeScore !== null) {
        overlayValue = `${entry.vibeScore.toFixed(2)} VS`
      } else {
        overlayValue = `${entry.playcount} plays` // Fallback to plays if no VS
      }
    }

    return `
      <div style="
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: ${imageWidth}px;
        height: ${imageHeight}px;
        overflow: hidden;
      ">
        ${hasImage ? `
          <img 
            src="${escapeHtml(imageBase64)}" 
            alt="${escapeHtml(entry.name)}"
            style="width: 100%; height: 100%; object-fit: cover;"
          />
        ` : `
          <div style="
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, ${themeColors.primaryLighter} 0%, ${themeColors.primaryLight} 100%);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              font-size: ${imageWidth * 0.1}px;
              font-weight: bold;
              color: ${themeColors.primaryDark};
              opacity: 0.6;
              text-align: center;
              padding: 20px;
            ">${escapeHtml(entry.name)}</div>
          </div>
        `}
        ${showName ? `
        <!-- Item Name (top left) -->
        <div style="
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: ${imageWidth * 0.035}px;
          font-weight: 500;
          color: white;
          text-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.9),
            0 1px 1px rgba(0, 0, 0, 0.8),
            0 0 2px rgba(0, 0, 0, 0.7);
          max-width: 70%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.2;
        ">${escapeHtml(entry.name)}</div>
        ` : ''}
        
        ${showOverlay ? `
        <!-- Overlay Number (top right) -->
        <div style="
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: ${imageWidth * 0.035}px;
          font-weight: bold;
          color: white;
          text-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.9),
            0 1px 1px rgba(0, 0, 0, 0.8),
            0 0 2px rgba(0, 0, 0, 0.7);
          letter-spacing: 0.5px;
        ">${escapeHtml(overlayValue)}</div>
        ` : ''}
      </div>
    `
  }).join('')

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
      background: #000000;
      position: relative;
    }
  </style>
</head>
<body>
  <!-- Header Bar -->
  <div style="
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${headerHeight}px;
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
    z-index: 10;
  ">
    <div style="
      font-size: 32px;
      font-weight: bold;
      color: ${themeColors.primary};
    ">${escapeHtml(groupName)}</div>
    <div style="
      font-size: 32px;
      font-weight: bold;
      color: ${themeColors.primary};
    ">Week of ${escapeHtml(weekLabel)}</div>
  </div>
  
  <!-- Image Grid -->
  <div style="
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  ">
    ${imagesHTML}
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
    z-index: 10;
  ">
    <div style="
      width: 160px;
      height: 30px;
      display: flex;
      align-items: center;
      overflow: hidden;
    ">
      <img 
        src="${logoBase64}" 
        alt="ChartsFM"
        style="width: 140px; height: 50px; object-fit: cover; object-position: center;"
        onerror="this.style.display='none'"
      />
    </div>
    <div style="
      color: white;
      font-size: 16px;
      font-weight: bold;
    ">Create yours on chartsfm.greatwhiteshark.dev</div>
  </div>
</body>
</html>`
}

function loadLogoAsBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-transparent.png')
    const fileData = fs.readFileSync(logoPath)
    const base64String = Buffer.from(fileData).toString('base64')
    return `data:image/png;base64,${base64String}`
  } catch (error) {
    console.error('Error loading logo:', error)
    return ''
  }
}

// Helper function to convert image URL to base64
async function convertImageToBase64(imageUrl: string): Promise<string | null> {
  try {
    let imageBuffer: Buffer
    let contentType: string
    
    // Check if it's a relative path (local file)
    if (imageUrl.startsWith('/uploads/')) {
      console.log('Reading image from local filesystem...')
      const filePath = path.join(process.cwd(), 'public', imageUrl)
      
      if (fs.existsSync(filePath)) {
        imageBuffer = fs.readFileSync(filePath)
        // Determine content type from file extension
        const ext = path.extname(filePath).toLowerCase()
        contentType = ext === '.png' ? 'image/png' 
          : ext === '.webp' ? 'image/webp'
          : ext === '.gif' ? 'image/gif'
          : 'image/jpeg'
        console.log('Image read from filesystem, size:', imageBuffer.length, 'content-type:', contentType)
      } else {
        console.error('Image file not found at path:', filePath)
        return null
      }
    } else {
      // It's an absolute URL, fetch it
      console.log('Fetching image from URL...')
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChartsFM/1.0)',
        },
      })
      
      if (!imageResponse.ok) {
        console.error(`Image fetch failed with status: ${imageResponse.status}`)
        return null
      }
      
      const arrayBuffer = await imageResponse.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
      contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
      console.log('Image fetched from URL, size:', imageBuffer.length, 'content-type:', contentType)
    }
    
    // Convert to base64
    const base64String = imageBuffer.toString('base64')
    return `data:${contentType};base64,${base64String}`
  } catch (error) {
    console.error('Error converting image to base64:', error)
    return null
  }
}

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
    const chartTypeParam = searchParams.get('chartType') || 'artists'
    const overlayTypeParam = searchParams.get('overlayType') || 'position'
    const showNameParam = searchParams.get('showName')
    const showName = showNameParam !== null ? showNameParam === 'true' : true // Default to true
    const gridSizeParam = searchParams.get('gridSize') || '4x3'
    
    // Validate grid size
    const validGridSizes: Array<'3x3' | '4x3' | '5x3'> = ['3x3', '4x3', '5x3']
    if (!validGridSizes.includes(gridSizeParam as any)) {
      return NextResponse.json({ error: 'Invalid gridSize. Must be one of: 3x3, 4x3, 5x3' }, { status: 400 })
    }
    const gridSize = gridSizeParam as '3x3' | '4x3' | '5x3'
    
    // Validate grid size against chart size
    const chartSize = (group as any).chartSize || 20
    if (chartSize === 10 && gridSize !== '3x3') {
      return NextResponse.json({ error: 'Only 3x3 grid is available for Top 10 charts' }, { status: 400 })
    }
    
    if (!weekStartParam) {
      return NextResponse.json({ error: 'weekStart parameter is required' }, { status: 400 })
    }

    // Validate chart type
    const validChartTypes: Array<'artists' | 'tracks' | 'albums'> = ['artists', 'tracks', 'albums']
    if (!validChartTypes.includes(chartTypeParam as any)) {
      return NextResponse.json({ error: 'Invalid chartType. Must be one of: artists, tracks, albums' }, { status: 400 })
    }
    const chartType = chartTypeParam as 'artists' | 'tracks' | 'albums'

    // Validate overlay type
    const validOverlayTypes: Array<'position' | 'plays' | 'vs' | 'none'> = ['position', 'plays', 'vs', 'none']
    if (!validOverlayTypes.includes(overlayTypeParam as any)) {
      return NextResponse.json({ error: 'Invalid overlayType. Must be one of: position, plays, vs, none' }, { status: 400 })
    }
    const overlayType = overlayTypeParam as 'position' | 'plays' | 'vs' | 'none'

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

    // Get chart entries for the specified chart type
    const chartEntries = await getGroupChartEntries(
      group.id,
      normalizedWeekStart,
      chartType
    )

    if (chartEntries.length === 0) {
      return NextResponse.json({ error: 'No chart entries found' }, { status: 404 })
    }

    // Get entries based on grid size
    const [gridCols, gridRows] = gridSize.split('x').map(Number)
    const totalItems = gridCols * gridRows
    const topEntries = chartEntries.slice(0, totalItems).map(entry => ({
      position: entry.position,
      name: entry.name,
      playcount: entry.playcount,
      vibeScore: entry.vibeScore,
      artist: entry.artist, // Needed for tracks and albums
    }))

    // Get theme colors
    const colorTheme = ((group as any).colorTheme || 'white') as ThemeName
    const themeColors = GROUP_THEMES[colorTheme]

    // Get chart mode
    const chartMode = (group.chartMode || 'plays_only') as string
    const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

    // Get images for entries and convert to base64
    const apiKey = process.env.LASTFM_API_KEY || ''
    const itemImages: Array<{ name: string; imageBase64: string | null }> = []
    
    // Fetch images in batches to respect rate limits
    // Process in batches of 5 to avoid overwhelming the rate limiter
    const batchSize = 5
    const entriesToProcess = topEntries.slice(0, totalItems)
    
    for (let i = 0; i < entriesToProcess.length; i += batchSize) {
      const batch = entriesToProcess.slice(i, i + batchSize)
      const batchPromises = batch.map(async (entry) => {
        try {
          let imageUrl: string | null = null
          
          if (chartType === 'artists') {
            // For artists, use artist image (MusicBrainz - no rate limiting)
            imageUrl = await getArtistImage(entry.name, apiKey)
            console.log(`Artist ${entry.position} (${entry.name}) image URL:`, imageUrl)
          } else if (chartType === 'tracks') {
            // For tracks, use artist image (MusicBrainz - no rate limiting)
            if (entry.artist) {
              imageUrl = await getArtistImage(entry.artist, apiKey)
              console.log(`Track ${entry.position} (${entry.name} by ${entry.artist}) artist image URL:`, imageUrl)
            }
          } else if (chartType === 'albums') {
            // For albums, use album image (Last.fm API - rate limited)
            if (entry.artist) {
              imageUrl = await getAlbumImage(entry.artist, entry.name, apiKey)
              console.log(`Album ${entry.position} (${entry.name} by ${entry.artist}) image URL:`, imageUrl)
            }
          }
          
          if (imageUrl) {
            const imageBase64 = await convertImageToBase64(imageUrl)
            return {
              name: entry.name,
              imageBase64,
            }
          } else {
            console.log(`No image URL returned for ${entry.name}`)
            return {
              name: entry.name,
              imageBase64: null,
            }
          }
        } catch (error) {
          console.error(`Error loading image for ${entry.name}:`, error)
          return {
            name: entry.name,
            imageBase64: null,
          }
        }
      })
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      itemImages.push(...batchResults)
      
      // Add a small delay between batches to give rate limiter time to refill
      // Only needed for albums (Last.fm API), but harmless for others
      if (i + batchSize < entriesToProcess.length && chartType === 'albums') {
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay between batches
      }
    }
    
    console.log(`Loaded ${itemImages.filter(img => img.imageBase64).length} images out of ${itemImages.length} attempts`)

    // Format week label
    const weekLabel = formatWeekLabel(normalizedWeekStart)

    // Load logo
    const logoBase64 = loadLogoAsBase64()

    // Generate HTML
    let html: string
    try {
      html = await generateSquareChartHTML({
        groupName: group.name,
        weekLabel,
        entries: topEntries.map(entry => ({
          position: entry.position,
          name: entry.name,
          playcount: entry.playcount,
          vibeScore: entry.vibeScore,
          artist: entry.artist,
        })),
        themeColors,
        showVS,
        itemImages,
        logoBase64,
        overlayType,
        showName,
        gridSize,
      })
      console.log('HTML generated successfully, length:', html.length)
      console.log('HTML contains image tag:', html.includes('<img'))
      const hasAnyImage = itemImages.some((img: { name: string; imageBase64: string | null }) => img.imageBase64)
      if (hasAnyImage) {
        console.log('HTML contains image data URI:', html.includes('data:image'))
      }
    } catch (htmlError) {
      console.error('Error generating HTML:', htmlError)
      return NextResponse.json(
        { 
          error: 'Failed to generate HTML template',
          details: process.env.NODE_ENV === 'development' ? (htmlError instanceof Error ? htmlError.message : String(htmlError)) : undefined
        },
        { status: 500 }
      )
    }
    
    // Import Playwright-core and Chromium binary dynamically (only when needed)
    let chromium
    let chromiumBinary: any = null
    try {
      chromium = (await import('playwright-core')).chromium
      console.log('Playwright-core imported successfully')
      
      // Use lightweight Chromium for serverless (Vercel), full Playwright for local dev
      const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      if (isServerless) {
        console.log('Detected serverless environment, using @sparticuz/chromium-min')
        const chromiumModule = await import('@sparticuz/chromium-min')
        chromiumBinary = chromiumModule.default || chromiumModule
        // Optimize Chromium for serverless (if method exists)
        if (chromiumBinary && typeof chromiumBinary.setGraphicsMode === 'function') {
          chromiumBinary.setGraphicsMode(false)
        }
      } else {
        console.log('Local environment detected, using system Chromium')
      }
    } catch (importError) {
      console.error('Failed to import playwright-core or chromium:', importError)
      return NextResponse.json(
        { 
          error: 'Playwright dependencies not installed. Please run: npm install playwright-core @sparticuz/chromium-min',
          details: process.env.NODE_ENV === 'development' ? (importError instanceof Error ? importError.message : String(importError)) : undefined
        },
        { status: 500 }
      )
    }
    
    // Launch browser with appropriate configuration
    let browser
    try {
      console.log('Attempting to launch browser...')
      const launchOptions: any = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process', // Important for serverless
        ],
      }
      
      // Use lightweight Chromium binary in serverless environment
      if (chromiumBinary) {
        try {
          // @sparticuz/chromium-min will automatically use CHROMIUM_REMOTE_EXEC_PATH env var if set
          // If not set, it will look for local files (which don't exist in Vercel)
          // So we need to ensure the env var is set, or pass the location directly
          const remotePath = process.env.CHROMIUM_REMOTE_EXEC_PATH
          
          let executablePath: string
          if (remotePath) {
            console.log('Using CHROMIUM_REMOTE_EXEC_PATH from environment:', remotePath)
            // Pass the location to executablePath if env var is set
            executablePath = await chromiumBinary.executablePath(remotePath)
          } else {
            // Try default remote location for v141.0.0
            const defaultRemotePath = 'https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.tar.br'
            console.log('CHROMIUM_REMOTE_EXEC_PATH not set, using default remote path:', defaultRemotePath)
            executablePath = await chromiumBinary.executablePath(defaultRemotePath)
          }
          
          launchOptions.executablePath = executablePath
          // Merge args - chromiumBinary.args should be used, but keep our essential ones
          const chromiumArgs = chromiumBinary.args || []
          launchOptions.args = [...chromiumArgs, ...launchOptions.args.filter((arg: string) => 
            !chromiumArgs.includes(arg)
          )]
          console.log('Using serverless-optimized Chromium binary')
        } catch (execPathError) {
          console.error('Failed to get Chromium executable path:', execPathError)
          const errorMsg = execPathError instanceof Error ? execPathError.message : String(execPathError)
          return NextResponse.json(
            { 
              error: 'Failed to get Chromium executable for image generation',
              details: `Please set CHROMIUM_REMOTE_EXEC_PATH environment variable in Vercel to: https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.tar.br`,
              errorMessage: process.env.NODE_ENV === 'development' ? errorMsg : undefined
            },
            { status: 500 }
          )
        }
      }
      
      browser = await chromium.launch(launchOptions)
      console.log('Browser launched successfully')
    } catch (launchError) {
      console.error('Failed to launch browser:', launchError)
      const errorMsg = launchError instanceof Error ? launchError.message : String(launchError)
      return NextResponse.json(
        { 
          error: 'Failed to launch browser for image generation',
          details: process.env.NODE_ENV === 'development' ? errorMsg : undefined
        },
        { status: 500 }
      )
    }
    
    try {
      console.log('Creating new page...')
      const page = await browser.newPage()
      
      // Set viewport to match our image dimensions (square: 1800x1800)
      await page.setViewportSize({
        width: 1800,
        height: 1800,
      })
      console.log('Viewport set')
      
      // Set HTML content directly (no need to navigate to a URL)
      // Playwright's setContent has better auto-waiting built-in
      console.log('Setting HTML content...')
      const hasImageInHTML = html.includes('data:image') || html.includes('<img')
      console.log('HTML includes image:', hasImageInHTML, 'HTML length:', html.length)
      await page.setContent(html, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })
      console.log('HTML content set')
      
      // Wait for images to load (Playwright has better auto-waiting built-in)
      try {
        // Wait for any images to be present and loaded
        const imageCount = await page.locator('img').count()
        if (imageCount > 0) {
          console.log('Found', imageCount, 'image(s), waiting for them to load...')
          // Wait for all images to load - Playwright's waitForLoadState handles this better
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
            console.log('Network idle timeout, continuing anyway')
          })
          // Additional check to ensure base64 images are loaded
          await page.evaluate(() => {
            return Promise.all(
              Array.from(document.images).map((img) => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve()
                return new Promise((resolve) => {
                  img.onload = () => resolve(true)
                  img.onerror = () => resolve(true) // Resolve even on error
                  setTimeout(() => resolve(true), 3000) // Timeout after 3s
                })
              })
            )
          })
          console.log('Images loaded (or timed out)')
        }
      } catch (e) {
        // Continue even if images don't load
        console.log('Image loading check skipped or timed out')
      }
      
      // Additional brief wait for any remaining resources
      await page.waitForTimeout(500)
      console.log('Taking screenshot...')
      
      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: 1800,
          height: 1800,
        },
      })
      console.log('Screenshot taken successfully')
      
      // Create filename
      const weekStr = weekStartParam
      const groupNameSlug = group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const filename = `${groupNameSlug}_${chartType}_${weekStr}_square.png`
      
      // Return PNG file (Playwright screenshot returns Buffer)
      return new NextResponse(screenshot as unknown as BodyInit, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error('Error generating square chart image export:', error)
    
    // Provide detailed error message
    let errorMessage = 'Failed to generate square chart image export'
    let errorDetails = ''
    
    if (error instanceof Error) {
      errorDetails = error.message
      errorMessage = error.message
      
      // Specific error handling
      if (error.message.includes('Cannot find module') || error.message.includes('playwright') || error.message.includes('chromium')) {
        errorMessage = 'Playwright dependencies not installed. Please run: npm install playwright-core @sparticuz/chromium-min'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Image generation timed out. Please try again.'
      } else if (error.message.includes('Navigation')) {
        errorMessage = 'Failed to render HTML. Please check server logs.'
      } else if (error.message.includes('Protocol error')) {
        errorMessage = 'Browser connection error. Please try again.'
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}
