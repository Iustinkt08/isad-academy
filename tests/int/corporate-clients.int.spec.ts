import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('corporateClients (int)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('is publicly readable', async () => {
    const client = await payload.create({
      collection: 'corporateClients',
      data: { name: `Big Bank ${RUN_ID}`, order: 1 },
      overrideAccess: true,
    })

    const publicFind = await payload.find({
      collection: 'corporateClients',
      where: { id: { equals: client.id } },
      overrideAccess: false,
    })
    expect(publicFind.docs).toHaveLength(1)
  })

  it('denies public creation', async () => {
    await expect(
      payload.create({
        collection: 'corporateClients',
        data: { name: `Should Not Be Created ${RUN_ID}` },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('allows url to be left empty (optional per CLAUDE.md §4)', async () => {
    const client = await payload.create({
      collection: 'corporateClients',
      data: { name: `No URL Client ${RUN_ID}`, order: 2 },
      overrideAccess: true,
    })

    expect(client.url).toBeFalsy()
  })
})
