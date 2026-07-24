import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

/**
 * T14/T-Brand — one-off asset generator (committed alongside its outputs so they can always
 * be regenerated/rebranded). Renders branded SVGs to PNG via sharp:
 *
 *   - public/og-default.png   (1200×630) — site-wide default OpenGraph image: dark brand
 *     gradient (#1C5D99 44% → #091F33 100%, client Figma directive) with the official white
 *     stacked lockup (public/brand/logo-white.svg) and the tagline.
 *   - src/app/apple-icon.png  (180×180)  — Apple touch icon, rasterized from src/app/icon.svg
 *     (Brand Book p.17: white icon-only mark on a Deep Blue rounded-square tile).
 *
 * Run with: npx tsx scripts/generate-og.ts
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dirname, '..')

// Brand Book p.10 palette: Deep Blue #1C5D99, Steel Blue #407EA2, Ink #222222,
// Mist #BBCDE5, White #FFFFFF. Dark surfaces: #1C5D99 44% → #091F33 100%.
const OG_BASE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0.44" stop-color="#1C5D99"/>
      <stop offset="1" stop-color="#091F33"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="600" y="560" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="400" fill="#BBCDE5">Live online professional training</text>
</svg>
`

// White stacked lockup (762×557 viewBox) — rasterized width on the 1200×630 canvas.
const LOCKUP_WIDTH = 420
const LOCKUP_HEIGHT = Math.round((LOCKUP_WIDTH * 557) / 762) // ≈ 307

async function generate() {
  const publicDir = path.join(root, 'public')
  await mkdir(publicDir, { recursive: true })

  // OG: dark brand gradient + white stacked lockup composited above the tagline.
  const lockupSvg = await readFile(path.join(publicDir, 'brand', 'logo-white.svg'))
  const lockupPng = await sharp(lockupSvg).resize(LOCKUP_WIDTH, LOCKUP_HEIGHT).png().toBuffer()
  const ogPng = await sharp(Buffer.from(OG_BASE_SVG))
    .composite([
      {
        input: lockupPng,
        left: Math.round((1200 - LOCKUP_WIDTH) / 2),
        top: 110,
      },
    ])
    .png()
    .toBuffer()
  const ogPath = path.join(publicDir, 'og-default.png')
  await writeFile(ogPath, ogPng)
  console.log(`written ${ogPath} (${ogPng.length} bytes)`)

  // Apple touch icon: same artwork as the favicon (src/app/icon.svg), rasterized at 180×180.
  const iconSvg = await readFile(path.join(root, 'src', 'app', 'icon.svg'))
  const applePng = await sharp(iconSvg).resize(180, 180).png().toBuffer()
  const applePath = path.join(root, 'src', 'app', 'apple-icon.png')
  await writeFile(applePath, applePng)
  console.log(`written ${applePath} (${applePng.length} bytes)`)
}

generate().catch((err) => {
  console.error('[generate-og] failed:', err)
  process.exit(1)
})
