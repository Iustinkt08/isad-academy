import { BlocksFeature, lexicalEditor, TextStateFeature } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'
import { publicOrPublished } from '../access/publicOrPublished'
import { leadMagnetFields } from '../fields/leadMagnet'
import { downloadableResourceBlock, linkChipBlock } from '../fields/richTextBlocks'
import { slugField } from '../fields/slug'
import { broadcastNewPostOnPublish } from '../lib/email/hooks'
import { computeReadingTimeMinutes } from '../lib/richtext/plainText'
import { TEXT_STATE_PRESETS } from '../lib/richtext/textState'

/**
 * Blog articles (CLAUDE.md §4, §6, §10). Drafts + published via `versions.drafts` (same
 * pattern as `courses`). `body` extends the default Lexical feature set (headings, lists,
 * blockquotes, links, in-text upload images) with the locked T12 extras:
 *   - `TextStateFeature` — palette-named text colors (content stores keys, never hexes);
 *   - `BlocksFeature` — `linkChip` (pill external link, NEVER a video embed) and
 *     `downloadableResource` (inline download card) custom blocks.
 * Admin "Preview" opens `/next/preview?slug=…`, which authenticates the admin, enables Next
 * draft mode and lands on `/blog/[slug]` — public draft URLs stay 404. No comments, no
 * `seo` group yet (T14 plugin-seo).
 */
export const BlogPosts: CollectionConfig = {
  slug: 'blogPosts',
  admin: {
    useAsTitle: 'title',
    group: { en: 'Content', ro: 'Conținut' },
    defaultColumns: ['title', '_status', 'createdAt'],
    listSearchableFields: ['title'],
    description: {
      en: 'Blog articles shown on the Blog page. The rich text editor supports named brand colors, link chips (pill-style external links) and downloadable resources. The first publish of an article can also email newsletter subscribers.',
      ro: 'Articolele de blog afișate pe pagina Blog. Editorul de text suportă culori de brand predefinite, link chips (linkuri externe în formă de pastilă) și resurse descărcabile. Prima publicare a unui articol poate trimite și un email abonaților la newsletter.',
    },
    preview: (doc) => {
      const slug = typeof doc?.slug === 'string' && doc.slug.length > 0 ? doc.slug : null
      if (!slug) return null
      const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '')
      return `${base}/next/preview?slug=${encodeURIComponent(slug)}`
    },
  },
  versions: {
    drafts: true,
  },
  access: {
    read: publicOrPublished,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    slugField('title'),
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: {
          en: 'Cover image shown on the blog list card and at the top of the article. Optional: articles can be published without one and the layout adapts.',
          ro: 'Imaginea de copertă afișată pe cardul din lista de blog și în partea de sus a articolului. Opțională: articolele pot fi publicate și fără imagine, iar aspectul se adaptează.',
        },
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          // Named palette colors/highlights — see src/lib/richtext/textState.ts (single
          // source of truth shared with the frontend renderer).
          TextStateFeature({ state: TEXT_STATE_PRESETS }),
          // Link chips + downloadable resources (docs/PLAN.md locked decision). NO
          // video-embed feature — CLAUDE.md §4 explicitly rules embeds out.
          BlocksFeature({ blocks: [linkChipBlock, downloadableResourceBlock] }),
        ],
      }),
      admin: {
        description: {
          en: 'Article body shown on the article page. Supports colored text, blockquotes, images inside the text, link chips (pill-style external links) and downloadable resources.',
          ro: 'Conținutul articolului afișat pe pagina acestuia. Suportă text colorat, citate evidențiate, imagini în text, link chips (linkuri externe tip pastilă) și resurse descărcabile.',
        },
      },
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'Dr. Silviu Gresoi',
      admin: {
        description: {
          en: 'Author name shown under the article title. Pre-filled with Dr. Silviu Gresoi and editable per article.',
          ro: 'Numele autorului afișat sub titlul articolului. Precompletat cu Dr. Silviu Gresoi și editabil pentru fiecare articol.',
        },
      },
    },
    {
      name: 'category',
      type: 'select',
      admin: {
        description: {
          en: 'Reserved for future filtering of the blog list. The category is stored now, but the site shows no filter at launch.',
          ro: 'Rezervat pentru filtrarea viitoare a listei de blog. Categoria se salvează de pe acum, dar site-ul nu afișează încă niciun filtru la lansare.',
        },
      },
      options: [
        { label: { en: 'AI Governance', ro: 'Guvernanță AI' }, value: 'aiGovernance' },
        { label: { en: 'Anti-Fraud', ro: 'Antifraudă' }, value: 'antiFraud' },
        { label: { en: 'Risk Management', ro: 'Managementul riscului' }, value: 'riskManagement' },
        { label: { en: 'Other', ro: 'Altele' }, value: 'other' },
      ],
    },
    {
      name: 'readingTime',
      type: 'number',
      localized: true,
      min: 0,
      admin: {
        description: {
          en: 'Reading time in minutes, shown on the blog card and on the article page. Leave empty to estimate it automatically from the body at about 200 words per minute; a value entered by hand always takes priority.',
          ro: 'Timpul de citire în minute, afișat pe cardul de blog și pe pagina articolului. Lăsați gol pentru o estimare automată din conținut, la aproximativ 200 de cuvinte pe minut; o valoare introdusă manual are întotdeauna prioritate.',
        },
      },
    },
    {
      name: 'leadMagnet',
      label: { en: 'Lead magnet', ro: 'Lead magnet' },
      type: 'group',
      admin: {
        description: {
          en: 'When enabled, the article shows an email form that delivers the attached file to the reader after they submit their address.',
          ro: 'Când este activat, articolul afișează un formular de email care livrează cititorului fișierul atașat după ce își introduce adresa.',
        },
      },
      fields: leadMagnetFields(),
    },
    {
      name: 'relatedCourse',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: false,
      admin: {
        description: {
          en: 'Links this article to a course. When set, a callout for that course appears at the end of the article; when empty, no callout is shown.',
          ro: 'Leagă articolul de un curs. Când este setat, la finalul articolului apare o recomandare către acel curs; când este gol, recomandarea nu se afișează.',
        },
      },
    },
    {
      name: 'sendNewsletterOnPublish',
      label: { en: 'Send newsletter on publish', ro: 'Trimite newsletter la publicare' },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: {
          en: 'Uncheck to publish WITHOUT emailing subscribers. Only the first publish can trigger the newsletter broadcast, and it is sent at most once. Publishing while unchecked keeps that one send available: unpublish, tick the box and publish again to send it later.',
          ro: 'Debifați pentru a publica FĂRĂ a trimite email abonaților. Doar prima publicare poate declanșa trimiterea newsletterului, și se trimite cel mult o dată. Dacă publicați cu bifa scoasă, trimiterea rămâne disponibilă: retrageți articolul, bifați căsuța și publicați din nou pentru a o trimite mai târziu.',
        },
      },
    },
    {
      name: 'broadcastSentAt',
      type: 'date',
      admin: {
        hidden: true,
        description: {
          en: 'Set automatically once the first-publish newsletter broadcast has been attempted. Prevents the broadcast from being sent again on later saves or re-publishes. Do not edit by hand.',
          ro: 'Se setează automat după prima încercare de trimitere a newsletterului de la publicare. Împiedică retrimiterea anunțului la salvările sau republicările ulterioare. Nu se editează manual.',
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      // Auto reading time (CLAUDE.md §4 `readingTime` "auto sau manual"): only fills the
      // field when the editor left it EMPTY — a manual value (including one entered on a
      // later edit) is never overwritten. Recomputed on every save while empty, so body
      // edits keep the estimate honest. `data.body ?? originalDoc.body` covers partial
      // updates that don't resend the body.
      async ({ data, originalDoc }) => {
        if (data && data.readingTime == null) {
          const body = data.body ?? (originalDoc as { body?: unknown } | undefined)?.body
          const minutes = computeReadingTimeMinutes(body)
          if (minutes != null) data.readingTime = minutes
        }
        return data
      },
    ],
    // T7: first-publish (draft/unpublished -> published, exactly once) newsletter broadcast —
    // see src/lib/email/hooks/broadcastNewPostOnPublish.ts for the exactly-once mechanics
    // (`broadcastSentAt` + a `context.skipBroadcastHook` re-entrancy guard).
    afterChange: [broadcastNewPostOnPublish, revalidateSiteHook],
    afterDelete: [revalidateSiteHook],
  },
}
