import fs from 'fs'
import path from 'path'

import sharp from 'sharp'

import { uploadsDir } from '@/lib/media/uploadsDir'

/**
 * Local asset resolution for the course PDF export. `process.cwd()` is NOT reliable in
 * production — under Passenger the app boots with cwd = the account home, not the app
 * root (see the full diagnosis in `src/lib/media/uploadsDir.ts`, 2026-08-07). And
 * `process.argv[1]` is NOT `server.js` there either: the LiteSpeed loader starts the app
 * through `app_wrapper.cjs`/`app.js` (PassengerStartupFile), so the first prod deploy of
 * this route 500-ed on unresolvable font paths (2026-09-01). The reliable anchor is the
 * one that already works in production: `uploadsDir` (env `PAYLOAD_MEDIA_DIR` or the
 * startup-file dir) points at `<app root>/media`, and `public/` sits right next to it.
 * Every candidate is PROBED for an actual `public/` dir instead of being trusted.
 */
const resolveAppRoot = (): string => {
  const entry = process.argv[1]
  const candidates = [
    path.dirname(uploadsDir),
    entry ? path.dirname(entry) : '',
    process.cwd(),
  ]
  for (const dir of candidates) {
    try {
      if (dir && fs.existsSync(path.join(dir, 'public'))) return dir
    } catch {
      // un candidat inaccesibil nu oprește căutarea
    }
  }
  return process.cwd()
}

let appRoot: string | null = null

/** Absolute path of a file under `public/` (app root resolved once per process). */
export const publicAsset = (...segments: string[]): string =>
  path.join((appRoot ??= resolveAppRoot()), 'public', ...segments)

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
