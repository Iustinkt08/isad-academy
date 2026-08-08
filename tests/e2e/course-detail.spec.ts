import { expect, test } from '@playwright/test'

/**
 * Course detail — owner Figma redesign v2 (node 3790:4223, 2026-07-14): CourseHeader
 * (breadcrumb, pill, gradient title, teaser — NO meta chips, NO share) → two columns
 * (About / Who it's for / Programme / Certification + sticky EnrolmentCard whose
 * "Only X seats left" is a floating chip on the selected edition) → callout.
 *
 * Runs against the CURRENT seeded dev DB:
 *  - /courses/ai-governance-responsible-ai        — 28–29 Jul 2026, 12 seats (own course)
 *  - /courses/artificial-intelligence-management-system — 11 Aug 2026, 2 seats LEFT (threshold test)
 *  - /courses/lead-implementer                    — 15–19 Sep 2026, 5-day schedule (Programme test)
 *  - /courses/lead-auditor                        — 20–24 Oct 2026
 * All editions: Early Bird €900 active until 01.12.2026, Standard €1,200.
 * NOTE: no exact-seat assertions on lead-implementer — checkout specs buy seats there.
 */
const AI_GOVERNANCE_URL = '/courses/ai-governance-responsible-ai'
const AIMS_FOUNDATION_URL = '/courses/artificial-intelligence-management-system'
const LEAD_IMPLEMENTER_URL = '/courses/lead-implementer'

test.describe('course detail', () => {
  test('header renders pill, gradient title and teaser — no chips, no share (v2)', async ({
    page,
  }) => {
    await page.goto(AI_GOVERNANCE_URL)

    // Title: last word carries the gradient, final "." stays ink — assert the full h1 text.
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toContainText('AI Governance & Responsible AI.')

    // Own course (category 'other') → ISAD pill, not the PECB track pill.
    await expect(page.getByText('ISAD Academy · Own Course')).toBeVisible()

    // Teaser = shortDescription (first link of the teaser chain, same as the catalog).
    await expect(page.getByText(/Turn AI ethics, risk and accountability/)).toBeVisible()

    // Redesign v2 removes the meta chips and the Share link from the header.
    await expect(page.getByText(/Taught by Dr\. Silviu Gresoi/)).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Share/ })).toHaveCount(0)
  })

  test('enrolment card shows the edition with the active Early Bird price', async ({ page }) => {
    await page.goto(AI_GOVERNANCE_URL)

    await expect(page.getByRole('heading', { name: 'Choose your edition' })).toBeVisible()

    // One upcoming edition, selected by default, EB window active → €900 + until-date.
    const edition = page.getByTestId('edition')
    await expect(edition).toHaveCount(1)
    await expect(edition).toContainText('28.07 – 29.07.2026')
    await expect(edition.getByText('€900')).toBeVisible()
    await expect(edition.getByText('Early Bird · until 01.12.2026')).toBeVisible()
    await expect(edition.getByText(/Standard €1,200/)).toBeVisible()

    // 12 seats ≥ threshold (5) → no floating urgency chip (v2 moved it to a chip that
    // overlaps the card's top-right corner, shown only for the selected under-threshold
    // edition; per-row seat counts are gone entirely).
    await expect(page.getByText(/Only \d+ seats? left/)).toHaveCount(0)
  })

  test('seats-left badge appears under the threshold (2 of 15 seats remain)', async ({ page }) => {
    await page.goto(AIMS_FOUNDATION_URL)

    await expect(page.getByText('Only 2 seats left')).toBeVisible()
  })

  test('Enrol CTA carries the checkout contract: session + quantity', async ({ page }) => {
    await page.goto(AI_GOVERNANCE_URL)

    const enrol = page.getByRole('link', { name: /Enrol now/ })
    await expect(enrol).toHaveCount(1)
    await expect(enrol).toHaveAttribute('href', /\/checkout\?edition=\d+&qty=1$/)

    // The stepper updates the quantity in the link.
    await page.getByRole('button', { name: 'More seats' }).click()
    await page.getByRole('button', { name: 'More seats' }).click()
    await expect(enrol).toHaveAttribute('href', /\/checkout\?edition=\d+&qty=3$/)
  })

  test('programme lists the 5-day schedule of the earliest upcoming edition', async ({ page }) => {
    await page.goto(LEAD_IMPLEMENTER_URL)

    await expect(page.getByRole('heading', { name: /Programme — edition 15\.09\.2026/ })).toBeVisible()
    for (const day of ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5']) {
      await expect(page.getByText(day, { exact: true })).toBeVisible()
    }
    await expect(page.getByText('Live session · 09:00–17:00').first()).toBeVisible()
    // PECB track course → official-track pill + PECB certification copy (R2).
    await expect(page.getByText('PECB ISO/IEC 42001 · Official Certification Track')).toBeVisible()
    await expect(page.getByText(/official PECB exam/)).toBeVisible()
  })

  test('no reviews, modules or similar-courses sections (§6)', async ({ page }) => {
    await page.goto(AI_GOVERNANCE_URL)

    await expect(page.getByRole('heading', { name: 'About this course' })).toBeVisible()
    await expect(page.getByText(/course contents|modules/i)).toHaveCount(0)
    await expect(page.getByText(/similar courses/i)).toHaveCount(0)
    await expect(page.getByTestId('testimonial')).toHaveCount(0)
  })

  test('unknown slug returns 404', async ({ page }) => {
    const response = await page.goto('/courses/does-not-exist')
    expect(response?.status()).toBe(404)
  })
})
