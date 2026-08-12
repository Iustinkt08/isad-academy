import 'dotenv/config'

// Seed convention (2026-08): NO real e-mails from seeds — neutralize Brevo before any
// import that could construct a mailer. corporatePage only revalidates on save, but the
// guard stays as a belt-and-braces rule for every seed script.
process.env.BREVO_API_KEY = ''

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { getDictionary } from '../src/lib/i18n/dictionaries'

/**
 * Owner 2026-08-12: pre-fill the `corporatePage` global with the CURRENT site copy
 * (EN + RO, straight from src/lib/i18n/dictionaries.ts) so the dashboard starts from
 * the live content instead of empty fields — including the five default form fields
 * (phone, participants, topic, preferred period, message), which become editable rows.
 *
 * Idempotent: overwrites the global's content on every run.
 * Run with: `npx tsx scripts/seed-corporate-page.ts`
 */

const en = getDictionary('en').corporate
const ro = getDictionary('ro').corporate

/** The five built-in form fields, as global rows (mirrors defaultCorporateFormFields). */
const FORM_FIELDS = [
  { fieldType: 'phone' as const, required: false, en: en.form.phoneLabel, ro: ro.form.phoneLabel },
  {
    fieldType: 'text' as const,
    required: false,
    en: en.form.participantsPlaceholder,
    ro: ro.form.participantsPlaceholder,
  },
  {
    fieldType: 'courseTopic' as const,
    required: true,
    en: en.form.topicPlaceholder,
    ro: ro.form.topicPlaceholder,
  },
  { fieldType: 'period' as const, required: false, en: en.form.periodLegend, ro: ro.form.periodLegend },
  {
    fieldType: 'textarea' as const,
    required: false,
    en: en.form.messageLabel,
    ro: ro.form.messageLabel,
  },
]

async function main() {
  const payload = await getPayload({ config })

  // EN first — creates the array rows and their ids.
  const seeded = await payload.updateGlobal({
    slug: 'corporatePage',
    overrideAccess: true,
    locale: 'en',
    data: {
      hero: {
        pill: en.hero.pill,
        titleTop: en.hero.titleTop,
        titleBottomPrefix: en.hero.titleBottomPrefix,
        titleBottomHighlight: en.hero.titleBottomHighlight,
        subtitle: en.hero.subtitle,
        ctaPrimary: en.hero.ctaPrimary,
        ctaSecondary: en.hero.ctaSecondary,
      },
      benefits: {
        titlePlain: en.benefits.titlePlain,
        titleHighlight: en.benefits.titleHighlight,
        items: en.benefits.items.map((item) => ({ title: item.title, text: item.text })),
        idealFor: en.benefits.idealFor,
        industries: en.benefits.industries.map((name) => ({ name })),
      },
      form: {
        title: en.form.title,
        subtitle: en.form.subtitle,
        fields: FORM_FIELDS.map((field) => ({
          label: field.en,
          fieldType: field.fieldType,
          required: field.required,
        })),
      },
      aside: {
        nextTitle: en.aside.nextTitle,
        steps: en.aside.steps.map((text) => ({ text })),
        talkTitle: en.aside.talkTitle,
        talkNote: en.aside.talkNote,
      },
    },
  })

  // RO second — SAME rows (matched by id) so the localized labels attach to them.
  const rowIds = {
    items: (seeded.benefits?.items ?? []).map((row) => row.id),
    industries: (seeded.benefits?.industries ?? []).map((row) => row.id),
    fields: (seeded.form?.fields ?? []).map((row) => row.id),
    steps: (seeded.aside?.steps ?? []).map((row) => row.id),
  }

  await payload.updateGlobal({
    slug: 'corporatePage',
    overrideAccess: true,
    locale: 'ro',
    data: {
      hero: {
        pill: ro.hero.pill,
        titleTop: ro.hero.titleTop,
        titleBottomPrefix: ro.hero.titleBottomPrefix,
        titleBottomHighlight: ro.hero.titleBottomHighlight,
        subtitle: ro.hero.subtitle,
        ctaPrimary: ro.hero.ctaPrimary,
        ctaSecondary: ro.hero.ctaSecondary,
      },
      benefits: {
        titlePlain: ro.benefits.titlePlain,
        titleHighlight: ro.benefits.titleHighlight,
        items: ro.benefits.items.map((item, index) => ({
          id: rowIds.items[index],
          title: item.title,
          text: item.text,
        })),
        idealFor: ro.benefits.idealFor,
        industries: ro.benefits.industries.map((name, index) => ({
          id: rowIds.industries[index],
          name,
        })),
      },
      form: {
        title: ro.form.title,
        subtitle: ro.form.subtitle,
        fields: FORM_FIELDS.map((field, index) => ({
          id: rowIds.fields[index],
          label: field.ro,
          fieldType: field.fieldType,
          required: field.required,
        })),
      },
      aside: {
        nextTitle: ro.aside.nextTitle,
        steps: ro.aside.steps.map((text, index) => ({ id: rowIds.steps[index], text })),
        talkTitle: ro.aside.talkTitle,
        talkNote: ro.aside.talkNote,
      },
    },
  })

  console.log('corporatePage global seeded (EN + RO), including the 5 default form fields.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
