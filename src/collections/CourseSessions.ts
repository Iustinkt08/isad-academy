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
  { name: 'price', type: 'number', min: 0, label: { en: 'Price (EUR)', ro: 'Preț (EUR)' } },
  {
    name: 'priceRON',
    type: 'number',
    min: 0,
    label: { en: 'Price (RON)', ro: 'Preț (RON)' },
    admin: {
      description: {
        en: 'Price charged to visitors browsing from Romania (the currency is chosen by the visitor\'s location). Leave empty to sell this window in EUR only.',
        ro: 'Prețul perceput vizitatorilor care accesează site-ul din România (moneda se alege după locația vizitatorului). Lăsați gol pentru a vinde această fereastră doar în EUR.',
      },
    },
  },
  { name: 'startDate', type: 'date' },
  {
    name: 'endDate',
    type: 'date',
    admin: {
      description: {
        en: `Last day of the ${label} window. Leave both dates empty if this edition has no ${label} window.`,
        ro: `Ultima zi a ferestrei ${label}. Lăsați ambele date goale dacă această ediție nu are fereastră ${label}.`,
      },
    },
  },
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
    group: { en: 'Content', ro: 'Conținut' },
    defaultColumns: ['course', 'startDate', 'capacity', 'seatsSold'],
    description: {
      en: 'Editions of a course: dates, schedule, capacity and price windows. Each edition sells separately; the seat counts and the Early Bird or Standard prices shown on the site come from here.',
      ro: 'Edițiile unui curs: date, program, capacitate și ferestre de preț. Fiecare ediție se vinde separat; numărul de locuri și prețurile Early Bird sau Standard afișate pe site vin de aici.',
    },
  },
  defaultSort: 'startDate',
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
        singular: { en: 'Schedule day', ro: 'Zi de program' },
        plural: { en: 'Schedule days', ro: 'Zile de program' },
      },
      admin: {
        description: {
          en: 'The concrete days and hours this edition meets, shown in the program section of the course page. The latest day here also decides when the edition counts as past.',
          ro: 'Zilele și orele concrete în care se ține această ediție, afișate în secțiunea de program a paginii de curs. Cea mai târzie zi de aici decide și momentul din care ediția este considerată încheiată.',
        },
      },
      fields: [
        { name: 'date', type: 'date', required: true },
        {
          name: 'startTime',
          type: 'text',
          required: true,
          admin: {
            description: {
              en: 'Start time of that day, 24-hour format, for example "09:00".',
              ro: 'Ora de început a zilei respective, în format de 24 de ore, de exemplu „09:00".',
            },
          },
        },
        {
          name: 'endTime',
          type: 'text',
          required: true,
          admin: {
            description: {
              en: 'End time of that day, 24-hour format, for example "17:00".',
              ro: 'Ora de final a zilei respective, în format de 24 de ore, de exemplu „17:00".',
            },
          },
        },
      ],
    },
    {
      name: 'capacity',
      type: 'number',
      required: true,
      min: 1,
      admin: {
        description: {
          en: 'Total seats for this edition. The site shows "X seats left" only when few remain, and sales stop automatically once every seat is sold.',
          ro: 'Numărul total de locuri pentru această ediție. Site-ul afișează „X seats left" doar când rămân puține, iar vânzarea se oprește automat când toate locurile s-au vândut.',
        },
      },
    },
    {
      name: 'seatsSold',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
        description: {
          en: 'Seats consumed by confirmed orders. Updated automatically and atomically when a payment is confirmed; a refund releases the seats again. Do not edit by hand.',
          ro: 'Locurile consumate de comenzile confirmate. Se actualizează automat și atomic la confirmarea unei plăți; o rambursare eliberează locurile la loc. Nu se editează manual.',
        },
      },
    },
    {
      name: 'reviewRequestSentAt',
      type: 'date',
      admin: {
        hidden: true,
        description: {
          en: 'Timestamp set once the review-request emails have gone out to participants after this edition ended. The daily job checks it so nobody is emailed twice, even when a retry follows partial failures. Never set by hand.',
          ro: 'Marcaj de timp setat după trimiterea emailurilor de cerere de recenzie către participanți, la finalul acestei ediții. Jobul zilnic îl verifică pentru ca nimeni să nu primească emailul de două ori, nici măcar la o reîncercare după eșecuri parțiale. Nu se setează niciodată manual.',
        },
      },
    },
    {
      name: 'earlyBird',
      label: { en: 'Early Bird', ro: 'Early Bird' },
      type: 'group',
      admin: {
        description: {
          en: 'Early Bird price window. While the current date is inside this window, the site sells at this price. Leave everything empty if this edition has no Early Bird offer.',
          ro: 'Fereastra de preț Early Bird. Cât timp data curentă este în această fereastră, site-ul vinde la acest preț. Lăsați totul gol dacă această ediție nu are ofertă Early Bird.',
        },
      },
      fields: priceWindowFields('Early Bird'),
    },
    {
      name: 'standard',
      label: { en: 'Standard', ro: 'Standard' },
      type: 'group',
      admin: {
        description: {
          en: 'Standard price window, used when the Early Bird window is not active. If neither window is active, the edition cannot be purchased and the site shows "Enrolment coming soon".',
          ro: 'Fereastra de preț Standard, folosită când fereastra Early Bird nu este activă. Dacă niciuna dintre ferestre nu este activă, ediția nu poate fi cumpărată, iar site-ul afișează „Enrolment coming soon".',
        },
      },
      fields: priceWindowFields('Standard'),
    },
    {
      name: 'seatsRemaining',
      type: 'number',
      virtual: true,
      admin: {
        readOnly: true,
        description: {
          en: 'Calculated automatically as capacity minus seats sold. Read-only and never stored; a negative number means the edition was oversold and needs attention.',
          ro: 'Calculat automat drept capacitate minus locuri vândute. Doar pentru citire, nu se stochează; un număr negativ înseamnă că ediția a fost suprarezervată și necesită atenție.',
        },
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
        { label: { en: 'Upcoming', ro: 'Urmează' }, value: 'upcoming' },
        { label: { en: 'Past', ro: 'Încheiată' }, value: 'past' },
        { label: { en: 'Sold out', ro: 'Locuri epuizate' }, value: 'soldOut' },
        { label: { en: 'No active price window', ro: 'Fără fereastră de preț activă' }, value: 'noActiveWindow' },
      ],
      admin: {
        readOnly: true,
        description: {
          en: 'Derived automatically from the dates, the remaining seats and the price windows. Read-only and never stored; it changes on its own as time passes or seats sell.',
          ro: 'Derivat automat din date, locurile rămase și ferestrele de preț. Doar pentru citire, nu se stochează; se schimbă de la sine pe măsură ce trece timpul sau se vând locuri.',
        },
      },
      hooks: {
        afterRead: [
          ({ siblingData }) => computeSessionStatus(siblingData as DerivableSession),
        ],
      },
    },
  ],
}
