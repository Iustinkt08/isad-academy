'use client'

import type { CheckoutSessionView } from '@/lib/checkout'
import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import { formatDateLocale } from './constants'

/**
 * Add-to-calendar (owner 2026-09-01) — confirmation page, LIVE editions only (self-study
 * courses never render this; the page checks `session.selfStudy` before mounting it).
 *
 * Two buttons, no external services:
 *  — Apple Calendar: builds an .ics client-side (one VEVENT per schedule day, timed in
 *    Europe/Bucharest — the trainer's timezone) and downloads it; macOS/iOS open it
 *    straight into Calendar.
 *  — Google Calendar: the render?action=TEMPLATE link (single-event API), pre-filled with
 *    the FIRST schedule day; the remaining days are listed in the event description.
 * A session without usable schedule rows falls back to one all-day event on `startDate`.
 */

type CalendarEvent =
  | { allDay: false; date: string; start: string; end: string } // YYYYMMDD + HHMMSS local
  | { allDay: true; date: string; nextDate: string } // YYYYMMDD pair (DTEND is exclusive)

const TIME_RE = /^(\d{1,2}):(\d{2})$/

/** ISO datetime → calendar-date digits (UTC parts — Payload stores date-only pickers at
 * UTC midnight, the same convention the catalog's own date formatting relies on). */
const yyyymmdd = (iso: string): string | null => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('')
}

const hhmmss = (time: string): string | null => {
  const match = TIME_RE.exec(time.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}${match[2]}00`
}

const buildEvents = (
  startDate: string,
  schedule: CheckoutSessionView['schedule'],
): CalendarEvent[] => {
  const timed = (schedule ?? []).flatMap<CalendarEvent>((row) => {
    const date = yyyymmdd(row.date)
    const start = hhmmss(row.startTime)
    const end = hhmmss(row.endTime)
    return date && start && end ? [{ allDay: false, date, start, end }] : []
  })
  if (timed.length > 0) {
    return timed.sort((a, b) => a.date.localeCompare(b.date))
  }

  // No usable schedule rows → one all-day event on the edition's start date.
  const date = yyyymmdd(startDate)
  const dayAfter = new Date(startDate)
  if (!date || Number.isNaN(dayAfter.getTime())) return []
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)
  const nextDate = yyyymmdd(dayAfter.toISOString())
  return nextDate ? [{ allDay: true, date, nextDate }] : []
}

/** RFC 5545 TEXT escaping (commas/semicolons are separators there). */
const icsEscape = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Recurring EET/EEST rules — lets Apple Calendar place the times correctly even when the
 * buyer's device sits in another timezone. */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Bucharest',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0300',
  'TZNAME:EEST',
  'DTSTART:19700329T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0200',
  'TZNAME:EET',
  'DTSTART:19701025T040000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

const buildIcs = (
  events: CalendarEvent[],
  orderId: number,
  summary: string,
  description: string,
  location: string,
): string => {
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//isad.academy//checkout//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...VTIMEZONE,
  ]
  events.forEach((event, index) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:isad-order-${orderId}-day-${index}@isad.academy`,
      `DTSTAMP:${stamp}`,
      ...(event.allDay
        ? [`DTSTART;VALUE=DATE:${event.date}`, `DTEND;VALUE=DATE:${event.nextDate}`]
        : [
            `DTSTART;TZID=Europe/Bucharest:${event.date}T${event.start}`,
            `DTEND;TZID=Europe/Bucharest:${event.date}T${event.end}`,
          ]),
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      `LOCATION:${icsEscape(location)}`,
      'END:VEVENT',
    )
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

const googleUrl = (
  first: CalendarEvent,
  summary: string,
  description: string,
  location: string,
): string => {
  const dates = first.allDay
    ? `${first.date}/${first.nextDate}`
    : `${first.date}T${first.start}/${first.date}T${first.end}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary,
    dates,
    details: description,
    location,
    ctz: 'Europe/Bucharest',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

const BUTTON_CLASS =
  'flex w-full items-center justify-center gap-2 rounded-[999px] border border-[#e6e6e6] bg-white px-[22px] pb-3 pt-[11px] text-[14px] font-medium text-[#222222] transition-colors hover:border-[#bdbdbd] lg:w-auto'

const AppleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 814 1000" className="h-4 w-4 fill-[#222222]">
    <path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 71-69 141-43 61-88 123-156 123s-86-40-165-40c-77 0-104 41-167 41s-107-57-157-127C42 787 0 664 0 547c0-187 122-286 242-286 64 0 117 42 157 42 38 0 97-45 170-45 27 0 127 3 219 83zM554 172c32-38 54-90 54-143 0-7-1-15-2-21-52 2-113 34-150 77-29 33-56 85-56 138 0 8 1 16 2 19 3 1 9 2 14 2 46 0 104-31 138-72z" />
  </svg>
)

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4 w-4">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.5 13.2l7.9 6.2C12.3 13.4 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.7 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.8c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 7-10.3 7-17.7z" />
    <path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.9-6.2z" />
    <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.7-5.8l-7.7-6c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.7-3.9-13.6-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
  </svg>
)

export function AddToCalendar({
  locale,
  orderId,
  courseTitle,
  startDate,
  schedule,
}: {
  locale: Locale
  orderId: number
  courseTitle: string
  startDate: string
  schedule?: CheckoutSessionView['schedule']
}) {
  const t = getDictionary(locale).checkout
  const events = buildEvents(startDate, schedule)
  const firstEvent = events[0]
  if (!firstEvent) return null

  const summary = `${courseTitle} — ${t.academyName}`
  // Google's template link carries a single event, so the remaining schedule days ride
  // along in the description ("Also on: …"); the .ics has one real event per day.
  const scheduleLabels = (schedule ?? []).flatMap((row) => {
    const day = formatDateLocale(row.date, locale)
    return day ? [`${day} ${row.startTime}–${row.endTime}`] : []
  })
  const googleDescription = [
    t.calendarDescription,
    ...(scheduleLabels.length > 1 ? [t.calendarMoreDays(scheduleLabels.slice(1).join(', '))] : []),
  ].join('\n')

  const downloadIcs = () => {
    const ics = buildIcs(events, orderId, summary, t.calendarDescription, t.calendarLocation)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `isad-academy-order-${orderId}.ics`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex w-full max-w-[min(350px,calc(100vw_-_40px))] flex-col items-center gap-3 lg:max-w-[560px]">
      <p className="text-[13.5px] font-medium text-[#959595]">{t.addToCalendar}</p>
      <div className="flex w-full flex-col gap-2.5 lg:w-auto lg:flex-row lg:gap-3">
        <button type="button" onClick={downloadIcs} className={BUTTON_CLASS}>
          <AppleIcon />
          {t.appleCalendar}
        </button>
        <a
          href={googleUrl(firstEvent, summary, googleDescription, t.calendarLocation)}
          target="_blank"
          rel="noopener noreferrer"
          className={BUTTON_CLASS}
        >
          <GoogleIcon />
          {t.googleCalendar}
        </a>
      </div>
    </div>
  )
}
