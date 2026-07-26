import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

/**
 * Discount codes (general or member-granting). Admin-only in every direction — the public
 * must never be able to enumerate valid codes via the API; checkout (T6) validates a
 * customer-entered code server-side via the Local API with `overrideAccess: true`.
 */
export const DiscountCodes: CollectionConfig = {
  slug: 'discountCodes',
  admin: {
    useAsTitle: 'code',
    group: 'Sales',
    defaultColumns: ['code', 'percentage', 'type', 'isActive', 'usageCount'],
    description: 'Discount codes. Never publicly readable — checkout validates codes server-side.',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
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
        description: 'Leave empty for unlimited uses.',
      },
    },
    {
      name: 'usageCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
        description: 'Incremented by checkout when the code is applied. Do not edit by hand.',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'general',
      options: [
        { label: 'General', value: 'general' },
        { label: 'Member', value: 'member' },
      ],
      admin: {
        description: '"member" codes also grant the member discount (CLAUDE.md §8, §13 — % TBD).',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
