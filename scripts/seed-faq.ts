import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

/**
 * Content migration (owner request 2026-07-25): replace the FAQ items with the 17
 * journey-shaped Q&A (the FaqSection dictionary defaults), each assigned to its homepage
 * tab via the `category` select — Discover / Learn / Validate / Access. Seeds BOTH
 * locales (EN default + RO via localized update), matching src/lib/i18n/dictionaries.ts.
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

type Category = 'discover' | 'learn' | 'validate' | 'access'

const FAQ: { category: Category; q: string; a: string; qRo: string; aRo: string }[] = [
  // Discover — the company, the site, the courses
  {
    category: 'discover',
    q: 'What is isad.academy?',
    a: 'isad.academy is the course platform of International Security and Defence (ISAD), an official PECB partner. We deliver live, practitioner-led training on AI governance and ISO/IEC 42001 — built to help you renew your knowledge and stay in step with global policies and evolving ISO standards.',
    qRo: 'Ce este isad.academy?',
    aRo: 'isad.academy este platforma de cursuri a International Security and Defence (ISAD), partener oficial PECB. Livrăm training live, condus de practicieni, pe guvernanța AI și ISO/IEC 42001 — construit să te ajute să îți înnoiești cunoștințele și să ții pasul cu politicile globale și standardele ISO în continuă evoluție.',
  },
  {
    category: 'discover',
    q: 'Who teaches the courses?',
    a: 'All courses are taught live by Dr. Silviu Gresoi — PhD in AI & Machine Learning, Certified Fraud Examiner, with 20+ years of experience in anti-fraud, risk management and data analytics, and a speaker at AI Expo Europe and AI Summit Europe.',
    qRo: 'Cine predă cursurile?',
    aRo: 'Toate cursurile sunt predate live de Dr. Silviu Gresoi — doctor în AI & Machine Learning, Certified Fraud Examiner, cu peste 20 de ani de experiență în anti-fraudă, managementul riscului și data analytics, speaker la AI Expo Europe și AI Summit Europe.',
  },
  {
    category: 'discover',
    q: 'What courses can I take?',
    a: 'At launch we run four courses: the official PECB ISO/IEC 42001 tracks — Foundation, Lead Implementer and Lead Auditor — plus AI Governance & Responsible AI, ISAD Academy’s own practical course. The catalog lists every upcoming edition; not sure which fits you, take the short quiz on the courses page.',
    qRo: 'Ce cursuri pot urma?',
    aRo: 'La lansare avem patru cursuri: traseele oficiale PECB ISO/IEC 42001 — Foundation, Lead Implementer și Lead Auditor — plus AI Governance & Responsible AI, cursul practic propriu ISAD Academy. Catalogul listează fiecare ediție viitoare; dacă nu ești sigur care ți se potrivește, completează quiz-ul scurt din pagina de cursuri.',
  },
  {
    category: 'discover',
    q: 'Are the courses live or self-paced?',
    a: 'All courses are delivered live on Google Meet, in small groups, directly by Dr. Silviu Gresoi. There are no pre-recorded lessons — every session leaves room for your questions and your organization’s real cases.',
    qRo: 'Cursurile sunt live sau în ritm propriu?',
    aRo: 'Toate cursurile sunt livrate live pe Google Meet, în grupuri mici, direct de Dr. Silviu Gresoi. Nu există lecții preînregistrate — fiecare sesiune lasă loc pentru întrebările tale și pentru cazurile reale din organizația ta.',
  },
  // Learn — time framing, evaluations
  {
    category: 'learn',
    q: 'How long does a course take and how is it scheduled?',
    a: 'Duration differs per course and is listed in hours on each course page. Every edition has its own concrete programme — the exact days and hours are published on the course page, so you know the full schedule before you enrol.',
    qRo: 'Cât durează un curs și cum e programat?',
    aRo: 'Durata diferă de la curs la curs și e afișată în ore pe fiecare pagină de curs. Fiecare ediție are propriul program concret — zilele și orele exacte sunt publicate pe pagina cursului, așa că știi întregul calendar înainte să te înscrii.',
  },
  {
    category: 'learn',
    q: 'When do the next editions start?',
    a: 'Each course page lists its upcoming editions with start dates and available seats. If an edition is sold out or no dates are open yet, leave your email under “Notify me” or subscribe to the newsletter — you’ll hear the moment new dates are announced.',
    qRo: 'Când încep următoarele ediții?',
    aRo: 'Fiecare pagină de curs listează edițiile viitoare, cu date de început și locuri disponibile. Dacă o ediție e sold out sau nu sunt încă date anunțate, lasă-ți emailul la „Anunță-mă" sau abonează-te la newsletter — afli imediat ce apar date noi.',
  },
  {
    category: 'learn',
    q: 'Do I need prior experience with ISO standards?',
    a: 'Not for the Foundation course or AI Governance & Responsible AI — they start from the ground up. For Lead Implementer and Lead Auditor, basic familiarity with management systems helps but is not mandatory. Not sure which level fits you? Take the short quiz and we will recommend a course.',
    qRo: 'Am nevoie de experiență anterioară cu standardele ISO?',
    aRo: 'Nu pentru cursul Foundation sau AI Governance & Responsible AI — acestea pornesc de la zero. Pentru Lead Implementer și Lead Auditor, o familiaritate de bază cu sistemele de management ajută, dar nu e obligatorie. Nu ești sigur ce nivel ți se potrivește? Completează quiz-ul scurt și îți recomandăm noi un curs.',
  },
  {
    category: 'learn',
    q: 'How am I evaluated — is there an exam?',
    a: 'For the PECB tracks, the evaluation is the official PECB exam, taken online through the PECB platform after the training — and the preparation is built into the final day of the course. For ISAD Academy’s own courses there is no external exam: you complete the live sessions and receive your certificate of completion.',
    qRo: 'Cum sunt evaluat — există examen?',
    aRo: 'Pentru traseele PECB, evaluarea este examenul oficial PECB, susținut online prin platforma PECB după training — iar pregătirea e inclusă în ultima zi de curs. Pentru cursurile proprii ISAD Academy nu există examen extern: finalizezi sesiunile live și primești certificatul de absolvire.',
  },
  // Validate — certifications
  {
    category: 'validate',
    q: 'What certificate do I receive after the course?',
    a: 'For the PECB tracks (ISO/IEC 42001 Foundation, Lead Implementer, Lead Auditor), you receive the official, internationally recognized PECB certificate after passing the exam. For ISAD Academy’s own courses, you receive an ISAD Academy certificate of completion stating your CPD credits.',
    qRo: 'Ce certificat primesc după curs?',
    aRo: 'Pentru traseele PECB (ISO/IEC 42001 Foundation, Lead Implementer, Lead Auditor), primești certificatul oficial PECB, recunoscut internațional, după promovarea examenului. Pentru cursurile proprii ISAD Academy, primești un certificat de absolvire ISAD Academy care menționează creditele tale CPD.',
  },
  {
    category: 'validate',
    q: 'How does enrolment on the PECB platform work?',
    a: 'After your payment is confirmed, we register you on the PECB platform. There you get access to the official course materials, your exam scheduling and, once you pass, your certificate.',
    qRo: 'Cum funcționează înrolarea pe platforma PECB?',
    aRo: 'După confirmarea plății, te înregistrăm pe platforma PECB. Acolo primești acces la materialele oficiale de curs, la programarea examenului și, după promovare, la certificatul tău.',
  },
  {
    category: 'validate',
    q: 'How do CPD credits work?',
    a: 'Simple: one hour of learning equals one CPD credit. A 35-hour course earns you 35 CPD credits, stated on your certificate — recognized for your continuing professional development.',
    qRo: 'Cum funcționează creditele CPD?',
    aRo: 'Simplu: o oră de învățare înseamnă un credit CPD. Un curs de 35 de ore îți aduce 35 de credite CPD, menționate pe certificat — recunoscute pentru dezvoltarea ta profesională continuă.',
  },
  {
    category: 'validate',
    q: 'Is the certification recognized internationally?',
    a: 'Yes. PECB is a global certification body and its certificates are recognized internationally. ISO/IEC 42001:2023 itself is the international standard for AI management systems — so the credential travels with you across employers and borders.',
    qRo: 'Certificarea e recunoscută internațional?',
    aRo: 'Da. PECB este un organism global de certificare, iar certificatele sale sunt recunoscute internațional. ISO/IEC 42001:2023 este chiar standardul internațional pentru sistemele de management al AI — așa că acreditarea te însoțește oriunde, indiferent de angajator sau țară.',
  },
  // Access — enrolment for individuals and organizations
  {
    category: 'access',
    q: 'How do I enrol in a course?',
    a: 'Pick your course, choose an edition and click Enrol. You add the participants (name + email for each seat), fill in your billing details and pay online. The confirmation and the invoice arrive by email right away, and the Google Meet invite follows before the start date.',
    qRo: 'Cum mă înscriu la un curs?',
    aRo: 'Alege cursul, selectează o ediție și apasă Înscrie-te. Adaugi participanții (nume + email pentru fiecare loc), completezi datele de facturare și plătești online. Confirmarea și factura sosesc imediat pe email, iar invitația de Google Meet urmează înainte de data de început.',
  },
  {
    category: 'access',
    q: 'Can I enrol my team or my company?',
    a: 'Yes. At checkout you can buy several seats on the same edition — each with a named participant — and pay as a company, with your billing details on the invoice. From 3 seats, the 10% group discount applies automatically. And for a private session delivered just for your team, online or on-site, head to the Corporate page and tell us what you need.',
    qRo: 'Pot înscrie echipa sau compania mea?',
    aRo: 'Da. La checkout poți cumpăra mai multe locuri pe aceeași ediție — fiecare cu participantul lui nominal — și poți plăti ca firmă, cu datele de facturare pe factură. De la 3 locuri, reducerea de grup de 10% se aplică automat. Iar pentru o sesiune privată livrată doar pentru echipa ta, online sau la sediu, intră pe pagina Corporate și spune-ne ce ai nevoie.',
  },
  {
    category: 'access',
    q: 'Can I pay in RON or EUR?',
    a: 'Both: prices are in RON for participants from Romania and in EUR for international participants. All prices are final — isad.academy is not VAT registered, so no VAT is added at checkout.',
    qRo: 'Pot plăti în RON sau EUR?',
    aRo: 'Ambele: prețurile sunt în RON pentru participanții din România și în EUR pentru participanții internaționali. Toate prețurile sunt finale — isad.academy nu este plătitoare de TVA, deci nu se adaugă TVA la checkout.',
  },
  {
    category: 'access',
    q: 'Do discounts stack — group, member, promo codes?',
    a: 'Yes, discounts stack. The 10% group discount applies automatically from 3 seats on the same edition, APCF members get their member discount with their code, and promo codes apply on top — all combined in your order summary before payment.',
    qRo: 'Se cumulează reducerile — de grup, de membru, codurile promoționale?',
    aRo: 'Da, reducerile se cumulează. Reducerea de grup de 10% se aplică automat de la 3 locuri pe aceeași ediție, membrii APCF primesc reducerea de membru cu codul lor, iar codurile promoționale se aplică peste — toate combinate în sumarul comenzii, înainte de plată.',
  },
  {
    category: 'access',
    q: 'What is the cancellation & refund policy?',
    a: 'If you can no longer attend, you can request a refund (depending on how close to the start date you cancel) or, where possible, transfer to a future edition. If we cancel or reschedule an edition, you choose between a full refund, a free transfer to a future edition, or a voucher for the full amount. Refunded seats are released automatically. Full details are in our Terms & Conditions.',
    qRo: 'Care este politica de anulare și rambursare?',
    aRo: 'Dacă nu mai poți participa, poți solicita o rambursare (în funcție de cât de aproape de data de început anulezi) sau, unde e posibil, transferul la o ediție viitoare. Dacă noi anulăm sau reprogramăm o ediție, alegi între rambursare integrală, transfer gratuit la o ediție viitoare sau un voucher pentru întreaga sumă. Locurile rambursate se eliberează automat. Detaliile complete sunt în Termeni și condiții.',
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
    const created = await payload.create({
      collection: 'faqItems',
      overrideAccess: true,
      locale: 'en',
      data: {
        question: item.q,
        answer: richText([item.a]),
        category: item.category,
        order: index + 1,
      },
    })
    await payload.update({
      collection: 'faqItems',
      id: created.id,
      overrideAccess: true,
      locale: 'ro',
      data: {
        question: item.qRo,
        answer: richText([item.aRo]),
      },
    })
  }
  console.log(`Created ${FAQ.length} FAQ items (EN + RO).`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
