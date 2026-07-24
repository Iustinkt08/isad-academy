import { expect, test } from '@playwright/test'

test('home page responds and renders the global chrome', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)

  // Hero heading (copy comes from the `homepage` global, so only assert presence)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Header: brand + main nav + highlighted Quiz pill + persistent CTA (§7)
  const header = page.getByRole('banner')
  await expect(header.getByRole('link', { name: 'isad.academy — home' })).toBeVisible()
  const nav = header.getByRole('navigation', { name: 'Main' })
  for (const label of ['Home', 'Courses', 'Corporate', 'Certification', 'About', 'Blog', 'Contact']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible()
  }
  await expect(header.getByRole('link', { name: 'Quiz' })).toBeVisible()
  await expect(header.getByRole('link', { name: 'See courses' })).toBeVisible()

  // Footer renders with legal links and the copyright row
  const footer = page.getByRole('contentinfo')
  await expect(footer.getByRole('link', { name: 'Cookie Policy' })).toBeVisible()
  await expect(footer.getByText(/© \d{4} isad\.academy/)).toBeVisible()
})
