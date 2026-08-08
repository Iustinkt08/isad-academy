/**
 * Normalizes a Payload media URL into something next/image will accept.
 *
 * Payload generates ABSOLUTE `media.url` values whenever `serverURL` is configured
 * (payload.config.ts sets it from NEXT_PUBLIC_SITE_URL), but next/image rejects any
 * absolute URL whose host is not allow-listed in `images.remotePatterns` — the request
 * to /_next/image comes back 400 and the image silently never renders. Plain <img>
 * consumers (e.g. the mobile blog cards) are unaffected, which is why the bug showed
 * up as "images work on the phone but not on desktop".
 *
 * Rather than allow-listing our own host per environment, strip the site's own origin
 * so next/image always receives a same-origin relative path. External URLs (a future
 * S3/CDN storage adapter) are passed through untouched — those DO belong in
 * `images.remotePatterns` if they ever appear.
 */
export const toImageSrc = (url: string): string => {
  if (url.startsWith('/')) return url

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!site) return url

  try {
    const parsed = new URL(url)
    const siteOrigin = new URL(site).origin
    if (parsed.origin !== siteOrigin) return url
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}
