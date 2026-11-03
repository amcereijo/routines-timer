/**
 * Client-side image preparation.
 *
 * Images are embedded in the routine document as `data:` URLs, so they are
 * downscaled and re-encoded in the browser before they are sent to the
 * server. That keeps the database small and the public page fast, without
 * requiring an object-storage service on Vercel.
 */

/** Longest edge of an embedded image, in pixels. */
export const IMAGE_MAX_DIMENSION = 1024

/** Target size of an embedded image, in bytes. */
export const IMAGE_MAX_BYTES = 150 * 1024

/** Decoded byte length of a base64 payload (without decoding it). */
export function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

/** Byte size of a `data:` URL. */
export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return 0
  const payload = dataUrl.slice(comma + 1)
  if (dataUrl.slice(0, comma).includes(';base64')) {
    return base64ByteLength(payload)
  }
  return payload.length
}

type Drawable = ImageBitmap | HTMLImageElement

async function loadImage(file: File): Promise<{
  image: Drawable
  release: () => void
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return { image: bitmap, release: () => bitmap.close?.() }
    } catch {
      // fall through to the <img> path
    }
  }

  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url
  await image.decode()
  return {
    image,
    release: () => URL.revokeObjectURL(url),
  }
}

function encode(canvas: HTMLCanvasElement, mime: string, quality: number): string {
  return canvas.toDataURL(mime, quality)
}

/**
 * Convert an uploaded file into a small `data:` URL suitable for embedding in
 * a routine. PNG sources keep their transparency when they fit the budget,
 * everything else is encoded as JPEG.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be added')
  }

  const { image, release } = await loadImage(file)
  try {
    const width = 'width' in image ? image.width : 0
    const height = 'height' in image ? image.height : 0
    if (!width || !height) throw new Error('Could not read the image')

    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.drawImage(image, 0, 0, w, h)

    const keepAlpha = file.type === 'image/png' || file.type === 'image/gif'
    if (keepAlpha) {
      const png = encode(canvas, 'image/png', 1)
      if (dataUrlByteLength(png) <= IMAGE_MAX_BYTES) return png
    }

    let quality = 0.82
    let dataUrl = encode(canvas, 'image/jpeg', quality)
    while (dataUrlByteLength(dataUrl) > IMAGE_MAX_BYTES && quality > 0.4) {
      quality -= 0.08
      dataUrl = encode(canvas, 'image/jpeg', quality)
    }
    return dataUrl
  } finally {
    release()
  }
}
