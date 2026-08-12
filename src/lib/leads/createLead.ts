import type { Payload } from 'payload'

import { resolveCorporateFormFields, type CorporateFormField } from '../corporate/formConfig'
import { getDictionary } from '../i18n/dictionaries'
import { HONEYPOT_FIELD, validateLeadInput, type NormalizedCorporateAnswer } from './validateLeadInput'

export type LeadSuccessBody = { ok: true }
export type LeadFailureBody = { ok: false; error: string }

export type CreateLeadResult =
  | { status: 201; body: LeadSuccessBody }
  | { status: 400; body: LeadFailureBody }

/**
 * `POST /api/leads/submit` service (CLAUDE.md §4 `leads`, §6 Contact/Corporate) — deliberately
 * separated from the route handler so it is unit/integration-testable by direct invocation
 * (see tests/int/leads-route.int.spec.ts), mirroring `processCheckout`.
 *
 * Flow:
 *   1. Honeypot: bots that auto-fill every input populate the visually-hidden `website`
 *      field. A non-empty honeypot returns the SAME 201 `{ ok: true }` as a real submission
 *      (so the bot learns nothing) but silently skips creation — no lead, no notification
 *      email. Humans never see or focus the field (aria-hidden, tabindex=-1, off-screen).
 *   2. Validation: strict, allow-listed, per-type (`validateLeadInput`).
 *   3. `topicCourse` existence check via the Local API with `overrideAccess: false` — only a
 *      PUBLISHED course id passes, exactly what the public corporate form offers.
 *   4. Create via Local API with `overrideAccess: true` (public create is allowed on `leads`
 *      anyway, but the input has already been fully validated/normalized here). The T7
 *      `afterChange` hook then sends the single-destination notification email — this
 *      service must NOT send email itself.
 *
 * The corporate form has no free-standing "name" input; the Leads collection requires
 * `name`, so the contact person doubles as the lead's name (§4 — corporate leads are keyed
 * by company + contact person).
 */
export async function createLead(raw: unknown, deps: { payload: Payload }): Promise<CreateLeadResult> {
  const { payload } = deps

  const honeypot =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)[HONEYPOT_FIELD]
      : undefined
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return { status: 201, body: { ok: true } }
  }

  // Dynamic corporate form (owner 2026-08-12): validation runs against the CURRENT field
  // configuration from the `corporatePage` global; a missing/unreadable global falls back
  // to the built-in default fields (EN dict — labels stored on leads stay consistent).
  const corporateFields = await resolveCorporateFields(payload)

  const validated = validateLeadInput(raw, corporateFields)
  if (!validated.ok) {
    return { status: 400, body: { ok: false, error: validated.error } }
  }
  const input = validated.value

  if (input.type === 'contact') {
    await payload.create({
      collection: 'leads',
      data: {
        type: 'contact',
        name: input.name,
        email: input.email,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
      },
      overrideAccess: true,
    })
    return { status: 201, body: { ok: true } }
  }

  // courseTopic answers: only a PUBLISHED course id passes (overrideAccess: false), and its
  // title becomes the stored display value of the answer.
  const courseTitles = new Map<number, string>()
  for (const answer of input.answers) {
    if (answer.fieldType !== 'courseTopic' || answer.courseId === undefined) continue
    const course = await payload.findByID({
      collection: 'courses',
      id: answer.courseId,
      depth: 0,
      overrideAccess: false,
      disableErrors: true,
    })
    if (!course) {
      return {
        status: 400,
        body: { ok: false, error: `"${answer.label}" must reference an existing course.` },
      }
    }
    courseTitles.set(answer.courseId, course.title)
  }

  const firstCourseId = input.answers.find(
    (answer) => answer.fieldType === 'courseTopic' && answer.courseId !== undefined,
  )?.courseId

  await payload.create({
    collection: 'leads',
    data: {
      type: 'corporate',
      name: input.contactPerson,
      email: input.email,
      companyName: input.companyName,
      contactPerson: input.contactPerson,
      // Kept as a real relationship so the admin list/detail still links to the course.
      topicCourse: firstCourseId,
      formData: input.answers.map((answer) => ({
        label: answer.label,
        value: answerDisplayValue(answer, courseTitles),
      })),
    },
    overrideAccess: true,
  })
  return { status: 201, body: { ok: true } }
}

/** Current corporate form fields, resolved from the global; never throws. */
async function resolveCorporateFields(payload: Payload): Promise<CorporateFormField[]> {
  const global = await payload
    .findGlobal({ slug: 'corporatePage', depth: 0, overrideAccess: true, locale: 'en' })
    .catch(() => null)
  return resolveCorporateFormFields(global, getDictionary('en'))
}

/** "2026-09-01 → 2026-09-05" for periods, the course title (or free text) for topics,
 * the trimmed value for everything else — what the admin and the e-mail display. */
function answerDisplayValue(
  answer: NormalizedCorporateAnswer,
  courseTitles: Map<number, string>,
): string {
  if (answer.fieldType === 'period') {
    const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : '—')
    return `${day(answer.from)} → ${day(answer.to)}`
  }
  if (answer.fieldType === 'courseTopic') {
    if (answer.courseId !== undefined) {
      return courseTitles.get(answer.courseId) ?? `#${answer.courseId}`
    }
    return answer.other ?? ''
  }
  return answer.value ?? ''
}
