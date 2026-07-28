import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * T15 — E2E critical-flow gaps not already covered by tests/e2e/checkout.spec.ts,
 * course-detail.spec.ts, chrome.spec.ts, etc.
 *
 * Realigned to the CURRENT dev DB (launch catalog, 2026-07): the old seeded courses were
 * deleted, so the former `npm run seed` beforeAll/afterAll hooks are REMOVED (reseeding
 * would recreate the deleted courses). Purchase flows use the **Lead Implementer** edition
 * (15–19 Sep 2026, capacity 12, Early Bird €900 active); the 11 Aug AIMS edition (2 seats
 * left) is never bought from — another suite asserts its seat count.
 *
 * File-level `mode: 'default'` + `workers: 1` in playwright.config.ts keep the shared dev
 * DB deterministic (this file creates real confirmed orders that decrement real seats).
 */
test.describe.configure({ mode: 'default' })

const LEAD_IMPLEMENTER_URL = '/cursuri/lead-implementer'
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

/** Resolve a course's Enrol link session id from the rendered page (T9/T10 contract) — never
 * hardcoded, mirrors checkout.spec.ts's `enrolSessionId`. */
async function enrolSessionId(page: Page, courseUrl: string): Promise<string> {
  await page.goto(courseUrl)
  const href = await page.getByRole('link', { name: /^Enrol now/ }).getAttribute('href')
  // EnrolForm links with the Figma-extract aliases (?edition=&qty=); both spellings are
  // part of the checkout page's SearchParams contract.
  const match = href?.match(/(?:session|edition)=(\d+)/)
  expect(match, `Enrol href should carry a session id (got "${href}")`).toBeTruthy()
  return match![1]!
}

/** `seatsRemaining` (virtual, public REST) for a session — the observable seat state. */
async function seatsRemaining(request: APIRequestContext, sessionId: string): Promise<number> {
  const response = await request.get(`/api/courseSessions/${sessionId}?depth=0`)
  expect(response.ok()).toBeTruthy()
  const doc = (await response.json()) as { seatsRemaining?: number }
  expect(typeof doc.seatsRemaining).toBe('number')
  return doc.seatsRemaining!
}

test.describe('discount code purchase — WELCOME10 (T15 gap 1)', () => {
  test('full purchase with a valid code: breakdown discount, confirmation total, observable seat decrement', async ({
    page,
    request,
  }) => {
    const sessionId = await enrolSessionId(page, LEAD_IMPLEMENTER_URL)
    const seatsBefore = await seatsRemaining(request, sessionId)

    await page.goto(`/checkout?session=${sessionId}&quantity=1`)
    await expect(page.getByRole('heading', { name: 'Complete your enrolment.' })).toBeVisible()

    await page.getByLabel('Discount code').fill('WELCOME10')
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByText('Code WELCOME10 applied.')).toBeVisible()

    // 10% off €900 = €810 — code line + reduced total, both server-computed (quote endpoint).
    const breakdown = page.getByTestId('pricing-breakdown')
    await expect(breakdown.getByText('Code WELCOME10')).toBeVisible()
    await expect(page.getByTestId('order-summary').getByText('€810')).toBeVisible()

    const email = `welcome10-${RUN_ID}@example.com`
    await page.getByLabel('Full name').fill('Discount Buyer')
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByRole('button', { name: /Pay securely/ }).click()

    // Confirmation recap shows the discounted total (order.pricing snapshot, not a re-quote).
    // Redesign (Figma 4031-156): compact recap card — total paid + order ref; the buyer
    // email moves to the subtitle ("confirmation email is on its way to …").
    await expect(page).toHaveURL(/\/checkout\/confirmare$/)
    await expect(page.getByRole('heading', { name: 'Enrolment confirmed.' })).toBeVisible()
    const recap = page.getByTestId('order-recap')
    await expect(recap.getByText('€810')).toBeVisible()
    await expect(page.getByText(email, { exact: false })).toBeVisible()

    // Observable state change: the seat consumed on confirmed payment (§3.4/§8) shows up
    // as a real, atomic decrement on the session (capacity 12 stays above the "seats left"
    // display threshold, so the REST virtual field is the reliable observation point).
    expect(await seatsRemaining(request, sessionId)).toBe(seatsBefore - 1)
  })

  test('the code still works for a second buyer (usage accounting is int-covered — this only checks it is not exhausted)', async ({
    page,
  }) => {
    const sessionId = await enrolSessionId(page, LEAD_IMPLEMENTER_URL)
    await page.goto(`/checkout?session=${sessionId}&quantity=1`)

    await page.getByLabel('Discount code').fill('WELCOME10')
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByText('Code WELCOME10 applied.')).toBeVisible()

    // 10% off €900 = €810 (Early Bird window still active — §8 step 1)
    await expect(page.getByTestId('order-summary').getByText('€810')).toBeVisible()

    const email = `welcome10-second-${RUN_ID}@example.com`
    await page.getByLabel('Full name').fill('Second Discount Buyer')
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByRole('button', { name: /Pay securely/ }).click()

    await expect(page).toHaveURL(/\/checkout\/confirmare$/)
    await expect(page.getByRole('heading', { name: 'Enrolment confirmed.' })).toBeVisible()
    await expect(page.getByTestId('order-recap').getByText('€810')).toBeVisible()
  })
})

test.describe('notify-me from a sold-out edition (T15 gap 2)', () => {
  // TODO(seed realignment): the launch-catalog dev DB has no sold-out edition (the old
  // seeded sold-out session C was removed with the old courses, and buying out a live
  // edition here would trample the other suites' seat assertions). Re-enable once the
  // seed script is realigned to the launch catalog and creates a sold-out edition again.
  test.skip('sold-out edition: inline newsletter form submits → success message', async () => {})
})

test.describe('quiz nav (T15 gap 4)', () => {
  test('the courses-page Quiz CTA navigates to the quiz wizard', async ({ page }) => {
    // Quiz moved out of the navbar into the catalog page (owner decision 2026-07-12, §7);
    // the coming-soon placeholder was replaced by the real wizard on 2026-07-23.
    await page.goto('/cursuri')
    await page.getByRole('link', { name: /Which course is right for me/ }).click()

    await expect(page).toHaveURL('/quiz')
    // Bilingual quiz: the EN wizard renders at /quiz (RO twin under /ro/quiz).
    await expect(
      page.getByRole('heading', { level: 1, name: /Which course is right for me\?/ }),
    ).toBeVisible()
    await expect(page.getByText('Question 1 of 12')).toBeVisible()
  })
})

test.describe('critical-path smoke — CLAUDE.md §16 DoD (T15 gap 5)', () => {
  test('Home → Catalog → Course → Checkout entry → back: no console errors, no failed requests', async ({
    page,
  }) => {
    const consoleErrors: string[] = []
    const failedRequests: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('response', (response) => {
      const url = response.url()
      // Analytics is consent-gated + lazy (T14) and seeded with a fake GA4 id for the
      // consent-gating tests — its script/beacon requests may legitimately 404/fail and are
      // not part of this app's own request surface. Also ignore the browser's own
      // best-effort /favicon.ico probe (no dedicated route; icon.svg/apple-icon.png cover it).
      if (/googletagmanager\.com|google-analytics\.com|\/favicon\.ico$/.test(url)) return
      if (response.status() >= 400) failedRequests.push(`${response.status()} ${url}`)
    })

    const home = await page.goto('/')
    expect(home?.status()).toBe(200)
    await page
      .getByRole('region', { name: 'Cookie consent' })
      .getByRole('button', { name: 'Refuse non-essential' })
      .click()

    await page
      .getByRole('banner')
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Courses' })
      .click()
    await expect(page).toHaveURL('/cursuri')

    const courseCard = page.getByTestId('course-card').filter({ hasText: 'Lead Implementer' })
    await courseCard.getByRole('link', { name: 'View course' }).click()
    await expect(page).toHaveURL(LEAD_IMPLEMENTER_URL)

    await page.getByRole('link', { name: /^Enrol now/ }).click()
    await expect(page).toHaveURL(/\/checkout\?edition=\d+&qty=1/)
    await expect(page.getByRole('heading', { name: 'Complete your enrolment.' })).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(LEAD_IMPLEMENTER_URL)

    expect(consoleErrors, `unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([])
    expect(failedRequests, `unexpected failed requests:\n${failedRequests.join('\n')}`).toEqual([])
  })
})
