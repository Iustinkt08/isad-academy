import { getMailer } from '../email'
import { readNewsletterReplyTo } from '../email/senders'
import { renderNewsletterConfirmEmail } from '../email/templates/newsletterConfirm'
import type { Locale } from '../i18n/config'
import { createConfirmToken } from './confirmToken'

/**
 * Pasul 1 al double opt-in-ului, extras din `POST /api/newsletter` ca să poată fi refolosit
 * de înscrierea la evenimente (bifa de newsletter din pop-up, spec §8: „apelezi EXACT funcția
 * existentă … nu o rescrie").
 *
 * Comportamentul e neschimbat față de ce trimitea ruta înainte — doar mutat aici. Cine îl
 * apelează decide ce face cu eșecul: ruta de newsletter îl traduce în status HTTP, înscrierea
 * la eveniment doar îl loghează, pentru că o problemă la newsletter NU are voie să anuleze o
 * înscriere validă la eveniment.
 */
export type ConfirmationOutcome =
  | { ok: true }
  /** Lipsește secretul de semnare — nu emitem un link pe care nu-l putem verifica. */
  | { ok: false; reason: 'unsigned' }
  | { ok: false; reason: 'sendFailed'; error: string }

export const sendNewsletterConfirmation = async (input: {
  email: string
  locale: Locale
}): Promise<ConfirmationOutcome> => {
  const token = createConfirmToken({ email: input.email, locale: input.locale })
  if (!token) return { ok: false, reason: 'unsigned' }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(
    /\/+$/,
    '',
  )
  const confirmUrl = `${siteUrl}/api/newsletter/confirm?token=${encodeURIComponent(token)}`
  const { subject, html, text } = renderNewsletterConfirmEmail({
    confirmUrl,
    locale: input.locale,
  })

  const result = await getMailer().sendTransactional({
    to: input.email,
    subject,
    html,
    text,
    // `transactional` (no-reply@) — owner 2026-08-07. Vezi comentariul din ruta de newsletter.
    sender: 'transactional',
    // Explicit: un câmp `replyTo` absent face Brevo să pună adresa contului.
    replyTo: readNewsletterReplyTo() || undefined,
  })

  return result.ok ? { ok: true } : { ok: false, reason: 'sendFailed', error: result.error }
}
