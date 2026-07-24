import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('partners (int)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('is publicly readable', async () => {
    const partner = await payload.create({
      collection: 'partners',
      data: { name: `APCF ${RUN_ID}`, url: 'https://apcf.ro', order: 1, type: 'accreditation' },
      overrideAccess: true,
    })

    const publicFind = await payload.find({
      collection: 'partners',
      where: { id: { equals: partner.id } },
      overrideAccess: false,
    })
    expect(publicFind.docs).toHaveLength(1)
  })

  it('denies public creation', async () => {
    await expect(
      payload.create({
        collection: 'partners',
        data: { name: `Should Not Be Created ${RUN_ID}` },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('allows the type field to be left empty (reserved/optional)', async () => {
    const partner = await payload.create({
      collection: 'partners',
      data: { name: `No Type Partner ${RUN_ID}`, order: 2 },
      overrideAccess: true,
    })

    expect(partner.type).toBeFalsy()
  })
})
