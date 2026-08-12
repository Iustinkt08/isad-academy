import { describe, expect, it } from 'vitest'

import type { CorporateFormField } from '../../../src/lib/corporate/formConfig'
import {
  validateLeadInput,
  type NormalizedContactLead,
  type NormalizedCorporateLead,
} from '../../../src/lib/leads/validateLeadInput'

const validContact = () => ({
  type: 'contact',
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'course',
  message: 'Tell me more about the ISO/IEC 42001 preparation course.',
})

/** Explicit form config (owner 2026-08-12 dynamic corporate form) — one field of every
 * type, so the per-type validation paths are all exercised deterministically. */
const FIELDS: CorporateFormField[] = [
  { id: 'phone', label: 'Phone', fieldType: 'phone', required: false, options: [] },
  { id: 'participants', label: 'Participants', fieldType: 'text', required: false, options: [] },
  { id: 'topic', label: 'Topic / course', fieldType: 'courseTopic', required: true, options: [] },
  { id: 'period', label: 'Preferred period', fieldType: 'period', required: false, options: [] },
  { id: 'message', label: 'Goals', fieldType: 'textarea', required: false, options: [] },
  { id: 'dept', label: 'Department', fieldType: 'select', required: false, options: ['IT', 'Legal'] },
  { id: 'billing', label: 'Billing e-mail', fieldType: 'email', required: false, options: [] },
]

const validCorporate = (): Record<string, unknown> => ({
  type: 'corporate',
  companyName: 'Acme Bank SRL',
  contactPerson: 'Maria Ionescu',
  email: 'maria@acme.example.com',
  answers: [
    { id: 'participants', value: '6–10' },
    { id: 'topic', courseId: 42 },
  ],
})

/** Corporate submissions validate against the explicit FIELDS config. */
const run = (body: unknown) => validateLeadInput(body, FIELDS)

const corporateWithAnswers = (answers: unknown) => ({ ...validCorporate(), answers })

describe('validateLeadInput — shape and type', () => {
  it.each([null, undefined, 'string', 42, [1, 2]])('rejects non-object body %p', (raw) => {
    const result = validateLeadInput(raw)
    expect(result.ok).toBe(false)
  })

  it('rejects a missing/unknown type', () => {
    expect(validateLeadInput({})).toMatchObject({ ok: false })
    expect(validateLeadInput({ type: 'newsletter' })).toMatchObject({
      ok: false,
      error: '"type" must be "contact" or "corporate".',
    })
  })
})

describe('validateLeadInput — contact', () => {
  it('accepts a full valid contact lead and trims fields', () => {
    const result = validateLeadInput({
      ...validContact(),
      name: '  Jane Doe  ',
      phone: ' +40 700 000 000 ',
    })
    expect(result.ok).toBe(true)
    const value = (result as { ok: true; value: NormalizedContactLead }).value
    expect(value).toMatchObject({
      type: 'contact',
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+40 700 000 000',
      subject: 'course',
    })
  })

  it('accepts an omitted phone (optional)', () => {
    const result = validateLeadInput(validContact())
    expect(result.ok).toBe(true)
    expect((result as { ok: true; value: NormalizedContactLead }).value.phone).toBeUndefined()
  })

  it.each(['name', 'email', 'subject', 'message'])('rejects a missing required %s', (key) => {
    const body: Record<string, unknown> = validContact()
    delete body[key]
    const result = validateLeadInput(body)
    expect(result.ok).toBe(false)
  })

  it('rejects a malformed email', () => {
    const result = validateLeadInput({ ...validContact(), email: 'not-an-email' })
    expect(result).toMatchObject({ ok: false, error: '"email" must be a valid e-mail address.' })
  })

  it('rejects a subject outside the allowed set', () => {
    const result = validateLeadInput({ ...validContact(), subject: 'sales' })
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toContain('"subject"')
  })

  it('accepts every allowed subject', () => {
    for (const subject of ['course', 'corporate', 'certification', 'other']) {
      expect(validateLeadInput({ ...validContact(), subject }).ok).toBe(true)
    }
  })

  it('rejects a whitespace-only message', () => {
    const result = validateLeadInput({ ...validContact(), message: '   ' })
    expect(result).toMatchObject({ ok: false, error: '"message" is required.' })
  })

  it('rejects unknown fields (mass-assignment hygiene)', () => {
    const result = validateLeadInput({ ...validContact(), isAdmin: true })
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toContain('isAdmin')
  })

  it('rejects corporate-only fields on a contact lead', () => {
    const result = validateLeadInput({ ...validContact(), companyName: 'Sneaky SRL' })
    expect(result.ok).toBe(false)
  })

  it('allow-lists the empty honeypot field without reading it', () => {
    expect(validateLeadInput({ ...validContact(), website: '' }).ok).toBe(true)
  })
})

describe('validateLeadInput — corporate (dynamic form)', () => {
  it('accepts a valid corporate lead and keeps answers in config order', () => {
    const result = run({
      ...validCorporate(),
      // Submitted out of config order on purpose — normalization must reorder.
      answers: [
        { id: 'topic', courseId: 42 },
        { id: 'participants', value: ' 6–10 ' },
      ],
    })
    expect(result.ok).toBe(true)
    const value = (result as { ok: true; value: NormalizedCorporateLead }).value
    expect(value).toMatchObject({
      type: 'corporate',
      companyName: 'Acme Bank SRL',
      contactPerson: 'Maria Ionescu',
    })
    expect(value.answers.map((answer) => answer.fieldId)).toEqual(['participants', 'topic'])
    expect(value.answers[0]).toMatchObject({ label: 'Participants', value: '6–10' })
    expect(value.answers[1]).toMatchObject({ fieldType: 'courseTopic', courseId: 42 })
  })

  it('normalizes a numeric-string courseId to a number', () => {
    const result = run(
      corporateWithAnswers([{ id: 'topic', courseId: '42' }]),
    ) as { ok: true; value: NormalizedCorporateLead }
    expect(result.ok).toBe(true)
    expect(result.value.answers[0]?.courseId).toBe(42)
  })

  it('rejects a non-numeric courseId', () => {
    const result = run(corporateWithAnswers([{ id: 'topic', courseId: 'iso-course' }]))
    expect(result).toMatchObject({
      ok: false,
      error: '"Topic / course": "courseId" must be a course id.',
    })
  })

  it('accepts "other" instead of courseId on a topic field', () => {
    const result = run(
      corporateWithAnswers([{ id: 'topic', other: 'Custom in-house fraud analytics workshop' }]),
    ) as { ok: true; value: NormalizedCorporateLead }
    expect(result.ok).toBe(true)
    expect(result.value.answers[0]?.other).toBe('Custom in-house fraud analytics workshop')
  })

  it('rejects a topic answer with neither courseId nor other, or with both', () => {
    expect(run(corporateWithAnswers([{ id: 'topic' }]))).toMatchObject({
      ok: false,
      error: '"Topic / course": provide exactly one of "courseId" or "other".',
    })
    expect(
      run(corporateWithAnswers([{ id: 'topic', courseId: 42, other: 'Also this' }])).ok,
    ).toBe(false)
  })

  it('rejects a missing REQUIRED configured field (topic)', () => {
    const result = run(corporateWithAnswers([{ id: 'participants', value: '6–10' }]))
    expect(result).toMatchObject({ ok: false, error: '"Topic / course" is required.' })
  })

  it.each(['companyName', 'contactPerson', 'email'])('rejects a missing required %s', (key) => {
    const body = validCorporate()
    delete body[key]
    expect(run(body).ok).toBe(false)
  })

  it('rejects an empty text answer but accepts the field being omitted', () => {
    expect(
      run(
        corporateWithAnswers([
          { id: 'participants', value: '   ' },
          { id: 'topic', courseId: 1 },
        ]),
      ).ok,
    ).toBe(false)
    expect(run(corporateWithAnswers([{ id: 'topic', courseId: 1 }])).ok).toBe(true)
  })

  it('accepts a period with from <= to and normalizes to ISO', () => {
    const result = run(
      corporateWithAnswers([
        { id: 'topic', courseId: 1 },
        { id: 'period', from: '2026-09-01', to: '2026-09-30' },
      ]),
    ) as { ok: true; value: NormalizedCorporateLead }
    expect(result.ok).toBe(true)
    const period = result.value.answers.find((answer) => answer.fieldId === 'period')
    expect(period?.from).toBe(new Date('2026-09-01').toISOString())
    expect(period?.to).toBe(new Date('2026-09-30').toISOString())
  })

  it('accepts an open-ended period (only from, or only to)', () => {
    expect(
      run(corporateWithAnswers([{ id: 'topic', courseId: 1 }, { id: 'period', from: '2026-09-01' }]))
        .ok,
    ).toBe(true)
    expect(
      run(corporateWithAnswers([{ id: 'topic', courseId: 1 }, { id: 'period', to: '2026-09-30' }]))
        .ok,
    ).toBe(true)
  })

  it('rejects a period with from AFTER to, unparsable dates, or unknown keys', () => {
    expect(
      run(
        corporateWithAnswers([
          { id: 'topic', courseId: 1 },
          { id: 'period', from: '2026-10-01', to: '2026-09-01' },
        ]),
      ),
    ).toMatchObject({ ok: false, error: '"Preferred period": "from" must be on or before "to".' })
    expect(
      run(corporateWithAnswers([{ id: 'topic', courseId: 1 }, { id: 'period', from: 'next week' }]))
        .ok,
    ).toBe(false)
    expect(
      run(
        corporateWithAnswers([
          { id: 'topic', courseId: 1 },
          { id: 'period', from: '2026-09-01', tz: 'UTC' },
        ]),
      ).ok,
    ).toBe(false)
  })

  it('enforces select options and e-mail format on configured fields', () => {
    expect(
      run(corporateWithAnswers([{ id: 'topic', courseId: 1 }, { id: 'dept', value: 'IT' }])).ok,
    ).toBe(true)
    expect(
      run(corporateWithAnswers([{ id: 'topic', courseId: 1 }, { id: 'dept', value: 'Sales' }])).ok,
    ).toBe(false)
    expect(
      run(
        corporateWithAnswers([
          { id: 'topic', courseId: 1 },
          { id: 'billing', value: 'not-an-email' },
        ]),
      ).ok,
    ).toBe(false)
  })

  it('rejects answers for fields outside the config, and duplicates', () => {
    expect(
      run(corporateWithAnswers([{ id: 'topic', courseId: 1 }, { id: 'ghost', value: 'x' }])).ok,
    ).toBe(false)
    expect(
      run(
        corporateWithAnswers([
          { id: 'topic', courseId: 1 },
          { id: 'topic', other: 'again' },
        ]),
      ),
    ).toMatchObject({ ok: false, error: 'Duplicate answer for form field "topic".' })
  })

  it('rejects unknown top-level fields and legacy/contact-only fields', () => {
    expect(run({ ...validCorporate(), pricing: { total: 0 } }).ok).toBe(false)
    expect(run({ ...validCorporate(), subject: 'corporate' }).ok).toBe(false)
    expect(run({ ...validCorporate(), participantsRange: '6-10' }).ok).toBe(false)
  })

  it('falls back to the built-in default fields when no config is passed', () => {
    const result = validateLeadInput({
      ...validCorporate(),
      answers: [{ id: 'default-topic', courseId: 7 }],
    })
    expect(result.ok).toBe(true)
    expect(
      validateLeadInput({ ...validCorporate(), answers: [{ id: 'topic', courseId: 7 }] }).ok,
    ).toBe(false)
  })
})
