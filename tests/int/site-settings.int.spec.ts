import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

describe('siteSettings (int)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('is publicly readable with the locked-in default values (CLAUDE.md §13 / docs/PLAN.md)', async () => {
    const settings = await payload.findGlobal({
      slug: 'siteSettings',
      overrideAccess: false,
    })

    expect(settings.seatsThreshold).toBe(5)
    expect(settings.currency).toBe('EUR')
    expect(settings.vatDisplay).toBe('incl')
    expect(settings.earlyBirdDisplay).toBe('bothWindows')
    expect(settings.stackingPolicy).toBe('stackAll')
  })

  it('denies public updates', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'siteSettings',
        data: { seatsThreshold: 99 },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
