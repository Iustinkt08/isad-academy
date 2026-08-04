/**
 * Rate limiting minimal, in-process, fără dependințe (fixed-window) pentru rutele POST
 * publice — apărare împotriva abuzului: spam de formulare, amplificare de emailuri prin
 * contul Brevo, flood de comenzi/apeluri Netopia (securitate: A04/A05, OWASP).
 *
 * Limitări asumate: starea trăiește în memoria procesului. Pe cPanel/Passenger pot exista
 * câteva procese Node, deci limita efectivă = limită × număr de procese — acceptabil ca
 * plasă anti-abuz (nu ca rate-limit distribuit exact). La nevoie se poate muta pe un store
 * partajat (Redis/Upstash) fără să schimbe interfața de aici.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
let lastSweep = 0

/** Curăță periodic ferestrele expirate ca Map-ul să nu crească nemărginit. */
const sweep = (now: number): void => {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/** IP-ul clientului din antetele de proxy (LiteSpeed/cPanel pun `x-forwarded-for`). */
export const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export type RateLimitOptions = {
  /** Namespace-ul rutei (chei separate per endpoint). */
  name: string
  /** Cereri permise per fereastră. */
  limit: number
  /** Lungimea ferestrei, în ms. */
  windowMs: number
  /** Cheie explicită (implicit IP-ul). */
  key?: string
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number }

export const checkRateLimit = (request: Request, opts: RateLimitOptions): RateLimitResult => {
  const now = Date.now()
  sweep(now)

  const id = `${opts.name}:${opts.key ?? getClientIp(request)}`
  const bucket = buckets.get(id)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true }
  }
  if (bucket.count >= opts.limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  bucket.count += 1
  return { ok: true }
}

/** Răspunsul standard 429 (cu antetul `Retry-After`). */
export const tooManyRequests = (retryAfter: number): Response =>
  Response.json(
    { ok: false, error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )

/** Helper compact pentru rutele POST: întoarce un Response 429 dacă s-a depășit limita,
 * altfel `null` (continuă handler-ul). No-op sub `NODE_ENV=test`, ca starea in-process să nu
 * se scurgă între testele de rută (logica pură se testează direct prin `checkRateLimit`). */
export const enforceRateLimit = (request: Request, opts: RateLimitOptions): Response | null => {
  if (process.env.NODE_ENV === 'test') return null
  const result = checkRateLimit(request, opts)
  return result.ok ? null : tooManyRequests(result.retryAfter)
}

/** Preset-uri: formularele publice sunt zgârcite; checkout-ul e ceva mai permisiv (retry uman). */
export const RL_FORM = { limit: 6, windowMs: 10 * 60 * 1000 }
export const RL_CHECKOUT = { limit: 12, windowMs: 10 * 60 * 1000 }
