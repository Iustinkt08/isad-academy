import { expect, test, type Page } from '@playwright/test'

/**
 * T11 — Corporate + Certification + About + Contact + lead forms (§6), over the seeded dev
 * DB (`npm run seed`). Lead submissions here create real `leads` rows in the dev database —
 * harmless, and the notification email hook logs-and-skips while
 * `siteSettings.contact.email` is unset.
 */

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

test.describe('contact page', () => {
  test('full submit → success message replaces the form', async ({ page }) => {
    await page.goto('/contact')

    await page.getByLabel('Full name').fill('E2E Contact')
    await page.getByLabel('E-mail', { exact: true }).fill(`e2e-contact-${RUN_ID}@example.com`)
    await page.getByLabel('Subject').selectOption('course')
    await page.getByLabel('Message').fill('I would like to know more about the ISO course.')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByTestId('form-success')).toBeVisible()
    await expect(page.getByText("Thanks — we'll get back to you.")).toBeVisible()
    // The form is replaced by the success panel (§6) — and NO response-time promise anywhere.
    await expect(page.getByTestId('contact-form')).toHaveCount(0)
    await expect(page.getByText(/within \d+|business hours/i)).toHaveCount(0)
  })

  test('empty submit renders inline errors and focuses the first invalid field', async ({
    page,
  }) => {
    await page.goto('/contact')

    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByText('Please enter your name.')).toBeVisible()
    await expect(page.getByText('Please enter a valid e-mail address.')).toBeVisible()
    // Subject became OPTIONAL with the 3977-489 redesign (falls back to "other" server-side)
    await expect(page.getByText('Please enter a message.')).toBeVisible()
    // Focus lands on the first invalid field; aria-invalid marks it for AT
    await expect(page.getByLabel('Full name')).toBeFocused()
    await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true')
    // Still on the page, form still present
    await expect(page.getByTestId('contact-form')).toBeVisible()
  })

  test('direct details panel exists without map, address or WhatsApp', async ({ page }) => {
    await page.goto('/contact')

    await expect(page.getByRole('heading', { name: 'Reach us directly' })).toBeVisible()
    await expect(page.locator('iframe')).toHaveCount(0) // no embedded map
    await expect(page.getByText(/WhatsApp/i)).toHaveCount(0)
  })
})

test.describe('corporate page', () => {
  test('stays lead-gen only, without the removed sections', async ({ page }) => {
    await page.goto('/corporate')

    // Both the "TRUSTED BY TEAMS IN" logo strip and the "Topics we deliver" section were
    // removed from the design (owner, 2026-07-13) — catalog courses now only feed the
    // form's Topic select.
    await expect(page.getByTestId('corporate-logo-strip')).toHaveCount(0)
    await expect(page.getByTestId('corporate-topic')).toHaveCount(0)

    // Lead-gen only: no prices, no buy/enrol buttons (§6)
    await expect(page.getByText(/€\s?\d|EUR|RON/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /enrol|buy/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /enrol|buy/i })).toHaveCount(0)
  })

  test('form with "Other" topic reveal submits → thank-you without hour promises', async ({
    page,
  }) => {
    await page.goto('/corporate')

    await page.getByLabel('Company name').fill('E2E Corp SRL')
    await page.getByLabel('Contact person').fill('E2E Person')
    await page.getByLabel('E-mail').fill(`e2e-corporate-${RUN_ID}@example.com`)
    // Free-text range since the 3790:3624 redesign (was a select of fixed ranges)
    await page.getByLabel('How many participants?').fill('6–10')

    // "Other" reveals the free-text topic input. NB: the topic select is scoped to the form —
    // bare getByLabel('Topic') would also match the "Topics we deliver" section (aria-labelledby).
    await expect(page.getByLabel('What topic do you have in mind?')).toHaveCount(0)
    await page.getByTestId('corporate-form').getByLabel('Topic').selectOption('other')
    await page.getByLabel('What topic do you have in mind?').fill('AI governance for auditors')

    await page.getByLabel('From', { exact: true }).fill('2026-09-01')
    await page.getByLabel('To', { exact: true }).fill('2026-09-30')
    await page.getByRole('button', { name: 'Request proposal' }).click()

    await expect(page.getByTestId('form-success')).toBeVisible()
    await expect(page.getByText("Thank you — we'll get back to you.")).toBeVisible()
    await expect(page.getByTestId('corporate-form')).toHaveCount(0)
    await expect(page.getByText(/within \d+|business hours/i)).toHaveCount(0)
  })

  test('form offers the published catalog courses as topic options', async ({ page }) => {
    await page.goto('/corporate')

    const options = page.getByTestId('corporate-form').getByLabel('Topic').locator('option')
    // One of the four launch courses (E1) — the old seed catalog was replaced 2026-07-12.
    await expect(options.filter({ hasText: 'AI Governance & Responsible AI' })).toHaveCount(1)
    await expect(options.filter({ hasText: 'Other — tell us what you need' })).toHaveCount(1)
  })
})

// NOTE: the home certification-summary section (R2 copy + process + FAQ accordion) was
// REMOVED from the homepage by the owner on 2026-07-13, together with the expert band —
// its e2e block was retired with it. The FAQ returns as the standalone FaqSection.

test.describe('about page', () => {
  test('renders the expert bio, credentials, stats and dual CTA', async ({ page }) => {
    await page.goto('/about')

    await expect(page.getByRole('heading', { name: 'Dr. Silviu Gresoi' })).toBeVisible()
    await expect(page.getByText('CFE (Certified Fraud Examiner), 2014')).toBeVisible()
    // Stats reused from homepage.whyIsad
    await expect(page.getByText('20+', { exact: true })).toBeVisible()
    // Dual CTA (§6) — scoped to the CTA section (the header carries its own "See courses")
    const ctaSection = page.locator('section').filter({ hasText: 'Ready when you are' })
    await expect(ctaSection.getByRole('link', { name: 'See courses' })).toBeVisible()
    await expect(ctaSection.getByRole('link', { name: 'Contact us' })).toBeVisible()
    // APCF appears only in its certification role, linking to the home section
    await expect(
      page.getByRole('link', { name: 'see how certification works' }),
    ).toHaveAttribute('href', '/#certification')
  })
})

test.describe('lead pages — headings and keyboard access', () => {
  const PAGES = ['/contact', '/corporate', '/about'] as const

  async function expectVisibleFocusAfterFirstTab(page: Page): Promise<void> {
    // First Tab lands on the skip link, which slides into view — a real, VISIBLE focus state.
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Skip to content' })
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeVisible()
    // Next Tab reaches the header brand link — focus keeps moving through real elements.
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'isad.academy — home' })).toBeFocused()
  }

  for (const path of PAGES) {
    test(`${path} has exactly one h1 and a keyboard-visible focus path`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expectVisibleFocusAfterFirstTab(page)
    })
  }
})
