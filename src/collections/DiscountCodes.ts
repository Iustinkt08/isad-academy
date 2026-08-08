import type { CollectionConfig } from 'payload'

import { hiddenFromEditors, isAdminRole } from '../access/isAdminRole'

/**
 * Discount codes (general or member-granting). Admin-only in every direction — the public
 * must never be able to enumerate valid codes via the API; checkout (T6) validates a
 * customer-entered code server-side via the Local API with `overrideAccess: true`.
 */
export const DiscountCodes: CollectionConfig = {
  slug: 'discountCodes',
  admin: {
    useAsTitle: 'code',
    group: { en: 'Sales', ro: 'Vânzări' },
    defaultColumns: ['code', 'percentage', 'type', 'isActive', 'usageCount'],
    description: {
      en: 'Discount codes entered at checkout. Never publicly readable: the checkout validates a customer\'s code on the server, so visitors cannot list the valid codes.',
      ro: 'Coduri de reducere introduse la checkout. Nu sunt niciodată vizibile public: checkout-ul validează codul clientului pe server, deci vizitatorii nu pot afla lista codurilor valide.',
    },
    // Pricing levers are admin-only — editors manage content, not discounts (owner 2026-08-08).
    hidden: hiddenFromEditors,
  },
  access: {
    read: isAdminRole,
    create: isAdminRole,
    update: isAdminRole,
    delete: isAdminRole,
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'percentage',
      type: 'number',
      required: true,
      min: 0,
      max: 100,
    },
    {
      name: 'expiresAt',
      type: 'date',
    },
    {
      name: 'usageLimit',
      type: 'number',
      min: 1,
      admin: {
        description: {
          en: 'Maximum number of orders that may use this code. Leave empty for unlimited uses; once the limit is reached, checkout rejects the code.',
          ro: 'Numărul maxim de comenzi care pot folosi acest cod. Lăsați gol pentru utilizări nelimitate; odată atinsă limita, checkout-ul respinge codul.',
        },
      },
    },
    {
      name: 'usageCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
        description: {
          en: 'How many times checkout has applied this code so far. Increased automatically on each confirmed use. Do not edit by hand.',
          ro: 'De câte ori a fost aplicat codul la checkout până acum. Crește automat la fiecare utilizare confirmată. Nu se editează manual.',
        },
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'general',
      options: [
        { label: { en: 'General', ro: 'General' }, value: 'general' },
        { label: { en: 'Member', ro: 'Membru' }, value: 'member' },
      ],
      admin: {
        description: {
          en: 'General codes apply only their own percentage. Member codes additionally grant the member discount to the order, as if the buyer were an APCF member.',
          ro: 'Codurile generale aplică doar procentul propriu. Codurile de membru acordă în plus și reducerea de membru pentru comandă, ca și cum cumpărătorul ar fi membru APCF.',
        },
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
