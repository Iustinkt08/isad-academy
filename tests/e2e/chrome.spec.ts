import { expect, test } from '@playwright/test'

test.describe('cookie consent', () => {
  test('banner shows by default and accept persists across reloads', async ({ page, context }) => {
    await page.goto('/')
    const banner = page.getByRole('region', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    // No consent cookie exists before an explicit decision (privacy-first default)
    let cookies = await context.cookies()
    expect(cookies.find((c) => c.name === 'cookie-consent')).toBeUndefined()

    await banner.getByRole('button', { name: 'Accept analytics cookies' }).click()
    await expect(banner).toBeHidden()

    cookies = await context.cookies()
    expect(cookies.find((c) => c.name === 'cookie-consent')?.value).toBe('accepted')

    await page.reload()
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toHaveCount(0)
  })

  test('refuse persists and the footer button re-opens preferences', async ({ page, context }) => {
    await page.goto('/')
    const banner = page.getByRole('region', { name: 'Cookie consent' })
    await banner.getByRole('button', { name: 'Refuse non-essential' }).click()
    await expect(banner).toBeHidden()

    const cookies = await context.cookies()
    expect(cookies.find((c) => c.name === 'cookie-consent')?.value).toBe('rejected')

    await page.getByRole('contentinfo').getByRole('button', { name: 'Cookie preferences' }).click()
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible()
  })
})

test('newsletter form surfaces the signup confirmation inline', async ({ page }) => {
  // T7 replaced the T8-era 503 stub with the real double-opt-in endpoint: in dev (Brevo
  // unconfigured → NoopMailer) it returns 200 { ok: true }, so the form shows its
  // check-your-inbox confirmation instead of the old "coming soon" note.
  await page.goto('/')
  // Dismiss the consent banner first so it cannot overlap the footer form
  await page
    .getByRole('region', { name: 'Cookie consent' })
    .getByRole('button', { name: 'Refuse non-essential' })
    .click()

  const footer = page.getByRole('contentinfo')
  await footer.getByLabel('E-mail').fill('test@example.com')
  await footer.getByRole('button', { name: 'Subscribe' }).click()
  await expect(
    footer.getByText('Almost there — check your inbox to confirm your subscription.'),
  ).toBeVisible()
})

test('quiz placeholder page renders', async ({ page }) => {
  await page.goto('/quiz')
  await expect(page.getByRole('heading', { level: 1, name: 'Find your course' })).toBeVisible()
  await expect(page.getByText('The course quiz is coming soon')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Browse all courses' })).toBeVisible()
})

test('mobile menu opens, closes with Escape, and has no cart icon', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')

  const openButton = page.getByRole('button', { name: 'Open menu' })
  await expect(openButton).toHaveAttribute('aria-expanded', 'false')
  await openButton.click()

  const closeButton = page.getByRole('button', { name: 'Close menu' })
  await expect(closeButton).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('navigation', { name: 'Mobile' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )

  // §7: no cart icon anywhere in the header
  await expect(page.getByRole('banner').getByText(/cart/i)).toHaveCount(0)
})
