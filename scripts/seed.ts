import 'dotenv/config'

import { getPayload, type Payload } from 'payload'

import config from '../src/payload.config'

/**
 * Dev-only seed script — populates the DEV database (`DATABASE_URI` from `.env`, i.e. `isad`,
 * never the throwaway `isad_test` used by int tests) with realistic placeholder content so
 * the admin UI and future frontend slices (T8+) have something to render against.
 *
 * Idempotent: every document is looked up first (by slug/title/question/name — none of these
 * collections has a DB-level unique constraint beyond `courses.slug`) and only created if
 * missing, so `npm run seed` can be re-run safely without producing duplicates. Globals are
 * naturally idempotent (an `update` always overwrites, never appends).
 *
 * Run with: `npm run seed`
 */

const DAY_MS = 24 * 60 * 60 * 1000
const daysFromNow = (offsetDays: number): string => new Date(Date.now() + offsetDays * DAY_MS).toISOString()

/** Minimal valid Lexical editor state — one paragraph per string in `paragraphs`. */
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

// --- Lexical node builders for the blog seed (shapes match what the editor saves) --------

const textNode = (text: string, state?: Record<string, string>) => ({
  type: 'text',
  text,
  version: 1,
  ...(state ? { $: state } : {}),
})

const paragraph = (children: unknown[]) => ({
  type: 'paragraph',
  children,
  direction: 'ltr' as const,
  format: '' as const,
  indent: 0,
  version: 1,
})

const heading = (tag: 'h2' | 'h3', text: string) => ({
  type: 'heading',
  tag,
  children: [textNode(text)],
  direction: 'ltr' as const,
  format: '' as const,
  indent: 0,
  version: 1,
})

const blockquote = (text: string) => ({
  type: 'quote',
  children: [textNode(text)],
  direction: 'ltr' as const,
  format: '' as const,
  indent: 0,
  version: 1,
})

const uploadNode = (mediaId: number) => ({
  type: 'upload',
  version: 3,
  format: '' as const,
  relationTo: 'media',
  value: mediaId,
  fields: null,
})

/** `fields.id` must look like a bson ObjectID (24 hex chars) — same as the editor writes. */
const blockNode = (fields: Record<string, unknown>) => ({
  type: 'block',
  version: 2,
  format: '' as const,
  fields,
})

const lexicalRoot = (children: unknown[]) => ({
  root: {
    type: 'root',
    children,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

// Minimal single-page PDF — enough for a real `media` doc with application/pdf mime type.
const TINY_PDF = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj',
    'trailer<</Size 4/Root 1 0 R>>',
    '%%EOF',
  ].join('\n'),
  'utf8',
)

// 1x1 transparent PNG (same bytes as the int-test fixture) — the in-text image + cover.
const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000155273105000000004945454e44ae426082',
  'hex',
)

/** Find a media doc by its alt text (natural key), or create it from an in-memory buffer. */
async function findOrCreateMedia(
  payload: Payload,
  alt: string,
  file: { data: Buffer; mimetype: string; name: string },
): Promise<{ created: boolean; id: number }> {
  const existing = await payload.find({
    collection: 'media',
    where: { alt: { equals: alt } },
    overrideAccess: true,
    limit: 1,
  })
  if (existing.docs[0]) return { created: false, id: existing.docs[0].id }

  const doc = await payload.create({
    collection: 'media',
    data: { alt },
    file: { ...file, size: file.data.length },
    overrideAccess: true,
  })
  return { created: true, id: doc.id }
}

/**
 * Find the first doc matching `where`, or create it. Keeps the script safe to re-run.
 * Bilingual site (RO/EN): seed data is written as English (`locale: 'en'`); the Romanian
 * translation is layered on top afterwards via `withRo`.
 */
async function findOrCreate<T extends Record<string, unknown>>(
  payload: Payload,
  collection: Parameters<Payload['create']>[0]['collection'],
  where: Parameters<Payload['find']>[0]['where'],
  data: T,
): Promise<{ created: boolean; doc: Record<string, unknown> }> {
  const existing = await payload.find({ collection, where, overrideAccess: true, limit: 1, locale: 'en' })
  if (existing.docs[0]) return { created: false, doc: existing.docs[0] as unknown as Record<string, unknown> }

  const doc = await payload.create({ collection, data, overrideAccess: true, locale: 'en' } as never)
  return { created: true, doc: doc as unknown as Record<string, unknown> }
}

/**
 * Upsert the Romanian (`locale: 'ro'`) translation of a doc's LOCALIZED fields only —
 * non-localized fields are untouched (Payload merges per-field). Always overwrites on
 * re-run, mirroring how globals are seeded. `draft: true` keeps draft-only docs
 * unpublished: updating a versioned doc without it would publish it.
 */
async function withRo(
  payload: Payload,
  collection: Parameters<Payload['create']>[0]['collection'],
  id: number,
  data: Record<string, unknown>,
  opts: { draft?: boolean } = {},
): Promise<void> {
  await payload.update({
    collection,
    id,
    locale: 'ro',
    data,
    ...(opts.draft ? { draft: true } : {}),
    overrideAccess: true,
  } as never)
}

/**
 * Upsert a course session keyed by (course, capacity). Sessions have no natural text key,
 * and their dates are relative to "now", so re-runs must UPDATE (not skip) to keep the UI
 * states fresh. Capacities are deliberately distinct per course in this seed so the pair
 * acts as a stable natural key. Dev-only convenience — never used in production.
 */
async function upsertSession(
  payload: Payload,
  label: string,
  courseId: number,
  data: Record<string, unknown> & { capacity: number },
): Promise<void> {
  const existing = await payload.find({
    collection: 'courseSessions',
    where: {
      and: [{ course: { equals: courseId } }, { capacity: { equals: data.capacity } }],
    },
    overrideAccess: true,
    limit: 1,
  })

  if (existing.docs[0]) {
    await payload.update({
      collection: 'courseSessions',
      id: existing.docs[0].id,
      data: { course: courseId, ...data } as never,
      overrideAccess: true,
    })
    payload.logger.info(`[seed] session ${label}: updated`)
  } else {
    await payload.create({
      collection: 'courseSessions',
      data: { course: courseId, ...data } as never,
      overrideAccess: true,
    })
    payload.logger.info(`[seed] session ${label}: created`)
  }
}

async function seed() {
  const payload = await getPayload({ config })
  const log = (message: string) => payload.logger.info(`[seed] ${message}`)

  // --- Published course: ISO/IEC 42001:2023 preparation training -----------------------
  const courseTitle = 'ISO/IEC 42001:2023 — AI Management Systems (preparation training)'
  const { doc: course, created: courseCreated } = await findOrCreate(
    payload,
    'courses',
    { slug: { equals: 'iso-iec-42001-2023-ai-management-systems-preparation-training' } },
    {
      title: courseTitle,
      _status: 'published',
      durationHours: 16,
      category: 'iso',
      description: richText([
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit — sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. [Placeholder copy, pending Silviu review — CLAUDE.md §15.]',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
      ]),
      audience: [
        { text: 'Lorem ipsum: Compliance officers overseeing AI systems. [Placeholder — pending Silviu confirmation]' },
        { text: 'Lorem ipsum: Risk and audit professionals entering AI governance. [Placeholder]' },
        { text: 'Lorem ipsum: Technical leads preparing for ISO/IEC 42001 readiness. [Placeholder]' },
      ],
    },
  )
  log(`course "${courseTitle}": ${courseCreated ? 'created' : 'already exists, skipped'}`)

  // RO translation (bilingual site RO/EN) — localized fields only
  await withRo(payload, 'courses', course.id as number, {
    title: 'ISO/IEC 42001:2023 — Sisteme de management al inteligenței artificiale (curs de pregătire)',
    description: richText([
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit — sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. [Text substituent, în așteptarea verificării lui Silviu — CLAUDE.md §15.]',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
    ]),
    audience: [
      { text: 'Lorem ipsum: Ofițeri de conformitate care supraveghează sisteme AI. [Substituent — în așteptarea confirmării lui Silviu]' },
      { text: 'Lorem ipsum: Profesioniști în risc și audit care intră în guvernanța AI. [Substituent]' },
      { text: 'Lorem ipsum: Lideri tehnici care pregătesc organizația pentru ISO/IEC 42001. [Substituent]' },
    ],
  })

  // --- Draft course ----------------------------------------------------------------------
  const draftTitle = 'Anti-Fraud Fundamentals for Financial Institutions'
  const { doc: draftCourse, created: draftCreated } = await findOrCreate(
    payload,
    'courses',
    { slug: { equals: 'anti-fraud-fundamentals-for-financial-institutions' } },
    {
      title: draftTitle,
      _status: 'draft',
      durationHours: 12,
      category: 'antiFraud',
      description: richText([
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. [Placeholder copy, pending Silviu review — CLAUDE.md §15.]',
      ]),
      audience: [{ text: 'Lorem ipsum: Fraud investigation teams. [Placeholder]' }],
    },
  )
  log(`draft course "${draftTitle}": ${draftCreated ? 'created' : 'already exists, skipped'}`)

  // RO translation — `draft: true` so the course stays unpublished
  await withRo(
    payload,
    'courses',
    draftCourse.id as number,
    {
      title: 'Fundamente antifraudă pentru instituții financiare',
      description: richText([
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. [Text substituent, în așteptarea verificării lui Silviu — CLAUDE.md §15.]',
      ]),
      audience: [{ text: 'Lorem ipsum: Echipe de investigare a fraudelor. [Substituent]' }],
    },
    { draft: true },
  )

  // --- Second published course (later start date — makes catalog sorting testable) --------
  const course2Title = 'AI Risk Management Foundations'
  const { doc: course2, created: course2Created } = await findOrCreate(
    payload,
    'courses',
    { slug: { equals: 'ai-risk-management-foundations' } },
    {
      title: course2Title,
      _status: 'published',
      durationHours: 8,
      category: 'iso',
      description: richText([
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit — sed do eiusmod tempor incididunt ut labore. [Placeholder copy, pending Silviu review — CLAUDE.md §15.]',
      ]),
      audience: [
        { text: 'Lorem ipsum: Managers building an AI risk register. [Placeholder]' },
        { text: 'Lorem ipsum: Analysts new to AI governance. [Placeholder]' },
      ],
    },
  )
  log(`course "${course2Title}": ${course2Created ? 'created' : 'already exists, skipped'}`)

  // RO translation
  await withRo(payload, 'courses', course2.id as number, {
    title: 'Fundamentele managementului riscurilor AI',
    description: richText([
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit — sed do eiusmod tempor incididunt ut labore. [Text substituent, în așteptarea verificării lui Silviu — CLAUDE.md §15.]',
    ]),
    audience: [
      { text: 'Lorem ipsum: Manageri care construiesc un registru de riscuri AI. [Substituent]' },
      { text: 'Lorem ipsum: Analiști la început de drum în guvernanța AI. [Substituent]' },
    ],
  })

  // --- Sessions (upserted by course + capacity — see upsertSession) -----------------------
  // A — upcoming, Early Bird active, 4 of 10 seats left (< default threshold 5)
  await upsertSession(payload, 'A (upcoming, EB active, 4 seats left)', course.id as number, {
    startDate: daysFromNow(45),
    schedule: [
      { date: daysFromNow(45), startTime: '09:00', endTime: '17:00' },
      { date: daysFromNow(46), startTime: '09:00', endTime: '17:00' },
    ],
    capacity: 10,
    seatsSold: 6,
    earlyBird: { price: 900, priceRON: 4500, startDate: daysFromNow(-5), endDate: daysFromNow(20) },
    standard: { price: 1200, priceRON: 6000, startDate: daysFromNow(21), endDate: daysFromNow(44) },
  })

  // B — future, no active price window ("Enrolment coming soon")
  await upsertSession(payload, 'B (future, no active window)', course.id as number, {
    startDate: daysFromNow(120),
    schedule: [{ date: daysFromNow(120), startTime: '09:00', endTime: '17:00' }],
    capacity: 15,
    seatsSold: 0,
    earlyBird: { price: 900, priceRON: 4500, startDate: daysFromNow(90), endDate: daysFromNow(100) },
    standard: { price: 1200, priceRON: 6000, startDate: daysFromNow(101), endDate: daysFromNow(119) },
  })

  // C — sold out (future date, active standard window, 0 seats remaining)
  await upsertSession(payload, 'C (sold out)', course.id as number, {
    startDate: daysFromNow(30),
    schedule: [{ date: daysFromNow(30), startTime: '09:00', endTime: '17:00' }],
    capacity: 5,
    seatsSold: 5,
    standard: { price: 1200, priceRON: 6000, startDate: daysFromNow(-5), endDate: daysFromNow(29) },
  })

  // D — past edition (ran last month)
  await upsertSession(payload, 'D (past)', course.id as number, {
    startDate: daysFromNow(-31),
    schedule: [
      { date: daysFromNow(-31), startTime: '09:00', endTime: '17:00' },
      { date: daysFromNow(-30), startTime: '09:00', endTime: '17:00' },
    ],
    capacity: 12,
    seatsSold: 9,
    earlyBird: { price: 900, priceRON: 4500, startDate: daysFromNow(-75), endDate: daysFromNow(-55) },
    standard: { price: 1200, priceRON: 6000, startDate: daysFromNow(-54), endDate: daysFromNow(-32) },
  })

  // E — second course: upcoming, standard window active, no Early Bird (no EB badge)
  await upsertSession(payload, 'E (course 2, standard active)', course2.id as number, {
    startDate: daysFromNow(75),
    schedule: [
      { date: daysFromNow(75), startTime: '09:00', endTime: '13:00' },
      { date: daysFromNow(76), startTime: '09:00', endTime: '13:00' },
    ],
    capacity: 12,
    seatsSold: 0,
    standard: { price: 800, priceRON: 4000, startDate: daysFromNow(-5), endDate: daysFromNow(74) },
  })

  // --- Discount codes (T15 — E2E valid-code purchase flow) -------------------------------
  // `WELCOME10`: general 10% code, active, no expiry, plenty of headroom under its usage
  // limit — tests/e2e/critical-flows.spec.ts applies it on a real checkout twice per run
  // (two different buyer emails) and asserts the observable discount + seat decrement.
  // Natural key = `code` (DB-unique). Only created once: `usageCount` is intentionally left
  // alone on re-seed (idempotent create, never reset) so accumulating e2e runs never
  // silently "un-use" a code that a previous run already exercised — usageLimit (100) is far
  // above what repeated local/CI runs could plausibly exhaust.
  // (`EXPIRED10` is deliberately NOT seeded: the "expired code" outcome is already covered
  // at unit level — tests/unit/pricing/* — and int level — tests/int/checkout.int.spec.ts,
  // tests/int/checkout-quote.int.spec.ts — so an e2e fixture for it would only duplicate
  // coverage without exercising anything new in the browser layer.)
  const { created: welcome10Created } = await findOrCreate(
    payload,
    'discountCodes',
    { code: { equals: 'WELCOME10' } },
    { code: 'WELCOME10', percentage: 10, type: 'general', isActive: true, usageLimit: 100 },
  )
  log(`discount code "WELCOME10": ${welcome10Created ? 'created' : 'already exists, skipped'}`)

  // --- Reviews (only `text` is localized — author/role stay as-is) -------------------------
  const reviews = [
    {
      text: "The course gave our compliance team a clear, practical path toward ISO/IEC 42001 readiness.",
      textRo: 'Cursul a oferit echipei noastre de conformitate un parcurs clar și practic către pregătirea pentru ISO/IEC 42001.',
      authorName: 'Maria Ionescu',
      roleCompany: 'Head of Compliance, Acme Bank',
      source: 'manual',
      showOnHome: true,
      course: course.id,
    },
    {
      text: "Dr. Gresoi's real-world anti-fraud experience made the live sessions incredibly practical.",
      textRo: 'Experiența reală în antifraudă a Dr. Gresoi a făcut sesiunile live incredibil de practice.',
      authorName: 'Andrei Popescu',
      roleCompany: 'Risk Manager, First National',
      source: 'emailForm',
      showOnHome: true,
      course: course.id,
    },
    {
      text: 'Good overview of the AI management framework — would recommend to technical teams.',
      textRo: 'O bună trecere în revistă a cadrului de management al AI — l-aș recomanda echipelor tehnice.',
      authorName: 'Elena Radu',
      roleCompany: 'IT Lead, TechCorp',
      source: 'manual',
      showOnHome: false,
    },
  ]
  for (const { textRo, ...review } of reviews) {
    const { created, doc } = await findOrCreate(payload, 'reviews', { text: { equals: review.text } }, review)
    await withRo(payload, 'reviews', doc.id as number, { text: textRo })
    log(`review by "${review.authorName}": ${created ? 'created' : 'already exists, skipped'}`)
  }

  // --- Partners ------------------------------------------------------------------------------
  const partners = [
    { name: 'APCF', url: 'https://apcf.ro', order: 1, type: 'accreditation' },
    { name: 'AI Expo Europe', url: 'https://example.com/ai-expo-europe', order: 2, type: 'trainingPartner' },
  ]
  for (const partner of partners) {
    const { created } = await findOrCreate(payload, 'partners', { name: { equals: partner.name } }, partner)
    log(`partner "${partner.name}": ${created ? 'created' : 'already exists, skipped'}`)
  }

  // --- Corporate clients -----------------------------------------------------------------
  const corporateClients = [
    { name: 'Acme Bank', order: 1 },
    { name: 'First National', order: 2 },
  ]
  for (const client of corporateClients) {
    const { created } = await findOrCreate(payload, 'corporateClients', { name: { equals: client.name } }, client)
    log(`corporate client "${client.name}": ${created ? 'created' : 'already exists, skipped'}`)
  }

  // --- FAQ items (question + answer localized) -----------------------------------------------
  const faqItems = [
    {
      question: 'Is the ISO/IEC 42001 certificate accredited?',
      answer: richText([
        'isad.academy courses are training that prepares you for ISO/IEC 42001:2023. You receive a certificate of completion issued by APCF, together with CPD credits — not an accredited ISO certification.',
      ]),
      order: 1,
      ro: {
        question: 'Este certificatul ISO/IEC 42001 acreditat?',
        answer: richText([
          'Cursurile isad.academy sunt programe de pregătire pentru ISO/IEC 42001:2023. Primești un certificat de absolvire emis de APCF, împreună cu credite CPD — nu o certificare ISO acreditată.',
        ]),
      },
    },
    {
      question: 'How are the courses delivered?',
      answer: richText(['All courses are delivered live, 1:1, on Google Meet — never pre-recorded.']),
      order: 2,
      ro: {
        question: 'Cum sunt livrate cursurile?',
        answer: richText(['Toate cursurile sunt livrate live, 1:1, pe Google Meet — niciodată preînregistrate.']),
      },
    },
    {
      question: 'What are CPD credits?',
      answer: richText([
        'CPD (Continuing Professional Development) credits recognize the hours you have invested in professional training.',
      ]),
      order: 3,
      ro: {
        question: 'Ce sunt creditele CPD?',
        answer: richText([
          'Creditele CPD (Continuing Professional Development — dezvoltare profesională continuă) recunosc orele investite în formarea profesională.',
        ]),
      },
    },
  ]
  for (const { ro, ...faq } of faqItems) {
    const { created, doc } = await findOrCreate(payload, 'faqItems', { question: { equals: faq.question } }, faq)
    await withRo(payload, 'faqItems', doc.id as number, ro)
    log(`FAQ "${faq.question}": ${created ? 'created' : 'already exists, skipped'}`)
  }

  // --- Blog media (natural key = alt text) -------------------------------------------------
  const pdfMedia = await findOrCreateMedia(payload, 'ISO/IEC 42001 readiness checklist (placeholder PDF)', {
    data: TINY_PDF,
    mimetype: 'application/pdf',
    name: 'iso-42001-readiness-checklist.pdf',
  })
  log(`media "readiness checklist PDF": ${pdfMedia.created ? 'created' : 'already exists, skipped'}`)

  const imageMedia = await findOrCreateMedia(payload, 'Illustration: AI governance building blocks (placeholder)', {
    data: TINY_PNG,
    mimetype: 'image/png',
    name: 'ai-governance-illustration.png',
  })
  log(`media "AI governance illustration": ${imageMedia.created ? 'created' : 'already exists, skipped'}`)

  // Distinct doc from the in-text illustration so alt texts stay unambiguous on the page.
  const coverMedia = await findOrCreateMedia(payload, 'Cover: ISO/IEC 42001 article (placeholder)', {
    data: TINY_PNG,
    mimetype: 'image/png',
    name: 'iso-42001-article-cover.png',
  })
  log(`media "ISO article cover": ${coverMedia.created ? 'created' : 'already exists, skipped'}`)

  // --- Blog posts (T12) ---------------------------------------------------------------------
  // Post 2 is created FIRST (and with an explicit older `createdAt`) so the /blog list —
  // sorted by createdAt desc — always shows post 1 on top. [Demo articles pending Silviu's
  // real content — CLAUDE.md §15.]
  const post2Title = 'Five questions to ask before your first AI audit'
  const { doc: post2, created: post2Created } = await findOrCreate(
    payload,
    'blogPosts',
    { slug: { equals: 'five-questions-to-ask-before-your-first-ai-audit' } },
    {
      title: post2Title,
      _status: 'published',
      createdAt: daysFromNow(-21),
      excerpt:
        'A short pre-audit checklist: the five questions that surface most AI governance gaps before an auditor does.',
      // No coverImage on purpose — exercises the imageless card on /blog.
      body: lexicalRoot([
        paragraph([
          textNode(
            'Before an auditor walks through your AI inventory, walk through it yourself. These five questions surface the gaps that show up most often in first-time AI audits. [Placeholder demo article — pending Silviu review.]',
          ),
        ]),
        paragraph([
          textNode(
            'Who owns each AI system? What data does it touch? How are decisions reviewed? When was the risk register last updated? And who gets called when the model misbehaves?',
          ),
        ]),
      ]),
      leadMagnet: { enabled: true, file: pdfMedia.id },
    },
  )
  log(`blog post "${post2Title}": ${post2Created ? 'created' : 'already exists, skipped'}`)

  // RO translation — same Lexical node structure, only the copy changes
  await withRo(payload, 'blogPosts', post2.id as number, {
    title: 'Cinci întrebări de pus înainte de primul audit AI',
    excerpt:
      'O scurtă listă de verificare pre-audit: cele cinci întrebări care scot la iveală cele mai multe lacune de guvernanță AI înaintea unui auditor.',
    body: lexicalRoot([
      paragraph([
        textNode(
          'Înainte ca un auditor să îți parcurgă inventarul AI, parcurge-l tu. Aceste cinci întrebări scot la iveală lacunele care apar cel mai des la primele audituri AI. [Articol demonstrativ substituent — în așteptarea verificării lui Silviu.]',
        ),
      ]),
      paragraph([
        textNode(
          'Cine deține fiecare sistem AI? Ce date atinge? Cum sunt revizuite deciziile? Când a fost actualizat ultima dată registrul de riscuri? Și cine este chemat atunci când modelul se comportă greșit?',
        ),
      ]),
    ]),
  })

  const post1Title = 'What ISO/IEC 42001 means for your AI governance'
  const { doc: post1, created: post1Created } = await findOrCreate(
    payload,
    'blogPosts',
    { slug: { equals: 'what-iso-iec-42001-means-for-your-ai-governance' } },
    {
      title: post1Title,
      _status: 'published',
      excerpt:
        'ISO/IEC 42001:2023 is the first management-system standard for AI. Here is what it covers — and how to prepare.',
      coverImage: coverMedia.id,
      relatedCourse: course.id,
      // readingTime deliberately omitted — the beforeChange hook auto-estimates it.
      body: lexicalRoot([
        paragraph([
          textNode('ISO/IEC 42001:2023 is the first '),
          textNode('management-system standard for AI', { color: 'blue' }),
          textNode(' — it does for AI governance what ISO 27001 did for information security. Preparing for it early gives your organisation a '),
          textNode('structured, auditable way', { color: 'aqua' }),
          textNode(
            ' to run AI responsibly. [Placeholder demo article — pending Silviu review.]',
          ),
        ]),
        heading('h2', 'Why it matters now'),
        paragraph([
          textNode(
            'Regulators, customers and boards are all asking the same question: who is accountable for your AI systems? An AI management system gives that question a documented answer.',
          ),
        ]),
        blockquote(
          'Governance is not about slowing AI down — it is about being able to prove, at any moment, that you know what your AI is doing.',
        ),
        uploadNode(imageMedia.id),
        heading('h2', 'Where to start'),
        paragraph([
          textNode(
            'Start with an inventory of AI systems, name an owner for each, and map the risks. Training that prepares you for ISO/IEC 42001 turns that starting point into a full readiness plan.',
          ),
        ]),
        blockNode({
          id: '665f00000000000000000001',
          blockName: '',
          blockType: 'linkChip',
          label: 'Watch the standard explained',
          url: 'https://www.youtube.com/watch?v=isad42001intro',
          platform: 'youtube',
        }),
        blockNode({
          id: '665f00000000000000000002',
          blockName: '',
          blockType: 'downloadableResource',
          title: 'ISO/IEC 42001 readiness checklist',
          description: 'A one-page checklist to gauge how prepared your organisation is.',
          file: pdfMedia.id,
        }),
      ]),
    },
  )
  log(`blog post "${post1Title}": ${post1Created ? 'created' : 'already exists, skipped'}`)

  // RO translation — identical node structure (colors, upload, blocks: same ids/urls/files)
  await withRo(payload, 'blogPosts', post1.id as number, {
    title: 'Ce înseamnă ISO/IEC 42001 pentru guvernanța AI din organizația ta',
    excerpt:
      'ISO/IEC 42001:2023 este primul standard de sistem de management pentru AI. Iată ce acoperă — și cum te poți pregăti.',
    body: lexicalRoot([
      paragraph([
        textNode('ISO/IEC 42001:2023 este primul '),
        textNode('standard de sistem de management pentru AI', { color: 'blue' }),
        textNode(' — face pentru guvernanța AI ceea ce ISO 27001 a făcut pentru securitatea informației. Pregătirea din timp oferă organizației tale o '),
        textNode('modalitate structurată și auditabilă', { color: 'aqua' }),
        textNode(
          ' de a utiliza AI în mod responsabil. [Articol demonstrativ substituent — în așteptarea verificării lui Silviu.]',
        ),
      ]),
      heading('h2', 'De ce contează acum'),
      paragraph([
        textNode(
          'Autoritățile de reglementare, clienții și consiliile de administrație pun aceeași întrebare: cine răspunde de sistemele voastre AI? Un sistem de management al AI oferă acestei întrebări un răspuns documentat.',
        ),
      ]),
      blockquote(
        'Guvernanța nu înseamnă să încetinești AI-ul — înseamnă să poți dovedi, în orice moment, că știi ce face AI-ul tău.',
      ),
      uploadNode(imageMedia.id),
      heading('h2', 'De unde să începi'),
      paragraph([
        textNode(
          'Începe cu un inventar al sistemelor AI, numește un responsabil pentru fiecare și cartografiază riscurile. Un curs care te pregătește pentru ISO/IEC 42001 transformă acest punct de plecare într-un plan complet de pregătire.',
        ),
      ]),
      blockNode({
        id: '665f00000000000000000001',
        blockName: '',
        blockType: 'linkChip',
        label: 'Vezi standardul explicat',
        url: 'https://www.youtube.com/watch?v=isad42001intro',
        platform: 'youtube',
      }),
      blockNode({
        id: '665f00000000000000000002',
        blockName: '',
        blockType: 'downloadableResource',
        title: 'Listă de verificare a pregătirii pentru ISO/IEC 42001',
        description: 'O listă de verificare de o pagină pentru a evalua cât de pregătită este organizația ta.',
        file: pdfMedia.id,
      }),
    ]),
  })

  const draftPostTitle = 'Draft: upcoming trends'
  const { doc: draftPost, created: draftPostCreated } = await findOrCreate(
    payload,
    'blogPosts',
    { slug: { equals: 'draft-upcoming-trends' } },
    {
      title: draftPostTitle,
      _status: 'draft',
      excerpt: 'Not published yet — must 404 publicly.',
      body: lexicalRoot([
        paragraph([textNode('Work in progress. [Placeholder draft — pending Silviu review.]')]),
      ]),
    },
  )
  log(`draft blog post "${draftPostTitle}": ${draftPostCreated ? 'created' : 'already exists, skipped'}`)

  // RO translation — `draft: true` so the post keeps 404-ing publicly
  await withRo(
    payload,
    'blogPosts',
    draftPost.id as number,
    {
      title: 'Ciornă: tendințe viitoare',
      excerpt: 'Nepublicat încă — trebuie să returneze 404 public.',
      body: lexicalRoot([
        paragraph([textNode('Lucrare în curs. [Ciornă substituent — în așteptarea verificării lui Silviu.]')]),
      ]),
    },
    { draft: true },
  )

  // --- expertBio global ------------------------------------------------------------------
  await payload.updateGlobal({
    slug: 'expertBio',
    data: {
      name: 'Dr. Silviu Gresoi, PhD, CFE',
      title: 'Senior Solution Consultant & Fraud Practice Lead | AI, Risk & Financial Crime Expert',
      shortBio:
        'International consultant, trainer, and speaker with over 20 years of experience helping organizations leverage Artificial Intelligence, Governance, Risk Management, and Financial Crime solutions to solve real-world challenges.',
      fullBio: richText([
        'Dr. Silviu Gresoi has spent over 21 years working in anti-fraud, risk management and data analytics across the banking and energy sectors, including roles at BancPost, Banca Românească, Garanti Bank and First Bank. [TO CONFIRM — EN copy pending Silviu review, CLAUDE.md §4/§15]',
        'He is a Certified Fraud Examiner (CFE, 2014) and holds a PhD in AI & Machine Learning from Politehnica Bucharest. He has spoken at AI Expo Europe and AI Summit Europe. [TO CONFIRM]',
      ]),
      credentials: [
        { label: 'Certification', value: 'CFE (Certified Fraud Examiner), 2014' },
        { label: 'Education', value: 'PhD, AI & Machine Learning — Politehnica Bucharest' },
        { label: 'Experience', value: '21+ years in Anti-Fraud, Risk Management & Data Analytics' },
        { label: 'Speaking', value: 'AI Expo Europe, AI Summit Europe' },
      ],
    },
    overrideAccess: true,
    locale: 'en',
  })
  // RO translation — localized fields only (`name` is not localized)
  await payload.updateGlobal({
    slug: 'expertBio',
    locale: 'ro',
    data: {
      title: 'Consultant senior de soluții & lider al practicii antifraudă | Expert AI, risc și criminalitate financiară',
      shortBio:
        'Consultant internațional, trainer și speaker cu peste 20 de ani de experiență, care ajută organizațiile să valorifice soluții de inteligență artificială, guvernanță, management al riscului și combatere a criminalității financiare pentru a rezolva provocări reale.',
      fullBio: richText([
        'Dr. Silviu Gresoi a lucrat peste 21 de ani în antifraudă, managementul riscului și analiza datelor, în sectorul bancar și în cel energetic, inclusiv în roluri la BancPost, Banca Românească, Garanti Bank și First Bank. [DE CONFIRMAT — copy în așteptarea verificării lui Silviu, CLAUDE.md §4/§15]',
        'Este Certified Fraud Examiner (CFE, 2014) și deține un doctorat în AI & Machine Learning la Politehnica București. A susținut prezentări la AI Expo Europe și AI Summit Europe. [DE CONFIRMAT]',
      ]),
      credentials: [
        { label: 'Certificare', value: 'CFE (Certified Fraud Examiner), 2014' },
        { label: 'Educație', value: 'Doctorat, AI & Machine Learning — Politehnica București' },
        { label: 'Experiență', value: '21+ ani în antifraudă, managementul riscului și analiza datelor' },
        { label: 'Conferințe', value: 'AI Expo Europe, AI Summit Europe' },
      ],
    },
    overrideAccess: true,
  })
  log('expertBio global: upserted [TO CONFIRM placeholders — CLAUDE.md §4/§15]')

  // --- certificationInfo global (conservative R2 wording) ---------------------------------
  await payload.updateGlobal({
    slug: 'certificationInfo',
    data: {
      issuer: 'PECB',
      description: richText([
        'isad.academy delivers training that prepares you for ISO/IEC 42001:2023 (AI Management Systems). For PECB courses, participants are enrolled in the PECB platform after payment and obtain their certification directly from PECB. Every course carries CPD credits — one credit per training hour. Courses developed by isad.academy finish with a certificate of completion.',
      ]),
      process: [
        { title: 'Enrol', description: 'Reserve your seat in a live, 1:1 session with Dr. Silviu Gresoi.' },
        { title: 'Attend', description: 'Join the scheduled live sessions on Google Meet and complete the course.' },
        { title: 'Receive your certificate', description: 'Obtain your certification directly through PECB, plus CPD credits — one per training hour.' },
      ],
    },
    overrideAccess: true,
    locale: 'en',
  })
  // RO translation — localized fields only (`issuer` is not localized)
  await payload.updateGlobal({
    slug: 'certificationInfo',
    locale: 'ro',
    data: {
      description: richText([
        'isad.academy livrează cursuri care te pregătesc pentru ISO/IEC 42001:2023 (sisteme de management al inteligenței artificiale). Pentru cursurile PECB, participanții sunt înrolați în platforma PECB după plată și obțin certificarea direct de la PECB. Fiecare curs oferă credite CPD — un credit pentru fiecare oră de curs. Cursurile dezvoltate de isad.academy se încheie cu un certificat de absolvire.',
      ]),
      process: [
        { title: 'Înscrie-te', description: 'Rezervă-ți locul într-o sesiune live, 1:1, cu Dr. Silviu Gresoi.' },
        { title: 'Participă', description: 'Alătură-te sesiunilor live programate pe Google Meet și finalizează cursul.' },
        { title: 'Primește-ți certificatul', description: 'Obții certificarea direct prin PECB, plus credite CPD — unul pentru fiecare oră de curs.' },
      ],
    },
    overrideAccess: true,
  })
  log('certificationInfo global: upserted (conservative R2 wording)')

  // --- homepage global ---------------------------------------------------------------------
  await payload.updateGlobal({
    slug: 'homepage',
    data: {
      hero: {
        // Copy from the client's Figma hero design (node 3640-2876, 2026-07-11)
        title: 'Learn AI, Data Analysis & Fraud Prevention',
        subtitle: 'Develop practical skills to face the world challenges.',
        ctaText: 'Get your certificate today',
        ctaLink: '/cursuri',
      },
      featuredCourses: [course.id as number, course2.id as number],
      whyIsad: {
        stats: [
          // D5 (discovery doc, iulie 2026) — proposed metrics, "to be finalized before launch"
          { value: '20+', label: 'Years of experience' },
          { value: '2,000+', label: 'Companies served' },
          { value: '100+', label: 'Training sessions delivered' },
          { value: 'International', label: 'Projects delivered' },
        ],
        differentiators: [
          {
            title: 'Live, not recorded',
            text: 'Every session is taught live, 1:1, on Google Meet — no pre-recorded videos.',
          },
          {
            title: 'Real-world expertise',
            text: 'Training led by a PhD-level anti-fraud and AI governance practitioner.',
          },
        ],
      },
      newsletter: {
        headline: 'Stay ahead of AI governance & compliance',
        invitationText: 'Get new articles and course announcements in your inbox.',
      },
    },
    overrideAccess: true,
    locale: 'en',
  })
  // RO translation — localized fields only (ctaLink / featuredCourses are not localized)
  await payload.updateGlobal({
    slug: 'homepage',
    locale: 'ro',
    data: {
      hero: {
        title: 'Învață AI, analiză de date și prevenirea fraudei',
        subtitle: 'Dezvoltă competențe practice pentru provocările lumii de azi.',
        ctaText: 'Obține-ți certificatul astăzi',
      },
      whyIsad: {
        stats: [
          { value: '20+', label: 'Ani de experiență' },
          { value: '2.000+', label: 'Companii deservite' },
          { value: '100+', label: 'Sesiuni de training livrate' },
          { value: 'Internaționale', label: 'Proiecte livrate' },
        ],
        differentiators: [
          {
            title: 'Live, nu înregistrat',
            text: 'Fiecare sesiune este predată live, 1:1, pe Google Meet — fără videoclipuri preînregistrate.',
          },
          {
            title: 'Expertiză din practică',
            text: 'Training susținut de un practician cu doctorat, specializat în antifraudă și guvernanța AI.',
          },
        ],
      },
      newsletter: {
        headline: 'Rămâi cu un pas înainte în guvernanța AI și conformitate',
        invitationText: 'Primește articole noi și anunțuri despre cursuri direct în inbox.',
      },
    },
    overrideAccess: true,
  })
  log('homepage global: upserted')

  // --- siteSettings global (T14) -----------------------------------------------------------
  // Dev/e2e only — a fake GA4 ID so the consent-gating E2E tests have something to gate
  // (no script may load before accept; the tag must appear after accept). Production values
  // come from the real dashboard/env (CLAUDE.md §2), never from this seed. Payload merges
  // partial updates per-field, so the other siteSettings fields keep their values/defaults.
  await payload.updateGlobal({
    slug: 'siteSettings',
    data: {
      analytics: { ga4Id: 'G-TESTLOCAL1' },
      // Confirmed in the discovery answers doc (2026-07): B3 stacking, B2 VAT, A1 entity
      stackingPolicy: 'stackAll',
      vatDisplay: 'excl',
      legalEntity: { name: 'International Security and Defence SRL (ISAD)', cui: '44849076' },
    },
    overrideAccess: true,
  })
  log('siteSettings global: analytics.ga4Id set to G-TESTLOCAL1 (dev/e2e gating tests)')


  // --- legalPages (owner request 2026-07-12): CMS-editable legal content ---------------
  // Structure modeled on the reference examples; REAL data from the discovery answers doc
  // (entity ISAD SRL / CUI 44849076, A3 refund rules, PECB certification, no VAT, RON/EUR);
  // everything else is a marked placeholder until Silviu delivers the final legal texts (A2).
  // Each doc carries its full RO translation under `ro` (legal texts → the first RO section
  // heading is suffixed "(traducere orientativă — necesită revizuire juridică)").
  const legalDocs: {
    page: 'privacy' | 'cookies' | 'terms'
    title: string
    intro: string
    sections: { heading: string; body: ReturnType<typeof richText> }[]
    ro: {
      title: string
      intro: string
      sections: { heading: string; body: ReturnType<typeof richText> }[]
    }
  }[] = [
    {
      page: 'privacy',
      title: 'Privacy Policy',
      intro: 'How isad.academy processes personal data, why, and the rights you have.',
      sections: [
        { heading: '1. General aspects', body: richText([
          'International Security and Defence SRL (ISAD) respects the privacy of the users of isad.academy and is committed to protecting personal data in accordance with Regulation (EU) 2016/679 (GDPR) and applicable Romanian legislation.',
          '[Placeholder — final legal wording pending from Silviu (discovery A2).]',
        ]) },
        { heading: '2. Data controller', body: richText([
          'Controller: International Security and Defence SRL (ISAD), CUI 44849076.',
          'Registered address and GDPR contact e-mail: [Placeholder — pending].',
        ]) },
        { heading: '3. Data we process', body: richText([
          'Orders and checkout: buyer name, e-mail, phone and, for companies, company name, CUI and address; the name and e-mail of each named participant.',
          'Contact and corporate forms: name, e-mail, phone, message and the details you submit.',
          'Newsletter: e-mail address, with double opt-in confirmation (processed through Brevo, EU-hosted).',
          'Technical data: country-level location derived from your IP (used only to display prices in RON for Romania and EUR elsewhere), plus cookie and consent preferences described in the Cookie Policy.',
        ]) },
        { heading: '4. Purposes and legal bases', body: richText([
          'Contract performance: processing orders, delivering live sessions, sending the Google Meet invitation and enrolling participants in the PECB platform for PECB courses.',
          'Legal obligation: issuing and keeping invoices and accounting records.',
          'Consent: newsletter and analytics cookies (Google Analytics 4, only after you accept).',
          'Legitimate interest: site security, fraud prevention and answering your requests.',
          '[Placeholder — retention periods pending final legal text.]',
        ]) },
        { heading: '5. Recipients', body: richText([
          'Brevo (transactional and marketing e-mail, EU), the payment processor (to be confirmed — a mock provider is used in development), SmartBill (invoicing, planned), PECB (course enrolment for certification) and our hosting/infrastructure providers.',
        ]) },
        { heading: '6. Your rights', body: richText([
          'Under GDPR you have the right of access (art. 15), rectification (art. 16), erasure (art. 17), restriction (art. 18), data portability (art. 20), objection (art. 21), the right not to be subject to solely automated decisions (art. 22), the right to withdraw consent at any time and the right to lodge a complaint with ANSPDCP (art. 77).',
        ]) },
        { heading: '7. Exercising your rights', body: richText([
          'Requests are answered within one month, extendable by two months for complex requests, as permitted by GDPR. Contact: [Placeholder — GDPR e-mail pending].',
        ]) },
        { heading: '8. Supervisory authority (ANSPDCP)', body: richText([
          'Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal — B-dul General Gheorghe Magheru nr. 28-30, Sector 1, București, 010336, România; anspdcp@dataprotection.ro.',
        ]) },
      ],
      ro: {
        title: 'Politica de confidențialitate',
        intro: 'Cum prelucrează isad.academy datele cu caracter personal, în ce scopuri și ce drepturi ai.',
        sections: [
          { heading: '1. Aspecte generale (traducere orientativă — necesită revizuire juridică)', body: richText([
            'International Security and Defence SRL (ISAD) respectă confidențialitatea utilizatorilor isad.academy și se angajează să protejeze datele cu caracter personal în conformitate cu Regulamentul (UE) 2016/679 (GDPR) și cu legislația română aplicabilă.',
            '[Substituent — formularea juridică finală urmează de la Silviu (discovery A2).]',
          ]) },
          { heading: '2. Operatorul de date', body: richText([
            'Operator: International Security and Defence SRL (ISAD), CUI 44849076.',
            'Sediul social și adresa de e-mail pentru solicitări GDPR: [Substituent — în așteptare].',
          ]) },
          { heading: '3. Datele pe care le prelucrăm', body: richText([
            'Comenzi și checkout: numele, e-mailul și telefonul cumpărătorului și, pentru companii, denumirea companiei, CUI-ul și adresa; numele și e-mailul fiecărui participant nominalizat.',
            'Formularele de contact și corporate: nume, e-mail, telefon, mesaj și detaliile pe care le transmiți.',
            'Newsletter: adresa de e-mail, cu confirmare double opt-in (prelucrată prin Brevo, găzduit în UE).',
            'Date tehnice: localizarea la nivel de țară derivată din adresa IP (folosită doar pentru a afișa prețurile în RON pentru România și în EUR în rest), plus preferințele privind cookie-urile și consimțământul, descrise în Politica de cookie-uri.',
          ]) },
          { heading: '4. Scopuri și temeiuri legale', body: richText([
            'Executarea contractului: procesarea comenzilor, livrarea sesiunilor live, trimiterea invitației Google Meet și înrolarea participanților în platforma PECB pentru cursurile PECB.',
            'Obligație legală: emiterea și păstrarea facturilor și a evidențelor contabile.',
            'Consimțământ: newsletterul și cookie-urile de analiză (Google Analytics 4, doar după ce accepți).',
            'Interes legitim: securitatea site-ului, prevenirea fraudelor și răspunsul la solicitările tale.',
            '[Substituent — perioadele de păstrare urmează în textul juridic final.]',
          ]) },
          { heading: '5. Destinatari', body: richText([
            'Brevo (e-mail tranzacțional și de marketing, UE), procesatorul de plăți (de confirmat — în dezvoltare se folosește un furnizor mock), SmartBill (facturare, planificat), PECB (înrolarea la cursuri pentru certificare) și furnizorii noștri de găzduire/infrastructură.',
          ]) },
          { heading: '6. Drepturile tale', body: richText([
            'Conform GDPR ai dreptul de acces (art. 15), de rectificare (art. 16), de ștergere (art. 17), de restricționare (art. 18), la portabilitatea datelor (art. 20), de opoziție (art. 21), dreptul de a nu face obiectul unor decizii exclusiv automatizate (art. 22), dreptul de a-ți retrage consimțământul în orice moment și dreptul de a depune o plângere la ANSPDCP (art. 77).',
          ]) },
          { heading: '7. Exercitarea drepturilor', body: richText([
            'Solicitările primesc răspuns în termen de o lună, cu posibilitatea prelungirii cu două luni pentru cererile complexe, conform GDPR. Contact: [Substituent — e-mail GDPR în așteptare].',
          ]) },
          { heading: '8. Autoritatea de supraveghere (ANSPDCP)', body: richText([
            'Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal — B-dul General Gheorghe Magheru nr. 28-30, Sector 1, București, 010336, România; anspdcp@dataprotection.ro.',
          ]) },
        ],
      },
    },
    {
      page: 'cookies',
      title: 'Cookie Policy',
      intro: 'The cookies and similar technologies isad.academy uses, and how to manage them.',
      sections: [
        { heading: '1. Purpose of this policy', body: richText([
          'This policy explains how International Security and Defence SRL (ISAD), CUI 44849076, uses cookies and similar technologies on isad.academy: which categories exist, what they do, how long they last and how you can manage your options.',
        ]) },
        { heading: '2. What cookies are', body: richText([
          'A cookie is a small file of letters and numbers stored in your browser when you visit a website. Cookies do not contain software or viruses; they store information about your preferences or device to make navigation work properly.',
        ]) },
        { heading: '3. Cookies and similar technologies we use', body: richText([
          'Strictly necessary (active without consent): the "locale" cookie remembers your RO/EN language choice (12 months); your cookie-consent choice is stored in the browser until you delete it. Blocking these affects the language switcher and re-displays the consent banner.',
          'Performance / analytics (only with your consent): Google Analytics 4 cookies (_ga and related, up to ~2 years) measure how the site is used. Refusing them does not affect any functionality.',
          'Functional and marketing cookies: not used at present. If they are ever introduced, they will be activated only after consent and listed here first.',
        ]) },
        { heading: '4. Managing cookies', body: richText([
          'You can accept or refuse non-essential cookies from the banner shown on your first visit, change your mind at any time using the "Cookie preferences" button on this page, or delete cookies from your browser settings. Withdrawing consent is as easy as giving it and does not affect the lawfulness of prior processing.',
        ]) },
        { heading: '5. Updates', body: richText([
          'This policy is updated whenever the cookies we use change. The "Last updated" tag at the top of this page reflects the latest revision automatically.',
        ]) },
      ],
      ro: {
        title: 'Politica de cookie-uri',
        intro: 'Cookie-urile și tehnologiile similare folosite de isad.academy și cum le poți gestiona.',
        sections: [
          { heading: '1. Scopul acestei politici (traducere orientativă — necesită revizuire juridică)', body: richText([
            'Această politică explică modul în care International Security and Defence SRL (ISAD), CUI 44849076, folosește cookie-uri și tehnologii similare pe isad.academy: ce categorii există, ce rol au, cât durează și cum îți poți gestiona opțiunile.',
          ]) },
          { heading: '2. Ce sunt cookie-urile', body: richText([
            'Un cookie este un fișier de mici dimensiuni, format din litere și cifre, stocat în browserul tău atunci când vizitezi un site. Cookie-urile nu conțin programe software sau viruși; ele stochează informații despre preferințele sau dispozitivul tău pentru ca navigarea să funcționeze corect.',
          ]) },
          { heading: '3. Cookie-urile și tehnologiile similare pe care le folosim', body: richText([
            'Strict necesare (active fără consimțământ): cookie-ul „locale" reține alegerea limbii RO/EN (12 luni); alegerea privind consimțământul pentru cookie-uri este stocată în browser până când o ștergi. Blocarea acestora afectează selectorul de limbă și duce la reafișarea bannerului de consimțământ.',
            'Performanță / analiză (doar cu consimțământul tău): cookie-urile Google Analytics 4 (_ga și cele asociate, până la ~2 ani) măsoară modul în care este utilizat site-ul. Refuzarea lor nu afectează nicio funcționalitate.',
            'Cookie-uri funcționale și de marketing: nu sunt folosite în prezent. Dacă vor fi introduse vreodată, vor fi activate doar după consimțământ și listate mai întâi aici.',
          ]) },
          { heading: '4. Gestionarea cookie-urilor', body: richText([
            'Poți accepta sau refuza cookie-urile neesențiale din bannerul afișat la prima vizită, îți poți schimba opțiunea oricând din butonul „Preferințe cookie-uri" de pe această pagină sau poți șterge cookie-urile din setările browserului. Retragerea consimțământului este la fel de simplă ca acordarea lui și nu afectează legalitatea prelucrărilor anterioare.',
          ]) },
          { heading: '5. Actualizări', body: richText([
            'Această politică este actualizată ori de câte ori se schimbă cookie-urile pe care le folosim. Eticheta „Ultima actualizare" din partea de sus a paginii reflectă automat cea mai recentă revizuire.',
          ]) },
        ],
      },
    },
    {
      page: 'terms',
      title: 'Terms & Conditions',
      intro: 'The terms governing the use of isad.academy and the purchase of live course editions.',
      sections: [
        { heading: '1. General aspects', body: richText([
          'These terms apply between International Security and Defence SRL (ISAD), CUI 44849076 — the owner and operator of isad.academy — and any person who visits the site or purchases a course edition. Using the site implies acceptance of these terms.',
          '[Placeholder — final legal wording pending from Silviu (discovery A2).]',
        ]) },
        { heading: '2. Definitions', body: richText([
          'Course — a live training programme listed in the catalog. Edition — a scheduled run of a course, with its own dates, capacity and price windows. Seat — a place in an edition, tied to a named participant (name + e-mail); no user accounts are created. Order — the purchase of one or more seats in a single edition.',
        ]) },
        { heading: '3. Services', body: richText([
          'isad.academy delivers live, one-to-one online training on Google Meet. For PECB courses, certification is obtained directly through PECB — participants are enrolled in the PECB platform after payment. Every course carries CPD credits (one credit per training hour).',
        ]) },
        { heading: '4. Ordering and payment', body: richText([
          'Orders cover a single edition, with the name and e-mail of each participant. Prices are shown without VAT — ISAD is not VAT-registered. Prices are displayed and charged in RON for visitors from Romania and EUR otherwise.',
          '[Placeholder — payment processor details pending (a mock provider is used in development).]',
        ]) },
        { heading: '5. Cancellations and refunds', body: richText([
          'Participant cancellations follow the cancellation policy (refund depending on timing, or transfer to another edition where possible). If isad.academy cancels or reschedules an edition, participants choose between a full refund, a free transfer to a future edition or, optionally, a voucher for the full value. Granted refunds release the seat automatically.',
          '[Placeholder — exact thresholds and withdrawal-right details pending.]',
        ]) },
        { heading: '6. Liability', body: richText([
          '[Placeholder — pending final legal text.]',
        ]) },
        { heading: '7. Disputes', body: richText([
          'Disputes are addressed amicably first. Consumers may contact ANPC — including the SAL alternative dispute resolution mechanism (anpc.ro/ce-este-sal) — or use the EU online dispute resolution platform (SOL/ODR).',
        ]) },
        { heading: '8. Contact', body: richText([
          'International Security and Defence SRL (ISAD), CUI 44849076. E-mail and registered address: [Placeholder — pending].',
        ]) },
      ],
      ro: {
        title: 'Termeni și condiții',
        intro: 'Termenii care guvernează utilizarea isad.academy și achiziția edițiilor de curs live.',
        sections: [
          { heading: '1. Aspecte generale (traducere orientativă — necesită revizuire juridică)', body: richText([
            'Acești termeni se aplică între International Security and Defence SRL (ISAD), CUI 44849076 — proprietarul și operatorul isad.academy — și orice persoană care vizitează site-ul sau achiziționează o ediție de curs. Utilizarea site-ului implică acceptarea acestor termeni.',
            '[Substituent — formularea juridică finală urmează de la Silviu (discovery A2).]',
          ]) },
          { heading: '2. Definiții', body: richText([
            'Curs — un program de instruire live listat în catalog. Ediție — o desfășurare programată a unui curs, cu propriile date, propria capacitate și propriile ferestre de preț. Loc — un loc într-o ediție, asociat unui participant nominalizat (nume + e-mail); nu se creează conturi de utilizator. Comandă — achiziția unuia sau mai multor locuri într-o singură ediție.',
          ]) },
          { heading: '3. Servicii', body: richText([
            'isad.academy livrează instruire online live, unu-la-unu, pe Google Meet. Pentru cursurile PECB, certificarea se obține direct prin PECB — participanții sunt înrolați în platforma PECB după plată. Fiecare curs oferă credite CPD (un credit pentru fiecare oră de curs).',
          ]) },
          { heading: '4. Comandă și plată', body: richText([
            'Comenzile acoperă o singură ediție și includ numele și e-mailul fiecărui participant. Prețurile sunt afișate fără TVA — ISAD nu este plătitoare de TVA. Prețurile sunt afișate și încasate în RON pentru vizitatorii din România și în EUR în rest.',
            '[Substituent — detaliile procesatorului de plăți urmează (în dezvoltare se folosește un furnizor mock).]',
          ]) },
          { heading: '5. Anulări și rambursări', body: richText([
            'Anulările din partea participanților urmează politica de anulare (rambursare în funcție de moment sau, acolo unde este posibil, transfer la o altă ediție). Dacă isad.academy anulează sau reprogramează o ediție, participanții aleg între rambursare integrală, transfer gratuit la o ediție viitoare sau, opțional, un voucher în valoare integrală. Rambursările acordate eliberează locul automat.',
            '[Substituent — pragurile exacte și detaliile privind dreptul de retragere urmează.]',
          ]) },
          { heading: '6. Răspundere', body: richText([
            '[Substituent — în așteptarea textului juridic final.]',
          ]) },
          { heading: '7. Litigii', body: richText([
            'Litigiile se soluționează mai întâi pe cale amiabilă. Consumatorii se pot adresa ANPC — inclusiv mecanismului de soluționare alternativă a litigiilor SAL (anpc.ro/ce-este-sal) — sau pot folosi platforma europeană de soluționare online a litigiilor (SOL/ODR).',
          ]) },
          { heading: '8. Contact', body: richText([
            'International Security and Defence SRL (ISAD), CUI 44849076. E-mail și sediu social: [Substituent — în așteptare].',
          ]) },
        ],
      },
    },
  ]

  for (const { ro, ...doc } of legalDocs) {
    const existing = await payload.find({
      collection: 'legalPages',
      where: { page: { equals: doc.page } },
      limit: 1,
      overrideAccess: true,
      locale: 'en',
    })
    let legalId: number
    if (existing.docs[0]) {
      await payload.update({
        collection: 'legalPages',
        id: existing.docs[0].id,
        data: doc,
        overrideAccess: true,
        locale: 'en',
      })
      legalId = existing.docs[0].id
    } else {
      const createdDoc = await payload.create({ collection: 'legalPages', data: doc, overrideAccess: true, locale: 'en' })
      legalId = createdDoc.id
    }
    await withRo(payload, 'legalPages', legalId, ro)
  }
  log('legalPages: 3 documents upserted (privacy / cookies / terms) — EN + RO')

  await payload.db.destroy?.()
  log('done')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed:', err)
    process.exit(1)
  })
