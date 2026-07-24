/**
 * Shared request-body intake for every public POST route (T16 dedupe): size guard first,
 * then JSON parse — one implementation of the two failure modes every route used to
 * hand-roll. Each route keeps its OWN response envelope (`{ error }` vs `{ ok, error }`),
 * wrapping the returned `status`/`error` — response contracts are unchanged, except the
 * newsletter route's oversized-body status, aligned from 400 to 413 like everywhere else.
 */

export type ParseJsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; status: 400 | 413; error: string }

export const PAYLOAD_TOO_LARGE_ERROR = 'Request payload too large.'
export const INVALID_JSON_ERROR = 'Request body must be valid JSON.'

export const parseJsonBody = async (request: Request, maxBytes: number): Promise<ParseJsonBodyResult> => {
  const rawText = await request.text()

  if (rawText.length > maxBytes) {
    return { ok: false, status: 413, error: PAYLOAD_TOO_LARGE_ERROR }
  }

  try {
    return { ok: true, body: rawText.length > 0 ? JSON.parse(rawText) : {} }
  } catch {
    return { ok: false, status: 400, error: INVALID_JSON_ERROR }
  }
}
