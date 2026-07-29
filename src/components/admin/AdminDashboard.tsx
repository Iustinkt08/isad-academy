import Link from 'next/link'
import type { ServerProps } from 'payload'
import type { ReactNode } from 'react'

import { computeSeatsRemaining } from '../../collections/CourseSessions'

/**
 * Dashboard widgets (admin.components.beforeDashboard) — a server component, so it
 * queries through the Local API directly (`overrideAccess: true`: the viewer is already
 * an authenticated admin — only admins can reach the dashboard).
 *
 * Two bands above the native Payload dashboard (which stays untouched — §3.5):
 *   1. Quick actions — pill links straight to the create forms Silviu uses most.
 *   2. Status cards — upcoming editions (low seats flagged red below
 *      `siteSettings.seatsThreshold`), orders (confirmed count + last 5), leads
 *      (count + last 3) and draft articles.
 *
 * Every section is wrapped in its own try/catch: a failing query logs a warning and
 * OMITS that card instead of crashing the whole admin dashboard.
 *
 * Styling lives in src/app/(payload)/custom.scss (`.isad-dash*`) on Payload theme
 * variables, so the widgets follow the admin's light/dark theme.
 */

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const formatDate = (value: null | string | undefined): string => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

type ChipTone = 'error' | 'neutral' | 'success' | 'warning'

/** pending = amber, confirmed = green, failed/refunded = red (task spec). */
const ORDER_STATUS_TONE: Record<string, ChipTone> = {
  confirmed: 'success',
  failed: 'error',
  pending: 'warning',
  refunded: 'error',
}

const Chip = ({ children, tone }: { children: ReactNode; tone: ChipTone }) => (
  <span className={`isad-dash__chip isad-dash__chip--${tone}`}>{children}</span>
)

const Card = ({
  children,
  count,
  href,
  title,
}: {
  children: ReactNode
  count?: string
  href: string
  title: string
}) => (
  <section className="isad-dash__card">
    <header className="isad-dash__card-head">
      <h3 className="isad-dash__card-title">
        {title}
        {count != null && <span className="isad-dash__count"> · {count}</span>}
      </h3>
      <Link className="isad-dash__view-all" href={href}>
        View all
      </Link>
    </header>
    {children}
  </section>
)

export async function AdminDashboard(props: ServerProps) {
  const { payload } = props
  const admin = payload.config.routes.admin
  const logSectionFailure = (section: string, err: unknown) =>
    payload.logger.warn(
      `[admin dashboard] "${section}" widget failed and was omitted: ${err instanceof Error ? err.message : String(err)}`,
    )

  // "X seats left" turns red below this threshold (CLAUDE.md §4 siteSettings).
  let seatsThreshold = 5
  try {
    const settings = await payload.findGlobal({ slug: 'siteSettings', depth: 0, overrideAccess: true })
    if (typeof settings?.seatsThreshold === 'number') seatsThreshold = settings.seatsThreshold
  } catch (err) {
    logSectionFailure('seatsThreshold', err) // keep the default of 5
  }

  // --- Upcoming editions (startDate in the future), soonest first ---
  let upcoming:
    | null
    | { courseTitle: string; id: number | string; low: boolean; seatsRemaining: number; startDate: string }[] = null
  try {
    const result = await payload.find({
      collection: 'courseSessions',
      depth: 1, // resolve `course` so the card can show the course title
      limit: 5,
      overrideAccess: true,
      sort: 'startDate',
      where: { startDate: { greater_than: new Date().toISOString() } },
    })
    upcoming = result.docs.map((session) => {
      const course = session.course
      const courseTitle =
        course && typeof course === 'object' ? course.title || 'Untitled course' : `Course #${String(course)}`
      const seatsRemaining = computeSeatsRemaining(session)
      return {
        courseTitle,
        id: session.id,
        low: seatsRemaining < seatsThreshold,
        seatsRemaining,
        startDate: session.startDate,
      }
    })
  } catch (err) {
    logSectionFailure('upcoming editions', err)
  }

  // --- Orders: confirmed count + last 5 ---
  let orders:
    | null
    | {
        confirmedCount: number
        recent: { createdAt: string; id: number | string; paymentStatus: string; total: string }[]
      } = null
  try {
    const [confirmed, recent] = await Promise.all([
      payload.count({
        collection: 'orders',
        overrideAccess: true,
        where: { paymentStatus: { equals: 'confirmed' } },
      }),
      payload.find({ collection: 'orders', depth: 0, limit: 5, overrideAccess: true, sort: '-createdAt' }),
    ])
    orders = {
      confirmedCount: confirmed.totalDocs,
      recent: recent.docs.map((order) => ({
        createdAt: order.createdAt,
        id: order.id,
        paymentStatus: order.paymentStatus,
        total:
          typeof order.pricing?.total === 'number'
            ? `${order.pricing.total} ${order.pricing?.currency ?? ''}`.trim()
            : '—',
      })),
    }
  } catch (err) {
    logSectionFailure('orders', err)
  }

  // --- Leads: total count + last 3 ---
  let leads: null | { recent: { id: number | string; name: string; type: string }[]; totalCount: number } = null
  try {
    const [total, recent] = await Promise.all([
      payload.count({ collection: 'leads', overrideAccess: true }),
      payload.find({ collection: 'leads', depth: 0, limit: 3, overrideAccess: true, sort: '-createdAt' }),
    ])
    leads = {
      recent: recent.docs.map((lead) => ({ id: lead.id, name: lead.name, type: lead.type })),
      totalCount: total.totalDocs,
    }
  } catch (err) {
    logSectionFailure('leads', err)
  }

  // --- Draft articles ---
  let draftPostCount: null | number = null
  try {
    const result = await payload.count({
      collection: 'blogPosts',
      overrideAccess: true,
      where: { _status: { equals: 'draft' } },
    })
    draftPostCount = result.totalDocs
  } catch (err) {
    logSectionFailure('draft articles', err)
  }

  return (
    <div className="isad-dash">
      <nav aria-label="Quick actions" className="isad-dash__actions">
        <Link className="isad-dash__action" href={`${admin}/collections/courses/create`}>
          + Add course
        </Link>
        <Link className="isad-dash__action" href={`${admin}/collections/courseSessions/create`}>
          + Add edition
        </Link>
        <Link className="isad-dash__action" href={`${admin}/collections/blogPosts/create`}>
          + Write article
        </Link>
        <Link className="isad-dash__action" href={`${admin}/collections/discountCodes/create`}>
          + Discount code
        </Link>
      </nav>

      <div className="isad-dash__grid">
        {upcoming != null && (
          <Card href={`${admin}/collections/courseSessions`} title="Upcoming editions">
            {upcoming.length === 0 ? (
              <p className="isad-dash__empty">No upcoming editions scheduled.</p>
            ) : (
              <ul className="isad-dash__rows">
                {upcoming.map((row) => (
                  <li className="isad-dash__row" key={row.id}>
                    <span className="isad-dash__row-main">{row.courseTitle}</span>
                    <span className="isad-dash__row-meta">{formatDate(row.startDate)}</span>
                    <Chip tone={row.low ? 'error' : 'neutral'}>
                      {row.seatsRemaining} {row.seatsRemaining === 1 ? 'seat' : 'seats'} left
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {orders != null && (
          <Card count={`${orders.confirmedCount} confirmed`} href={`${admin}/collections/orders`} title="Orders">
            {orders.recent.length === 0 ? (
              <p className="isad-dash__empty">No orders yet.</p>
            ) : (
              <ul className="isad-dash__rows">
                {orders.recent.map((order) => (
                  <li className="isad-dash__row" key={order.id}>
                    <span className="isad-dash__row-main">#{order.id}</span>
                    <span className="isad-dash__row-meta">{formatDate(order.createdAt)}</span>
                    <span className="isad-dash__row-meta">{order.total}</span>
                    <Chip tone={ORDER_STATUS_TONE[order.paymentStatus] ?? 'neutral'}>{order.paymentStatus}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {leads != null && (
          <Card count={`${leads.totalCount} total`} href={`${admin}/collections/leads`} title="Leads">
            {leads.recent.length === 0 ? (
              <p className="isad-dash__empty">No leads yet.</p>
            ) : (
              <ul className="isad-dash__rows">
                {leads.recent.map((lead) => (
                  <li className="isad-dash__row" key={lead.id}>
                    <span className="isad-dash__row-main">{lead.name}</span>
                    <Chip tone="neutral">{lead.type}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {draftPostCount != null && (
          <Card href={`${admin}/collections/blogPosts`} title="Draft articles">
            <p className="isad-dash__big">{draftPostCount}</p>
            <p className="isad-dash__empty">
              {draftPostCount === 1 ? 'Unpublished article' : 'Unpublished articles'} waiting to be finished.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
