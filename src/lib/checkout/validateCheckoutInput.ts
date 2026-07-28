/**
 * Server-side validation for `POST /api/checkout` (CLAUDE.md §3.2/§4/§6). Deliberately
 * hand-rolled (no schema library in this repo) but exhaustive: this is the ONLY gate between
 * an arbitrary client payload and order creation, so every rule the spec calls out lives
 * here, in one place, with one shared error shape.
 *
 * Mass-assignment hygiene: every object level (request body, `buyer`, each `participants[i]`)
 * is checked against an explicit allow-list — an unrecognized field is rejected outright
 * EXCEPT for `IGNORED_TOP_LEVEL_KEYS` (see below), so a client can never sneak an unexpected
 * field into what becomes `orders` data.
 */

const MAX_QUANTITY = 500
const MAX_PARTICIPANTS = 100
const MAX_NAME_LENGTH = 200
const MAX_EMAIL_LENGTH = 254
const MAX_TEXT_LENGTH = 300
const MAX_CODE_LENGTH = 64

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ALLOWED_TOP_LEVEL_KEYS = ['sessionId', 'quantity', 'buyer', 'participants', 'code', 'codes']

/** Codes stack, max 2 per order (owner 2026-07-25) — mirrored by the engine's
 * `MAX_DISCOUNT_CODES`. */
const MAX_CODES = 2

/**
 * A tampering (or merely naive) client might send a client-computed `total`, a full
 * `pricing` breakdown, or a bare `isMember` claim (CLAUDE.md §13 — membership can only ever
 * be granted by a valid `type: 'member'` discount code, never a client-asserted flag).
 * These keys are accepted WITHOUT erroring so a well-meaning but stale client doesn't get a
 * confusing 400 — but their values are never read anywhere below, or anywhere in
 * `processCheckout`: pricing is always recomputed server-side.
 */
const IGNORED_TOP_LEVEL_KEYS = ['pricing', 'total', 'isMember']

const ALLOWED_BUYER_KEYS = ['name', 'email', 'phone', 'isCompany', 'companyName', 'cui', 'address']
const ALLOWED_PARTICIPANT_KEYS = ['name', 'email']

export type NormalizedBuyer = {
  name: string
  email: string
  phone?: string
  isCompany: boolean
  companyName?: string
  cui?: string
  address?: string
}

export type NormalizedParticipant = { name: string; email: string }

export type NormalizedCheckoutInput = {
  sessionId: number | string
  quantity: number
  buyer: NormalizedBuyer
  participants: NormalizedParticipant[]
  /** Trimmed discount codes in application order (max `MAX_CODES`); [] = none. The legacy
   * single `code` field is folded in here. */
  codes: string[]
}

export type CheckoutValidationResult =
  | { ok: true; value: NormalizedCheckoutInput }
  | { ok: false; error: string }

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength

const isValidEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value)

const rejectUnknownKeys = (
  obj: Record<string, unknown>,
  allowed: string[],
  label: string,
): string | null => {
  const unknown = Object.keys(obj).filter((key) => !allowed.includes(key))
  if (unknown.length > 0) {
    return `Unknown field(s) in ${label}: ${unknown.join(', ')}.`
  }
  return null
}

export const validateCheckoutInput = (raw: unknown): CheckoutValidationResult => {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Request body must be a JSON object.' }
  }

  const topLevelError = rejectUnknownKeys(
    raw,
    [...ALLOWED_TOP_LEVEL_KEYS, ...IGNORED_TOP_LEVEL_KEYS],
    'request body',
  )
  if (topLevelError) return { ok: false, error: topLevelError }

  const { sessionId, quantity, buyer, participants, code, codes } = raw

  if (!(typeof sessionId === 'number' && Number.isFinite(sessionId)) && !isNonEmptyString(sessionId, 100)) {
    return { ok: false, error: '"sessionId" is required.' }
  }

  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || (quantity as number) < 1) {
    return { ok: false, error: '"quantity" must be a positive integer.' }
  }
  if ((quantity as number) > MAX_QUANTITY) {
    return { ok: false, error: `"quantity" may not exceed ${MAX_QUANTITY}.` }
  }
  const validQuantity = quantity as number

  if (!isPlainObject(buyer)) {
    return { ok: false, error: '"buyer" is required.' }
  }
  const buyerError = rejectUnknownKeys(buyer, ALLOWED_BUYER_KEYS, 'buyer')
  if (buyerError) return { ok: false, error: buyerError }

  if (!isNonEmptyString(buyer.name, MAX_NAME_LENGTH)) {
    return { ok: false, error: '"buyer.name" is required.' }
  }
  if (!isValidEmail(buyer.email)) {
    return { ok: false, error: '"buyer.email" must be a valid e-mail address.' }
  }
  if (buyer.phone !== undefined && !isNonEmptyString(buyer.phone, MAX_TEXT_LENGTH)) {
    return { ok: false, error: '"buyer.phone" must be a non-empty string.' }
  }

  const isCompanyRaw = buyer.isCompany
  const isCompany = isCompanyRaw === undefined ? false : isCompanyRaw
  if (typeof isCompany !== 'boolean') {
    return { ok: false, error: '"buyer.isCompany" must be a boolean.' }
  }

  if (isCompany) {
    if (!isNonEmptyString(buyer.companyName, MAX_TEXT_LENGTH)) {
      return { ok: false, error: '"buyer.companyName" is required for company (B2B) purchases.' }
    }
    if (!isNonEmptyString(buyer.cui, MAX_TEXT_LENGTH)) {
      return { ok: false, error: '"buyer.cui" is required for company (B2B) purchases.' }
    }
  } else if (buyer.companyName !== undefined && !isNonEmptyString(buyer.companyName, MAX_TEXT_LENGTH)) {
    return { ok: false, error: '"buyer.companyName" must be a non-empty string.' }
  }

  if (buyer.address !== undefined && !isNonEmptyString(buyer.address, MAX_TEXT_LENGTH)) {
    return { ok: false, error: '"buyer.address" must be a non-empty string.' }
  }
  if (
    !isCompany &&
    buyer.cui !== undefined &&
    !isNonEmptyString(buyer.cui, MAX_TEXT_LENGTH)
  ) {
    return { ok: false, error: '"buyer.cui" must be a non-empty string.' }
  }

  const normalizedBuyer: NormalizedBuyer = {
    name: buyer.name as string,
    email: buyer.email as string,
    phone: buyer.phone as string | undefined,
    isCompany,
    companyName: buyer.companyName as string | undefined,
    cui: buyer.cui as string | undefined,
    address: buyer.address as string | undefined,
  }

  if (participants !== undefined && !Array.isArray(participants)) {
    return { ok: false, error: '"participants" must be an array.' }
  }
  let participantsInput: unknown[] = Array.isArray(participants) ? participants : []

  // CLAUDE.md §4/§6: at quantity 1, the buyer doubles as the sole participant when the
  // client omits (or sends an empty) participants array.
  if (validQuantity === 1 && participantsInput.length === 0) {
    participantsInput = [{ name: normalizedBuyer.name, email: normalizedBuyer.email }]
  }

  if (participantsInput.length !== validQuantity) {
    const noun = validQuantity === 1 ? 'entry' : 'entries'
    return {
      ok: false,
      error: `"participants" must contain exactly ${validQuantity} ${noun} to match "quantity" (received ${participantsInput.length}).`,
    }
  }
  if (participantsInput.length > MAX_PARTICIPANTS) {
    return { ok: false, error: `"participants" may not exceed ${MAX_PARTICIPANTS} entries.` }
  }

  const normalizedParticipants: NormalizedParticipant[] = []
  for (let index = 0; index < participantsInput.length; index += 1) {
    const participant = participantsInput[index]
    if (!isPlainObject(participant)) {
      return { ok: false, error: `participants[${index}] must be an object.` }
    }
    const participantError = rejectUnknownKeys(participant, ALLOWED_PARTICIPANT_KEYS, `participants[${index}]`)
    if (participantError) return { ok: false, error: participantError }

    if (!isNonEmptyString(participant.name, MAX_NAME_LENGTH)) {
      return { ok: false, error: `participants[${index}].name is required.` }
    }
    if (!isValidEmail(participant.email)) {
      return { ok: false, error: `participants[${index}].email must be a valid e-mail address.` }
    }

    normalizedParticipants.push({ name: participant.name, email: participant.email })
  }

  // `codes` (new, ordered, max 2) takes precedence; the legacy single `code` still works.
  const normalizedCodes: string[] = []
  if (codes !== undefined && codes !== null) {
    if (!Array.isArray(codes)) {
      return { ok: false, error: '"codes" must be an array of strings.' }
    }
    if (codes.length > MAX_CODES) {
      return { ok: false, error: `At most ${MAX_CODES} discount codes can be applied per order.` }
    }
    for (const entry of codes) {
      if (!isNonEmptyString(entry, MAX_CODE_LENGTH)) {
        return { ok: false, error: 'Every entry in "codes" must be a non-empty string.' }
      }
      normalizedCodes.push(entry.trim())
    }
  } else if (code !== undefined && code !== null) {
    if (!isNonEmptyString(code, MAX_CODE_LENGTH)) {
      return { ok: false, error: '"code" must be a non-empty string.' }
    }
    normalizedCodes.push(code.trim())
  }

  return {
    ok: true,
    value: {
      sessionId: sessionId as number | string,
      quantity: validQuantity,
      buyer: normalizedBuyer,
      participants: normalizedParticipants,
      codes: normalizedCodes,
    },
  }
}
