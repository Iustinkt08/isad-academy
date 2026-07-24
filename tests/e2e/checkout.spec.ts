import { expect, test, type Page } from '@playwright/test'

/**
 * Checkout UI + confirmation, end-to-end over the CURRENT dev DB (launch catalog,
 * 2026-07 — the old seeded courses were removed, so there is NO `npm run seed` hook here;
 * reseeding would recreate the deleted courses).
 *
 * Purchase flows use the PECB ISO/IEC 42001 **Lead Implementer** edition (15–19 Sep 2026,
 * capacity 12, Early Bird €900 active until 1 Dec 2026, standard €1,200). The 11 Aug
 * AIMS edition (2 seats left) is deliberately never bought from — another suite asserts
 * its seat count. Session ids are resolved at test time from the Enrol link href (T9
 * contract), never hardcoded.
 *
 * Sequential in ONE worker (`mode: 'default'`): the happy path consumes real seats, so
 * parallel workers would race each other's totals.
 */
test.describe.configure({ mode: 'default' })

const COURSE_URL = '/cursuri/lead-implementer'
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

/** Resolve the Lead Implementer session id from the course page's Enrol link (T9 contract). */
async function enrolSessionId(page: Page): Promise<string> {
  await page.goto(COURSE_URL)
  const href = await page.getByRole('link', { name: /^Enrol now/ }).getAttribute('href')
  const match = href?.match(/session=(\d+)/)
  expect(match, `Enrol href should carry a session id (got "${href}")`).toBeTruthy()
  return match![1]!
}

test.describe('checkout', () => {
  test('happy path (quantity 1, buyer = participant) → confirmation recap with order reference', async ({
    page,
  }) => {
    await page.goto(COURSE_URL)
    await page.getByRole('link', { name: /^Enrol now/ }).click()

    await expect(page).toHaveURL(/\/checkout\?session=\d+&quantity=1/)
    await expect(page.getByRole('heading', { name: 'Complete your enrolment.' })).toBeVisible()
    await expect(page.getByText('Lead Implementer').first()).toBeVisible()

    // quantity 1 → no participant field-pairs; the buyer is the participant
    await expect(page.getByText('The buyer is the participant.')).toBeVisible()
    await expect(page.getByTestId('participant-fields')).toHaveCount(0)

    // Server-authoritative breakdown (Early Bird €900 active — window per §8 step 1)
    const breakdown = page.getByTestId('pricing-breakdown')
    await expect(breakdown.getByText('1 × Early Bird seat')).toBeVisible()
    await expect(page.getByTestId('order-summary').getByText('€900').first()).toBeVisible()
    // vatDisplay='excl' (B2 — ISAD is not VAT-registered, CLAUDE.md §13)
    await expect(page.getByText('Final price — isad.academy is not VAT registered.')).toBeVisible()

    await page.getByLabel('Full name').fill('Happy Buyer')
    await page.getByLabel('Email', { exact: true }).fill(`happy-${RUN_ID}@example.com`)
    await page.getByRole('button', { name: /Pay securely/ }).click()

    // Confirmation renders from the sessionStorage'd checkout response (orders have no public read)
    await expect(page).toHaveURL(/\/checkout\/confirmare$/)
    // NB: the heading uses a typographic apostrophe (You’re), not ASCII.
    await expect(page.getByRole('heading', { name: 'You’re enrolled!' })).toBeVisible()
    await expect(page.getByText('Lead Implementer', { exact: false }).first()).toBeVisible()
    await expect(page.getByText(/Order reference:/)).toBeVisible()
    await expect(page.getByText(/#\d+/)).toBeVisible()
    await expect(page.getByText('Happy Buyer')).toBeVisible()
    await expect(page.getByText(`happy-${RUN_ID}@example.com`)).toBeVisible()
    await expect(
      page.getByText('Your Google Meet invite will follow a few days before the course starts', {
        exact: false,
      }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to courses' })).toBeVisible()
  })

  test('quantity 3 renders three participant pairs + group discount line; stepper reprices live', async ({
    page,
  }) => {
    const sessionId = await enrolSessionId(page)
    await page.goto(`/checkout?session=${sessionId}&quantity=3`)

    await expect(page.getByTestId('participant-fields')).toHaveCount(3)

    const breakdown = page.getByTestId('pricing-breakdown')
    await expect(breakdown.getByText('3 × Early Bird seats')).toBeVisible()
    await expect(breakdown.getByText(/Group discount \(3\+ seats\)/)).toBeVisible()
    // €900 × 3 = €2,700 − 10% group = €2,430 (stackAll — B3)
    await expect(page.getByTestId('order-summary').getByText('€2,430')).toBeVisible()

    // Stepper re-renders participant fields + repriced totals
    await page.getByRole('button', { name: 'Increase seats' }).click()
    await expect(page.getByTestId('seats-count')).toHaveText('4')
    await expect(page.getByTestId('participant-fields')).toHaveCount(4)
    // €900 × 4 = €3,600 − 10% = €3,240
    await expect(page.getByTestId('order-summary').getByText('€3,240')).toBeVisible()
  })

  test('?edition= and ?qty= aliases (Figma extract contract) resolve like session/quantity', async ({
    page,
  }) => {
    const sessionId = await enrolSessionId(page)
    await page.goto(`/checkout?edition=${sessionId}&qty=2`)

    await expect(page.getByRole('heading', { name: 'Complete your enrolment.' })).toBeVisible()
    await expect(page.getByTestId('seats-count')).toHaveText('2')
    await expect(page.getByTestId('participant-fields')).toHaveCount(2)
  })

  test('company toggle reveals B2B fields and requires them client-side', async ({ page }) => {
    const sessionId = await enrolSessionId(page)
    await page.goto(`/checkout?session=${sessionId}&quantity=1`)

    await expect(page.getByLabel('Company name')).toHaveCount(0)
    await page.getByRole('button', { name: 'Company', exact: true }).click()
    await expect(page.getByLabel('Company name')).toBeVisible()
    await expect(page.getByLabel('CUI', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Company address')).toBeVisible()

    await page.getByLabel('Full name').fill('B2B Buyer')
    await page.getByLabel('Email', { exact: true }).fill(`b2b-${RUN_ID}@example.com`)
    await page.getByRole('button', { name: /Pay securely/ }).click()

    // Client validation blocks the submit — inline errors, still on /checkout
    await expect(page.getByText('Please enter the company name.')).toBeVisible()
    await expect(page.getByText('Please enter the company CUI.')).toBeVisible()
    await expect(page.getByText('Please enter the company address.')).toBeVisible()
    await expect(page).toHaveURL(/\/checkout\?session=/)
  })

  test('invalid discount code shows the inline quote error', async ({ page }) => {
    const sessionId = await enrolSessionId(page)
    await page.goto(`/checkout?session=${sessionId}&quantity=1`)

    await page.getByLabel('Discount code').fill(`NO-SUCH-CODE-${RUN_ID}`)
    await page.getByRole('button', { name: 'Apply' }).click()

    await expect(page.getByText("This code doesn't exist.")).toBeVisible()
    // No discount line appeared
    await expect(page.getByTestId('pricing-breakdown').getByText(/^Code /)).toHaveCount(0)
  })

  test('declined payment (fail@test.local) surfaces the 402 message and stays on checkout', async ({
    page,
  }) => {
    const sessionId = await enrolSessionId(page)
    await page.goto(`/checkout?session=${sessionId}&quantity=1`)

    await page.getByLabel('Full name').fill('Declined Buyer')
    await page.getByLabel('Email', { exact: true }).fill('fail@test.local')
    await page.getByRole('button', { name: /Pay securely/ }).click()

    await expect(page.getByText('Payment was declined — please try again.')).toBeVisible()
    await expect(page).toHaveURL(/\/checkout\?session=/)
    // The button recovers for a retry
    await expect(page.getByRole('button', { name: /Pay securely/ })).toBeEnabled()
  })

  test('sold-out session renders the sold-out message and no form', async ({ page, request }) => {
    // Resolve a sold-out edition via the public REST API (no hardcoded ids). The launch
    // catalog currently has none — skip rather than buy out a live edition to create one.
    const response = await request.get('/api/courseSessions?limit=100&depth=0')
    expect(response.ok()).toBeTruthy()
    const data = (await response.json()) as { docs: { id: number; status?: string }[] }
    const soldOut = data.docs.find((doc) => doc.status === 'soldOut')
    test.skip(!soldOut, 'no sold-out edition in the current dev DB (launch catalog)')

    await page.goto(`/checkout?session=${soldOut!.id}&quantity=1`)

    await expect(page.getByRole('heading', { name: 'This edition is sold out' })).toBeVisible()
    await expect(page.getByTestId('checkout-form')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'View course' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browse courses' })).toBeVisible()
  })

  test('missing or unknown session params render a clear dead-end, never a form', async ({
    page,
  }) => {
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: 'No edition selected' })).toBeVisible()
    await expect(page.getByTestId('checkout-form')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Browse courses' })).toBeVisible()

    await page.goto('/checkout?session=99999999&quantity=1')
    await expect(page.getByRole('heading', { name: 'Edition not found' })).toBeVisible()
    await expect(page.getByTestId('checkout-form')).toHaveCount(0)
  })

  test('direct visit to /checkout/confirmare without a stored order shows the empty state', async ({
    page,
  }) => {
    await page.goto('/checkout/confirmare')
    await expect(page.getByRole('heading', { name: 'No recent order found' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browse courses' })).toBeVisible()
  })
})
