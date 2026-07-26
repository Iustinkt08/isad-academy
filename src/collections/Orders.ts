import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { sendOrderConfirmationEmail } from '../lib/email/hooks'
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
    group: 'Sales',
    defaultColumns: ['paymentStatus', 'session', 'quantity', 'createdAt'],
    listSearchableFields: ['buyer.email', 'buyer.name'],
    description: 'Checkout orders. Server-side only — never exposed to the public API.',
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
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
        { name: 'isCompany', type: 'checkbox', defaultValue: false, label: 'Buying as a company (B2B)' },
        {
          name: 'companyName',
          type: 'text',
          admin: { condition: (_, siblingData) => Boolean(siblingData?.isCompany) },
        },
        {
          name: 'cui',
          type: 'text',
          label: 'CUI / VAT ID',
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
        singular: 'Participant',
        plural: 'Participants',
      },
      admin: {
        description:
          'One row per seat — length must equal "quantity". When quantity is 1, the checkout API fills this from the buyer.',
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
        description:
          'Snapshot of the pricing engine output at the moment of purchase (CLAUDE.md §8) — never recomputed after the fact. Read-only: not hand-editable.',
      },
      fields: [
        { name: 'basePrice', type: 'number' },
        {
          name: 'currency',
          type: 'select',
          options: ['EUR', 'RON'],
          admin: { description: 'Visitor currency resolved by geo at purchase time (B1).' },
        },
        {
          name: 'appliedWindow',
          type: 'select',
          options: [
            { label: 'Early Bird', value: 'earlyBird' },
            { label: 'Standard', value: 'standard' },
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
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
    {
      name: 'provider',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Payment provider that handled this order, e.g. "mock", "stripe". Set by checkout — read-only.',
      },
    },
    {
      name: 'providerRef',
      type: 'text',
      admin: {
        readOnly: true,
        description: "Provider's transaction/session reference. Set by checkout — read-only.",
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
  hooks: {
    afterChange: [consumeSeatsOnConfirm, sendOrderConfirmationEmail, issueInvoiceOnConfirm],
    afterDelete: [releaseSeatsOnDelete],
  },
}
