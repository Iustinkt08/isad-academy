import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import {
  createEventRegistration,
  HONEYPOT_FIELD,
} from '../../../src/lib/events/createEventRegistration'

/** The active event id = its date key; far future so the check is clock-robust. */
const FUTURE_EVENT_ID = '2099-01-01T00:00:00.000Z'

/** Minimal Payload stub — the two Local API calls the pipeline makes, plus `findGlobal`
 * (eventId is now validated against the active `eventPopup` global). By default the popup
 * is active and its date matches `FUTURE_EVENT_ID`. */
const makePayload = (
  existingCount = 0,
  popup: unknown = { active: true, eventDate: FUTURE_EVENT_ID },
) => {
  const find = vi.fn().mockResolvedValue({ totalDocs: existingCount, docs: [] })
  const create = vi.fn().mockResolvedValue({ id: 1 })
  const findGlobal = vi.fn().mockResolvedValue(popup)
  return { payload: { find, create, findGlobal } as unknown as Payload, find, create, findGlobal }
}

const validInput = {
  eventId: FUTURE_EVENT_ID,
  firstName: 'Ana',
  lastName: 'Popescu',
  email: 'ana@example.com',
  occupation: 'Consultant',
}

describe('createEventRegistration', () => {
  it('creates a registration and returns 201 for valid input', async () => {
    const { payload, create } = makePayload()
    const result = await createEventRegistration(validInput, { payload })

    expect(result).toEqual({ status: 201, body: { ok: true } })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'eventRegistrations',
        data: expect.objectContaining({ firstName: 'Ana', email: 'ana@example.com' }),
      }),
    )
  })

  it('honeypot: a filled hidden field fakes success without persisting anything', async () => {
    const { payload, find, create } = makePayload()
    const result = await createEventRegistration(
      { ...validInput, [HONEYPOT_FIELD]: 'http://spam.example' },
      { payload },
    )

    expect(result).toEqual({ status: 201, body: { ok: true } })
    expect(find).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('deduplicates: same email + same event acknowledges without a second row', async () => {
    const { payload, create } = makePayload(1)
    const result = await createEventRegistration(validInput, { payload })

    expect(result).toEqual({ status: 201, body: { ok: true } })
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    ['missing first name', { ...validInput, firstName: '  ' }],
    ['missing last name', { ...validInput, lastName: '' }],
    ['invalid email', { ...validInput, email: 'not-an-email' }],
    ['missing event id', { ...validInput, eventId: '' }],
    ['oversized field', { ...validInput, occupation: 'x'.repeat(201) }],
  ])('rejects %s with 400', async (_label, input) => {
    const { payload, create } = makePayload()
    const result = await createEventRegistration(input, { payload })

    expect(result.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects an eventId that is not the active event (dedupe-bypass guard)', async () => {
    const { payload, create } = makePayload()
    const result = await createEventRegistration({ ...validInput, eventId: 'evt-forged-2' }, { payload })

    expect(result.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects when the popup is inactive / no event is open', async () => {
    const { payload, create } = makePayload(0, { active: false, eventDate: FUTURE_EVENT_ID })
    const result = await createEventRegistration(validInput, { payload })

    expect(result.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects non-object bodies', async () => {
    const { payload } = makePayload()
    expect((await createEventRegistration(null, { payload })).status).toBe(400)
    expect((await createEventRegistration('[]', { payload })).status).toBe(400)
    expect((await createEventRegistration([1, 2], { payload })).status).toBe(400)
  })

  it('occupation is optional (free-text field, datalist covers choose-or-type)', async () => {
    const { payload, create } = makePayload()
    const noOccupation: Partial<typeof validInput> = { ...validInput }
    delete noOccupation.occupation
    const result = await createEventRegistration(noOccupation, { payload })

    expect(result.status).toBe(201)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ occupation: expect.anything() }),
      }),
    )
  })
})
