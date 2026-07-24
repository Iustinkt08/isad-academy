import { describe, expect, it } from 'vitest'

import {
  checkoutSubmitError,
  codeDetailMessage,
} from '../../../src/components/checkout/messages'

describe('codeDetailMessage — inline copy per invalid-code detail', () => {
  it.each([
    ['notFound', "This code doesn't exist."],
    ['expired', 'This code has expired.'],
    ['inactive', 'This code is no longer active.'],
    ['usageLimitReached', 'This code has reached its usage limit.'],
  ] as const)('%s → %s', (detail, expected) => {
    expect(codeDetailMessage(detail)).toBe(expected)
  })
})

describe('checkoutSubmitError — maps every T6 status/body to a UI surface', () => {
  it('400 with a code detail attaches to the code field', () => {
    expect(checkoutSubmitError(400, { error: 'Invalid or expired discount code.', detail: 'expired' })).toEqual({
      kind: 'code',
      message: 'This code has expired.',
    })
  })

  it('400 without detail surfaces the server validation message in the general panel', () => {
    expect(checkoutSubmitError(400, { error: '"buyer.email" must be a valid email address.' })).toEqual({
      kind: 'general',
      message: '"buyer.email" must be a valid email address.',
    })
  })

  it('400 with no body falls back to a generic validation prompt', () => {
    expect(checkoutSubmitError(400, null)).toEqual({
      kind: 'general',
      message: 'Please check your details and try again.',
    })
  })

  it('402 payment failed → declined message', () => {
    expect(checkoutSubmitError(402, { error: 'Payment failed.' })).toEqual({
      kind: 'general',
      message: 'Payment was declined — please try again.',
    })
  })

  it('404 session not found → removed-edition message', () => {
    expect(checkoutSubmitError(404, { error: 'Course session not found.' })).toEqual({
      kind: 'general',
      message: 'This edition could not be found. It may have been removed.',
    })
  })

  it('409 with soldOut flag → soldOut kind (link to course page rendered by the form)', () => {
    expect(checkoutSubmitError(409, { error: 'This edition just sold out.', soldOut: true })).toEqual({
      kind: 'soldOut',
      message: 'This edition just sold out.',
    })
  })

  it('409 without soldOut (past / no active window) passes the server message through', () => {
    expect(checkoutSubmitError(409, { error: 'This edition has already taken place.' })).toEqual({
      kind: 'general',
      message: 'This edition has already taken place.',
    })
    expect(checkoutSubmitError(409, { error: 'Enrolment is not open for this edition.' })).toEqual({
      kind: 'general',
      message: 'Enrolment is not open for this edition.',
    })
  })

  it('unexpected statuses (413/500/…) fall back to the generic message', () => {
    expect(checkoutSubmitError(413, { error: 'Request payload too large.' })).toEqual({
      kind: 'general',
      message: 'Something went wrong. Please try again.',
    })
    expect(checkoutSubmitError(500, null)).toEqual({
      kind: 'general',
      message: 'Something went wrong. Please try again.',
    })
  })
})
