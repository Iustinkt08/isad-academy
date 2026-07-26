import { expect, test } from '@playwright/test'

/**
 * T12 — Blog list + article + Lexical extras + lead-magnet gate + draft preview, over the
 * seeded dev DB (scripts/seed.ts):
 *   - post 1 (newest): cover image, colored runs, blockquote, in-text image, linkChip,
 *     downloadableResource, relatedCourse → ISO course.
 *   - post 2 (older, imageless): leadMagnet enabled with the seeded PDF.
 *   - draft "Draft: upcoming trends" — must 404 publicly.
 */

const POST_1_URL = '/blog/what-iso-iec-42001-means-for-your-ai-governance'
const POST_1_TITLE = 'What ISO/IEC 42001 means for your AI governance'
const POST_2_URL = '/blog/five-questions-to-ask-before-your-first-ai-audit'
const POST_2_TITLE = 'Five questions to ask before your first AI audit'

test.describe('blog list', () => {
  test('shows the two seeded articles newest-first; imageless card renders; no filters/search', async ({
    page,
  }) => {
    await page.goto('/blog')

    await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()

    const cards = page.getByTestId('blog-post-card')
    await expect(cards).toHaveCount(2)

    // Chronological, newest first (post 2 is seeded 3 weeks older)
    await expect(cards.nth(0)).toContainText(POST_1_TITLE)
    await expect(cards.nth(1)).toContainText(POST_2_TITLE)

    // Card metadata: date + reading time on both; category only where set
    // Redesign 3802:39: cards show the date + a "Read article" pill (no reading time).
    await expect(cards.nth(0).getByRole('link', { name: 'Read article' })).toBeVisible()
    await expect(cards.nth(1).getByRole('link', { name: 'Read article' })).toBeVisible()

    // Post 1 has a cover image; post 2 is a graceful text-only card
    // Media logic (owner core rule): the card WITH a cover shows the real image and
    // no branded label; the card WITHOUT one shows the branded panel (label + monogram).
    await expect(page.getByText('isad.academy · blog')).toHaveCount(1)

    // §6: no featured slot, no filters, no search
    await expect(page.locator('input[type="search"]')).toHaveCount(0)
    await expect(page.getByRole('combobox')).toHaveCount(0)
  })
})

test.describe('blog article', () => {
  test('renders the full rich-text feature set, related course and LinkedIn share', async ({
    page,
  }) => {
    await page.goto(POST_1_URL)

    // Breadcrumb + header line (author · date · reading time)
    // Redesign (Figma 3977-687/3977-718): title + author row only — no breadcrumb,
    // no reading-time chip, no LinkedIn share on the article page.
    await expect(page.getByRole('heading', { level: 1, name: POST_1_TITLE })).toBeVisible()
    await expect(page.getByText('Dr. Silviu Gresoi')).toBeVisible()

    // Colored text runs (TextStateFeature) — style comes from the named palette preset
    const coloredRuns = page.locator('span[data-text-state]')
    await expect(coloredRuns).toHaveCount(2)
    await expect(coloredRuns.first()).toContainText('management-system standard for AI')
    await expect(coloredRuns.first()).toHaveAttribute('style', /#1C5D99|rgb\(28,\s*93,\s*153\)/i)

    // Blockquote styling
    await expect(page.locator('blockquote')).toContainText(
      'Governance is not about slowing AI down',
    )

    // In-text image (Lexical upload node)
    await expect(
      page.locator('article img[alt="Illustration: AI governance building blocks (placeholder)"]'),
    ).toBeVisible()

    // Link chip: pill external link with platform name — never an embed
    const chip = page.getByTestId('link-chip')
    await expect(chip).toContainText('Watch the standard explained')
    await expect(chip).toContainText('YouTube')
    await expect(chip).toHaveAttribute('href', 'https://www.youtube.com/watch?v=isad42001intro')
    await expect(chip).toHaveAttribute('target', '_blank')
    await expect(chip).toHaveAttribute('rel', /noopener/)
    await expect(page.locator('iframe')).toHaveCount(0)

    // Downloadable resource card: title, meta, download link to the media file
    const resource = page.getByTestId('downloadable-resource')
    await expect(resource).toContainText('ISO/IEC 42001 readiness checklist')
    await expect(resource).toContainText('PDF')
    const download = resource.getByRole('link', { name: /Download/ })
    await expect(download).toHaveAttribute('href', /iso-42001-readiness-checklist(-\d+)?\.pdf$/)
    await expect(download).toHaveAttribute('download', '')

    // Related course block (relatedCourse is set on post 1)
    const related = page.getByTestId('related-course')
    await expect(related).toContainText('ISO/IEC 42001:2023')
    await expect(related.getByRole('link', { name: 'View course' })).toHaveAttribute(
      'href',
      /\/cursuri\/iso-iec-42001-2023/,
    )

    // Newsletter CTA always present
    await expect(page.getByText('Get new articles in your inbox')).toBeVisible()

    // Post 1 has no lead magnet — no gate
    await expect(page.getByTestId('lead-magnet-gate')).toHaveCount(0)
  })

  test('lead-magnet gate: valid email swaps the form for the success state', async ({ page }) => {
    await page.goto(POST_2_URL)

    // Post 2 has no related course — newsletter CTA still always renders
    await expect(page.getByTestId('related-course')).toHaveCount(0)
    await expect(page.getByText('Get new articles in your inbox')).toBeVisible()

    const gate = page.getByTestId('lead-magnet-gate')
    await expect(gate.getByRole('heading', { name: 'Get the resource' })).toBeVisible()
    // NB: the microcopy uses a typographic apostrophe (We’ll), not ASCII.
    await expect(gate.getByText('We’ll email you the download link.')).toBeVisible()

    await gate.getByLabel('Email address').fill('reader@example.com')
    await gate.getByRole('button', { name: 'Send me the file' }).click()

    await expect(
      gate.getByText('Check your inbox — the download link is on its way.'),
    ).toBeVisible()
    // The form is gone after success
    await expect(gate.getByRole('button', { name: 'Send me the file' })).toHaveCount(0)
  })

  test('draft article URL returns 404 publicly', async ({ page }) => {
    const response = await page.goto('/blog/draft-upcoming-trends')
    expect(response?.status()).toBe(404)
  })

  test('unknown slug returns 404', async ({ page }) => {
    const response = await page.goto('/blog/does-not-exist')
    expect(response?.status()).toBe(404)
  })
})

test.describe('draft preview', () => {
  test('/next/preview without an admin session is refused and leaks no draft', async ({
    page,
    request,
  }) => {
    const response = await request.get('/next/preview?slug=draft-upcoming-trends')
    expect(response.status()).toBe(401)

    // No draft-mode cookie was set — the draft still 404s afterwards
    const draftPage = await page.goto('/blog/draft-upcoming-trends')
    expect(draftPage?.status()).toBe(404)
  })
})
