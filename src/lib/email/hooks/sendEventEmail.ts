import type { CollectionAfterChangeHook } from 'payload'

import type {
  EventEmail,
  EventPopup as EventPopupDoc,
  EventRegistration,
} from '../../../payload-types'
import { getMailer } from '../index'
import { renderEventEmail, type EventEmailVariables } from '../templates/eventEmail'

/** Loturi mici cu pauză între ele — nu ca să fim politicoși, ci ca să nu lovim rate limit-ul
 *  providerului și să pierdem jumătate din destinatari într-o rafală. */
const BATCH_SIZE = 20
const BATCH_PAUSE_MS = 1_000
/** O trimitere eșuată se reîncearcă de două ori; peste asta nu mai e o eroare trecătoare. */
const MAX_ATTEMPTS = 3

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const formatDate = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })
}

/** Scrierea rezultatului, non-reentrantă (tiparul documentat de Payload pentru context). */
const stamp = async (
  req: Parameters<CollectionAfterChangeHook<EventEmail>>[0]['req'],
  id: number | string,
  data: Record<string, unknown>,
): Promise<void> => {
  try {
    await req.payload.update({
      collection: 'eventEmails',
      id,
      data,
      context: { skipEventEmailHook: true },
      overrideAccess: true,
      req,
    })
  } catch (error) {
    req.payload.logger.error(
      `[email] eventEmail ${id} sent but could not be stamped: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * `eventEmails` `afterChange` — trimite un email tuturor înscrișilor la un eveniment, sau doar
 * un exemplar de test către adminul logat (spec §7).
 *
 * Tiparul e cel de la `sendNewsletterCampaign` — bifă + salvare, nu buton custom (decizie
 * owner 2026-08-07): editorul știe deja cum se comportă câmpurile din Payload.
 *
 * EXACTLY-ONCE prin construcție: `sentAt` se ștampilează la prima ÎNCERCARE, iar un document
 * care îl are nu mai poate trimite niciodată. Corectarea unei greșeli de scriere după
 * trimitere e inertă — nu retrimite nimănui. Singura excepție e reluarea unei trimiteri
 * `failed`, care țintește DOAR adresele eșuate, nu toată lista.
 *
 * Ca orice hook de email din proiect: nu aruncă niciodată. O cădere de provider nu are voie
 * să anuleze salvarea documentului; rezultatul se scrie în `status`/`failures`, unde editorul
 * îl poate citi.
 */
export const sendEventEmail: CollectionAfterChangeHook<EventEmail> = async ({
  doc,
  req,
  context,
}) => {
  if (context?.skipEventEmailHook) return doc
  if (!doc?.sendTestNow && !doc?.sendNow) return doc

  const isTest = Boolean(doc.sendTestNow)
  const alreadySent = Boolean(doc.sentAt)
  const retryingFailures = !isTest && alreadySent && doc.status === 'failed'

  // Trimitere completă deja făcută cu succes → bifa e inertă. Fără asta, o salvare
  // accidentală ar re-trimite întregii liste.
  if (!isTest && alreadySent && !retryingFailures) {
    await stamp(req, doc.id, { sendNow: false, sendTestNow: false })
    return doc
  }

  const patch: Record<string, unknown> = { sendNow: false, sendTestNow: false }

  try {
    const popupId = typeof doc.popup === 'object' ? doc.popup?.id : doc.popup
    if (!popupId) throw new Error('No event pop-up selected.')

    const popup = (await req.payload.findByID({
      collection: 'eventPopups',
      id: popupId,
      overrideAccess: true,
      depth: 0,
    })) as EventPopupDoc

    const settings = await req.payload
      .findGlobal({ slug: 'siteSettings', overrideAccess: true })
      .catch(() => null)
    const contactEmail =
      (settings as { contact?: { email?: string } } | null)?.contact?.email ??
      'contact@isad.academy'

    const eventTitle = `${popup.titlePlain ?? ''}${popup.titleGradient ?? ''}`.trim()
    const eventDate = formatDate(popup.eventDate)
    // De pe EMAIL, nu de pe eveniment (owner 2026-08-07) — un reminder poate trimite altundeva
    // decât invitația, iar linkul de multe ori nici nu există când se creează pop-up-ul.
    const joinUrl = doc.joinUrl ?? ''

    // Richtext upload nodes in `doc.body` are unpopulated (bare media ids) — re-read at
    // depth 2 so inline images render in the email (same fix as sendNewsletterCampaign).
    const populatedBody = await req.payload
      .findByID({ collection: 'eventEmails', id: doc.id, depth: 2, overrideAccess: true, req })
      .then((d) => d.body)
      .catch(() => doc.body)

    // ——— Destinatarii ———————————————————————————————————————————————————————————————
    type Recipient = { email: string; firstName: string; lastName: string }
    let recipients: Recipient[]

    if (isTest) {
      const testTo = req.user?.email
      if (!testTo) throw new Error('No logged-in user to send the test to.')
      // Date demonstrative: testul trebuie să arate cum arată variabilele completate, nu
      // găuri goale în text.
      recipients = [{ email: testTo, firstName: 'Ana', lastName: 'Popescu' }]
    } else if (retryingFailures) {
      recipients = (doc.failures ?? [])
        .map((f) => ({ email: String(f?.email ?? ''), firstName: '', lastName: '' }))
        .filter((r) => r.email)
      if (recipients.length === 0) throw new Error('No failed addresses left to retry.')
    } else {
      const found = await req.payload.find({
        collection: 'eventRegistrations',
        where: { popup: { equals: popupId } },
        limit: 0, // 0 = toate; lista unui eveniment e mărginită de capacitatea lui
        overrideAccess: true,
        depth: 0,
      })
      recipients = (found.docs as EventRegistration[]).map((r) => ({
        email: r.email,
        firstName: r.firstName ?? '',
        lastName: r.lastName ?? '',
      }))
      if (recipients.length === 0) throw new Error('This event has no registrations yet.')
    }

    // ——— Trimiterea ————————————————————————————————————————————————————————————————
    const mailer = getMailer()
    const failures: { email: string; error: string }[] = []
    let success = 0

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (recipient) => {
          const variables: EventEmailVariables = {
            firstName: recipient.firstName,
            lastName: recipient.lastName,
            eventTitle,
            eventDate,
            joinUrl,
          }
          const { subject, html, text } = renderEventEmail({
            subject: String(doc.subject ?? ''),
            body: populatedBody,
            variables,
            eventTitleForFooter: eventTitle,
            contactEmail,
          })

          let lastError = ''
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
            const result = await mailer.sendTransactional({
              to: recipient.email,
              subject,
              html,
              text,
              // `newsletter` => news@isad.academy (owner 2026-08-07). Fără categorie explicită
              // se folosea expeditorul tranzacțional (no-reply@), adresa chitanțelor — iar un
              // anunț despre eveniment nu are ce căuta pe reputația aceleia.
              sender: 'newsletter',
            })
            if (result.ok) {
              success += 1
              return
            }
            lastError = result.error
            if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt)
          }
          failures.push({ email: recipient.email, error: lastError.slice(0, 300) })
        }),
      )

      if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_PAUSE_MS)
    }

    if (isTest) {
      patch.lastResult =
        failures.length === 0
          ? `Test trimis către ${recipients[0]?.email} la ${new Date().toISOString()}.`
          : `Testul a EȘUAT: ${failures[0]?.error}`
    } else {
      patch.status = failures.length === 0 ? 'sent' : 'failed'
      patch.sentAt = doc.sentAt ?? new Date().toISOString()
      patch.sentBy = doc.sentBy ?? req.user?.id
      patch.recipientCount = recipients.length
      patch.successCount = success
      patch.failures = failures
      patch.lastResult =
        failures.length === 0
          ? `Trimis către ${success} din ${recipients.length} destinatari.`
          : `${success} trimise, ${failures.length} eșuate. Bifează din nou „Send now" ca să reîncerci DOAR adresele eșuate.`
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    patch.lastResult = `EȘUAT: ${message}`
    // Un eșec înainte de prima trimitere nu trebuie să marcheze documentul ca „trimis" —
    // altfel bifa devine inertă și editorul nu mai poate încerca deloc.
    if (!isTest && doc.sentAt) patch.status = 'failed'
    req.payload.logger.error(`[email] eventEmail ${doc.id}: ${message}`)
  }

  await stamp(req, doc.id, patch)
  return doc
}
