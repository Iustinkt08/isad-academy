import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

/**
 * One-off content migration (owner request 2026-07-12): wipe the seed/placeholder courses and
 * replace them with the four launch courses (CLAUDE.md §13 E1), then re-point the Home
 * "Explore our upcoming courses" section (homepage.featuredCourses) at them.
 *
 * Because a course is referenced by courseSessions (FK) which are referenced by orders (FK),
 * we delete in dependency order: orders → courseSessions → courses. This is DEV data only
 * (DATABASE_URI dev DB); editions/prices for the new courses are added later by Silviu, so the
 * new courses ship content-only (no sessions) and read as "Enrolment coming soon" until then.
 *
 * Run with: `npx tsx scripts/replace-courses.ts`
 */

/** Minimal valid Lexical editor state — one paragraph per string. */
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

/** The four launch courses, in the order shown on the Home preview row. */
const NEW_COURSES: { title: string; category: 'iso' | 'other'; shortDescription: string }[] = [
  {
    title: 'AI Governance & Responsible AI',
    category: 'other',
    shortDescription: 'Turn AI ethics, risk and accountability into practices you can apply from day one.',
  },
  {
    title: 'Artificial Intelligence Management System',
    category: 'iso',
    shortDescription:
      'Grasp the core concepts and requirements of an AI Management System based on ISO/IEC 42001.',
  },
  {
    title: 'Lead Implementer',
    category: 'iso',
    shortDescription:
      'Gain the skills to plan, implement and manage a 42001-compliant AI Management System end to end.',
  },
  {
    title: 'Lead Auditor',
    category: 'iso',
    shortDescription:
      'Learn to audit an AI Management System against ISO/IEC 42001: planning, conducting and reporting.',
  },
]

async function main() {
  const payload = await getPayload({ config })

  const all = { pagination: false, overrideAccess: true, depth: 0 } as const

  // 1) Inventory (drafts included) before touching anything.
  const [courses, sessions, orders] = await Promise.all([
    payload.find({ collection: 'courses', draft: true, ...all }),
    payload.find({ collection: 'courseSessions', ...all }),
    payload.find({ collection: 'orders', ...all }),
  ])
  console.log(
    `Existing → courses: ${courses.totalDocs}, sessions: ${sessions.totalDocs}, orders: ${orders.totalDocs}`,
  )
  console.log('  courses:', courses.docs.map((c) => `${c.id}:${(c as { slug?: string }).slug}`).join(', '))

  // 2) Delete in FK dependency order: orders → sessions → courses.
  if (orders.totalDocs > 0) {
    const r = await payload.delete({ collection: 'orders', where: { id: { exists: true } }, overrideAccess: true })
    console.log(`Deleted orders: ${r.docs.length}`)
  }
  if (sessions.totalDocs > 0) {
    const r = await payload.delete({ collection: 'courseSessions', where: { id: { exists: true } }, overrideAccess: true })
    console.log(`Deleted sessions: ${r.docs.length}`)
  }
  if (courses.totalDocs > 0) {
    const r = await payload.delete({ collection: 'courses', where: { id: { exists: true } }, overrideAccess: true })
    console.log(`Deleted courses: ${r.docs.length}`)
  }

  // 3) Create the four launch courses (published, content-only).
  const createdIds: number[] = []
  for (const c of NEW_COURSES) {
    const doc = await payload.create({
      collection: 'courses',
      overrideAccess: true,
      data: {
        title: c.title,
        category: c.category,
        shortDescription: c.shortDescription,
        description: richText([
          'Placeholder course description. Final copy pending Dr. Silviu Gresoi.',
        ]),
        _status: 'published',
      },
    })
    createdIds.push(doc.id as number)
    console.log(`Created course ${doc.id}: ${doc.title} (slug: ${(doc as { slug?: string }).slug})`)
  }

  // 4) Feature all four on the Home section, in the given order.
  await payload.updateGlobal({
    slug: 'homepage',
    overrideAccess: true,
    data: { featuredCourses: createdIds },
  })
  console.log(`homepage.featuredCourses → [${createdIds.join(', ')}]`)

  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
