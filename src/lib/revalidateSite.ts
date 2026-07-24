/**
 * On-demand ISR revalidation (owner decision 2026-07-13: bilingual site with fully
 * static pages — EN unprefixed, RO under /ro). Every dashboard save on a publicly
 * rendered collection/global regenerates the frontend on the next request.
 *
 * The whole `[locale]` layout is revalidated instead of a per-path map: the site is
 * ~20 static pages × 2 locales, and content is heavily cross-embedded (courses feed
 * Home + catalog + detail + sitemap; settings feed the footer everywhere), so a
 * conservative full sweep is both correct and cheap.
 *
 * `next/cache` is imported lazily and failures are swallowed: Payload hooks also fire
 * from CLI contexts (scripts/seed.ts via tsx) where there is no Next server to
 * revalidate — that must never break a save or the seed.
 */
export const revalidateSite = async (): Promise<void> => {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/[locale]', 'layout')
  } catch {
    // Outside the Next runtime (seed script, payload CLI) — nothing to revalidate.
  }
}

/** Drop-in Payload afterChange/afterDelete hook (collections and globals alike). */
export const revalidateSiteHook = (): void => {
  void revalidateSite()
}
