import { expect, test } from '@playwright/test'

/**
 * T9 — Home, realigned to the owner redesign (docs/UI-REDESIGN-SPEC.md) + the launch
 * catalog (2026-07): hero → why isad → course preview row ("Explore our upcoming
 * courses", homepage.featuredCourses) → testimonials → certification/FAQ section.
 * Relies on `npm run seed` + scripts/replace-courses.ts + seed-sample-sessions.ts having
 * run against the dev database.
 */
test.describe('home page', () => {
  test('renders the redesigned sections in order with seeded content', async ({ page }) => {
    await page.goto('/')

    // Hero (h1) + the content sections in order (footer h2s come after)
    await expect(
      page.getByRole('heading', { level: 1, name: /Learn AI, Data Analysis/ }),
    ).toBeVisible()

    const h2Texts = await page.getByRole('heading', { level: 2 }).allTextContents()
    const expectedOrder = [
      'Why isad.academy',
      'Explore our upcoming courses',
      'What learners say',
      'Frequently asked questions',
    ]
    const indexes = expectedOrder.map((label) => h2Texts.findIndex((text) => text.includes(label)))
    for (const [position, index] of indexes.entries()) {
      expect(index, `section "${expectedOrder[position]}" should be present`).toBeGreaterThan(-1)
    }
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b))

    // Course preview row renders homepage.featuredCourses (the 4 launch courses). The row
    // is a carousel that duplicates cards (and hides one set per breakpoint), so assert on
    // presence counts, not visibility of `.first()`.
    expect(await page.getByTestId('our-course-card').count()).toBeGreaterThanOrEqual(4)
    expect(await page.getByText('Lead Implementer').count()).toBeGreaterThan(0)
    expect(await page.getByText('AI Governance & Responsible AI').count()).toBeGreaterThan(0)

    // Expert presence (expertBio global) + the way to the About page
    await expect(page.getByText('Silviu Gresoi').first()).toBeVisible()
    expect(await page.locator('a[href="/about"]').count()).toBeGreaterThan(0)
  })

  test('testimonials show curated reviews only, capped at 5, without ratings', async ({
    page,
  }) => {
    await page.goto('/')

    const testimonials = page.locator('#testimonials')
    await expect(testimonials).toHaveCount(1)

    // Curated (showOnHome=true) reviews from the seed render…
    await expect(testimonials.getByText('Maria Ionescu').first()).toBeVisible()
    await expect(testimonials.getByText('Andrei Popescu').first()).toBeVisible()
    // …the showOnHome=false review is never rendered…
    await expect(page.getByText('Elena Radu')).toHaveCount(0)
    // …and no star ratings anywhere (§4 — reviews have no rating field)
    await expect(testimonials.getByText(/★|⭐/)).toHaveCount(0)
  })
})
