import 'dotenv/config'

// Seed convention (2026-08): NO real e-mails from seeds — neutralize Brevo before any
// import that could construct a mailer (partners only revalidate, but the rule stands).
process.env.BREVO_API_KEY = ''

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import config from '../src/payload.config'

/**
 * Owner 2026-08-12: load the partner logos delivered in the repo-root "partners logo/"
 * folder into the `partners` collection (media upload + one doc per partner).
 * Placement per the owner's instruction: ALL logos go to the homepage strip; the
 * Corporate strip shows only the Orange Digital Center logo.
 *
 * Idempotent at the collection level: wipes and recreates every partner doc (media docs
 * from previous runs are not garbage-collected — re-running uploads fresh files).
 * Run with: `npx tsx scripts/seed-partners.ts`
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGO_DIR = path.resolve(dirname, '..', 'partners logo')

const PARTNERS: Array<{
  name: string
  file: string
  showOnCorporate?: boolean
  url?: string
}> = [
  { name: 'ISAD AI', file: 'ISAD ai logo 1.svg' },
  { name: 'ISAD', file: 'ISAD logo.png' },
  { name: 'AI Factory', file: 'ai factory logo.svg' },
  { name: 'EuroHPC', file: 'eurohpc logo.svg' },
  // "pentru corporate, foloseste logoul cu orange" — the Orange Digital Center logo.
  { name: 'Orange Digital Center', file: 'orange digital center.svg', showOnCorporate: true },
  { name: 'PECB', file: 'pecb-logo-black.svg', url: 'https://pecb.com' },
]

async function main() {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'partners',
    pagination: false,
    overrideAccess: true,
    depth: 0,
  })
  if (existing.totalDocs > 0) {
    const removed = await payload.delete({
      collection: 'partners',
      where: { id: { exists: true } },
      overrideAccess: true,
    })
    console.log(`Deleted ${removed.docs.length} existing partner(s).`)
  }

  for (const [index, partner] of PARTNERS.entries()) {
    const media = await payload.create({
      collection: 'media',
      overrideAccess: true,
      filePath: path.join(LOGO_DIR, partner.file),
      data: { alt: `${partner.name} logo` },
    })
    await payload.create({
      collection: 'partners',
      overrideAccess: true,
      data: {
        name: partner.name,
        logo: media.id,
        showOnHome: true,
        showOnCorporate: partner.showOnCorporate ?? false,
        url: partner.url,
        order: index + 1,
      },
    })
    console.log(`Created partner "${partner.name}" (${partner.file}).`)
  }

  console.log(`Seeded ${PARTNERS.length} partners — all on Home, Orange Digital Center on Corporate.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
