import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

// Suffix per test run so the unique `code` field never collides with a previous run
// against the same throwaway `isad_test` database.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('discountCodes (int)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('is never publicly readable (codes must not be enumerable)', async () => {
    await payload.create({
      collection: 'discountCodes',
      data: { code: `SECRET-CODE-1-${RUN_ID}`, percentage: 15, type: 'general', isActive: true },
      overrideAccess: true,
    })

    // `isAdmin` resolves to a plain boolean, so Payload rejects the read outright
    // (rather than silently filtering to an empty list) unless `disableErrors` is passed.
    await expect(payload.find({ collection: 'discountCodes', overrideAccess: false })).rejects.toThrow()
  })

  it('denies public creation of discount codes', async () => {
    await expect(
      payload.create({
        collection: 'discountCodes',
        data: { code: `SHOULD-FAIL-${RUN_ID}`, percentage: 10, type: 'general' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('admin can create a member-type code with defaults applied', async () => {
    const code = await payload.create({
      collection: 'discountCodes',
      data: { code: `MEMBER-CODE-${RUN_ID}`, percentage: 20, type: 'member' },
      overrideAccess: true,
    })

    expect(code.isActive).toBe(true)
    expect(code.usageCount).toBe(0)
    expect(code.type).toBe('member')
  })
})
