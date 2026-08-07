import { escapeHtml, renderBaseLayout } from './base'
import { lexicalToEmailHtml } from './lexicalToEmailHtml'
import type { RenderedEmail } from './paymentConfirmation'

/**
 * Email către înscrișii unui eveniment, compus în admin (`eventEmails`, spec §7).
 *
 * Subiectul și corpul acceptă variabile: `{{firstName}}`, `{{lastName}}`, `{{eventTitle}}`,
 * `{{eventDate}}`, `{{joinUrl}}`. Sunt înlocuite PER DESTINATAR, după conversia rich text →
 * HTML, ca autorul să le poată pune oriunde în text fără să se gândească la structură.
 *
 * Substituția escapează valorile: numele vin din formularul public, iar un „<script>" scris
 * în câmpul de nume nu are voie să ajungă cod în inboxul altcuiva.
 */
export type EventEmailVariables = {
  firstName: string
  lastName: string
  eventTitle: string
  eventDate: string
  joinUrl: string
}

export type EventEmailData = {
  subject: string
  /** Payload richText (Lexical JSON). */
  body: unknown
  variables: EventEmailVariables
  /** Obligatoriu în subsol: de ce primește omul emailul (spec §7). */
  eventTitleForFooter: string
  contactEmail: string
}

const applyVariables = (input: string, vars: EventEmailVariables): string =>
  input
    .replace(/\{\{\s*firstName\s*\}\}/g, escapeHtml(vars.firstName))
    .replace(/\{\{\s*lastName\s*\}\}/g, escapeHtml(vars.lastName))
    .replace(/\{\{\s*eventTitle\s*\}\}/g, escapeHtml(vars.eventTitle))
    .replace(/\{\{\s*eventDate\s*\}\}/g, escapeHtml(vars.eventDate))
    .replace(/\{\{\s*joinUrl\s*\}\}/g, escapeHtml(vars.joinUrl))

/** Subiectul ajunge într-un antet, nu în HTML — aici escaparea ar produce „&amp;" vizibil. */
const applyVariablesPlain = (input: string, vars: EventEmailVariables): string =>
  input
    .replace(/\{\{\s*firstName\s*\}\}/g, vars.firstName)
    .replace(/\{\{\s*lastName\s*\}\}/g, vars.lastName)
    .replace(/\{\{\s*eventTitle\s*\}\}/g, vars.eventTitle)
    .replace(/\{\{\s*eventDate\s*\}\}/g, vars.eventDate)
    .replace(/\{\{\s*joinUrl\s*\}\}/g, vars.joinUrl)

const stripTags = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h1|h2|h3|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export const renderEventEmail = (data: EventEmailData): RenderedEmail => {
  const subject = applyVariablesPlain(data.subject, data.variables)
  const bodyHtml = applyVariables(lexicalToEmailHtml(data.body), data.variables)

  return {
    subject,
    html: renderBaseLayout({
      title: subject,
      bodyHtml,
      // Cerință de conformitate, nu politețe: omul trebuie să-și poată aminti DE CE primește
      // emailul. Fără asta, un mesaj la câteva luni după înscriere arată ca spam.
      footerText: `You are receiving this e-mail because you registered for “${data.eventTitleForFooter}” on isad.academy. Questions? Write to ${data.contactEmail}.`,
    }),
    text: stripTags(bodyHtml),
  }
}
