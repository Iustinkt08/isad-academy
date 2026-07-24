import type { Payload } from 'payload'

import { getSessionEndOfDay } from '../../collections/CourseSessions'
import { maskEmail } from '../checkout/maskEmail'
import { getMailer } from '../email'
import { renderReviewRequestEmail } from '../email/templates/reviewRequest'
import { createReviewToken } from './token'

export type SendReviewRequestsSummary = {
  sessionsProcessed: number
  emailsSent: number
  emailsFailed: number
}

export type SendReviewRequestsDeps = {
  payload: Payload
  /** Injected clock (mirrors `processCheckout`'s contract) so tests can pin "now"
   * deterministically instead of racing the system clock against fixture dates. */
  now?: Date
  /** How many days in the past a session's END is still eligible for a review request
   * (CLAUDE.md §10, T13). Default 7 — long enough to comfortably cover a daily cron missing a
   * day, short enough that a first deploy against months/years of historical sessions doesn't
   * suddenly mail everyone who ever attended. */
  lookbackDays?: number
  siteUrl?: string
}

const DEFAULT_LOOKBACK_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000
/** Generous safety cap — this is a single-expert live-training business, not a high-volume
 * catalog; a session or an order list this size would indicate something has gone wrong
 * rather than being a real pagination need. */
const FETCH_LIMIT = 1000

const courseTitleOf = (course: unknown): string => {
  if (course && typeof course === 'object' && 'title' in course) {
    const title = (course as { title?: unknown }).title
    return typeof title === 'string' ? title : ''
  }
  return ''
}

type Participant = { name: string; email: string }

/**
 * Daily review-request job core logic (CLAUDE.md §10, T13) — Payload-injected so it is
 * directly integration-testable via the Local API (no HTTP round trip, no job-queue
 * scaffolding needed), and reused by BOTH the `sendReviewRequests` Payload Jobs task handler
 * (payload.config.ts, run by Vercel Cron in production) and the `npm run jobs:run` dev/local
 * fallback script.
 *
 * For every `courseSessions` doc that (a) has already ended (`getSessionEndOfDay` < now),
 * (b) ended within the lookback window, and (c) has never been stamped
 * (`reviewRequestSentAt` empty): collects every unique participant email across that
 * session's CONFIRMED orders, sends one review-request email each (best-effort — a failed
 * send is logged, not thrown), then stamps `reviewRequestSentAt` regardless of individual
 * send failures so the job never re-mails the whole edition on the next run. A session
 * outside the lookback window or not yet finished is simply left unstamped and revisited on
 * a later run (once it enters the window) — or, for one already too old, permanently skipped
 * (documented behavior, not a bug: an ancient, never-stamped session — e.g. one that existed
 * before this feature shipped — must not suddenly mail everyone the day of first deploy).
 */
export const sendReviewRequests = async (deps: SendReviewRequestsDeps): Promise<SendReviewRequestsSummary> => {
  const { payload } = deps
  const now = deps.now ?? new Date()
  const lookbackDays = deps.lookbackDays ?? DEFAULT_LOOKBACK_DAYS
  const siteUrl = (deps.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
  const lookbackStart = new Date(now.getTime() - lookbackDays * DAY_MS)

  const summary: SendReviewRequestsSummary = { sessionsProcessed: 0, emailsSent: 0, emailsFailed: 0 }

  const candidates = await payload.find({
    collection: 'courseSessions',
    where: { reviewRequestSentAt: { equals: null } },
    depth: 1,
    limit: FETCH_LIMIT,
    overrideAccess: true,
  })

  for (const session of candidates.docs) {
    const endOfDay = getSessionEndOfDay(session)
    if (!endOfDay) continue
    if (endOfDay >= now) continue // not finished yet — leave unstamped for a later run
    if (endOfDay < lookbackStart) continue // ended too long ago — outside the lookback window

    summary.sessionsProcessed += 1

    const courseTitle = courseTitleOf(session.course)

    const ordersResult = await payload.find({
      collection: 'orders',
      where: {
        and: [{ session: { equals: session.id } }, { paymentStatus: { equals: 'confirmed' } }],
      },
      depth: 0,
      limit: FETCH_LIMIT,
      overrideAccess: true,
    })

    // Dedupe by (lowercased) email across every confirmed order on this session — the same
    // person could technically appear as a participant on more than one order.
    const participantsByEmail = new Map<string, Participant>()
    for (const order of ordersResult.docs) {
      const participants = Array.isArray(order.participants) ? order.participants : []
      for (const participant of participants) {
        const email = String(participant?.email ?? '').trim().toLowerCase()
        if (!email || participantsByEmail.has(email)) continue
        participantsByEmail.set(email, { name: String(participant?.name ?? ''), email })
      }
    }

    for (const participant of participantsByEmail.values()) {
      try {
        const token = createReviewToken({ sessionId: session.id, email: participant.email })
        const reviewUrl = `${siteUrl}/review/${token}`
        const { subject, html, text } = renderReviewRequestEmail({
          participantName: participant.name,
          courseTitle,
          editionDate: session.startDate,
          reviewUrl,
        })

        const result = await getMailer().sendTransactional({ to: participant.email, subject, html, text })
        if (result.ok) {
          summary.emailsSent += 1
        } else {
          summary.emailsFailed += 1
          payload.logger.warn(
            `[reviews] request email to ${maskEmail(participant.email)} for session ${session.id} failed: ${result.error}`,
          )
        }
      } catch (err) {
        summary.emailsFailed += 1
        const message = err instanceof Error ? err.message : String(err)
        payload.logger.error(
          `[reviews] request email to ${maskEmail(participant.email)} for session ${session.id} threw unexpectedly: ${message}`,
        )
      }
    }

    // Stamp even if some (or all) sends above failed — best-effort, consistent with the T7
    // email hooks: never let an email-provider outage turn into an unbounded daily re-send
    // storm for the same edition. A failure is logged above for Silviu to spot and follow up
    // on manually if needed.
    await payload.update({
      collection: 'courseSessions',
      id: session.id,
      data: { reviewRequestSentAt: now.toISOString() },
      overrideAccess: true,
    })
  }

  return summary
}
