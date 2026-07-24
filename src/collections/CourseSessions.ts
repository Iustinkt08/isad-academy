import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/** Minimal shape needed to derive `status` / `seatsRemaining` — decoupled from generated types. */
export type PriceWindow = {
  endDate?: string | Date | null
  price?: number | null
  startDate?: string | Date | null
}

export type ScheduleRow = {
  date?: string | Date | null
}

export type DerivableSession = {
  capacity?: number | null
  earlyBird?: PriceWindow | null
  schedule?: ScheduleRow[] | null
  seatsSold?: number | null
  standard?: PriceWindow | null
  startDate?: string | Date | null
}

export type SessionStatus = 'noActiveWindow' | 'past' | 'soldOut' | 'upcoming'

/** `capacity - seatsSold`, per CLAUDE.md §4. Not clamped — an oversold session (a T5 bug)
 * should surface as a negative number rather than being silently hidden. */
export const computeSeatsRemaining = (session: Pick<DerivableSession, 'capacity' | 'seatsSold'>): number =>
  (session.capacity ?? 0) - (session.seatsSold ?? 0)

/** The last day the session actually runs: the latest `schedule` date if any rows exist,
 * otherwise `startDate`. Returned at end-of-day so a session is only "past" once its last
 * scheduled day has fully elapsed. */
export const getSessionEndOfDay = (session: Pick<DerivableSession, 'schedule' | 'startDate'>): Date | null => {
  const scheduleDates = (session.schedule ?? [])
    .map((row) => (row?.date ? new Date(row.date) : null))
    .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()))

  const latest =
    scheduleDates.length > 0
      ? scheduleDates.reduce((a, b) => (b > a ? b : a))
      : session.startDate
        ? new Date(session.startDate)
        : null

  if (!latest || Number.isNaN(latest.getTime())) return null

  const endOfDay = new Date(latest)
  endOfDay.setHours(23, 59, 59, 999)
  return endOfDay
}

const isWithinWindow = (now: Date, window?: PriceWindow | null): boolean => {
  if (!window?.startDate || !window?.endDate) return false
  const start = new Date(window.startDate)
  const end = new Date(window.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
  return now >= start && now <= end
}

/** Base price is picked from whichever window (earlyBird | standard) is active "now" —
 * CLAUDE.md §8 step 1. Neither active ⇒ not purchasable. */
export const hasActivePriceWindow = (
  session: Pick<DerivableSession, 'earlyBird' | 'standard'>,
  now: Date = new Date(),
): boolean => isWithinWindow(now, session.earlyBird) || isWithinWindow(now, session.standard)

/**
 * Derives the read-only session status. Priority (resolves an ambiguity CLAUDE.md §4/§8
 * leaves implicit — see T2 report):
 *   1. `past` — the session already ran (end-of-day of its last scheduled day < now).
 *   2. `soldOut` — not past, and no seats remain (checked before pricing windows: a
 *      sold-out session is unpurchasable regardless of whether a price window is open).
 *   3. `noActiveWindow` — not past, seats available, but neither price window is active.
 *   4. `upcoming` — otherwise: seats available and a price window is active.
 */
export const computeSessionStatus = (session: DerivableSession, now: Date = new Date()): SessionStatus => {
  const endOfDay = getSessionEndOfDay(session)
  if (endOfDay && endOfDay < now) return 'past'

  if (computeSeatsRemaining(session) <= 0) return 'soldOut'

  if (!hasActivePriceWindow(session, now)) return 'noActiveWindow'

  return 'upcoming'
}

const priceWindowFields = (label: string): CollectionConfig['fields'] => [
  { name: 'price', type: 'number', min: 0, label: 'Price (EUR)' },
  {
    name: 'priceRON',
    type: 'number',
    min: 0,
    label: 'Price (RON)',
    admin: {
      description:
        'Charged to visitors from Romania (B1 — geo-based currency). Leave empty to sell this window in EUR only.',
    },
  },
  { name: 'startDate', type: 'date' },
  { name: 'endDate', type: 'date', admin: { description: `Leave both dates empty if there is no ${label.toLowerCase()} window.` } },
]

/**
 * One edition of a course (Variant B — CLAUDE.md §4): its own capacity, price windows and
 * schedule. Seats are only ever consumed on a CONFIRMED order (T5), atomically — never here.
 *
 * Public READ mirrors the parent course's draft gating (T16): anonymous requests only see
 * sessions whose parent course is `published` — a draft course's dates/prices/capacity no
 * longer leak through `/api/courseSessions` before Silviu publishes it. Payload supports
 * dot-notation relationship-subfield constraints in access Where results (`course._status`
 * joins the versioned `courses` collection); verified empirically in
 * tests/int/course-sessions.int.spec.ts. Admins see everything.
 */
export const CourseSessions: CollectionConfig = {
  slug: 'courseSessions',
  admin: {
    defaultColumns: ['course', 'startDate', 'capacity', 'seatsSold'],
    description: 'Editions of a course — dates, schedule, capacity and price windows.',
  },
  access: {
    read: ({ req }) => (req.user ? true : { 'course._status': { equals: 'published' } }),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Static frontend (EN + /ro) regenerates after every dashboard save.
  hooks: {
    afterChange: [revalidateSiteHook],
    afterDelete: [revalidateSiteHook],
  },
  fields: [
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      hasMany: false,
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
    },
    {
      name: 'schedule',
      type: 'array',
      labels: {
        singular: 'Schedule day',
        plural: 'Schedule days',
      },
      admin: {
        description: 'Concrete days and hours this edition meets.',
      },
      fields: [
        { name: 'date', type: 'date', required: true },
        { name: 'startTime', type: 'text', required: true, admin: { description: 'e.g. "09:00"' } },
        { name: 'endTime', type: 'text', required: true, admin: { description: 'e.g. "17:00"' } },
      ],
    },
    {
      name: 'capacity',
      type: 'number',
      required: true,
      min: 1,
      admin: {
        description: 'Total seats for this edition.',
      },
    },
    {
      name: 'seatsSold',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
        description: 'Consumed only on a CONFIRMED order, atomically (T5). Do not edit by hand.',
      },
    },
    {
      name: 'reviewRequestSentAt',
      type: 'date',
      admin: {
        hidden: true,
        description:
          'Idempotency stamp for the daily review-request job (T13, CLAUDE.md §10) — set once ' +
          'the post-session review-request emails have been sent for this edition (best-effort: ' +
          'stamped even if some individual sends failed, so the job never re-mails everyone on a ' +
          'retry). Never set by hand.',
      },
    },
    {
      name: 'earlyBird',
      label: 'Early Bird',
      type: 'group',
      admin: {
        description: 'Early Bird price window. Leave empty if this edition has none.',
      },
      fields: priceWindowFields('Early Bird'),
    },
    {
      name: 'standard',
      label: 'Standard',
      type: 'group',
      admin: {
        description: 'Standard price window.',
      },
      fields: priceWindowFields('Standard'),
    },
    {
      name: 'seatsRemaining',
      type: 'number',
      virtual: true,
      admin: {
        readOnly: true,
        description: 'Computed: capacity − seatsSold. Not stored.',
      },
      hooks: {
        afterRead: [
          ({ siblingData }) => computeSeatsRemaining(siblingData as DerivableSession),
        ],
      },
    },
    {
      name: 'status',
      type: 'select',
      virtual: true,
      options: [
        { label: 'Upcoming', value: 'upcoming' },
        { label: 'Past', value: 'past' },
        { label: 'Sold out', value: 'soldOut' },
        { label: 'No active price window', value: 'noActiveWindow' },
      ],
      admin: {
        readOnly: true,
        description: 'Computed from dates, seats and price windows. Not stored.',
      },
      hooks: {
        afterRead: [
          ({ siblingData }) => computeSessionStatus(siblingData as DerivableSession),
        ],
      },
    },
  ],
}
