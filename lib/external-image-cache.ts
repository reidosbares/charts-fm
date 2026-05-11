import { access } from 'fs/promises'
import { join } from 'path'

import { prisma } from './prisma'
import { compressImage } from './image-compression'
import { uploadFile } from './storage'

const DOWNLOAD_TIMEOUT_MS = 8000
const PROBE_TIMEOUT_MS = 2000
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB ceiling per source image
const CACHE_MAX_DIMENSION = 1920
const CACHE_QUALITY = 85

type CacheKind = 'artist' // album/track will be added later

/**
 * Look up a cached external image by (kind, cacheKey). Positive hits are probed
 * (HEAD / fs.access); if the blob is gone, the row is reaped and the result is
 * reported as a miss so the caller re-resolves and re-caches.
 *
 * Returns:
 *   - { hit: true, blobUrl: string }   — positive cache hit; use this URL
 *   - { hit: true, blobUrl: null }     — negative cache hit; caller should treat as "no image"
 *   - { hit: false }                   — cache miss (or reaped dead row); caller should resolve + cache
 */
export async function lookupCachedExternalImage(
  kind: CacheKind,
  cacheKey: string,
): Promise<{ hit: true; blobUrl: string | null } | { hit: false }> {
  const row = await prisma.cachedExternalImage.findUnique({
    where: { kind_cacheKey: { kind, cacheKey } },
    select: { blobUrl: true },
  })
  if (!row) return { hit: false }
  if (row.blobUrl === null) return { hit: true, blobUrl: null }

  if (await isBlobAlive(row.blobUrl)) {
    return { hit: true, blobUrl: row.blobUrl }
  }

  // Blob is gone — reap the row so the caller re-resolves and rewrites.
  try {
    await prisma.cachedExternalImage.delete({
      where: { kind_cacheKey: { kind, cacheKey } },
    })
  } catch (err) {
    // P2025 (row already deleted by concurrent reaper) is fine; log anything else.
    console.error('[external-image-cache] reap failed', { kind, cacheKey, err })
  }
  return { hit: false }
}

/**
 * Probe whether a cached blob URL still resolves. Fail-safe: any uncertain
 * result (timeout, network error, non-404 HTTP) returns true so we don't
 * accidentally reap live rows.
 */
async function isBlobAlive(url: string): Promise<boolean> {
  // Local-mode URLs are served by Next.js from public/.
  if (url.startsWith('/uploads/')) {
    try {
      await access(join(process.cwd(), 'public', url))
      return true
    } catch {
      return false
    }
  }
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    return res.status !== 404
  } catch {
    return true
  }
}

/**
 * Resolve, download, and cache an external image. Returns the Blob URL,
 * or null if no image could be cached (e.g. resolver returned null, or download failed).
 *
 * On a transient download/upload failure the negative-cache row is NOT written —
 * we want a retry next time. Only "resolver returned no URL" produces a negative-cache row.
 */
export async function resolveAndCacheExternalImage(
  kind: CacheKind,
  cacheKey: string,
  resolve: () => Promise<string | null>,
): Promise<string | null> {
  let sourceUrl: string | null
  try {
    sourceUrl = await resolve()
  } catch (err) {
    console.error('[external-image-cache] resolver threw', { kind, cacheKey, err })
    return null
  }

  if (!sourceUrl) {
    // Negative cache: artist exists but has no Wikimedia image. Don't re-query MB next time.
    await persistRow({ kind, cacheKey, sourceUrl: null, blobUrl: null, contentType: null, byteSize: null })
    return null
  }

  const downloaded = await downloadBytes(sourceUrl)
  if (downloaded.kind === 'transient') {
    // Network blip or 5xx — do not persist; retry next time.
    return null
  }
  if (downloaded.kind === 'permanent') {
    // Dead source URL — write a negative-cache row so we don't keep trying.
    await persistRow({ kind, cacheKey, sourceUrl, blobUrl: null, contentType: null, byteSize: null })
    return null
  }

  // downloaded.kind === 'ok' from here on — TypeScript narrows.
  let compressed: { buffer: Buffer; contentType: string }
  try {
    compressed = await compressImage(downloaded.buffer, {
      maxWidth: CACHE_MAX_DIMENSION,
      maxHeight: CACHE_MAX_DIMENSION,
      quality: CACHE_QUALITY,
      format: 'webp',
    })
  } catch (err) {
    console.error('[external-image-cache] compression failed', { kind, cacheKey, sourceUrl, err })
    return null
  }

  const fileName = buildBlobFileName(kind, cacheKey, compressed.contentType)
  let blobUrl: string
  try {
    const result = await uploadFile(fileName, compressed.buffer, compressed.contentType, 'artist-images-cached', { addRandomSuffix: false })
    blobUrl = result.url
  } catch (err) {
    console.error('[external-image-cache] blob upload failed', { kind, cacheKey, sourceUrl, err })
    return null
  }

  await persistRow({
    kind,
    cacheKey,
    sourceUrl,
    blobUrl,
    contentType: compressed.contentType,
    byteSize: compressed.buffer.byteLength,
  })

  return blobUrl
}

type DownloadResult =
  | { kind: 'ok'; buffer: Buffer; contentType: string }
  | { kind: 'permanent' }   // dead source — caller should negative-cache
  | { kind: 'transient' }   // retry next time

async function downloadBytes(url: string): Promise<DownloadResult> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      headers: {
        'User-Agent': 'ChartsFM/1.0 (https://chartsfm.com)',
      },
    })
    if (!response.ok) {
      const permanent = response.status >= 400 && response.status < 500
      console.warn('[external-image-cache] download non-OK', { url, status: response.status, permanent })
      return { kind: permanent ? 'permanent' : 'transient' }
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      console.warn('[external-image-cache] download non-image', { url, contentType })
      return { kind: 'permanent' }
    }
    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_BYTES) {
      console.warn('[external-image-cache] download size out of range', { url, bytes: arrayBuffer.byteLength })
      return { kind: 'permanent' }
    }
    return { kind: 'ok', buffer: Buffer.from(arrayBuffer), contentType }
  } catch (err) {
    console.warn('[external-image-cache] download threw', { url, err })
    return { kind: 'transient' }
  }
}

function buildBlobFileName(kind: CacheKind, cacheKey: string, contentType: string): string {
  const ext = contentType.split('/')[1]?.split(';')[0]?.trim().replace(/\+.*$/, '') || 'jpg'
  const safeKey = cacheKey
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'image'
  // Deterministic path: concurrent cold-cache writes for the same key land on the
  // same pathname so the second write overwrites the first instead of orphaning it.
  return `${kind}/${safeKey}.${ext}`
}

async function persistRow(args: {
  kind: CacheKind
  cacheKey: string
  sourceUrl: string | null
  blobUrl: string | null
  contentType: string | null
  byteSize: number | null
}): Promise<void> {
  try {
    await prisma.cachedExternalImage.upsert({
      where: { kind_cacheKey: { kind: args.kind, cacheKey: args.cacheKey } },
      create: {
        kind: args.kind,
        cacheKey: args.cacheKey,
        sourceUrl: args.sourceUrl,
        blobUrl: args.blobUrl,
        contentType: args.contentType,
        byteSize: args.byteSize,
      },
      update: {
        sourceUrl: args.sourceUrl,
        blobUrl: args.blobUrl,
        contentType: args.contentType,
        byteSize: args.byteSize,
        refreshedAt: new Date(),
      },
    })
  } catch (err) {
    console.error('[external-image-cache] persistRow failed', { args, err })
    // Swallow — failing to persist is not fatal to the calling request.
  }
}
