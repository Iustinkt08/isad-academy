import type { GlobalConfig } from 'payload'

import { hiddenFromEditors, isAdminRole } from '../access/isAdminRole'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Site-wide config for the business decisions still TBD from Silviu (CLAUDE.md §13) —
 * config-driven so nothing is hardcoded. Defaults match the locked interim values in
 * docs/PLAN.md: EUR, VAT-inclusive display, both price windows shown, "stackAll" pricing.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  admin: {
    group: { en: 'Site', ro: 'Site' },
    description: {
      en: 'Site-wide configuration: currency, price window display, discount stacking policy, legal entity details, contact info and analytics IDs.',
      ro: 'Configurarea generală a site-ului: moneda, afișarea ferestrelor de preț, politica de cumulare a reducerilor, datele entității juridice, informațiile de contact și ID-urile de analytics.',
    },
    // Business config is admin-only — editors manage content, not commercial settings.
    hidden: hiddenFromEditors,
  },
  access: {
    read: () => true,
    update: isAdminRole,
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
        description: {
          en: 'The "X seats left" badge on a course edition appears only when the remaining seats drop below this number. Set 0 to never show it.',
          ro: 'Eticheta "X seats left" de pe o ediție de curs apare doar când locurile rămase scad sub acest număr. Setează 0 ca să nu apară niciodată.',
        },
      },
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'EUR',
      options: [
        { label: { en: 'EUR', ro: 'EUR' }, value: 'EUR' },
        { label: { en: 'RON', ro: 'RON' }, value: 'RON' },
      ],
      admin: {
        description: {
          en: 'The site-wide currency setting used when displaying course prices. Default: EUR.',
          ro: 'Setarea de monedă folosită la afișarea prețurilor cursurilor pe site. Valoare implicită: EUR.',
        },
      },
    },
    {
      name: 'vatDisplay',
      type: 'select',
      defaultValue: 'incl',
      options: [
        { label: { en: 'VAT included', ro: 'Cu TVA inclus' }, value: 'incl' },
        { label: { en: 'VAT excluded', ro: 'Fără TVA' }, value: 'excl' },
      ],
      admin: {
        description: {
          en: 'Whether prices across the site are presented as VAT included or VAT excluded. Default: VAT included.',
          ro: 'Dacă prețurile de pe site sunt prezentate cu TVA inclus sau fără TVA. Valoare implicită: cu TVA inclus.',
        },
      },
    },
    {
      name: 'earlyBirdDisplay',
      type: 'select',
      defaultValue: 'bothWindows',
      options: [
        { label: { en: 'Show both windows', ro: 'Afișează ambele ferestre' }, value: 'bothWindows' },
        { label: { en: 'Show active window only', ro: 'Afișează doar fereastra activă' }, value: 'activeOnly' },
      ],
      admin: {
        description: {
          en: 'Controls the price block on the course page: show both the Early Bird and Standard price windows, or only the one currently active. Default: show both windows.',
          ro: 'Controlează blocul de preț de pe pagina cursului: afișează ambele ferestre de preț, Early Bird și Standard, sau doar pe cea activă în prezent. Valoare implicită: ambele ferestre.',
        },
      },
    },
    {
      name: 'stackingPolicy',
      type: 'select',
      defaultValue: 'stackAll',
      options: [
        { label: { en: 'Stack all discounts', ro: 'Cumulează toate reducerile' }, value: 'stackAll' },
        { label: { en: 'Best discount only', ro: 'Doar cea mai mare reducere' }, value: 'bestOf' },
        {
          label: {
            en: 'Group + member stack, code exclusive',
            ro: 'Grup + membru se cumulează, codul este exclusiv',
          },
          value: 'groupMemberStack_codeExclusive',
        },
      ],
      admin: {
        description: {
          en: 'How the group, member and discount-code reductions combine at checkout. All three strategies are implemented; this setting only selects which one applies. Changing it affects every new order immediately. Default: stack all discounts.',
          ro: 'Cum se combină la checkout reducerile de grup, de membru și cele din coduri. Toate cele trei strategii sunt implementate; setarea alege doar care dintre ele se aplică. Schimbarea ei afectează imediat fiecare comandă nouă. Valoare implicită: cumularea tuturor reducerilor.',
        },
      },
    },
    // `memberDiscountPercent` removed 2026-08-08 (owner): member pricing is retired in
    // favour of discount codes (up to two stack at checkout). The pricing engine keeps
    // its member branch dormant at 0%.
    {
      name: 'legalEntity',
      type: 'group',
      admin: {
        description: {
          en: 'Legal entity details shown in the site footer and used on invoices: company name, CUI, address and the ANPC dispute-resolution links. The footer simply omits whatever is left empty.',
          ro: 'Datele entității juridice afișate în footerul site-ului și folosite pe facturi: denumirea firmei, CUI-ul, adresa și linkurile ANPC pentru soluționarea litigiilor. Footerul omite pur și simplu ce rămâne necompletat.',
        },
      },
      fields: [
        { name: 'name', type: 'text' },
        { name: 'cui', type: 'text', label: { en: 'CUI', ro: 'CUI' } },
        { name: 'address', type: 'text' },
        { name: 'anpcUrl', type: 'text', label: { en: 'ANPC URL', ro: 'URL ANPC' } },
        { name: 'solUrl', type: 'text', label: { en: 'SOL URL', ro: 'URL SOL' } },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'linkedin', type: 'text', label: { en: 'LinkedIn URL', ro: 'URL LinkedIn' } },
      ],
    },
    {
      name: 'analytics',
      type: 'group',
      admin: {
        description: {
          en: 'Optional overrides for the GA4 and GTM IDs configured through environment variables. The scripts load lazily and only after cookie consent, so filling these in never affects visitors who declined.',
          ro: 'Suprascrieri opționale pentru ID-urile GA4 și GTM configurate prin variabilele de mediu. Scripturile se încarcă lent și doar după consimțământul pentru cookies, deci completarea lor nu afectează vizitatorii care au refuzat.',
        },
      },
      fields: [
        { name: 'ga4Id', type: 'text', label: { en: 'GA4 Measurement ID', ro: 'ID de măsurare GA4' } },
        { name: 'gtmId', type: 'text', label: { en: 'GTM Container ID', ro: 'ID container GTM' } },
        {
          name: 'gscVerification',
          type: 'text',
          label: { en: 'Search Console verification', ro: 'Verificare Search Console' },
        },
      ],
    },
  ],
}
