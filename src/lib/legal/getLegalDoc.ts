import { getPayload } from 'payload'

import config from '../../payload.config'
import type { LegalBlock, LegalDocContent } from '../../components/legal/content/types'
import type { Locale } from '../i18n/config'

/**
 * Citește o pagină legală din CMS și o întoarce în EXACT forma pe care o consumă deja
 * randorul (`LegalDocContent`).
 *
 * De ce un adaptor și nu un randor nou: componentele din `src/components/legal/` sunt cele
 * care produc paginile de azi, verificate. Traducând datele din CMS înapoi în tipul lor,
 * afișarea rămâne aceeași — singura schimbare e de unde vine textul. Un randor scris de la
 * zero ar fi introdus riscul exact acolo unde owner-ul a cerut să nu se schimbe nimic.
 *
 * Blocurile necunoscute sunt IGNORATE aici, spre deosebire de importator, care aruncă: la
 * randare, un tip nou adăugat în CMS și neimplementat în randor nu are voie să dea 500 pe o
 * pagină legală. Se pierde blocul, nu pagina.
 */

type CmsBlock = {
  blockType?: string
  text?: string | null
  items?: ({ text?: string | null } | null)[] | null
  headLeft?: string | null
  headRight?: string | null
  rows?: ({ left?: string | null; right?: string | null } | null)[] | null
  line1?: string | null
  line2?: string | null
}

const toLegalBlock = (block: CmsBlock): LegalBlock | null => {
  switch (block.blockType) {
    case 'paragraph':
      return { kind: 'p', text: block.text ?? '' }
    case 'subheading':
      return { kind: 'h3', text: block.text ?? '' }
    case 'list':
      return { kind: 'list', items: (block.items ?? []).map((i) => i?.text ?? '') }
    case 'table':
      return {
        kind: 'table',
        head: [block.headLeft ?? '', block.headRight ?? ''],
        rows: (block.rows ?? []).map((r) => [r?.left ?? '', r?.right ?? ''] as [string, string]),
      }
    case 'entity':
      return { kind: 'entity', line1: block.line1 ?? '', line2: block.line2 ?? '' }
    default:
      return null
  }
}

export const getLegalDoc = async (
  page: 'terms' | 'privacy' | 'cookies',
  locale: Locale,
): Promise<LegalDocContent | null> => {
  try {
    const payload = await getPayload({ config })
    const found = await payload.find({
      collection: 'legalPages',
      where: { page: { equals: page } },
      limit: 1,
      locale,
      fallbackLocale: 'en',
      depth: 0,
    })

    const doc = found.docs[0]
    if (!doc) return null

    const sections = (doc.sections ?? []).map((section) => ({
      // Preambulul n-are titlu; în CMS asta e un string gol, în tip e `undefined`.
      heading: section.heading?.trim() ? section.heading : undefined,
      blocks: ((section.blocks ?? []) as CmsBlock[])
        .map(toLegalBlock)
        .filter((b): b is LegalBlock => b !== null),
    }))

    // Un document fără niciun bloc nu e „conținut gol", e o interogare care n-a mers cum
    // trebuie. Mai bine cade pe varianta din cod decât să publice o pagină legală albă.
    if (sections.every((s) => s.blocks.length === 0)) return null

    return {
      titlePlain: doc.titlePlain ?? '',
      titleGradient: doc.titleGradient ?? '',
      metaTitle: doc.metaTitle ?? '',
      lastUpdated: doc.lastUpdated ?? '',
      sections,
    }
  } catch {
    return null // CMS indisponibil — pagina cade pe textul din cod
  }
}
