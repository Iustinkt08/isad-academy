# Course detail redesign — `/cursuri/[slug]` (plan, confirmed 2026-07-12)

Build this AFTER `/compact`. All decisions below are owner-confirmed.

## Reference & style
- Visual reference: certcar.com/model (couldn't fetch — 403 to bots; pattern known).
- Pattern: each content block is a **centered card** with a soft **drop shadow behind it**;
  inside each card a **two-column layout** — a **sticky title/label on the left**, the
  **content on the right**. Poppins only, modern, Apple-style, friendly, generous
  whitespace. Key elements highlighted in **Deep Blue #1C5D99**. Use existing brand tokens
  (`shadow-lift`/`shadow-soft`, `rounded-3xl`, grey ramp, `--ease-brand`).

## Card order (confirmed)
1. **Preț & Înscriere** (Pricing + Enrol) — at the top.
2. **Calendar** — interactive editions calendar.
3. **Despre** (description / what you learn).
4. **Cui se adresează** (audience).
5. **Certificare** (PECB certification + CPD, R2-conservative copy).

## Calendar (confirmed: clickable month grid)
- Month-grid calendar; days that have an edition are **highlighted in blue**.
- **Clicking an edition selects it** for enrolment (drives the same edition state the
  pricing engine + Enrol form already use). Two-way: selecting an edition in the
  price/enrol card also highlights it on the calendar.
- Data source: the course's `courseSessions` (each has `startDate`, `schedule[]` of
  `{date,startTime,endTime}`, capacity/seatsSold, price windows). Show upcoming editions;
  past ones dimmed/non-selectable. Respect `seatsThreshold` for "X seats left".
- Client component (interactivity); keep it accessible (keyboard-selectable days, aria).

## Enrol / money path (confirmed: restructure UI, keep logic)
- Move the pricing block + edition selector + quantity + Enrol into the sticky-card layout.
- **Do NOT change the pricing engine, the quote/checkout API, or the seat logic** — only
  the presentation. Reuse `EnrolForm`, `computeOrderPricing`, the `/api/checkout/quote`
  flow, `formatPrice`, currency (geo RON/EUR), `earlyBirdDisplay`, seats-left/sold-out/
  no-window states exactly as they work today.

## Reusable building block
- Create a `<StickyCard label={...}>children</StickyCard>` component:
  centered `max-w`, `rounded-3xl`, `shadow-lift`, white; grid `lg:grid-cols-[260px_1fr]`;
  left column `lg:sticky lg:top-24 self-start` with the label (Poppins SemiBold, blue
  eyebrow feel); right column the content. Stacks to one column on mobile (label on top).

## Edge states to preserve
- No active price window → "Enrolment coming soon" (not purchasable).
- Sold out → "Notify me next edition".
- Past editions → dimmed, non-selectable.
- Empty/no sessions → graceful.

## Acceptance
- Responsive 360/768/1024/1440; calendar usable on mobile (maybe list fallback < md).
- WCAG AA (blue #1C5D99 on white OK; Steel only ≥24px/≥19px bold; grey ramp for muted).
- Checkout flow still works end-to-end (verify with dev server + a mock purchase).
- typecheck + lint + unit tests green; update any E2E that assert course-page selectors.
- prefers-reduced-motion respected.

## Files likely touched
- `src/app/(frontend)/cursuri/[slug]/page.tsx` (server: fetch + compose cards)
- new `src/components/courses/StickyCard.tsx`
- new `src/components/courses/EditionsCalendar.tsx` (client, clickable)
- `src/components/courses/EnrolForm.tsx` + price block (restyle, keep logic)
- maybe lift edition-selection state so calendar ↔ enrol stay in sync (client wrapper).
