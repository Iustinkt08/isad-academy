import { escapeHtml, renderBaseLayout } from './base'
import type { RenderedEmail } from './paymentConfirmation'

/**
 * Course-launch newsletter — client-supplied copy (owner 2026-07-30,
 * "templates isad.academy.pdf", §"Newsletter template").
 *
 * The client's document lists three subject-line options; `subjectVariant` selects one so
 * the admin can pick per send without editing code. Every field in the "Course information"
 * block is optional: the schema (CLAUDE.md §4) has no `format`, `language` or per-course
 * `fee`, so any value the caller cannot supply is OMITTED from the table rather than
 * rendered as an empty placeholder.
 *
 * NOT WIRED YET (2026-07-30): sending this from the admin needs `newsletters` to gain a
 * layout selector plus a `course` relationship, which is a schema change and therefore a
 * Payload migration. Until that migration is written and applied, the `newsletters`
 * collection still sends only hand-written bodies (`./newsletterBroadcast`). This renderer
 * is complete and unit-tested, so wiring it is a collection change plus a migration.
 */
export type CourseAnnouncementData = {
  courseName: string
  /** Absolute URL for the "View programme details" button. */
  courseUrl: string
  subjectVariant?: 'introducing' | 'newProgramme' | 'enrolmentOpen'
  format?: string | null
  date?: string | null
  duration?: string | null
  language?: string | null
  fee?: string | null
  certification?: string | null
  /** Address for corporate/group enquiries. */
  contactEmail?: string
}

const BLUE = '#1c5d99'

const FOCUS_POINTS = [
  'organisational AI readiness;',
  'governance and accountability;',
  'AI risk assessment and audit preparation;',
  'regulatory and compliance considerations;',
  'internal controls, documentation and oversight;',
  'practical implementation planning.',
]

const subjectFor = (courseName: string, variant: CourseAnnouncementData['subjectVariant']): string => {
  switch (variant) {
    case 'newProgramme':
      return 'New executive programme from isad.academy'
    case 'enrolmentOpen':
      return `Enrolment now open: ${courseName}`
    default:
      return `Introducing ${courseName}`
  }
}

export const renderCourseAnnouncementEmail = (data: CourseAnnouncementData): RenderedEmail => {
  const courseName = data.courseName || 'our new programme'
  // Vezi nota din ./orderReceived — `support@` mapat pe `contact@` (owner 2026-08-05).
  const contactEmail = data.contactEmail || 'contact@isad.academy'
  const subject = subjectFor(courseName, data.subjectVariant)
  const preheader =
    'A practical programme for professionals responsible for AI readiness, governance and organisational implementation.'

  // Only rows with a real value survive — no "[Language]" ever reaches an inbox.
  const infoRows: Array<[string, string]> = (
    [
      ['Course', courseName],
      ['Format', data.format],
      ['Date', data.date],
      ['Duration', data.duration],
      ['Language', data.language],
      ['Fee', data.fee],
      ['Certification', data.certification],
    ] as Array<[string, string | null | undefined]>
  )
    .filter((row): row is [string, string] => Boolean(row[1] && String(row[1]).trim()))
    .map(([label, value]) => [label, String(value).trim()])

  const bodyHtml = `
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;">Introducing ${escapeHtml(courseName)}</h1>
    <p style="margin:0 0 16px;line-height:1.6;">isad.academy is pleased to announce the launch of ${escapeHtml(
      courseName,
    )}, a professional training programme developed for organisations preparing to adopt, govern and assess artificial intelligence responsibly.</p>
    <p style="margin:0 0 24px;line-height:1.6;">The course provides a structured view of the legal, operational and governance requirements that influence AI implementation. It is designed for professionals who need to translate broad AI principles into clear responsibilities, documented controls and practical action.</p>

    <h2 style="font-size:16px;margin:0 0 8px;">Programme focus</h2>
    <p style="margin:0 0 8px;line-height:1.6;">Participants will examine:</p>
    <ul style="margin:0 0 16px;padding-left:20px;line-height:1.6;">
      ${FOCUS_POINTS.map((point) => `<li style="margin:0 0 4px;">${point}</li>`).join('')}
    </ul>
    <p style="margin:0 0 24px;line-height:1.6;">The programme combines expert instruction with applied frameworks, case-based discussion and materials that can be used within the organisation after completion.</p>

    <h2 style="font-size:16px;margin:0 0 8px;">Course information</h2>
    <table role="presentation" width="100%" style="margin:0 0 24px;font-size:14px;">
      ${infoRows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 0;color:#666666;">${label}</td><td style="padding:4px 0;text-align:right;">${escapeHtml(
              value,
            )}</td></tr>`,
        )
        .join('')}
    </table>

    <h2 style="font-size:16px;margin:0 0 8px;">Intended participants</h2>
    <p style="margin:0 0 24px;line-height:1.6;">The course is designed for executives, board members, technology leaders, legal and compliance professionals, internal auditors, risk managers, product owners and consultants involved in AI adoption or oversight.</p>

    <h2 style="font-size:16px;margin:0 0 8px;">Corporate delivery</h2>
    <p style="margin:0 0 8px;line-height:1.6;">The programme is also available for private delivery to organisations.</p>
    <p style="margin:0 0 24px;line-height:1.6;">Corporate sessions may be adapted to reflect the organisation’s sector, AI portfolio, governance structure and regulatory environment.</p>

    <p style="margin:0 0 24px;">
      <a href="${escapeHtml(data.courseUrl)}" style="display:inline-block;background-color:${BLUE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px;font-weight:600;">View programme details</a>
    </p>

    <p style="margin:0 0 16px;line-height:1.6;">For corporate delivery or group participation, please contact <a href="mailto:${escapeHtml(
      contactEmail,
    )}" style="color:${BLUE};">${escapeHtml(contactEmail)}</a>.</p>
    <p style="margin:0;line-height:1.6;">The isad.academy Team</p>
  `

  const text = [
    `Introducing ${courseName}`,
    `isad.academy is pleased to announce the launch of ${courseName}, a professional training programme developed for organisations preparing to adopt, govern and assess artificial intelligence responsibly.`,
    'The course provides a structured view of the legal, operational and governance requirements that influence AI implementation. It is designed for professionals who need to translate broad AI principles into clear responsibilities, documented controls and practical action.',
    'Programme focus',
    'Participants will examine:',
    ...FOCUS_POINTS.map((point) => `- ${point}`),
    'The programme combines expert instruction with applied frameworks, case-based discussion and materials that can be used within the organisation after completion.',
    'Course information',
    ...infoRows.map(([label, value]) => `${label}: ${value}`),
    'Intended participants',
    'The course is designed for executives, board members, technology leaders, legal and compliance professionals, internal auditors, risk managers, product owners and consultants involved in AI adoption or oversight.',
    'Corporate delivery',
    'The programme is also available for private delivery to organisations.',
    'Corporate sessions may be adapted to reflect the organisation’s sector, AI portfolio, governance structure and regulatory environment.',
    `View programme details: ${data.courseUrl}`,
    `For corporate delivery or group participation, please contact ${contactEmail}.`,
    'The isad.academy Team',
  ].join('\n\n')

  const html = renderBaseLayout({ title: subject, preheader, bodyHtml })

  return { subject, html, text }
}
