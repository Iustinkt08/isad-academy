import fs from 'fs'
import path from 'path'

import sharp from 'sharp'

/**
 * Local asset resolution for the course PDF export. `process.cwd()` is NOT reliable in
 * production — under Passenger the app boots with cwd = the account home, not the app
 * root (see the full diagnosis in `src/lib/media/uploadsDir.ts`, 2026-08-07). Same trick
 * as there: in the standalone bundle `process.argv[1]` is `<app root>/server.js`, and
 * `public/` sits next to it; in dev, cwd is the project root.
 */
const resolveAppRoot = (): string => {
  const entry = process.argv[1]
  if (entry && path.basename(entry) === 'server.js') return path.dirname(entry)
  return process.cwd()
}

/** Absolute path of a file under `public/`. */
export const publicAsset = (...segments: string[]): string =>
  path.join(resolveAppRoot(), 'public', ...segments)

/**
 * Rasterize a local image (SVG included — the brand logos are SVG, which
 * `@react-pdf/renderer` can't embed directly) to a PNG data URI at the given pixel
 * width. Returns null when the file is missing or unreadable: the PDF then renders
 * without that image instead of failing the whole download.
 */
export const pngDataUri = async (filePath: string, width: number): Promise<string | null> => {
  try {
    if (!fs.existsSync(filePath)) return null
    const png = await sharp(filePath, { density: 300 }).resize({ width }).png().toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch {
    return null
  }
}
