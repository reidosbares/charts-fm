const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externalize server-only packages to avoid bundling issues
  // For Next.js 14, use experimental.serverComponentsExternalPackages
  experimental: {
    serverComponentsExternalPackages: [
      'playwright-core',
      'chromium-bidi',
      '@sparticuz/chromium',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize playwright-core and related packages for server-side
      config.externals = config.externals || []
      config.externals.push({
        'playwright-core': 'commonjs playwright-core',
        'chromium-bidi': 'commonjs chromium-bidi',
        '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
      })
    }
    return config
  },
  images: {
    // Cache images for 31 days to reduce cache writes and transformations
    // Images from Last.fm/Spotify don't change frequently
    minimumCacheTTL: 2678400, // 31 days in seconds
    // Use only WebP format to reduce transformations by 50%
    // WebP has excellent browser support and good compression
    formats: ['image/webp'],
    // Limit quality options to reduce transformation variations
    // 75 for thumbnails/small images, 90 for larger/higher quality needs
    qualities: [75, 90],
    // Configure image sizes to match actual usage patterns
    // Small sizes for thumbnails/avatars, medium for cards, large for heroes
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Device sizes for responsive images
    // Focused on common breakpoints to reduce unnecessary transformations
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lastfm.freetls.fastly.net',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
}

module.exports = withNextIntl(nextConfig)

