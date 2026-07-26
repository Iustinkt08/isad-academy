import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Global certification content for the home certification section (CLAUDE.md §4, §9 R2;
 * the /certificare page was retired 2026-07-11). Copy MUST stay
 * conservative: courses are positioned as "training that prepares you for ISO/IEC
 * 42001:2023" plus a certificate of completion issued by APCF + CPD credits — never as an
 * accredited ISO certification isad/APCF does not hold.
 */
export const CertificationInfo: GlobalConfig = {
  slug: 'certificationInfo',
  admin: {
    group: 'Site',
    description: 'Certification page content. Keep wording conservative (CLAUDE.md §9 R2) — never imply accreditation isad/APCF does not hold.',
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
      name: 'issuer',
      type: 'text',
      defaultValue: 'APCF',
    },
    {
      name: 'apcfLogo',
      label: 'APCF logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
      admin: {
        description: 'What the certification / CPD credits are. Conservative wording (CLAUDE.md §9 R2).',
      },
    },
    {
      name: 'process',
      type: 'array',
      localized: true,
      labels: { singular: 'Step', plural: 'Steps' },
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
    {
      name: 'certificateSample',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
