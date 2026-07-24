import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

describe('certificationInfo global (int)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('is publicly readable with issuer defaulting to "APCF"', async () => {
    const info = await payload.findGlobal({
      slug: 'certificationInfo',
      overrideAccess: false,
    })
    expect(info.issuer).toBe('APCF')
  })

  it('denies public updates', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'certificationInfo',
        data: { issuer: 'Someone Else' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('allows an admin to update the process steps', async () => {
    await payload.updateGlobal({
      slug: 'certificationInfo',
      data: {
        process: [{ title: 'Enrol', description: 'Sign up for a live session.' }],
      },
      overrideAccess: true,
    })

    const fetched = await payload.findGlobal({ slug: 'certificationInfo', overrideAccess: true })
    expect(fetched.process?.[0]?.title).toBe('Enrol')
  })
})
