import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { slugField } from '../fields/slug'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Event pop-ups — one document per live event (owner spec 2026-08-07).
 *
 * Înlocuiește globalul `eventPopup`, care putea ține un singur eveniment odată: acum Silviu
 * își face câte unul per eveniment, vede istoricul și numărul de înscriși pe fiecare.
 * Globalul rămâne pe loc până când migrarea datelor vechi e confirmată (pasul 7 din spec) —
 * nu-l șterge înainte.
 *
 * CONȚINUTUL e copiat 1:1 din global, inclusiv `localized: true` (owner 2026-08-07: „da, ca
 * acum"). Titlul e împărțit intenționat în `titlePlain` + `titleGradient` — al doilea segment
 * primește gradientul de brand din Figma; nu le uni într-un singur câmp.
 *
 * Ce NU e aici, deși apărea în specificație: `image`, `eventLocation`, `joinUrl`,
 * `eventDescription` ca richText. Owner-ul a cerut explicit „păstrează doar … cum e și acum".
 * `joinUrl` va fi nevoie la pasul 6 (variabila `{{joinUrl}}` din emailuri) — se adaugă acolo,
 * ca decizie separată.
 */
export const EventPopups: CollectionConfig = {
  slug: 'eventPopups',
  admin: {
    useAsTitle: 'internalName',
    group: { en: 'Sales', ro: 'Vânzări' },
    defaultColumns: ['internalName', 'eventDate', 'status', 'registrationsCount'],
    description: {
      en: 'One entry per live event. A pop-up shows on the site only while its status is "Published" AND the current time is between "Start showing at" and the event date; after the event it disappears on its own. "Registrations" counts the people who signed up for that event; their details are in Event Registrations.',
      ro: 'Câte o intrare pentru fiecare eveniment live. Un pop-up apare pe site doar cât timp are statusul „Published" ȘI ora curentă este între „Start showing at" și data evenimentului; după eveniment dispare de la sine. „Registrations" numără persoanele înscrise la acel eveniment; detaliile lor sunt în Event Registrations.',
    },
  },
  defaultSort: '-eventDate',
  access: {
    // Citirea publică se face DOAR prin endpoint-ul dedicat (pasul 2), care interoghează cu
    // `overrideAccess: true` și întoarce o felie sigură. Colecția în sine nu e publică: ar
    // expune altfel pop-up-uri `draft` și evenimente nepublicate.
    read: ({ req }) => Boolean(req.user),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  indexes: [
    // Interogarea frontend-ului: „published, în fereastra de afișare, cel mai recent".
    { fields: ['status', 'startShowingAt'] },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // „Reafișare forțată" e un buton deghizat în checkbox: la salvare incrementează
        // versiunea și se dezarmează singur, altfel ar reafișa pop-up-ul la FIECARE salvare
        // ulterioară. Clientul compară `displayVersion` cu ce are în localStorage.
        if (data?.forceReshow) {
          const current =
            typeof originalDoc?.displayVersion === 'number' ? originalDoc.displayVersion : 1
          data.displayVersion = current + 1
          data.forceReshow = false
        }
        return data
      },
    ],
    // Frontend-ul e static (EN + /ro); fără asta un pop-up publicat n-ar apărea până la
    // următorul build.
    afterChange: [revalidateSiteHook],
  },
  fields: [
    {
      name: 'internalName',
      type: 'text',
      required: true,
      admin: {
        description: {
          en: 'Internal name used only in this admin list, to tell events apart. Never shown to visitors.',
          ro: 'Nume intern folosit doar în această listă din admin, pentru a deosebi evenimentele. Nu este afișat niciodată vizitatorilor.',
        },
      },
    },
    slugField('internalName'),
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: { en: 'Draft', ro: 'Ciornă' }, value: 'draft' },
        { label: { en: 'Published', ro: 'Publicat' }, value: 'published' },
        { label: { en: 'Archived', ro: 'Arhivat' }, value: 'archived' },
      ],
      admin: {
        position: 'sidebar',
        description: {
          en: 'Only "Published" pop-ups can ever appear on the site; drafts and archived entries are never shown to visitors.',
          ro: 'Doar pop-up-urile „Published" pot apărea pe site; ciornele și intrările arhivate nu sunt afișate niciodată vizitatorilor.',
        },
      },
    },
    {
      name: 'displayVersion',
      type: 'number',
      defaultValue: 1,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          en: 'Increased automatically by "Force re-show". Visitors who dismissed an older version of the pop-up will see the new version again.',
          ro: 'Crescut automat de „Force re-show". Vizitatorii care au închis o versiune mai veche a pop-up-ului îl vor vedea din nou în versiunea nouă.',
        },
      },
    },
    {
      name: 'forceReshow',
      type: 'checkbox',
      virtual: true,
      defaultValue: false,
      label: { en: 'Force re-show', ro: 'Forțează reafișarea' },
      admin: {
        position: 'sidebar',
        // OBLIGATORIU lângă `virtual: true`: Payload face câmpurile virtuale readOnly în
        // admin din oficiu (fields/config/sanitize.js), iar bifa apărea gri, neapăsabilă.
        // Aici e singurul câmp virtual pe care omul TREBUIE să-l poată atinge.
        readOnly: false,
        description: {
          en: 'Tick and save to show this pop-up again to visitors who dismissed it. People who already registered never see it again. The box un-ticks itself after saving.',
          ro: 'Bifați și salvați pentru a afișa din nou pop-up-ul vizitatorilor care l-au închis. Cei deja înscriși nu îl mai văd niciodată. Căsuța se debifează singură după salvare.',
        },
      },
    },

    // ——— Conținut (identic cu globalul, localizat EN/RO) ————————————————————————————————
    {
      name: 'titlePlain',
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'Event title, the part rendered in the plain ink color, for example "AI Governance ". Keep the trailing space if the gradient segment continues the sentence.',
          ro: 'Titlul evenimentului, partea redată în culoarea de text obișnuită, de exemplu „AI Governance ". Păstrați spațiul de la final dacă segmentul cu gradient continuă propoziția.',
        },
      },
    },
    {
      name: 'titleGradient',
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'Event title, the segment rendered in the brand gradient, for example "in Practice.". Displayed right after the plain part.',
          ro: 'Titlul evenimentului, segmentul redat cu gradientul de brand, de exemplu „in Practice.". Se afișează imediat după partea simplă.',
        },
      },
    },
    { name: 'description', type: 'textarea', localized: true },
    {
      name: 'metaLine',
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'Short info line shown under the title, for example "Thu 14 Aug 2026 · 18:00 (EEST) · Live on Zoom".',
          ro: 'Linie scurtă de informații afișată sub titlu, de exemplu „Thu 14 Aug 2026 · 18:00 (EEST) · Live on Zoom".',
        },
      },
    },
    {
      name: 'speakers',
      type: 'array',
      labels: {
        singular: { en: 'Speaker', ro: 'Speaker' },
        plural: { en: 'Speakers', ro: 'Speakeri' },
      },
      admin: {
        description: {
          en: 'Speakers shown in the pop-up, each with their photo, or with initials when no photo is uploaded.',
          ro: 'Speakerii afișați în pop-up, fiecare cu fotografia sa sau cu inițialele atunci când nu este încărcată nicio fotografie.',
        },
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'role', type: 'text', localized: true },
        { name: 'photo', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'ctaLabel',
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'Label of the main button in the pop-up. When empty, the site shows "Secure your spot".',
          ro: 'Textul butonului principal din pop-up. Când este gol, site-ul afișează „Secure your spot".',
        },
      },
    },
    {
      name: 'joinLabel',
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'Label of the registration form submit button. When empty, the site shows "Join us".',
          ro: 'Textul butonului de trimitere a formularului de înscriere. Când este gol, site-ul afișează „Join us".',
        },
      },
    },
    {
      name: 'occupations',
      type: 'array',
      localized: true,
      labels: {
        singular: { en: 'Occupation option', ro: 'Opțiune de ocupație' },
        plural: { en: 'Occupation options', ro: 'Opțiuni de ocupație' },
      },
      admin: {
        description: {
          en: 'Options offered in the occupation list of the registration form. Visitors can also type their own answer.',
          ro: 'Opțiunile oferite în lista de ocupații din formularul de înscriere. Vizitatorii pot scrie și propriul răspuns.',
        },
      },
      fields: [{ name: 'label', type: 'text', required: true }],
    },

    // ——— Programare ————————————————————————————————————————————————————————————————————
    {
      name: 'eventDate',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: {
          en: 'Date and time of the event, used as the countdown target. The pop-up disappears on its own after this moment; there is no need to unpublish it.',
          ro: 'Data și ora evenimentului, folosite ca țintă pentru numărătoarea inversă. Pop-up-ul dispare singur după acest moment; nu este nevoie să îl retrageți manual.',
        },
      },
    },
    {
      name: 'startShowingAt',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: {
          en: 'The moment from which the pop-up may start appearing on the site. Must be before the event date.',
          ro: 'Momentul din care pop-up-ul poate începe să apară pe site. Trebuie să fie înaintea datei evenimentului.',
        },
      },
      validate: (value: unknown, options: unknown): string | true => {
        const siblingData = (options as { siblingData?: { eventDate?: unknown } } | undefined)
          ?.siblingData
        const eventDate = siblingData?.eventDate
        if (typeof value !== 'string' || typeof eventDate !== 'string') return true
        return new Date(value) < new Date(eventDate)
          ? true
          : 'Must be before the event date, otherwise the pop-up could never show.'
      },
    },
    {
      name: 'showDelaySeconds',
      type: 'number',
      defaultValue: 5,
      min: 0,
      max: 120,
      admin: {
        description: {
          en: 'How many seconds a visitor stays on the page before the pop-up appears.',
          ro: 'Câte secunde stă vizitatorul pe pagină înainte să apară pop-up-ul.',
        },
      },
    },

    // ——— Consimțământ newsletter ————————————————————————————————————————————————————————
    {
      name: 'newsletterOptInEnabled',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: {
          en: 'Shows the newsletter opt-in checkbox (unticked by default) in the registration form. Untick to hide the opt-in entirely for this event.',
          ro: 'Afișează în formularul de înscriere căsuța de abonare la newsletter (debifată implicit). Debifați pentru a ascunde complet opțiunea la acest eveniment.',
        },
      },
    },
    {
      name: 'newsletterConsentText',
      type: 'textarea',
      localized: true,
      defaultValue: 'I want to receive news from isad.academy',
      admin: {
        description: {
          en: 'The wording shown next to the newsletter opt-in. Stored as a snapshot on every registration, as GDPR proof of exactly what was agreed to.',
          ro: 'Formularea afișată lângă căsuța de abonare la newsletter. Se păstrează ca instantaneu la fiecare înscriere, ca dovadă GDPR a textului exact acceptat.',
        },
      },
    },

    // ——— Derivat ————————————————————————————————————————————————————————————————————————
    {
      name: 'registrationsCount',
      type: 'number',
      virtual: true,
      admin: {
        readOnly: true,
        description: {
          en: 'How many people signed up for this event. Counted live from Event Registrations; read-only.',
          ro: 'Câte persoane s-au înscris la acest eveniment. Numărat în timp real din Event Registrations; doar pentru citire.',
        },
      },
      hooks: {
        afterRead: [
          async ({ req, data }): Promise<number> => {
            if (!data?.id) return 0
            // Un COUNT per document — în listă înseamnă o interogare pe rând. Acceptabil:
            // `eventRegistrations.popup` e indexat, iar lista de evenimente e scurtă prin
            // natura ei. Dacă ajunge vreodată să doară, se mută pe un contor materializat.
            const result = await req.payload.count({
              collection: 'eventRegistrations',
              where: { popup: { equals: data.id } },
              overrideAccess: true,
            })
            return result.totalDocs
          },
        ],
      },
    },
  ],
}
