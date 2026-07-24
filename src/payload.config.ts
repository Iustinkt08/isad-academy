import { timingSafeEqual } from 'node:crypto'
import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { ro } from '@payloadcms/translations/languages/ro'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { BlogPosts } from './collections/BlogPosts'
import { CorporateClients } from './collections/CorporateClients'
import { CourseSessions } from './collections/CourseSessions'
import { Courses } from './collections/Courses'
import { DiscountCodes } from './collections/DiscountCodes'
import { FaqItems } from './collections/FaqItems'
import { Leads } from './collections/Leads'
import { LegalPages } from './collections/LegalPages'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Partners } from './collections/Partners'
import { Reviews } from './collections/Reviews'
import { Users } from './collections/Users'
import { CertificationInfo } from './globals/CertificationInfo'
import { ExpertBio } from './globals/ExpertBio'
import { Homepage } from './globals/Homepage'
import { SiteSettings } from './globals/SiteSettings'
import { sendReviewRequests } from './lib/reviews/sendReviewRequests'
import { lexicalToPlainText } from './lib/richtext/plainText'

/** Truncate plain text to a meta-description-friendly length. */
const truncateForMeta = (text: string, maxLength = 155): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // Bilingual content (owner decision 2026-07-13): every content field carries EN + RO.
  // EN is canonical; `fallback: true` shows EN wherever an RO translation is missing.
  localization: {
    locales: [
      { label: 'English', code: 'en' },
      { label: 'Română', code: 'ro' },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  // Admin UI language options (per-user, from the account menu) — Romanian for Silviu.
  i18n: {
    supportedLanguages: { en, ro },
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // Brand overlay (admin stays Payload-native — §3.5): graphics + meta here,
    // fonts/radii/accent in src/app/(payload)/custom.scss. Brand name always lowercase.
    meta: {
      titleSuffix: '· isad.academy',
      description: 'isad.academy dashboard — courses, editions, orders & content.',
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/brand/icon-gradient.svg' }],
    },
    components: {
      graphics: {
        Logo: '/components/admin/Logo#Logo',
        Icon: '/components/admin/Icon#Icon',
      },
      // Custom auth screens (Figma 3768:18 / 3770:18) — full view overrides, so the
      // old beforeLogin DOM-patcher (LoginEnhancer) is gone. Both render inside
      // Payload's MinimalTemplate; admin.css unwraps its 480px frame for them.
      views: {
        login: { Component: '/components/admin/views/LoginView#LoginView' },
        createFirstUser: {
          Component: '/components/admin/views/CreateFirstUserView#CreateFirstUserView',
        },
      },
    },
  },
  // Collections are added per task slice (T2: commerce, T3: content).
  collections: [
    Users,
    Media,
    Courses,
    CourseSessions,
    Orders,
    DiscountCodes,
    Reviews,
    Partners,
    CorporateClients,
    BlogPosts,
    FaqItems,
    Leads,
    LegalPages,
  ],
  globals: [SiteSettings, Homepage, ExpertBio, CertificationInfo],
  // T14 (CLAUDE.md §7 + docs/PLAN.md locked SEO decision): per-page meta/OG via
  // @payloadcms/plugin-seo. Fields live at `meta.*` (meta.title / meta.description /
  // meta.image), grouped into an "SEO" tab (`tabbedUI`). The frontend `generateMetadata`
  // functions PREFER `meta.*` and fall back to the content fields (title/excerpt/
  // description/coverImage/banner) when the editor left them empty.
  plugins: [
    seoPlugin({
      collections: ['courses', 'blogPosts'],
      uploadsCollection: 'media',
      tabbedUI: true,
      // Meta title/description are content → localized like the fields they describe.
      fields: ({ defaultFields }) =>
        defaultFields.map((field) =>
          'name' in field && (field.name === 'title' || field.name === 'description')
            ? { ...field, localized: true }
            : field,
        ),
      generateTitle: ({ doc }) => {
        const title = typeof doc?.title === 'string' ? doc.title.trim() : ''
        return title ? `${title} | isad.academy` : 'isad.academy'
      },
      generateDescription: ({ doc }) => {
        // blogPosts have a plain-text `excerpt`; courses have a rich-text `description`.
        // Blog bodies are the last resort so "Generate" never returns an empty string
        // while any usable copy exists.
        const excerpt = typeof doc?.excerpt === 'string' ? doc.excerpt.trim() : ''
        if (excerpt) return truncateForMeta(excerpt)
        return truncateForMeta(lexicalToPlainText(doc?.description ?? doc?.body))
      },
    }),
  ],
  editor: lexicalEditor(),
  // T13 (CLAUDE.md §10; docs/PLAN.md locked cron decision): `jobs.autoRun` is a long-running
  // in-process poller and does NOT fire on serverless platforms like Vercel — instead, Vercel
  // Cron (vercel.json) hits Payload's own `/api/payload-jobs/handle-schedules` (queues any due
  // scheduled task, per `tasks[].schedule` below) and `/api/payload-jobs/run` (drains the
  // queue) once a day. Both endpoints are gated by `jobs.access.run`: only requests carrying
  // `Authorization: Bearer <CRON_SECRET>` are let through — Vercel Cron automatically attaches
  // that header to its own requests once `CRON_SECRET` is set as a project env var. When
  // `CRON_SECRET` is unset (local dev), the endpoints fall back to admin-only (matches
  // `isAdmin`) rather than becoming a wide-open trigger.
  jobs: {
    access: {
      run: ({ req }) => {
        const secret = process.env.CRON_SECRET
        if (!secret) return Boolean(req.user)
        // Constant-time comparison (T16): `timingSafeEqual` requires equal-length buffers,
        // so length is checked first — a length mismatch alone already means "wrong secret"
        // and leaks nothing beyond what the response status does anyway.
        const provided = Buffer.from(req.headers.get('authorization') ?? '')
        const expected = Buffer.from(`Bearer ${secret}`)
        return provided.length === expected.length && timingSafeEqual(provided, expected)
      },
    },
    tasks: [
      {
        slug: 'sendReviewRequests',
        label: 'Send post-session review-request emails',
        inputSchema: [],
        outputSchema: [
          { name: 'sessionsProcessed', type: 'number' },
          { name: 'emailsSent', type: 'number' },
          { name: 'emailsFailed', type: 'number' },
        ],
        // Once daily, at 08:00 UTC, on the dedicated `nightly` queue — vercel.json schedules
        // `handle-schedules` a few minutes ahead of `run` so this task is actually queued
        // before `run` tries to drain it.
        schedule: [{ cron: '0 8 * * *', queue: 'nightly' }],
        handler: async ({ req }) => {
          const summary = await sendReviewRequests({ payload: req.payload })
          return { output: summary }
        },
      },
    ],
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
})
