import sharp from 'sharp'

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
}

/**
 * Compress an image file using sharp
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed image buffer and new content type
 */
export async function compressImage(
  file: File | Buffer,
  options: CompressionOptions = {}
): Promise<{ buffer: Buffer; contentType: string }> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 85,
    format = 'webp',
  } = options

  // Convert File to Buffer if needed
  const inputBuffer = file instanceof File 
    ? Buffer.from(await file.arrayBuffer())
    : file

  // Create sharp instance
  let sharpInstance = sharp(inputBuffer)

  // Get image metadata
  const metadata = await sharpInstance.metadata()

  // Determine output format based on input or option
  let outputFormat: 'jpeg' | 'webp' | 'png' = format
  const originalFormat = metadata.format

  // If original is GIF, convert to WebP (GIFs are typically not well-compressed)
  if (originalFormat === 'gif') {
    outputFormat = 'webp'
  } else if (originalFormat === 'png' && format === 'webp') {
    // PNG to WebP for better compression
    outputFormat = 'webp'
  } else if (originalFormat === 'jpeg' || originalFormat === 'jpg') {
    // Keep JPEG format but compress
    outputFormat = 'jpeg'
  }

  // Resize if image is larger than max dimensions
  const needsResize = 
    (metadata.width && metadata.width > maxWidth) ||
    (metadata.height && metadata.height > maxHeight)

  if (needsResize) {
    sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  // Apply compression based on format
  let compressedBuffer: Buffer
  let contentType: string

  switch (outputFormat) {
    case 'webp':
      compressedBuffer = await sharpInstance
        .webp({ quality, effort: 4 })
        .toBuffer()
      contentType = 'image/webp'
      break
    case 'jpeg':
      compressedBuffer = await sharpInstance
        .jpeg({ quality, mozjpeg: true })
        .toBuffer()
      contentType = 'image/jpeg'
      break
    case 'png':
      compressedBuffer = await sharpInstance
        .png({ quality, compressionLevel: 9 })
        .toBuffer()
      contentType = 'image/png'
      break
    default:
      // Fallback to WebP
      compressedBuffer = await sharpInstance
        .webp({ quality, effort: 4 })
        .toBuffer()
      contentType = 'image/webp'
  }

  return {
    buffer: compressedBuffer,
    contentType,
  }
}
