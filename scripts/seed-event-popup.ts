import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

/**
 * Dev seed for the `eventPopup` global (owner spec, Figma 4033-156): populates the test
 * event so the popup shows up on the site immediately — a REAL future date (~2 weeks out,
 * 18:00 Romania time) so the countdown actually counts. Speaker 1 reuses Silviu's existing
 * photo from the `expertBio` global; speaker 2 has no photo (renders initials).
 *
 * Idempotent by nature (globals upsert). Run with: `npx tsx scripts/seed-event-popup.ts`
 */

async function main() {
  const payload = await getPayload({ config })

  // ~2 weeks from now, at 18:00 EEST (UTC+3 in August) — a real countdown target.
  const eventDay = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const eventDate = new Date(
    Date.UTC(eventDay.getUTCFullYear(), eventDay.getUTCMonth(), eventDay.getUTCDate(), 15, 0, 0),
  )
  const metaDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Bucharest',
  }).format(eventDate)
  const metaLine = `${metaDate} · 18:00 (EEST) · Live on Zoom`

  // Silviu's existing photo — expertBio global first; when the dev DB has none there,
  // fall back to uploading the site's own portrait asset (public/silviu-gresoi.png).
  const expertBio = await payload.findGlobal({ slug: 'expertBio', depth: 0 }).catch(() => null)
  let silviuPhotoId =
    typeof expertBio?.photo === 'number' ? expertBio.photo : (expertBio?.photo?.id ?? null)

  if (!silviuPhotoId) {
    const existing = await payload.find({
      collection: 'media',
      where: { alt: { equals: 'Dr. Silviu Gresoi' } },
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })
    silviuPhotoId = existing.docs[0]?.id ?? null
  }

  if (!silviuPhotoId) {
    const { readFile } = await import('node:fs/promises')
    const path = await import('node:path')
    const filePath = path.resolve(process.cwd(), 'public/silviu-gresoi.png')
    const uploaded = await payload.create({
      collection: 'media',
      data: { alt: 'Dr. Silviu Gresoi' },
      file: {
        data: await readFile(filePath),
        name: 'silviu-gresoi.png',
        mimetype: 'image/png',
        size: (await readFile(filePath)).length,
      },
      overrideAccess: true,
    })
    silviuPhotoId = uploaded.id
  }

  await payload.updateGlobal({
    slug: 'eventPopup',
    data: {
      active: true,
      titlePlain: 'AI Governance ',
      titleGradient: 'in Practice.',
      description:
        'Join our free live session on ISO/IEC 42001 — what the standard actually asks, how to start, and your questions answered live by our trainer.',
      eventDate: eventDate.toISOString(),
      metaLine,
      speakers: [
        {
          name: 'Dr. Silviu Gresoi, PhD, CFE',
          role: 'Trainer · AI governance & risk',
          ...(silviuPhotoId ? { photo: silviuPhotoId } : {}),
        },
        {
          name: 'Ana Isad',
          role: 'Host · isad.academy',
        },
      ],
      occupations: [
        { label: 'Consultant' },
        { label: 'Manager' },
        { label: 'Auditor' },
        { label: 'IT & Security specialist' },
        { label: 'Compliance / Risk officer' },
        { label: 'Student' },
        { label: 'Other' },
      ],
    },
  })

  console.log(
    `eventPopup seeded — active, event on ${metaLine}, speaker photo ${silviuPhotoId ? `media #${silviuPhotoId}` : 'MISSING (expertBio has no photo)'}`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
