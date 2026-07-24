import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

/**
 * One-off content migration (owner request 2026-07-13): replace the 3 legacy seeded FAQ
 * items with the 12 dashboard-authored Q&A (faq-content.md — the FaqSection defaults),
 * each assigned to its homepage tab via the new `category` select.
 *
 * Run with: `npx tsx scripts/seed-faq.ts`
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

type Category = 'gettingStarted' | 'coursesCertification' | 'paymentsPractical'

const FAQ: { category: Category; q: string; a: string }[] = [
  {
    category: 'gettingStarted',
    q: 'How do I enrol in a course?',
    a: 'Pick your course, choose an edition and click Enrol. You add the participants (name + email for each seat), fill in your billing details and pay online. The confirmation and the invoice arrive by email right away, and the Google Meet invite follows before the start date.',
  },
  {
    category: 'gettingStarted',
    q: 'Do I need prior experience with ISO standards?',
    a: 'Not for the Foundation course or AI Governance & Responsible AI — they start from the ground up. For Lead Implementer and Lead Auditor, basic familiarity with management systems helps but is not mandatory. Not sure which level fits you? Take the short quiz and we will recommend a course.',
  },
  {
    category: 'gettingStarted',
    q: 'Are the courses live or self-paced?',
    a: 'All courses are delivered live on Google Meet, in small groups, directly by Dr. Silviu Gresoi. There are no pre-recorded lessons — every session leaves room for your questions and your organization’s real cases.',
  },
  {
    category: 'coursesCertification',
    q: 'What certificate do I receive after the course?',
    a: 'For the PECB tracks (ISO/IEC 42001 Foundation, Lead Implementer, Lead Auditor), you receive the official, internationally recognized PECB certificate after passing the exam. For ISAD Academy’s own courses, you receive an ISAD Academy certificate of completion stating your CPD credits.',
  },
  {
    category: 'coursesCertification',
    q: 'How do CPD credits work?',
    a: 'Simple: one hour of learning equals one CPD credit. A 35-hour course earns you 35 CPD credits, stated on your certificate — recognized for your continuing professional development.',
  },
  {
    category: 'coursesCertification',
    q: 'How is the PECB exam organized?',
    a: 'The exam is part of the PECB certification track and is taken online through the PECB platform after the training. We handle your exam enrolment — you focus on the preparation, which is built into the final day of the course.',
  },
  {
    category: 'coursesCertification',
    q: 'How does enrolment on the PECB platform work?',
    a: 'After your payment is confirmed, we register you on the PECB platform. There you get access to the official course materials, your exam scheduling and, once you pass, your certificate.',
  },
  {
    category: 'coursesCertification',
    q: 'Is the AI Governance & Responsible AI course right for beginners?',
    a: 'Yes. It’s a practical, vendor-neutral course on governing AI responsibly — ethics, risk, transparency and accountability — with no ISO experience required. It also works great as a complement to the PECB certification tracks.',
  },
  {
    category: 'paymentsPractical',
    q: 'Can I pay in RON or EUR?',
    a: 'Both: prices are in RON for participants from Romania and in EUR for international participants. All prices are final — ISAD is not VAT registered, so no VAT is added at checkout.',
  },
  {
    category: 'paymentsPractical',
    q: 'Do discounts stack — group, member, promo codes?',
    a: 'Yes, discounts stack. The 10% group discount applies automatically from 3 seats on the same edition, APCF members get their member discount with their code, and promo codes apply on top — all combined in your order summary before payment.',
  },
  {
    category: 'paymentsPractical',
    q: 'What is the cancellation & refund policy?',
    a: 'If you can no longer attend, you can request a refund (depending on how close to the start date you cancel) or, where possible, transfer to a future edition. If we cancel or reschedule an edition, you choose between a full refund, a free transfer to a future edition, or a voucher for the full amount. Refunded seats are released automatically. Full details are in our Terms & Conditions.',
  },
  {
    category: 'paymentsPractical',
    q: 'Can my company book in-house training?',
    a: 'Yes — every course in our catalog can be delivered as a private group session for your team, online or on-site. Head over to the Corporate page and tell us about your team; we’ll come back with a proposal.',
  },
]

async function main() {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'faqItems',
    pagination: false,
    overrideAccess: true,
    depth: 0,
  })
  console.log(`Existing FAQ items: ${existing.totalDocs}`)
  if (existing.totalDocs > 0) {
    const r = await payload.delete({
      collection: 'faqItems',
      where: { id: { exists: true } },
      overrideAccess: true,
    })
    console.log(`Deleted: ${r.docs.length}`)
  }

  for (const [index, item] of FAQ.entries()) {
    await payload.create({
      collection: 'faqItems',
      overrideAccess: true,
      data: {
        question: item.q,
        answer: richText([item.a]),
        category: item.category,
        order: index + 1,
      },
    })
  }
  console.log(`Created ${FAQ.length} FAQ items.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
