import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

describe('expertBio global (int)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('is publicly readable', async () => {
    const bio = await payload.findGlobal({
      slug: 'expertBio',
      overrideAccess: false,
    })
    expect(bio).toBeDefined()
  })

  it('denies public updates', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'expertBio',
        data: { name: 'Hacked Name' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('allows an admin to update the bio, including structured credentials', async () => {
    await payload.updateGlobal({
      slug: 'expertBio',
      data: {
        name: 'Dr. Silviu Gresoi',
        title: 'AI Governance & Anti-Fraud Expert',
        credentials: [{ label: 'CFE', value: '2014' }],
      },
      overrideAccess: true,
    })

    const fetched = await payload.findGlobal({ slug: 'expertBio', overrideAccess: true })
    expect(fetched.name).toBe('Dr. Silviu Gresoi')
    expect(fetched.credentials?.[0]?.label).toBe('CFE')
  })
})
