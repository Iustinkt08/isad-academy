import type { Dictionary } from '../i18n/dictionaries'

/**
 * Corporate page content + form-field configuration (owner 2026-08-12: the /corporate
 * page and its lead form become editable through the `corporatePage` global).
 *
 * Single source of truth for BOTH sides of the dynamic form:
 *   - the frontend (`/corporate` page → `CorporateLeadForm`) renders exactly the fields
 *     resolved here, and
 *   - the server (`createLead`) validates a submission against the SAME resolution, so
 *     a payload can never smuggle answers the admin-configured form does not contain.
 *
 * The form's core trio (company name, contact person, e-mail) is intentionally NOT part
 * of this config — leads and the notification e-mail depend on those columns, so they
 * are fixed and always required. Everything after them is configurable; when the global
 * has no rows, `defaultCorporateFormFields` reproduces the original form from the
 * dictionary (bilingual via the locale-aware dict), so an untouched global changes
 * nothing on the site.
 */

export const CORPORATE_FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'textarea',
  'select',
  'courseTopic',
  'period',
] as const

export type CorporateFieldType = (typeof CORPORATE_FIELD_TYPES)[number]

export type CorporateFormField = {
  /** Stable identifier — the Payload array-row id, or a `default-*` key for fallbacks. */
  id: string
  label: string
  fieldType: CorporateFieldType
  required: boolean
  /** Only meaningful for `fieldType: 'select'`. */
  options: string[]
}

/** Fully resolved /corporate view model — every string already fell back to the dict. */
export type CorporateContent = {
  hero: {
    pill: string
    titleTop: string
    titleBottomPrefix: string
    titleBottomHighlight: string
    subtitle: string
    ctaPrimary: string
    ctaSecondary: string
  }
  benefits: {
    titlePlain: string
    titleHighlight: string
    items: Array<{ title: string; text: string }>
    idealFor: string
    industries: string[]
  }
  form: {
    title: string
    subtitle: string
    fields: CorporateFormField[]
  }
  aside: {
    nextTitle: string
    steps: string[]
    talkTitle: string
    talkNote: string
  }
}

/** Structural shape of the `corporatePage` global — kept loose on purpose so this module
 * works with the raw Local API result without depending on generated payload-types. */
type CorporatePageLike = {
  hero?: Partial<Record<keyof CorporateContent['hero'], string | null>> | null
  benefits?: {
    titlePlain?: string | null
    titleHighlight?: string | null
    items?: Array<{ title?: string | null; text?: string | null }> | null
    idealFor?: string | null
    industries?: Array<{ name?: string | null }> | null
  } | null
  form?: {
    title?: string | null
    subtitle?: string | null
    fields?: Array<{
      id?: string | number | null
      label?: string | null
      fieldType?: string | null
      required?: boolean | null
      options?: Array<{ option?: string | null }> | null
    }> | null
  } | null
  aside?: {
    nextTitle?: string | null
    steps?: Array<{ text?: string | null }> | null
    talkTitle?: string | null
    talkNote?: string | null
  } | null
} | null

const pick = (value: string | null | undefined, fallback: string): string => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

/** The original form, rebuilt from the dictionary — used while the global has no rows.
 * Ids are stable literals so client render and server validation always agree. */
export const defaultCorporateFormFields = (dict: Dictionary): CorporateFormField[] => {
  const f = dict.corporate.form
  return [
    { id: 'default-phone', label: f.phoneLabel, fieldType: 'phone', required: false, options: [] },
    {
      id: 'default-participants',
      label: f.participantsPlaceholder,
      fieldType: 'text',
      required: false,
      options: [],
    },
    {
      id: 'default-topic',
      label: f.topicPlaceholder,
      fieldType: 'courseTopic',
      required: true,
      options: [],
    },
    { id: 'default-period', label: f.periodLegend, fieldType: 'period', required: false, options: [] },
    {
      id: 'default-message',
      label: f.messageLabel,
      fieldType: 'textarea',
      required: false,
      options: [],
    },
  ]
}

const isFieldType = (value: unknown): value is CorporateFieldType =>
  typeof value === 'string' && (CORPORATE_FIELD_TYPES as readonly string[]).includes(value)

/** Global rows → normalized fields; empty/malformed rows are dropped, an empty list
 * falls back to the dictionary defaults. */
export const resolveCorporateFormFields = (
  global: CorporatePageLike,
  dict: Dictionary,
): CorporateFormField[] => {
  const rows = global?.form?.fields
  if (!Array.isArray(rows) || rows.length === 0) return defaultCorporateFormFields(dict)

  const fields = rows.flatMap((row, index): CorporateFormField[] => {
    const label = row?.label?.trim()
    if (!label) return []
    const fieldType = isFieldType(row?.fieldType) ? row.fieldType : 'text'
    const options =
      fieldType === 'select'
        ? (row?.options ?? [])
            .map((item) => item?.option?.trim() ?? '')
            .filter((option) => option.length > 0)
        : []
    // A dropdown without options cannot be answered — render it as plain text instead.
    return [
      {
        id: String(row?.id ?? `row-${index}`),
        label,
        fieldType: fieldType === 'select' && options.length === 0 ? 'text' : fieldType,
        required: Boolean(row?.required),
        options,
      },
    ]
  })

  return fields.length > 0 ? fields : defaultCorporateFormFields(dict)
}

/** Whole-page view model with per-field dictionary fallback (CLAUDE.md §15 — no lorem). */
export const resolveCorporateContent = (
  global: CorporatePageLike,
  dict: Dictionary,
): CorporateContent => {
  const t = dict.corporate

  const items = (global?.benefits?.items ?? [])
    .map((item) => ({ title: item?.title?.trim() ?? '', text: item?.text?.trim() ?? '' }))
    .filter((item) => item.title.length > 0)
  const industries = (global?.benefits?.industries ?? [])
    .map((row) => row?.name?.trim() ?? '')
    .filter((name) => name.length > 0)
  const steps = (global?.aside?.steps ?? [])
    .map((row) => row?.text?.trim() ?? '')
    .filter((text) => text.length > 0)

  return {
    hero: {
      pill: pick(global?.hero?.pill, t.hero.pill),
      titleTop: pick(global?.hero?.titleTop, t.hero.titleTop),
      titleBottomPrefix: pick(global?.hero?.titleBottomPrefix, t.hero.titleBottomPrefix),
      titleBottomHighlight: pick(global?.hero?.titleBottomHighlight, t.hero.titleBottomHighlight),
      subtitle: pick(global?.hero?.subtitle, t.hero.subtitle),
      ctaPrimary: pick(global?.hero?.ctaPrimary, t.hero.ctaPrimary),
      ctaSecondary: pick(global?.hero?.ctaSecondary, t.hero.ctaSecondary),
    },
    benefits: {
      titlePlain: pick(global?.benefits?.titlePlain, t.benefits.titlePlain),
      titleHighlight: pick(global?.benefits?.titleHighlight, t.benefits.titleHighlight),
      items: items.length > 0 ? items : t.benefits.items,
      idealFor: pick(global?.benefits?.idealFor, t.benefits.idealFor),
      industries: industries.length > 0 ? industries : [...t.benefits.industries],
    },
    form: {
      title: pick(global?.form?.title, t.form.title),
      subtitle: pick(global?.form?.subtitle, t.form.subtitle),
      fields: resolveCorporateFormFields(global, dict),
    },
    aside: {
      nextTitle: pick(global?.aside?.nextTitle, t.aside.nextTitle),
      steps: steps.length > 0 ? steps : [...t.aside.steps],
      talkTitle: pick(global?.aside?.talkTitle, t.aside.talkTitle),
      talkNote: pick(global?.aside?.talkNote, t.aside.talkNote),
    },
  }
}
