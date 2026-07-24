import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('faqItems (int)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('is publicly readable', async () => {
    const faq = await payload.create({
      collection: 'faqItems',
      data: { question: `What is CPD? ${RUN_ID}`, order: 1 },
      overrideAccess: true,
    })

    const publicFind = await payload.find({
      collection: 'faqItems',
      where: { id: { equals: faq.id } },
      overrideAccess: false,
    })
    expect(publicFind.docs).toHaveLength(1)
  })

  it('denies public creation', async () => {
    await expect(
      payload.create({
        collection: 'faqItems',
        data: { question: `Should not be created ${RUN_ID}` },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
