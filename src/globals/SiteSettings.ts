import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Site-wide config for the business decisions still TBD from Silviu (CLAUDE.md §13) —
 * config-driven so nothing is hardcoded. Defaults match the locked interim values in
 * docs/PLAN.md: EUR, VAT-inclusive display, both price windows shown, "stackAll" pricing.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  admin: {
    group: 'Site',
    description: 'Site-wide configuration, including the business decisions still pending from Silviu (CLAUDE.md §13).',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  // Static frontend (EN + /ro) regenerates after every dashboard save.
  hooks: {
    afterChange: [revalidateSiteHook],
  },
  fields: [
    {
      name: 'seatsThreshold',
      type: 'number',
      defaultValue: 5,
      min: 0,
      admin: {
        description: 'Show "X seats left" only when seatsRemaining is below this number.',
      },
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'EUR',
      options: [
        { label: 'EUR', value: 'EUR' },
        { label: 'RON', value: 'RON' },
      ],
      admin: {
        description: 'TBD from Silviu (CLAUDE.md §13). Default: EUR.',
      },
    },
    {
      name: 'vatDisplay',
      type: 'select',
      defaultValue: 'incl',
      options: [
        { label: 'VAT included', value: 'incl' },
        { label: 'VAT excluded', value: 'excl' },
      ],
      admin: {
        description: 'TBD from Silviu (CLAUDE.md §13). Default: VAT included.',
      },
    },
    {
      name: 'earlyBirdDisplay',
      type: 'select',
      defaultValue: 'bothWindows',
      options: [
        { label: 'Show both windows', value: 'bothWindows' },
        { label: 'Show active window only', value: 'activeOnly' },
      ],
      admin: {
        description: 'TBD from Silviu (CLAUDE.md §13). Default: show both windows.',
      },
    },
    {
      name: 'stackingPolicy',
      type: 'select',
      defaultValue: 'stackAll',
      options: [
        { label: 'Stack all discounts', value: 'stackAll' },
        { label: 'Best discount only', value: 'bestOf' },
        { label: 'Group + member stack, code exclusive', value: 'groupMemberStack_codeExclusive' },
      ],
      admin: {
        description:
          'CRITICAL — TBD from Silviu (CLAUDE.md §8, §13). All three strategies are implemented (T4); this only selects which one applies. Default: stackAll.',
      },
    },
    {
      name: 'memberDiscountPercent',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 100,
      admin: {
        description: 'Member discount % — TBD by Silviu; 0 disables member pricing.',
      },
    },
    {
      name: 'legalEntity',
      type: 'group',
      admin: {
        description: 'Legal entity details for the footer + invoices. TBD from Silviu — footer degrades gracefully while empty.',
      },
      fields: [
        { name: 'name', type: 'text' },
        { name: 'cui', type: 'text', label: 'CUI' },
        { name: 'address', type: 'text' },
        { name: 'anpcUrl', type: 'text', label: 'ANPC URL' },
        { name: 'solUrl', type: 'text', label: 'SOL URL' },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'linkedin', type: 'text', label: 'LinkedIn URL' },
      ],
    },
    {
      name: 'analytics',
      type: 'group',
      admin: {
        description: 'Optional overrides for the env-based GA4/GTM IDs. Consent-gated + lazy-loaded (CLAUDE.md §7).',
      },
      fields: [
        { name: 'ga4Id', type: 'text', label: 'GA4 Measurement ID' },
        { name: 'gtmId', type: 'text', label: 'GTM Container ID' },
        { name: 'gscVerification', type: 'text', label: 'Search Console verification' },
      ],
    },
  ],
}
