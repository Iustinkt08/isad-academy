import { describe, expect, it } from 'vitest'

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

const validCorporate = () => ({
  type: 'corporate',
  companyName: 'Acme Bank SRL',
  contactPerson: 'Maria Ionescu',
  email: 'maria@acme.example.com',
  participantsRange: '6–10',
  topicCourse: 42,
})

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

describe('validateLeadInput — corporate', () => {
  it('accepts a valid corporate lead with topicCourse', () => {
    const result = validateLeadInput(validCorporate())
    expect(result.ok).toBe(true)
    const value = (result as { ok: true; value: NormalizedCorporateLead }).value
    expect(value).toMatchObject({
      type: 'corporate',
      companyName: 'Acme Bank SRL',
      contactPerson: 'Maria Ionescu',
      topicCourse: 42,
    })
  })

  it('normalizes a numeric-string topicCourse to a number', () => {
    const result = validateLeadInput({ ...validCorporate(), topicCourse: '42' })
    expect(result.ok).toBe(true)
    expect((result as { ok: true; value: NormalizedCorporateLead }).value.topicCourse).toBe(42)
  })

  it('rejects a non-numeric topicCourse', () => {
    const result = validateLeadInput({ ...validCorporate(), topicCourse: 'iso-course' })
    expect(result).toMatchObject({ ok: false, error: '"topicCourse" must be a course id.' })
  })

  it('accepts topicOther instead of topicCourse', () => {
    const body: Record<string, unknown> = validCorporate()
    delete body.topicCourse
    body.topicOther = 'Custom in-house fraud analytics workshop'
    const result = validateLeadInput(body)
    expect(result.ok).toBe(true)
    expect(
      (result as { ok: true; value: NormalizedCorporateLead }).value.topicOther,
    ).toBe('Custom in-house fraud analytics workshop')
  })

  it('rejects neither topicCourse nor topicOther', () => {
    const body: Record<string, unknown> = validCorporate()
    delete body.topicCourse
    const result = validateLeadInput(body)
    expect(result).toMatchObject({
      ok: false,
      error: 'Provide exactly one of "topicCourse" or "topicOther".',
    })
  })

  it('rejects both topicCourse and topicOther together', () => {
    const result = validateLeadInput({ ...validCorporate(), topicOther: 'Also this' })
    expect(result).toMatchObject({
      ok: false,
      error: 'Provide exactly one of "topicCourse" or "topicOther".',
    })
  })

  it.each(['companyName', 'contactPerson', 'email'])('rejects a missing required %s', (key) => {
    const body: Record<string, unknown> = validCorporate()
    delete body[key]
    expect(validateLeadInput(body).ok).toBe(false)
  })

  it('treats participantsRange as optional but rejects an empty one', () => {
    const body: Record<string, unknown> = validCorporate()
    delete body.participantsRange
    expect(validateLeadInput(body).ok).toBe(true)
    expect(validateLeadInput({ ...validCorporate(), participantsRange: '  ' }).ok).toBe(false)
  })

  it('accepts a preferredPeriod with from <= to and normalizes to ISO', () => {
    const result = validateLeadInput({
      ...validCorporate(),
      preferredPeriod: { from: '2026-09-01', to: '2026-09-30' },
    })
    expect(result.ok).toBe(true)
    const period = (result as { ok: true; value: NormalizedCorporateLead }).value.preferredPeriod
    expect(period?.from).toBe(new Date('2026-09-01').toISOString())
    expect(period?.to).toBe(new Date('2026-09-30').toISOString())
  })

  it('accepts an open-ended preferredPeriod (only from, or only to)', () => {
    expect(
      validateLeadInput({ ...validCorporate(), preferredPeriod: { from: '2026-09-01' } }).ok,
    ).toBe(true)
    expect(
      validateLeadInput({ ...validCorporate(), preferredPeriod: { to: '2026-09-30' } }).ok,
    ).toBe(true)
  })

  it('rejects a preferredPeriod with from AFTER to', () => {
    const result = validateLeadInput({
      ...validCorporate(),
      preferredPeriod: { from: '2026-10-01', to: '2026-09-01' },
    })
    expect(result).toMatchObject({
      ok: false,
      error: '"preferredPeriod.from" must be on or before "preferredPeriod.to".',
    })
  })

  it('rejects unparsable preferredPeriod dates and unknown period keys', () => {
    expect(
      validateLeadInput({ ...validCorporate(), preferredPeriod: { from: 'next week' } }).ok,
    ).toBe(false)
    expect(
      validateLeadInput({ ...validCorporate(), preferredPeriod: { from: '2026-09-01', tz: 'UTC' } }).ok,
    ).toBe(false)
  })

  it('rejects unknown fields and contact-only fields on a corporate lead', () => {
    expect(validateLeadInput({ ...validCorporate(), pricing: { total: 0 } }).ok).toBe(false)
    expect(validateLeadInput({ ...validCorporate(), subject: 'corporate' }).ok).toBe(false)
  })
})
