import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { cookiesEn } from '../src/components/legal/content/cookies-en'
import { cookiesRo } from '../src/components/legal/content/cookies-ro'
import { privacyEn } from '../src/components/legal/content/privacy-en'
import { privacyRo } from '../src/components/legal/content/privacy-ro'
import { termsEn } from '../src/components/legal/content/terms-en'
import { termsRo } from '../src/components/legal/content/terms-ro'
import type { LegalBlock, LegalDocContent } from '../src/components/legal/content/types'

/**
 * Mută textele legale din cod în CMS — o singură dată (owner 2026-08-07: „pagina de legal ar
 * trebui sa fie editabila, de asta am si facut colectiile").
 *
 * SURSA e `src/components/legal/content/*.ts`, adică EXACT ce randează site-ul acum, nu
 * .docx-urile și nu vechiul `scripts/legal-content/`. Motivul e simplu: orice retranscriere
 * poate introduce diferențe pe care nu le vede nimeni până le reclamă cineva. Copiind din
 * ce e deja afișat, paginile rămân identice caracter cu caracter.
 *
 * Idempotent: caută documentul după `page` și îl actualizează, altfel îl creează.
 *
 *   npx tsx scripts/import-legal-content.ts            # scrie
 *   npx tsx scripts/import-legal-content.ts --dry-run  # doar raportează
 */

const DRY_RUN = process.argv.includes('--dry-run')

type PageKey = 'terms' | 'privacy' | 'cookies'

const DOCS: { page: PageKey; en: LegalDocContent; ro: LegalDocContent }[] = [
  { page: 'terms', en: termsEn, ro: termsRo },
  { page: 'privacy', en: privacyEn, ro: privacyRo },
  { page: 'cookies', en: cookiesEn, ro: cookiesRo },
]

/** Traduce un bloc din modelul de cod în forma `blocks` a colecției. Un `kind` necunoscut
 *  ARUNCĂ — a-l sări în tăcere ar însemna text legal dispărut fără urmă. */
const toPayloadBlock = (block: LegalBlock): Record<string, unknown> => {
  switch (block.kind) {
    case 'p':
      return { blockType: 'paragraph', text: block.text }
    case 'h3':
      return { blockType: 'subheading', text: block.text }
    case 'list':
      return { blockType: 'list', items: block.items.map((text) => ({ text })) }
    case 'table':
      return {
        blockType: 'table',
        headLeft: block.head[0],
        headRight: block.head[1],
        rows: block.rows.map(([left, right]) => ({ left, right })),
      }
    case 'entity':
      return { blockType: 'entity', line1: block.line1, line2: block.line2 }
    default: {
      const exhaustive: never = block
      throw new Error(`Unknown legal block kind: ${JSON.stringify(exhaustive)}`)
    }
  }
}

const toPayloadData = (doc: LegalDocContent) => ({
  metaTitle: doc.metaTitle,
  titlePlain: doc.titlePlain,
  titleGradient: doc.titleGradient,
  lastUpdated: doc.lastUpdated,
  sections: doc.sections.map((section) => ({
    heading: section.heading ?? '',
    blocks: section.blocks.map(toPayloadBlock),
  })),
})

const countBlocks = (doc: LegalDocContent) =>
  doc.sections.reduce((total, section) => total + section.blocks.length, 0)

const findId = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  page: PageKey,
): Promise<number | string | undefined> => {
  const found = await payload.find({
    collection: 'legalPages',
    where: { page: { equals: page } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  return found.docs[0]?.id
}

const run = async () => {
  const payload = await getPayload({ config })

  for (const { page, en, ro } of DOCS) {
    console.log(
      `\n${page}: EN ${en.sections.length} secțiuni / ${countBlocks(en)} blocuri · ` +
        `RO ${ro.sections.length} secțiuni / ${countBlocks(ro)} blocuri`,
    )

    // Traducerea se face ÎNAINTE de orice scriere: un `kind` necunoscut trebuie să oprească
    // rularea, nu s-o lase pe jumătate făcută.
    const enData = toPayloadData(en)
    const roData = toPayloadData(ro)

    if (DRY_RUN) {
      console.log(`  [dry-run] aș scrie „${enData.metaTitle}" / „${roData.metaTitle}"`)
      continue
    }

    const existingId = await findId(payload, page)

    if (existingId) {
      await payload.update({
        collection: 'legalPages',
        id: existingId,
        data: enData as never,
        locale: 'en',
        overrideAccess: true,
      })
      console.log(`  EN actualizat (#${existingId})`)
    } else {
      const created = await payload.create({
        collection: 'legalPages',
        data: { page, ...enData } as never,
        locale: 'en',
        overrideAccess: true,
      })
      console.log(`  EN creat (#${created.id})`)
    }

    const targetId = existingId ?? (await findId(payload, page))
    if (!targetId) throw new Error(`Nu am putut regăsi documentul „${page}" pentru versiunea RO.`)

    await payload.update({
      collection: 'legalPages',
      id: targetId,
      data: roData as never,
      locale: 'ro',
      overrideAccess: true,
    })
    console.log(`  RO actualizat (#${targetId})`)
  }

  console.log(DRY_RUN ? '\nDry-run încheiat — nimic scris.' : '\nImport încheiat.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
