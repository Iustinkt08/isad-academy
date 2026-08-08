import { expect, test } from '@playwright/test'

/**
 * T9 — Catalog (§6, owner Figma redesign 2026-07-13): teaser cards without date/price/
 * seats, EB badge only where an upcoming edition has an active Early Bird window, a single
 * sort toggle, no filters/search. The grid currently renders the four launch courses from
 * the component's SAMPLE defaults (Payload wiring lands in a later pass), so assertions
 * target those.
 */
test.describe('catalog', () => {
  test('cards are course-level teasers: no date, no price, no seats', async ({ page }) => {
    await page.goto('/courses')

    // 4 launch courses (E1) + "AI in Credit Risk & Fraud" (owner demo course, 2026-07-14)
    const cards = page.getByTestId('course-card')
    await expect(cards).toHaveCount(5)

    // No filters, no search (§6)
    await expect(page.getByRole('searchbox')).toHaveCount(0)

    // Teaser-only content: no currency, no seat counts, no edition dates on any card
    await expect(cards.getByText(/€|EUR|RON/)).toHaveCount(0)
    await expect(cards.getByText(/seat/i)).toHaveCount(0)
    await expect(
      cards.getByText(/\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/),
    ).toHaveCount(0)

    // Duration chip + Early Bird badge were removed from the cards (owner 2026-07-13)
    await expect(cards.getByText(/hours/)).toHaveCount(0)
    await expect(cards.getByText('Early Bird')).toHaveCount(0)

    // Single interactive element: the "View course" button linking to the detail page
    const governanceCard = cards.filter({ hasText: 'AI Governance & Responsible AI' })
    await expect(governanceCard.getByRole('link', { name: 'View course' })).toHaveAttribute(
      'href',
      '/courses/ai-governance-responsible-ai',
    )
  })

  test('sort toggle flips the order by earliest upcoming start date', async ({ page }) => {
    await page.goto('/courses')

    const cardHeadings = page.getByTestId('course-card').getByRole('heading', { level: 3 })

    // Default: ascending — AI in Credit Risk & Fraud starts soonest (2026-07-23)
    const toggle = page.getByRole('button', { name: /Sort: Start date/ })
    await expect(toggle).toContainText('↓')
    await expect(cardHeadings.first()).toContainText('AI in Credit Risk & Fraud')

    await toggle.click()
    await expect(toggle).toContainText('↑')
    await expect(cardHeadings.first()).toContainText('Lead Auditor')

    // Toggle back
    await toggle.click()
    await expect(cardHeadings.first()).toContainText('AI in Credit Risk & Fraud')
  })

  test('quiz CTA is the primary action and navigates to the quiz page', async ({ page }) => {
    await page.goto('/courses')

    await page.getByRole('link', { name: /Which course is right for me/ }).click()
    await expect(page).toHaveURL('/quiz')
  })
})
