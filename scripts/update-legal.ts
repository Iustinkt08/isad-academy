import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import cookies from './legal-content/cookies'
import privacy from './legal-content/privacy'
import terms from './legal-content/terms'

/**
 * Populate the `legalPages` CMS collection with the REAL legal content (owner-provided
 * .docx sources), in EN + RO, for exactly three pages: cookies / privacy / terms.
 * Content lives in `scripts/legal-content/*.ts` (verbatim extractions — no invented text).
 *
 * Idempotent: each doc is looked up by its `page` value and updated in place (or created).
 * The legacy `delivery` document is removed (the delivery policy is folded into Terms).
 * Runs against the DEV database (`DATABASE_URI` from `.env`). Re-runnable safely.
 *
 * Run with: `npx tsx scripts/update-legal.ts`
 */

type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] }
type Section = { heading: string; blocks: Block[] }
type LocaleContent = { title: string; intro: string; sections: Section[] }

/** Minimal valid Lexical editor state — one paragraph per string (matches seed.ts). */
const richText = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      children: [{ type: 'text', text, version: 1 }],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    })),
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

/** Flatten a section's blocks into paragraphs; bullet items become "• …" lines
    (kept as paragraphs so we only rely on the proven paragraph-only Lexical shape). */
function toParagraphs(blocks: Block[]): string[] {
  const out: string[] = []
  for (const block of blocks) {
    if (block.type === 'p') {
      if (block.text.trim()) out.push(block.text)
    } else {
      for (const item of block.items) {
        if (item.trim()) out.push(`• ${item}`)
      }
    }
  }
  return out.length > 0 ? out : ['']
}

const toSections = (sections: Section[]) =>
  sections.map((s) => ({ heading: s.heading, body: richText(toParagraphs(s.blocks)) }))

async function run() {
  const payload = await getPayload({ config })

  const docs: { page: 'cookies' | 'privacy' | 'terms'; content: { en: LocaleContent; ro: LocaleContent } }[] = [
    { page: 'cookies', content: cookies },
    { page: 'privacy', content: privacy },
    { page: 'terms', content: terms },
  ]

  for (const { page, content } of docs) {
    const enData = {
      page,
      title: content.en.title,
      intro: content.en.intro,
      sections: toSections(content.en.sections),
    }

    const existing = await payload.find({
      collection: 'legalPages',
      where: { page: { equals: page } },
      limit: 1,
      overrideAccess: true,
      locale: 'en',
    })

    let id: number
    if (existing.docs[0]) {
      await payload.update({
        collection: 'legalPages',
        id: existing.docs[0].id,
        data: enData,
        overrideAccess: true,
        locale: 'en',
      })
      id = existing.docs[0].id
    } else {
      const created = await payload.create({
        collection: 'legalPages',
        data: enData,
        overrideAccess: true,
        locale: 'en',
      })
      id = created.id
    }

    await payload.update({
      collection: 'legalPages',
      id,
      locale: 'ro',
      overrideAccess: true,
      data: {
        title: content.ro.title,
        intro: content.ro.intro,
        sections: toSections(content.ro.sections),
      },
    })

    console.log(
      `legalPages/${page}: upserted EN (${content.en.sections.length} sections) + RO (${content.ro.sections.length} sections)`,
    )
  }

  // Remove the legacy delivery document (delivery policy is folded into Terms).
  // Once the 'delivery' enum option is dropped from the schema, querying it throws —
  // that's expected (the row is already gone), so tolerate it for idempotent re-runs.
  try {
    const delivery = await payload.find({
      collection: 'legalPages',
      where: { page: { equals: 'delivery' } },
      limit: 1,
      overrideAccess: true,
      locale: 'en',
    })
    if (delivery.docs[0]) {
      await payload.delete({ collection: 'legalPages', id: delivery.docs[0].id, overrideAccess: true })
      console.log('legalPages/delivery: deleted (folded into Terms)')
    } else {
      console.log('legalPages/delivery: none found (nothing to delete)')
    }
  } catch {
    console.log('legalPages/delivery: not a valid page value anymore (already removed)')
  }

  await payload.db.destroy?.()
  console.log('done')
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
