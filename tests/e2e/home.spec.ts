import { expect, test } from '@playwright/test'

/**
 * T9 — Home (§6 order): hero → featured courses → expert band → why isad → testimonials
 * (max 5) → partners. Relies on `npm run seed` having run against the
 * dev database.
 */
test.describe('home page', () => {
  test('renders the §6 sections in order with seeded content', async ({ page }) => {
    await page.goto('/')

    // Hero (h1) + the six content sections, in §6 order (footer h2s come after)
    const h2Texts = await page.getByRole('heading', { level: 2 }).allTextContents()
    const expectedOrder = [
      'Featured courses',
      'Meet your expert',
      'Why isad.academy',
      'What you walk away with',
      'What participants say',
      'Partners',
    ]
    const indexes = expectedOrder.map((label) =>
      h2Texts.findIndex((text) => text.includes(label)),
    )
    for (const [position, index] of indexes.entries()) {
      expect(index, `section "${expectedOrder[position]}" should be present`).toBeGreaterThan(-1)
    }
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b))

    // Featured courses come from homepage.featuredCourses
    const featured = page.getByRole('region', { name: 'Featured courses' })
    await expect(featured.getByText('ISO/IEC 42001:2023', { exact: false }).first()).toBeVisible()
    await expect(featured.getByText('AI Risk Management Foundations')).toBeVisible()
    await expect(featured.getByRole('link', { name: 'View course' })).toHaveCount(2)

    // Expert band pulls from the expertBio global and links to /despre
    await expect(page.getByRole('heading', { name: 'Dr. Silviu Gresoi' })).toBeVisible()
    const aboutLink = page.getByRole('link', { name: 'About the expert' })
    await expect(aboutLink).toBeVisible()
    await expect(aboutLink).toHaveAttribute('href', '/despre')

    // Why isad: stats + differentiators from homepage.whyIsad
    await expect(page.getByText('20+', { exact: true })).toBeVisible()
    await expect(page.getByText('Live, not recorded')).toBeVisible()

    // Partners: clickable logo linking out
    const partnerLink = page.getByRole('link', { name: 'APCF' })
    await expect(partnerLink).toBeVisible()
    await expect(partnerLink).toHaveAttribute('href', 'https://apcf.ro')
    await expect(partnerLink).toHaveAttribute('rel', /noopener/)
  })

  test('testimonials show curated reviews only, capped at 5, without ratings', async ({
    page,
  }) => {
    await page.goto('/')

    const testimonials = page.getByTestId('testimonial')
    const count = await testimonials.count()
    expect(count).toBeGreaterThanOrEqual(2)
    expect(count).toBeLessThanOrEqual(5)

    await expect(page.getByText('Maria Ionescu')).toBeVisible()
    await expect(page.getByText('Andrei Popescu')).toBeVisible()
    // showOnHome=false review is never rendered
    await expect(page.getByText('Elena Radu')).toHaveCount(0)
    // No star ratings anywhere (§4)
    await expect(testimonials.getByText(/★|⭐/)).toHaveCount(0)
  })
})
