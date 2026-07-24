import { expect, test, type Page } from '@playwright/test'

/**
 * T14 — SEO + consent-gated analytics + legal pages + system routes.
 * Relies on `npm run seed` having run against the dev database (seed sets
 * siteSettings.analytics.ga4Id = "G-TESTLOCAL1" precisely so the gating tests below have
 * something to gate; gscVerification stays unset).
 */

const COURSE_SLUG = 'iso-iec-42001-2023-ai-management-systems-preparation-training'
const COURSE_2_SLUG = 'ai-risk-management-foundations'
const POST_SLUG = 'what-iso-iec-42001-means-for-your-ai-governance'
const POST_2_SLUG = 'five-questions-to-ask-before-your-first-ai-audit'
const DRAFT_COURSE_SLUG = 'anti-fraud-fundamentals-for-financial-institutions'
const DRAFT_POST_SLUG = 'draft-upcoming-trends'
const LEGAL_ROUTES = ['/termeni', '/gdpr', '/politica-cookie', '/politica-livrare']
const PLACEHOLDER_MARKER = '[Placeholder — final legal text pending confirmation]'

/** Parse every ld+json script on the page. */
async function readJsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents()
  return raw.map((text) => JSON.parse(text) as Record<string, unknown>)
}

const findByType = (
  blocks: Record<string, unknown>[],
  type: string,
): Record<string, unknown> | undefined => blocks.find((block) => block['@type'] === type)

test.describe('system routes', () => {
  test('sitemap.xml lists static routes + published content, excludes drafts and transactional routes', async ({
    request,
  }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.ok()).toBeTruthy()
    const xml = await res.text()

    // Static + legal routes
    for (const route of ['/cursuri', '/corporate', '/despre', '/contact', '/blog', ...LEGAL_ROUTES]) {
      expect(xml, `sitemap should list ${route}`).toContain(`<loc>http://localhost:3000${route}</loc>`)
    }
    // Published courses + posts, with lastmod from updatedAt
    expect(xml).toContain(`/cursuri/${COURSE_SLUG}`)
    expect(xml).toContain(`/cursuri/${COURSE_2_SLUG}`)
    expect(xml).toContain(`/blog/${POST_SLUG}`)
    expect(xml).toContain(`/blog/${POST_2_SLUG}`)
    expect(xml).toContain('<lastmod>')
    // Drafts are invisible (overrideAccess: false), transactional/utility routes excluded
    expect(xml).not.toContain(DRAFT_COURSE_SLUG)
    expect(xml).not.toContain(DRAFT_POST_SLUG)
    expect(xml).not.toContain('/checkout')
    expect(xml).not.toContain('/quiz')
    expect(xml).not.toContain('/review')
    expect(xml).not.toContain('/newsletter')
  })

  test('robots.txt disallows admin/checkout/preview/api and points at the sitemap', async ({
    request,
  }) => {
    const res = await request.get('/robots.txt')
    expect(res.ok()).toBeTruthy()
    const text = await res.text()
    for (const path of ['/admin', '/checkout', '/next/preview', '/review/', '/api/']) {
      expect(text).toContain(`Disallow: ${path}`)
    }
    expect(text).toContain('Allow: /')
    expect(text).toContain('Sitemap: http://localhost:3000/sitemap.xml')
  })

  test('unknown URLs render the branded 404 inside the site layout, with a real 404 status', async ({
    page,
  }) => {
    const response = await page.goto('/this-page-does-not-exist')
    expect(response?.status()).toBe(404)

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browse courses' })).toHaveAttribute('href', '/cursuri')
    await expect(page.getByRole('link', { name: 'Read the blog' })).toHaveAttribute('href', '/blog')
    await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
    // Branded = full layout, not Next's bare default page
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })
})

test.describe('structured data + meta', () => {
  test('every page carries the Organization JSON-LD from the root layout', async ({ page }) => {
    await page.goto('/')
    const org = findByType(await readJsonLd(page), 'Organization')
    expect(org).toBeDefined()
    expect(org?.name).toBe('isad.academy')
    expect(org?.url).toBe('http://localhost:3000')
    expect(org?.logo).toBe('http://localhost:3000/og-default.png')
  })

  test('course detail: Course JSON-LD with per-edition CourseInstances, factual R2-safe claims', async ({
    page,
  }) => {
    await page.goto(`/cursuri/${COURSE_SLUG}`)
    const course = findByType(await readJsonLd(page), 'Course')
    expect(course).toBeDefined()
    expect(course?.name).toContain('ISO/IEC 42001:2023')
    expect((course?.provider as { name?: string })?.name).toBe('isad.academy')

    const instances = course?.hasCourseInstance as Record<string, unknown>[]
    expect(instances.length).toBeGreaterThanOrEqual(3) // seeded upcoming editions A, B, C
    for (const instance of instances) {
      expect(instance['@type']).toBe('CourseInstance')
      expect(instance.courseMode).toBe('Online')
      expect(instance.startDate).toBeTruthy()
    }
    // Seed session A: Early Bird active at €900 → InStock offer
    const inStock = instances.find(
      (instance) =>
        (instance.offers as { availability?: string } | undefined)?.availability ===
        'https://schema.org/InStock',
    )
    expect(inStock).toBeDefined()
    const offer = inStock?.offers as { price: number; priceCurrency: string }
    expect(offer.price).toBe(900)
    expect(offer.priceCurrency).toBe('EUR')
    // Seed session C is sold out → SoldOut availability
    expect(
      instances.some(
        (instance) =>
          (instance.offers as { availability?: string } | undefined)?.availability ===
          'https://schema.org/SoldOut',
      ),
    ).toBe(true)
    // Seed session B has no active price window → no offers advertised
    expect(instances.some((instance) => instance.offers === undefined)).toBe(true)
    // R2 guard: structured data must never claim accreditation (CLAUDE.md §9)
    expect(JSON.stringify(course)).not.toMatch(/accredit/i)

    // Per-page meta: title template, OG image chain (no meta.image/banner → default), canonical
    await expect(page).toHaveTitle(/\| isad\.academy$/)
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
      'content',
      'http://localhost:3000/og-default.png',
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `http://localhost:3000/cursuri/${COURSE_SLUG}`,
    )
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    )
  })

  test('blog article: BlogPosting JSON-LD + OG image falls back to the cover image', async ({
    page,
  }) => {
    await page.goto(`/blog/${POST_SLUG}`)
    const posting = findByType(await readJsonLd(page), 'BlogPosting')
    expect(posting).toBeDefined()
    expect(posting?.headline).toBe('What ISO/IEC 42001 means for your AI governance')
    expect(posting?.datePublished).toBeTruthy()
    expect((posting?.author as { name?: string })?.name).toBe('Dr. Silviu Gresoi')
    expect(Array.isArray(posting?.image)).toBe(true)

    // OG image chain: no meta.image set → coverImage wins over the site default
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
      'content',
      /iso-42001-article-cover/,
    )
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
  })

  test('home exposes an FAQPage built from faqItems (certification section)', async ({ page }) => {
    await page.goto('/')
    const faq = findByType(await readJsonLd(page), 'FAQPage')
    expect(faq).toBeDefined()
    const questions = faq?.mainEntity as { name: string; acceptedAnswer: { text: string } }[]
    expect(questions.length).toBeGreaterThanOrEqual(3)
    expect(questions[0]!.name).toBe('Is the ISO/IEC 42001 certificate accredited?')
    expect(questions[0]!.acceptedAnswer.text).toContain('certificate of completion')
  })

  test('Search Console verification meta is absent while unset in siteSettings', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="google-site-verification"]')).toHaveCount(0)
  })
})

test.describe('consent-gated lazy analytics', () => {
  test('before any consent decision: zero googletagmanager scripts and zero requests', async ({
    page,
  }) => {
    const gtmRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('googletagmanager.com')) gtmRequests.push(request.url())
    })

    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible()
    // Grace period past hydration + the lazyOnload window
    await page.waitForTimeout(1500)

    expect(gtmRequests).toEqual([])
    await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0)
  })

  test('accepting analytics cookies lazily injects the GA4 tag (Consent Mode v2 bootstrap first)', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('region', { name: 'Cookie consent' })
      .getByRole('button', { name: 'Accept analytics cookies' })
      .click()

    // The external tag is injected lazily after accept. With the fake seeded ID the
    // request itself may 404 — asserting the attempted script element is the point.
    await page.waitForSelector('script[src*="googletagmanager.com/gtag/js?id=G-TESTLOCAL1"]', {
      state: 'attached',
      timeout: 15_000,
    })

    // Consent Mode v2: defaults all-denied, then analytics_storage granted — ads stay denied.
    const consentCommands = await page.evaluate(() => {
      const layer = (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []
      return layer
        .filter((entry) => Array.isArray(entry) || Object.prototype.toString.call(entry) === '[object Arguments]')
        .map((entry) => Array.from(entry as ArrayLike<unknown>))
        .filter((entry) => entry[0] === 'consent')
        .map((entry) => [entry[1], entry[2]])
    })
    expect(consentCommands.length).toBeGreaterThanOrEqual(2)
    expect(consentCommands[0]![0]).toBe('default')
    expect(consentCommands[0]![1]).toMatchObject({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    })
    expect(consentCommands[1]).toEqual(['update', { analytics_storage: 'granted' }])
  })

  test('refusing non-essential cookies keeps analytics fully off', async ({ page }) => {
    const gtmRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('googletagmanager.com')) gtmRequests.push(request.url())
    })

    await page.goto('/')
    await page
      .getByRole('region', { name: 'Cookie consent' })
      .getByRole('button', { name: 'Refuse non-essential' })
      .click()
    await page.waitForTimeout(1500)

    expect(gtmRequests).toEqual([])
    await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0)
  })
})

test.describe('legal pages', () => {
  test('all four legal routes render with an h1, and TBD passages carry the placeholder marker', async ({
    page,
  }) => {
    const headings: Record<string, string> = {
      '/termeni': 'Terms & Conditions',
      '/gdpr': 'Privacy Policy',
      '/politica-cookie': 'Cookie Policy',
      '/politica-livrare': 'Delivery Policy',
    }

    for (const route of LEGAL_ROUTES) {
      await page.goto(route)
      await expect(
        page.getByRole('heading', { level: 1, name: headings[route] }),
        `${route} h1`,
      ).toBeVisible()
    }

    // §13-dependent passages are explicitly marked as placeholders…
    for (const route of ['/termeni', '/gdpr', '/politica-livrare']) {
      await page.goto(route)
      await expect(page.getByText(PLACEHOLDER_MARKER).first(), `${route} marker`).toBeVisible()
    }
  })

  test('the cookie policy is concrete about what actually exists today', async ({ page }) => {
    await page.goto('/politica-cookie')
    await expect(page.getByText('cookie-consent', { exact: true })).toBeVisible()
    await expect(page.getByText('Google Consent Mode', { exact: false })).toBeVisible()
    // Nothing on this page is placeholder — it describes the real cookie surface
    await expect(page.getByText(PLACEHOLDER_MARKER)).toHaveCount(0)
  })
})
