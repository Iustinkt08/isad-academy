import { timingSafeEqual } from 'node:crypto'
import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { migrations } from './migrations'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { ro } from '@payloadcms/translations/languages/ro'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { BlogPosts } from './collections/BlogPosts'
import { CourseSessions } from './collections/CourseSessions'
import { Courses } from './collections/Courses'
import { DiscountCodes } from './collections/DiscountCodes'
import { EventEmails } from './collections/EventEmails'
import { EventPopups } from './collections/EventPopups'
import { EventRegistrations } from './collections/EventRegistrations'
import { FaqItems } from './collections/FaqItems'
import { Leads } from './collections/Leads'
import { LegalPages } from './collections/LegalPages'
import { Media } from './collections/Media'
import { Newsletters } from './collections/Newsletters'
import { Orders } from './collections/Orders'
import { Reviews } from './collections/Reviews'
import { Users } from './collections/Users'
import { ExpertBio } from './globals/ExpertBio'
import { Homepage } from './globals/Homepage'
import { SiteSettings } from './globals/SiteSettings'
import { payloadMailerAdapter } from './lib/email/payloadAdapter'
import { sendReviewRequests } from './lib/reviews/sendReviewRequests'
import { lexicalToPlainText } from './lib/richtext/plainText'

/** Truncate plain text to a meta-description-friendly length. */
const truncateForMeta = (text: string, maxLength = 155): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** URL-ul public canonic — pinează whitelist-ul CSRF/CORS al Payload la origine-a proprie,
 * ca o cerere cross-origin cu cookie de admin să nu poată acționa asupra API-ului. */
const SERVER_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || undefined
const ORIGIN_ALLOWLIST = SERVER_URL ? [SERVER_URL] : []

export default buildConfig({
  ...(SERVER_URL ? { serverURL: SERVER_URL } : {}),
  // CSRF + CORS restrânse la propria origine (securitate: A01/A05). GraphQL e dezactivat —
  // nu-l folosim nicăieri, iar endpoint-ul lui ocolea validarea rutelor întărite.
  csrf: ORIGIN_ALLOWLIST,
  cors: ORIGIN_ALLOWLIST,
  graphQL: { disable: true },
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
      // Quick actions + status cards above the native dashboard (server component,
      // queries via Local API) — src/components/admin/AdminDashboard.tsx.
      beforeDashboard: ['/components/admin/AdminDashboard#AdminDashboard'],
      // Brand lockup at the top of the nav sidebar (owner request) —
      // src/components/admin/NavLogo.tsx.
      beforeNavLinks: ['/components/admin/NavLogo#NavLogo'],
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
        forgot: { Component: '/components/admin/views/ForgotPasswordView#ForgotPasswordView' },
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
    BlogPosts,
    FaqItems,
    Leads,
    LegalPages,
    Newsletters,
    EventPopups,
    EventRegistrations,
    EventEmails,
  ],
  globals: [SiteSettings, Homepage, ExpertBio],
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
  // Payload's own account emails (admin password reset) go through the project Mailer —
  // Brevo when BREVO_API_KEY is set, console/noop otherwise. See lib/email/payloadAdapter.
  email: payloadMailerAdapter,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    // Producție (owner 2026-07-26): migrațiile din src/migrations rulează AUTOMAT la
    // pornirea aplicației, DOAR când RUN_MIGRATIONS=true (setat în env-ul aplicației de
    // pe cPanel). Gate-ul e necesar pentru că `next build` rulează tot cu
    // NODE_ENV=production — fără el, workerii de build ar aplica migrațiile concurent
    // peste DB-ul local (lock-uri + timeout la generarea paginilor statice).
    // În dev rămâne push-ul drizzle; migrații noi: `npx payload migrate:create <nume>`.
    prodMigrations: process.env.RUN_MIGRATIONS === 'true' ? migrations : undefined,
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
})
