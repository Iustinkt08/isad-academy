import 'dotenv/config'

import { expect, test } from '@playwright/test'

import { createReviewToken } from '../../src/lib/reviews/token'

/**
 * T15 — Review submission flow (T13's recipe), end-to-end over the seeded dev DB.
 *
 * There are no accounts (CLAUDE.md §3): the HMAC-signed link IS the whole authorization for
 * a one-time public submission (src/lib/reviews/token.ts, src/lib/reviews/submitReview.ts).
 * The token-signing/verification edge cases (tampered, expired, malformed) and the
 * duplicate-submission 409 are already exhaustively covered at unit/int level
 * (tests/int/reviews-pipeline.int.spec.ts calls `createReviewToken`/`submitReview` directly)
 * — this file only walks the BROWSER-visible happy/duplicate/invalid paths.
 *
 * `sessionId` is resolved at runtime from the public `courseSessions` REST read (never
 * hardcoded — same pattern as checkout.spec.ts's sold-out lookup). The token itself is built
 * locally with the real `createReviewToken` (pure HMAC, no DB access) signed with
 * `PAYLOAD_SECRET` — `import 'dotenv/config'` loads that secret from `.env` into this test
 * process so the signature matches what the dev server (started via `npm run dev`, which
 * loads `.env` itself) verifies. This is the "cleanest option Playwright allows" mentioned in
 * the T15 brief: no extra Payload Local API / global-setup project needed just to mint a
 * token that is pure crypto over already-public data.
 */

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

test.describe('review submission (T13 recipe)', () => {
  test('valid token renders the form, accepts one submission, then rejects a repeat', async ({
    page,
    request,
  }) => {
    const sessionsRes = await request.get('/api/courseSessions?limit=1&depth=0')
    expect(sessionsRes.ok()).toBeTruthy()
    const { docs } = (await sessionsRes.json()) as { docs: { id: number }[] }
    expect(docs.length, 'seeded courseSessions should be non-empty').toBeGreaterThan(0)
    const sessionId = docs[0]!.id

    const email = `review-${RUN_ID}@example.com`
    const token = createReviewToken({ sessionId, email })

    const first = await page.goto(`/review/${token}`)
    expect(first?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit review' })).toBeVisible()

    await page
      .getByLabel('Your review')
      .fill('The live sessions were practical and well paced — highly recommended.')
    await page.getByLabel('Your name (optional)').fill('E2E Reviewer')
    await page.getByRole('button', { name: 'Submit review' }).click()

    await expect(page.getByText('Thank you for your review!')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit review' })).toHaveCount(0)

    // Re-visiting the SAME link (fresh mount → the form is back) and submitting again hits
    // the duplicate-submission guard: same (session, email) pair → 409.
    await page.goto(`/review/${token}`)
    await page.getByLabel('Your review').fill('Trying to submit a second review for the same edition.')
    await page.getByRole('button', { name: 'Submit review' }).click()

    // Next's route announcer also carries role="alert" — scope to the form's own error text.
    await expect(
      page.getByText('You have already submitted a review for this edition.'),
    ).toBeVisible()
    // The form is still there for a retry (unlike the success state) — no false "thank you".
    await expect(page.getByText('Thank you for your review!')).toHaveCount(0)
  })

  test('an invalid/garbage token shows the invalid-link message, never the form', async ({
    page,
  }) => {
    const response = await page.goto('/review/this-is-not-a-real-token')
    expect(response?.status()).toBe(200)

    await expect(
      page.getByRole('heading', { level: 1, name: 'This link is no longer valid' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit review' })).toHaveCount(0)
    await expect(page.locator('textarea')).toHaveCount(0)
  })
})
