import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

/**
 * Seed `courses.quizProfile` pentru cele 4 cursuri de lansare (owner 2026-07-26) —
 * motorul de quiz v2 recomandă DOAR cursuri tagate (level obligatoriu). Când Silviu
 * adaugă cursuri reale, completează tagurile din dashboard; scriptul e doar pentru
 * mock-urile actuale. Cursurile netagate rămân în afara quiz-ului.
 *
 * Run with: `npx tsx scripts/seed-quiz-profiles.ts`
 */

type Profile = {
  level: 'introductory' | 'intermediate' | 'advanced' | 'specialization'
  outcomes: (
    | 'overview'
    | 'practicalSkills'
    | 'implementationPlan'
    | 'auditPrep'
    | 'certification'
    | 'foundationForMore'
  )[]
  domains: (
    | 'isoManagement'
    | 'quality'
    | 'sustainability'
    | 'riskCompliance'
    | 'infosec'
    | 'ai'
    | 'leadership'
    | 'audit'
  )[]
  quizPitchEn: string
  quizPitchRo: string
}

const PROFILES: Record<string, Profile> = {
  'artificial-intelligence-management-system': {
    level: 'introductory',
    outcomes: ['overview', 'certification', 'foundationForMore'],
    domains: ['ai', 'isoManagement'],
    quizPitchEn:
      'The Foundation course: the big picture of ISO/IEC 42001 and the base for the certifications that follow — the recommended starting point.',
    quizPitchRo:
      'Cursul Foundation: imaginea de ansamblu asupra ISO/IEC 42001 și baza pentru certificările următoare — punctul de start recomandat.',
  },
  'lead-implementer': {
    level: 'advanced',
    outcomes: ['implementationPlan', 'practicalSkills', 'certification'],
    domains: ['ai', 'isoManagement'],
    quizPitchEn:
      'You learn to plan, implement and manage an AI management system compliant with ISO/IEC 42001, end to end — with the PECB exam included in the track.',
    quizPitchRo:
      'Înveți să planifici, să implementezi și să gestionezi un sistem de management AI conform ISO/IEC 42001, cap-coadă — cu examenul PECB inclus în traseu.',
  },
  'lead-auditor': {
    level: 'specialization',
    outcomes: ['auditPrep', 'certification'],
    domains: ['ai', 'isoManagement', 'audit'],
    quizPitchEn:
      'An auditor specialization: you plan, conduct and report audits of AI management systems against ISO/IEC 42001.',
    quizPitchRo:
      'Specializare de auditor: planifici, conduci și raportezi audituri ale sistemelor de management AI conform ISO/IEC 42001.',
  },
  'ai-governance-responsible-ai': {
    level: 'intermediate',
    outcomes: ['practicalSkills', 'overview'],
    domains: ['ai', 'riskCompliance'],
    quizPitchEn:
      'A practical course on responsible AI governance: ethics, risk, transparency and accountability — immediately applicable in your organization.',
    quizPitchRo:
      'Curs practic de guvernanță AI responsabilă: etică, risc, transparență și responsabilitate — aplicabile imediat în organizația ta.',
  },
}

async function main() {
  const payload = await getPayload({ config })

  for (const [slug, profile] of Object.entries(PROFILES)) {
    const found = await payload.find({
      collection: 'courses',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })
    const course = found.docs[0]
    if (!course) {
      console.warn(`SKIP — no course with slug "${slug}"`)
      continue
    }
    // EN pe locale-ul default; RO printr-un update separat — mock-urile nu au titlu RO,
    // deci trecem titlul existent ca să treacă validarea câmpului required localizat.
    await payload.update({
      collection: 'courses',
      id: course.id,
      overrideAccess: true,
      data: {
        quizProfile: {
          level: profile.level,
          outcomes: profile.outcomes,
          domains: profile.domains,
          quizPitch: profile.quizPitchEn,
        },
      },
    })
    await payload.update({
      collection: 'courses',
      id: course.id,
      overrideAccess: true,
      locale: 'ro',
      data: {
        title: course.title,
        quizProfile: { quizPitch: profile.quizPitchRo },
      },
    })
    console.log(`Tagged "${slug}" → ${profile.level} / ${profile.domains.join(',')}`)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(JSON.stringify(err?.data?.errors ?? err?.errors ?? String(err), null, 2))
  process.exit(1)
})
