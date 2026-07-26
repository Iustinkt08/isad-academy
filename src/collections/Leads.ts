import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { sendLeadNotificationEmail } from '../lib/email/hooks'

/**
 * Contact + Corporate form submissions (CLAUDE.md §4, §6) — dual purpose: email
 * notification (T7) and an admin-reviewable dashboard. Public creation is open (anonymous
 * visitors submit these forms); every other operation is admin-only.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    group: 'Sales',
    defaultColumns: ['type', 'name', 'email', 'createdAt'],
    description: 'Contact + Corporate form submissions. Public create only — read/update/delete are admin-only.',
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdmin,
    create: () => true,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Contact', value: 'contact' },
        { label: 'Corporate', value: 'corporate' },
      ],
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'message',
      type: 'textarea',
    },
    // --- Contact-only ---
    {
      name: 'subject',
      type: 'select',
      admin: {
        description: 'Contact form only.',
        condition: (_, siblingData) => siblingData?.type === 'contact',
      },
      options: [
        { label: 'Course', value: 'course' },
        { label: 'Corporate', value: 'corporate' },
        { label: 'Certification', value: 'certification' },
        { label: 'Other', value: 'other' },
      ],
    },
    // --- Corporate-only ---
    {
      name: 'companyName',
      type: 'text',
      admin: {
        description: 'Corporate form only.',
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
    },
    {
      name: 'contactPerson',
      type: 'text',
      admin: {
        description: 'Corporate form only.',
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
    },
    {
      name: 'participantsRange',
      type: 'text',
      admin: {
        description: 'Corporate form only — free-text range, e.g. "10-20".',
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
    },
    {
      name: 'topicCourse',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: false,
      admin: {
        description: 'Corporate form only — pick an existing catalog course as the requested topic.',
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
    },
    {
      name: 'topicOther',
      type: 'text',
      admin: {
        description: 'Corporate form only — free-text topic when it is not one of the catalog courses.',
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
    },
    {
      name: 'preferredPeriod',
      type: 'group',
      admin: {
        description: 'Corporate form only — preferred delivery window.',
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
      fields: [
        { name: 'from', type: 'date' },
        { name: 'to', type: 'date' },
      ],
    },
  ],
  // T7: single-destination email notification on every NEW lead (`siteSettings.contact.email`;
  // skipped gracefully — logged, never blocking — when unset). See
  // src/lib/email/hooks/sendLeadNotificationEmail.ts.
  hooks: {
    afterChange: [sendLeadNotificationEmail],
  },
}
