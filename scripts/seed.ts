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
  const courseTitle = 'ISO/IEC 42001:2023 AI Management Systems (preparation training)'
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
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. [Placeholder copy, pending Silviu review.]',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
      ]),
      audience: [
        { text: 'Lorem ipsum: Compliance officers overseeing AI systems. [Placeholder, pending Silviu confirmation]' },
        { text: 'Lorem ipsum: Risk and audit professionals entering AI governance. [Placeholder]' },
        { text: 'Lorem ipsum: Technical leads preparing for ISO/IEC 42001 readiness. [Placeholder]' },
      ],
    },
  )
  log(`course "${courseTitle}": ${courseCreated ? 'created' : 'already exists, skipped'}`)

  // RO translation (bilingual site RO/EN) — localized fields only
  await withRo(payload, 'courses', course.id as number, {
    title: 'ISO/IEC 42001:2023 Sisteme de management al inteligenței artificiale (curs de pregătire)',
    description: richText([
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. [Text substituent, în așteptarea verificării lui Silviu.]',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
    ]),
    audience: [
      { text: 'Lorem ipsum: Ofițeri de conformitate care supraveghează sisteme AI. [Substituent, în așteptarea confirmării lui Silviu]' },
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
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. [Placeholder copy, pending Silviu review.]',
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
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. [Text substituent, în așteptarea verificării lui Silviu.]',
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
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore. [Placeholder copy, pending Silviu review.]',
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
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore. [Text substituent, în așteptarea verificării lui Silviu.]',
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
  // (two different buyer e-mails) and asserts the observable discount + seat decrement.
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
      text: 'Good overview of the AI management framework. Would recommend to technical teams.',
      textRo: 'O bună trecere în revistă a cadrului de management al AI. L-aș recomanda echipelor tehnice.',
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

  // --- FAQ items (question + answer localized) -----------------------------------------------
  const faqItems = [
    {
      question: 'Is the ISO/IEC 42001 certificate accredited?',
      answer: richText([
        'isad.academy courses are training that prepares you for ISO/IEC 42001:2023. You receive a certificate of completion issued by APCF, together with CPD credits, not an accredited ISO certification.',
      ]),
      order: 1,
      ro: {
        question: 'Este certificatul ISO/IEC 42001 acreditat?',
        answer: richText([
          'Cursurile isad.academy sunt programe de pregătire pentru ISO/IEC 42001:2023. Primești un certificat de absolvire emis de APCF, împreună cu credite CPD, nu o certificare ISO acreditată.',
        ]),
      },
    },
    {
      question: 'How are the courses delivered?',
      answer: richText(['All courses are delivered live, 1:1, on Zoom, never pre-recorded.']),
      order: 2,
      ro: {
        question: 'Cum sunt livrate cursurile?',
        answer: richText(['Toate cursurile sunt livrate live, 1:1, pe Zoom, niciodată preînregistrate.']),
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
          'Creditele CPD (Continuing Professional Development, dezvoltare profesională continuă) recunosc orele investite în formarea profesională.',
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
            'Before an auditor walks through your AI inventory, walk through it yourself. These five questions surface the gaps that show up most often in first-time AI audits. [Placeholder demo article, pending Silviu review.]',
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
          'Înainte ca un auditor să îți parcurgă inventarul AI, parcurge-l tu. Aceste cinci întrebări scot la iveală lacunele care apar cel mai des la primele audituri AI. [Articol demonstrativ substituent, în așteptarea verificării lui Silviu.]',
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
        'ISO/IEC 42001:2023 is the first management-system standard for AI. Here is what it covers, and how to prepare.',
      coverImage: coverMedia.id,
      relatedCourse: course.id,
      // readingTime deliberately omitted — the beforeChange hook auto-estimates it.
      body: lexicalRoot([
        paragraph([
          textNode('ISO/IEC 42001:2023 is the first '),
          textNode('management-system standard for AI', { color: 'blue' }),
          textNode(': it does for AI governance what ISO 27001 did for information security. Preparing for it early gives your organisation a '),
          textNode('structured, auditable way', { color: 'aqua' }),
          textNode(
            ' to run AI responsibly. [Placeholder demo article, pending Silviu review.]',
          ),
        ]),
        heading('h2', 'Why it matters now'),
        paragraph([
          textNode(
            'Regulators, customers and boards are all asking the same question: who is accountable for your AI systems? An AI management system gives that question a documented answer.',
          ),
        ]),
        blockquote(
          'Governance is not about slowing AI down; it is about being able to prove, at any moment, that you know what your AI is doing.',
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
      'ISO/IEC 42001:2023 este primul standard de sistem de management pentru AI. Iată ce acoperă și cum te poți pregăti.',
    body: lexicalRoot([
      paragraph([
        textNode('ISO/IEC 42001:2023 este primul '),
        textNode('standard de sistem de management pentru AI', { color: 'blue' }),
        textNode(': face pentru guvernanța AI ceea ce ISO 27001 a făcut pentru securitatea informației. Pregătirea din timp oferă organizației tale o '),
        textNode('modalitate structurată și auditabilă', { color: 'aqua' }),
        textNode(
          ' de a utiliza AI în mod responsabil. [Articol demonstrativ substituent, în așteptarea verificării lui Silviu.]',
        ),
      ]),
      heading('h2', 'De ce contează acum'),
      paragraph([
        textNode(
          'Autoritățile de reglementare, clienții și consiliile de administrație pun aceeași întrebare: cine răspunde de sistemele voastre AI? Un sistem de management al AI oferă acestei întrebări un răspuns documentat.',
        ),
      ]),
      blockquote(
        'Guvernanța nu înseamnă să încetinești AI-ul; înseamnă să poți dovedi, în orice moment, că știi ce face AI-ul tău.',
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
      excerpt: 'Not published yet; must 404 publicly.',
      body: lexicalRoot([
        paragraph([textNode('Work in progress. [Placeholder draft, pending Silviu review.]')]),
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
      excerpt: 'Nepublicat încă; trebuie să returneze 404 public.',
      body: lexicalRoot([
        paragraph([textNode('Lucrare în curs. [Ciornă substituent, în așteptarea verificării lui Silviu.]')]),
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
        'Dr. Silviu Gresoi has spent over 21 years working in anti-fraud, risk management and data analytics across the banking and energy sectors, including roles at BancPost, Banca Românească, Garanti Bank and First Bank. [TO CONFIRM: EN copy pending Silviu review]',
        'He is a Certified Fraud Examiner (CFE, 2014) and holds a PhD in AI & Machine Learning from Politehnica Bucharest. He has spoken at AI Expo Europe and AI Summit Europe. [TO CONFIRM]',
      ]),
      credentials: [
        { label: 'Certification', value: 'CFE (Certified Fraud Examiner), 2014' },
        { label: 'Education', value: 'PhD, AI & Machine Learning, Politehnica Bucharest' },
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
        'Dr. Silviu Gresoi a lucrat peste 21 de ani în antifraudă, managementul riscului și analiza datelor, în sectorul bancar și în cel energetic, inclusiv în roluri la BancPost, Banca Românească, Garanti Bank și First Bank. [DE CONFIRMAT: copy în așteptarea verificării lui Silviu]',
        'Este Certified Fraud Examiner (CFE, 2014) și deține un doctorat în AI & Machine Learning la Politehnica București. A susținut prezentări la AI Expo Europe și AI Summit Europe. [DE CONFIRMAT]',
      ]),
      credentials: [
        { label: 'Certificare', value: 'CFE (Certified Fraud Examiner), 2014' },
        { label: 'Educație', value: 'Doctorat, AI & Machine Learning, Politehnica București' },
        { label: 'Experiență', value: '21+ ani în antifraudă, managementul riscului și analiza datelor' },
        { label: 'Conferințe', value: 'AI Expo Europe, AI Summit Europe' },
      ],
    },
    overrideAccess: true,
  })
  log('expertBio global: upserted [TO CONFIRM placeholders, CLAUDE.md §4/§15]')

  // --- homepage global ---------------------------------------------------------------------
  await payload.updateGlobal({
    slug: 'homepage',
    data: {
      hero: {
        // Copy from the client's Figma hero design (node 3640-2876, 2026-07-11)
        title: 'Learn AI, Data Analysis & Fraud Prevention',
        subtitle: 'Develop practical skills to face the world challenges.',
        ctaText: 'Get your certificate today',
        ctaLink: '/courses',
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
            text: 'Every session is taught live, 1:1, on Zoom. No pre-recorded videos.',
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
            text: 'Fiecare sesiune este predată live, 1:1, pe Zoom. Fără videoclipuri preînregistrate.',
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


  // legalPages: conținutul se importă separat, din sursa randată de site —
  // `npx tsx scripts/import-legal-content.ts` (owner 2026-08-07).

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
