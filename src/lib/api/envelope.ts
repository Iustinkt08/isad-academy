/**
 * The `{ ok: true } | { ok: false, error }` response envelope shared by the simple public
 * POST endpoints (newsletter et al.). Client components `import type` this (type-only — no
 * runtime import of server code into the client bundle) instead of re-declaring ad-hoc
 * `{ ok?: boolean; error?: string }` mirrors that could drift from the server contract.
 */
export type ApiOkEnvelope = { ok: true } | { ok: false; error: string }
