import { BlocksFeature, lexicalEditor, TextStateFeature } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { codeBlock } from '../fields/richTextBlocks'
import { revalidateSiteHook } from '../lib/revalidateSite'
import { TEXT_STATE_PRESETS } from '../lib/richtext/textState'
import { publicOrPublished } from '../access/publicOrPublished'
import { slugField } from '../fields/slug'

/**
 * Teaser + shared content for a course (CLAUDE.md §4). Dates, prices and seats live on
 * `courseSessions` (Variant B), never here. No `modules` field (§3, §9 R3 — resolved:
 * no modules) and no `seo` group yet (lands with `@payloadcms/plugin-seo` in T14).
 */
export const Courses: CollectionConfig = {
  slug: 'courses',
  admin: {
    useAsTitle: 'title',
    group: { en: 'Content', ro: 'Conținut' },
    defaultColumns: ['title', 'category', 'durationHours', '_status'],
    listSearchableFields: ['title'],
    description: {
      en: 'Course presentation pages shown in the catalog. Each course holds only the shared content (title, description, audience); dates, prices and seats live on Course Sessions, one entry per edition.',
      ro: 'Paginile de prezentare ale cursurilor afișate în catalog. Fiecare curs conține doar conținutul comun (titlu, descriere, public țintă); datele, prețurile și locurile stau în Course Sessions, câte o intrare per ediție.',
    },
  },
  versions: {
    drafts: true,
  },
  access: {
    read: publicOrPublished,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Static frontend (EN + /ro) regenerates after every dashboard save.
  hooks: {
    afterChange: [revalidateSiteHook],
    afterDelete: [revalidateSiteHook],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    slugField('title'),
    {
      name: 'shortDescription',
      type: 'textarea',
      localized: true,
      maxLength: 200,
      admin: {
        description: {
          en: 'Short blurb shown on the course preview cards, for example in the "Explore our upcoming courses" section on the homepage. Keep it to one or two sentences; it does not appear on the course page itself.',
          ro: 'Descriere scurtă afișată pe cardurile de previzualizare ale cursurilor, de exemplu în secțiunea „Explore our upcoming courses" de pe pagina principală. Limitați-vă la una sau două propoziții; nu apare pe pagina cursului.',
        },
      },
    },
    // `image` (course banner) removed 2026-08-08 (owner): the design no longer uses a
    // banner anywhere; OG/social images come from `meta.image` or the site default.
    {
      name: 'durationHours',
      type: 'number',
      min: 0,
      admin: {
        description: {
          en: 'Total course length in hours, shown on the catalog card and on the course page. Also used to calculate CPD credits, at 1 credit per hour.',
          ro: 'Durata totală a cursului în ore, afișată pe cardul din catalog și pe pagina cursului. Este folosită și la calculul creditelor CPD, 1 credit pe oră.',
        },
      },
    },
    {
      name: 'category',
      type: 'select',
      admin: {
        description: {
          en: 'Reserved for future catalog filtering. The category is stored now, but the catalog shows no filter at launch.',
          ro: 'Rezervat pentru filtrarea viitoare a catalogului. Categoria se salvează de pe acum, dar catalogul nu afișează încă niciun filtru la lansare.',
        },
      },
      options: [
        { label: { en: 'ISO/IEC 42001 (AI Management)', ro: 'ISO/IEC 42001 (Management AI)' }, value: 'iso' },
        { label: { en: 'Anti-Fraud', ro: 'Antifraudă' }, value: 'antiFraud' },
        { label: { en: 'Security', ro: 'Securitate' }, value: 'security' },
        { label: { en: 'Other', ro: 'Altele' }, value: 'other' },
      ],
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
      // Owner 2026-08-12: the description renders with FULL formatting on the course page
      // (headings, quotes, lists…) — plus the blog's named brand colors and a code block
      // for writing code verbatim. Rendered by src/components/richtext/RichTextContent.tsx.
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          TextStateFeature({ state: TEXT_STATE_PRESETS }),
          BlocksFeature({ blocks: [codeBlock] }),
        ],
      }),
      admin: {
        description: {
          en: 'Full course description shown on the course page, below the header. Formatting (titles, quotes, colors, code blocks) renders on the site exactly as set here.',
          ro: 'Descrierea completă a cursului, afișată pe pagina acestuia, sub antet. Formatarea (titluri, citate, culori, blocuri de cod) apare pe site exact cum este setată aici.',
        },
      },
    },
    {
      name: 'audience',
      type: 'array',
      localized: true,
      labels: {
        singular: { en: 'Audience item', ro: 'Element de public țintă' },
        plural: { en: 'Audience items', ro: 'Elemente de public țintă' },
      },
      admin: {
        description: {
          en: 'The "Who this course is for" list on the course page. Add one row per bullet point; rows appear on the site in the order set here.',
          ro: 'Lista „Cui i se adresează cursul" de pe pagina cursului. Adăugați câte un rând pentru fiecare punct; rândurile apar pe site în ordinea de aici.',
        },
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
      ],
    },
    // Owner 2026-08-12 (v2, same day): the trainer profiles shown under the enrolment
    // card on the course page — MULTIPLE allowed, one card each, in the order set here.
    // Empty = the site default (Dr. Silviu Gresoi).
    {
      name: 'trainers',
      type: 'relationship',
      relationTo: 'trainers',
      hasMany: true,
      admin: {
        description: {
          en: 'The trainer profiles shown on the course page, under the enrolment card — one card per trainer, in this order. Leave empty to show the default (Dr. Silviu Gresoi); add trainers in the Trainers collection.',
          ro: 'Profilurile de trainer afișate pe pagina cursului, sub cardul de înscriere — câte un card per trainer, în ordinea de aici. Lăsați gol pentru trainerul implicit (Dr. Silviu Gresoi); trainerii se adaugă în colecția Trainers.',
        },
      },
    },
    {
      name: 'certificationCredits',
      type: 'number',
      min: 0,
      admin: {
        description: {
          en: 'CPD credits shown on the course page. Calculated automatically as 1 credit per course hour from Duration (hours); this field is used only when Duration is empty.',
          ro: 'Creditele CPD afișate pe pagina cursului. Se calculează automat ca 1 credit pe oră de curs din câmpul Duration (hours); acest câmp se folosește doar când durata este goală.',
        },
      },
    },
    {
      name: 'sessions',
      type: 'join',
      collection: 'courseSessions',
      on: 'course',
      admin: {
        description: {
          en: 'The editions of this course, with their dates, prices and seats. Add or edit them in the Course Sessions collection; they appear here automatically.',
          ro: 'Edițiile acestui curs, cu datele, prețurile și locurile lor. Se adaugă sau se editează în colecția Course Sessions; apar aici automat.',
        },
      },
    },
    // Owner 2026-07-26: powers the course quiz. The engine
    // (src/components/quiz/quiz-data.ts) matches quiz answers against these tags —
    // weighted scoring, hard gates, nearest-edition tie-break. A course WITHOUT a level
    // is simply excluded from quiz recommendations (safe default for drafts/mockups).
    {
      name: 'quizProfile',
      type: 'group',
      admin: {
        description: {
          en: 'Matching tags for the course quiz on the site. Fill these in so the quiz can recommend this course; leave Level empty to keep the course out of the quiz results entirely.',
          ro: 'Etichete de potrivire pentru quiz-ul de cursuri de pe site. Completați-le pentru ca quiz-ul să poată recomanda acest curs; lăsați câmpul Level gol pentru a ține cursul complet în afara rezultatelor quiz-ului.',
        },
      },
      fields: [
        {
          name: 'level',
          type: 'select',
          options: [
            { label: { en: 'Introductory', ro: 'Introductiv' }, value: 'introductory' },
            { label: { en: 'Intermediate', ro: 'Intermediar' }, value: 'intermediate' },
            { label: { en: 'Advanced', ro: 'Avansat' }, value: 'advanced' },
            { label: { en: 'Professional specialization', ro: 'Specializare profesională' }, value: 'specialization' },
          ],
          admin: {
            description: {
              en: 'Depth of the course. Required for the course to appear in quiz results; while empty, the quiz never recommends this course.',
              ro: 'Nivelul de profunzime al cursului. Obligatoriu pentru ca acest curs să apară în rezultatele quiz-ului; cât timp este gol, quiz-ul nu îl recomandă niciodată.',
            },
          },
        },
        {
          name: 'outcomes',
          type: 'select',
          hasMany: true,
          options: [
            { label: { en: 'Overview / big picture', ro: 'Privire de ansamblu' }, value: 'overview' },
            { label: { en: 'Practical, applicable skills', ro: 'Abilități practice, aplicabile' }, value: 'practicalSkills' },
            { label: { en: 'Implementation plan', ro: 'Plan de implementare' }, value: 'implementationPlan' },
            { label: { en: 'Audit preparation', ro: 'Pregătire pentru audit' }, value: 'auditPrep' },
            { label: { en: 'Certification', ro: 'Certificare' }, value: 'certification' },
            { label: { en: 'Foundation for more advanced courses', ro: 'Bază pentru cursuri mai avansate' }, value: 'foundationForMore' },
          ],
          admin: {
            description: {
              en: 'What a participant walks away with at the end of the course. Pick all that apply; the quiz matches these against the visitor\'s answers.',
              ro: 'Ce obține un participant la finalul cursului. Alegeți toate variantele potrivite; quiz-ul le compară cu răspunsurile vizitatorului.',
            },
          },
        },
        {
          name: 'domains',
          type: 'select',
          hasMany: true,
          options: [
            { label: { en: 'ISO standards & management systems', ro: 'Standarde ISO și sisteme de management' }, value: 'isoManagement' },
            { label: { en: 'Quality & continuous improvement', ro: 'Calitate și îmbunătățire continuă' }, value: 'quality' },
            { label: { en: 'Sustainability & organizational responsibility', ro: 'Sustenabilitate și responsabilitate organizațională' }, value: 'sustainability' },
            { label: { en: 'Risk management & compliance', ro: 'Managementul riscului și conformitate' }, value: 'riskCompliance' },
            { label: { en: 'Information security & data protection', ro: 'Securitatea informației și protecția datelor' }, value: 'infosec' },
            { label: { en: 'AI & digital transformation', ro: 'AI și transformare digitală' }, value: 'ai' },
            { label: { en: 'Leadership, strategy & governance', ro: 'Leadership, strategie și guvernanță' }, value: 'leadership' },
            { label: { en: 'Audit & conformity assessment', ro: 'Audit și evaluarea conformității' }, value: 'audit' },
          ],
          admin: {
            description: {
              en: 'The domains this course covers, mirroring the quiz question about the visitor\'s field of interest. Pick all that apply.',
              ro: 'Domeniile acoperite de acest curs, în oglindă cu întrebarea din quiz despre domeniul de interes al vizitatorului. Alegeți toate variantele potrivite.',
            },
          },
        },
        {
          name: 'quizPitch',
          type: 'textarea',
          localized: true,
          admin: {
            description: {
              en: 'One or two sentences shown on the quiz result screen as the reason this course is recommended. The quiz runs in Romanian, so write at least the Romanian version.',
              ro: 'Una sau două propoziții afișate pe ecranul cu rezultatul quiz-ului, ca motiv pentru care recomandăm acest curs. Quiz-ul rulează în română, deci scrieți cel puțin versiunea în română.',
            },
          },
        },
      ],
    },
    // Owner 2026-08-12: the two callout cards at the bottom of the course page become
    // editable per course. Empty fields fall back to the site-wide default copy
    // (src/lib/i18n/dictionaries.ts `courseDetail.callout*`); the links stay fixed
    // (left card → /corporate, right card → /contact).
    {
      name: 'callouts',
      type: 'group',
      admin: {
        description: {
          en: 'The two cards at the bottom of the course page. Leave any field empty to use the default site copy; the left card always links to Corporate, the right one to Contact.',
          ro: 'Cele două cartonașe din partea de jos a paginii cursului. Lăsați un câmp gol pentru textul implicit al site-ului; cardul din stânga duce mereu la Corporate, cel din dreapta la Contact.',
        },
      },
      fields: [
        {
          name: 'team',
          type: 'group',
          label: { en: 'Left card (corporate)', ro: 'Cardul din stânga (corporate)' },
          fields: [
            { name: 'title', type: 'text', localized: true },
            { name: 'body', type: 'textarea', localized: true },
          ],
        },
        {
          name: 'questions',
          type: 'group',
          label: { en: 'Right card (contact)', ro: 'Cardul din dreapta (contact)' },
          fields: [
            { name: 'title', type: 'text', localized: true },
            { name: 'body', type: 'textarea', localized: true },
          ],
        },
      ],
    },
  ],
}
