import type { Access } from 'payload'

/**
 * Restricts an operation to authenticated Payload admin users (Silviu + team).
 * Clients never log in (CLAUDE.md §3.1) — this is the "admin-only" gate reused
 * across collections/globals that must never be publicly readable or writable.
 */
export const isAdmin: Access = ({ req: { user } }) => Boolean(user)
