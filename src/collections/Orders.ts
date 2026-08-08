import type { CollectionConfig } from 'payload'

import { hiddenFromEditors, isAdminRole } from '../access/isAdminRole'
import { sendOrderConfirmationEmail, sendOrderReceivedEmail } from '../lib/email/hooks'
import { issueInvoiceOnConfirm } from '../lib/invoicing/hooks/issueInvoiceOnConfirm'
import { consumeSeatsOnConfirm, releaseSeatsOnDelete } from '../lib/seats'

/**
 * A checkout on a single course session (CLAUDE.md §3.2 — no cart). Never publicly
 * readable, creatable or updatable: the checkout API (T6) writes through the Local API
 * with `overrideAccess: true` from the server; the admin panel is otherwise the only
 * consumer (Silviu reviews orders + participant lists).
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    group: { en: 'Sales', ro: 'Vânzări' },
    defaultColumns: ['paymentStatus', 'session', 'quantity', 'createdAt'],
    listSearchableFields: ['buyer.email', 'buyer.name'],
    description: {
      en: 'Orders placed through the site checkout, one course edition per order. Created and updated by the payment flow; use this list to review buyers, participants and payment status. Never exposed to the public API.',
      ro: 'Comenzile plasate prin checkout-ul site-ului, o singură ediție de curs per comandă. Create și actualizate de fluxul de plată; folosește lista pentru a consulta cumpărătorii, participanții și statusul plății. Nu sunt expuse niciodată prin API-ul public.',
    },
    // Sales data is admin-only — editors manage content, not orders (owner 2026-08-08).
    hidden: hiddenFromEditors,
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdminRole,
    create: isAdminRole,
    update: isAdminRole,
    delete: isAdminRole,
  },
  fields: [
    {
      name: 'session',
      type: 'relationship',
      relationTo: 'courseSessions',
      required: true,
      hasMany: false,
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'buyer',
      type: 'group',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text' },
        {
          name: 'isCompany',
          type: 'checkbox',
          defaultValue: false,
          label: { en: 'Buying as a company (B2B)', ro: 'Cumpărare pe firmă (B2B)' },
        },
        {
          name: 'companyName',
          type: 'text',
          admin: { condition: (_, siblingData) => Boolean(siblingData?.isCompany) },
        },
        {
          name: 'cui',
          type: 'text',
          label: { en: 'CUI / VAT ID', ro: 'CUI / Cod TVA' },
          admin: { condition: (_, siblingData) => Boolean(siblingData?.isCompany) },
        },
        {
          name: 'address',
          type: 'text',
          admin: { condition: (_, siblingData) => Boolean(siblingData?.isCompany) },
        },
      ],
    },
    {
      name: 'participants',
      type: 'array',
      minRows: 1,
      labels: {
        singular: { en: 'Participant', ro: 'Participant' },
        plural: { en: 'Participants', ro: 'Participanți' },
      },
      admin: {
        description: {
          en: 'One row per seat; the number of rows must equal "quantity". For single-seat orders, checkout fills this in automatically from the buyer details.',
          ro: 'Un rând pentru fiecare loc; numărul de rânduri trebuie să fie egal cu "quantity". Pentru comenzile cu un singur loc, checkout-ul completează automat datele cumpărătorului aici.',
        },
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
      ],
      validate: (value, { data }) => {
        const quantity = Number((data as { quantity?: number } | undefined)?.quantity) || 0
        const participants = Array.isArray(value) ? value : []

        if (participants.length !== quantity) {
          const noun = quantity === 1 ? 'entry' : 'entries'
          return `participants must contain exactly ${quantity} ${noun} to match "quantity" (received ${participants.length}).`
        }

        return true
      },
    },
    {
      name: 'pricing',
      type: 'group',
      admin: {
        // UI-only lock (admin.readOnly never affects the Local API the checkout writes
        // through with overrideAccess) — the fiscal snapshot must not be hand-edited.
        readOnly: true,
        description: {
          en: 'Snapshot of the full price breakdown at the moment of purchase: base price, applied window, discounts and total. Never recomputed afterwards and not hand-editable; it documents exactly what the buyer paid.',
          ro: 'Instantaneu al detalierii complete de preț din momentul cumpărării: preț de bază, fereastra aplicată, reducerile și totalul. Nu se recalculează ulterior și nu se editează manual; documentează exact cât a plătit cumpărătorul.',
        },
      },
      fields: [
        { name: 'basePrice', type: 'number' },
        {
          name: 'currency',
          type: 'select',
          options: [
            { label: { en: 'EUR', ro: 'EUR' }, value: 'EUR' },
            { label: { en: 'RON', ro: 'RON' }, value: 'RON' },
          ],
          admin: {
            description: {
              en: "Currency the buyer paid in, resolved from the visitor's location at purchase time: RON for Romania, EUR otherwise.",
              ro: 'Moneda în care a plătit cumpărătorul, stabilită după locația vizitatorului la momentul cumpărării: RON pentru România, EUR în rest.',
            },
          },
        },
        {
          name: 'appliedWindow',
          type: 'select',
          options: [
            { label: { en: 'Early Bird', ro: 'Early Bird' }, value: 'earlyBird' },
            { label: { en: 'Standard', ro: 'Standard' }, value: 'standard' },
          ],
        },
        { name: 'groupDiscount', type: 'number', defaultValue: 0 },
        { name: 'memberDiscount', type: 'number', defaultValue: 0 },
        // Legacy single-code field (= first applied code) — kept for admin continuity.
        { name: 'code', type: 'relationship', relationTo: 'discountCodes', hasMany: false },
        // Codes stack, max 2 per order (owner 2026-07-25) — full list, application order.
        { name: 'codes', type: 'relationship', relationTo: 'discountCodes', hasMany: true },
        { name: 'codeDiscount', type: 'number', defaultValue: 0 },
        { name: 'total', type: 'number' },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: { en: 'Pending', ro: 'În așteptare' }, value: 'pending' },
        { label: { en: 'Confirmed', ro: 'Confirmată' }, value: 'confirmed' },
        { label: { en: 'Failed', ro: 'Eșuată' }, value: 'failed' },
        { label: { en: 'Refunded', ro: 'Rambursată' }, value: 'refunded' },
      ],
    },
    {
      name: 'provider',
      type: 'text',
      admin: {
        readOnly: true,
        description: {
          en: 'Payment provider that handled this order, e.g. "mock" or "netopia". Set automatically by checkout; read-only.',
          ro: 'Procesatorul de plăți care a gestionat comanda, de exemplu "mock" sau "netopia". Setat automat de checkout; doar pentru citire.',
        },
      },
    },
    {
      name: 'providerRef',
      type: 'text',
      admin: {
        readOnly: true,
        description: {
          en: "The provider's transaction or payment-session reference. Set automatically by checkout; read-only. Use it to find the payment in the provider's own dashboard.",
          ro: 'Referința tranzacției sau a sesiunii de plată la procesator. Setată automat de checkout; doar pentru citire. Folosește-o pentru a găsi plata în panoul procesatorului.',
        },
      },
    },
  ],
  // T5 — atomic seat consumption (CLAUDE.md §3.4, §8; src/lib/seats). `afterChange` acts on
  // the paymentStatus TRANSITION (never the value alone): crossing INTO `confirmed` runs a
  // capacity-guarded atomic increment of `session.seatsSold` (rejects — and rolls back the
  // whole write — if it would oversell); crossing OUT of `confirmed` (refunded, failed, or
  // an admin reset to pending) releases the seat(s) symmetrically, so seats never leak.
  // `afterDelete` covers an admin deleting a still-`confirmed` order the same way.
  //
  // T7 — `sendOrderConfirmationEmail` (src/lib/email/hooks) runs AFTER the seat hook, on the
  // exact same not-confirmed -> confirmed transition (detected independently — the seat
  // hook's own logic is untouched). It never throws, so a Brevo outage can never undo the
  // seat consumption/order confirmation that already succeeded above it.
  // `sendOrderReceivedEmail` (owner 2026-07-30) covers the other end: create-with-pending
  // only, so a buyer sent to a hosted payment page gets a receipt while the payment settles.
  // It skips orders that are already confirmed on create, so it can never contradict the
  // confirmation email above.
  hooks: {
    afterChange: [
      consumeSeatsOnConfirm,
      sendOrderReceivedEmail,
      sendOrderConfirmationEmail,
      issueInvoiceOnConfirm,
    ],
    afterDelete: [releaseSeatsOnDelete],
  },
}
