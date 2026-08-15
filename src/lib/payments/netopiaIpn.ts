import { createHash, createPublicKey, createVerify, X509Certificate, type KeyObject } from 'crypto'

/**
 * Netopia IPN (Instant Payment Notification) verification — API v2.
 *
 * Netopia POSTs the IPN JSON to our notify URL with a `Verification-token` header: a JWT
 * signed with THEIR private key (RS512 by default). We verify it against the public
 * key(s)/certificate(s) from the Netopia admin (`NETOPIA_PUBLIC_KEY` — may hold several
 * concatenated PEM blocks; any of them validates), and additionally check (mirroring the
 * official SDKs):
 *   - `iss`  === 'NETOPIA Payments'
 *   - `aud`  === our POS signature (string or first array entry)
 *   - `sub`  === base64(sha512(raw request body)) — proves the payload wasn't tampered with
 *   - `exp`  — token not expired (small leeway for clock skew)
 *
 * No JWT library needed: the token is verified manually with node:crypto, which keeps the
 * payment path dependency-free.
 */

export type NetopiaIpnPayload = {
  order?: { orderID?: string; amount?: number; currency?: string }
  payment?: { status?: number; ntpID?: string; amount?: number; currency?: string }
}

export type NetopiaIpnVerification =
  | { ok: true; payload: NetopiaIpnPayload }
  | { ok: false; reason: string }

const JWT_ALGS: Record<string, string> = {
  RS256: 'RSA-SHA256',
  RS384: 'RSA-SHA384',
  RS512: 'RSA-SHA512',
}

/** 60s leeway on `exp`/`nbf` — Netopia delivers IPNs promptly; this only absorbs skew. */
const CLOCK_LEEWAY_SECONDS = 60

const base64UrlDecode = (segment: string): Buffer =>
  Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

/**
 * Accepts the `NETOPIA_PUBLIC_KEY` env value in any deploy-friendly shape: PEM
 * certificate(s), bare PEM public key(s), either of those with `\n` escaped (single-line
 * env vars), or the whole thing base64-encoded (cPanel env editors mangle multiline
 * values). Multiple PEM blocks may be concatenated — Netopia signs the sandbox and live
 * verification tokens with different keys, and during the activation review both must be
 * accepted at once (their tester signs with the live key while the site still runs on
 * sandbox).
 */
export const parseNetopiaPublicKeys = (raw: string): KeyObject[] => {
  let text = raw.trim().replace(/\\n/g, '\n')
  if (!text.includes('-----BEGIN')) {
    text = Buffer.from(text, 'base64').toString('utf8').trim()
  }
  const blocks = text.match(/-----BEGIN [^-]+-----[\s\S]+?-----END [^-]+-----/g) ?? []
  if (blocks.length === 0) {
    throw new Error('No PEM blocks found in NETOPIA_PUBLIC_KEY.')
  }
  return blocks.map((pem) =>
    pem.includes('CERTIFICATE') ? new X509Certificate(pem).publicKey : createPublicKey(pem),
  )
}

/** Single-key convenience wrapper (first PEM block) — kept for existing callers/tests. */
export const parseNetopiaPublicKey = (raw: string): KeyObject => {
  const [first] = parseNetopiaPublicKeys(raw)
  if (!first) {
    throw new Error('No PEM blocks found in NETOPIA_PUBLIC_KEY.')
  }
  return first
}

export const verifyNetopiaIpn = (
  rawBody: string,
  verificationToken: string | null,
  options: { publicKeyPem: string; posSignature: string | string[]; now?: Date },
): NetopiaIpnVerification => {
  if (!verificationToken) {
    return { ok: false, reason: 'Missing Verification-token header.' }
  }

  const [headerPart, claimsPart, signaturePart, ...extra] = verificationToken.split('.')
  if (!headerPart || !claimsPart || !signaturePart || extra.length > 0) {
    return { ok: false, reason: 'Malformed verification token (not a JWT).' }
  }

  let publicKeys: KeyObject[]
  try {
    publicKeys = parseNetopiaPublicKeys(options.publicKeyPem)
  } catch {
    return { ok: false, reason: 'NETOPIA_PUBLIC_KEY is not a valid certificate/public key.' }
  }

  let header: { alg?: string }
  let claims: Record<string, unknown>
  try {
    header = JSON.parse(base64UrlDecode(headerPart).toString('utf8')) as { alg?: string }
    claims = JSON.parse(base64UrlDecode(claimsPart).toString('utf8')) as Record<string, unknown>
  } catch {
    return { ok: false, reason: 'Verification token header/claims are not valid JSON.' }
  }

  const signatureAlg = JWT_ALGS[header.alg ?? '']
  if (!signatureAlg) {
    return { ok: false, reason: `Unsupported JWT algorithm "${header.alg}".` }
  }

  const signatureValid = publicKeys.some((publicKey) =>
    createVerify(signatureAlg)
      .update(`${headerPart}.${claimsPart}`)
      .verify(publicKey, base64UrlDecode(signaturePart)),
  )
  if (!signatureValid) {
    return { ok: false, reason: 'Verification token signature is invalid.' }
  }

  if (claims.iss !== 'NETOPIA Payments') {
    return { ok: false, reason: `Unexpected token issuer "${String(claims.iss)}".` }
  }

  const acceptedSignatures = Array.isArray(options.posSignature)
    ? options.posSignature
    : [options.posSignature]
  const aud = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud
  if (typeof aud !== 'string' || !acceptedSignatures.includes(aud)) {
    return { ok: false, reason: 'Token audience does not match our POS signature.' }
  }

  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000)
  const exp = typeof claims.exp === 'number' ? claims.exp : null
  if (exp !== null && nowSeconds > exp + CLOCK_LEEWAY_SECONDS) {
    return { ok: false, reason: 'Verification token has expired.' }
  }
  const nbf = typeof claims.nbf === 'number' ? claims.nbf : null
  if (nbf !== null && nowSeconds < nbf - CLOCK_LEEWAY_SECONDS) {
    return { ok: false, reason: 'Verification token is not valid yet.' }
  }

  const bodyHash = createHash('sha512').update(rawBody).digest('base64')
  if (claims.sub !== bodyHash) {
    return { ok: false, reason: 'Payload hash mismatch — body does not match the signed token.' }
  }

  try {
    return { ok: true, payload: JSON.parse(rawBody) as NetopiaIpnPayload }
  } catch {
    return { ok: false, reason: 'IPN body is not valid JSON.' }
  }
}
