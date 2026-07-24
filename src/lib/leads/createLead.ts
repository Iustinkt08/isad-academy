import type { Payload } from 'payload'

import { HONEYPOT_FIELD, validateLeadInput } from './validateLeadInput'

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

  const validated = validateLeadInput(raw)
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

  if (input.topicCourse !== undefined) {
    const course = await payload.findByID({
      collection: 'courses',
      id: input.topicCourse,
      depth: 0,
      overrideAccess: false,
      disableErrors: true,
    })
    if (!course) {
      return {
        status: 400,
        body: { ok: false, error: '"topicCourse" must reference an existing course.' },
      }
    }
  }

  await payload.create({
    collection: 'leads',
    data: {
      type: 'corporate',
      name: input.contactPerson,
      email: input.email,
      phone: input.phone,
      companyName: input.companyName,
      contactPerson: input.contactPerson,
      participantsRange: input.participantsRange,
      topicCourse: input.topicCourse,
      topicOther: input.topicOther,
      preferredPeriod: input.preferredPeriod,
      message: input.message,
    },
    overrideAccess: true,
  })
  return { status: 201, body: { ok: true } }
}
