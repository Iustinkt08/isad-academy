import type { Locale } from '../../i18n/config'
import { escapeHtml, renderBaseLayout } from './base'
import type { RenderedEmail } from './paymentConfirmation'

/**
 * Emailul de confirmare a abonării (double opt-in, pasul 1) — trimis de NOI ca email
 * tranzacțional obișnuit, nu prin funcția DOI a Brevo (v. src/lib/newsletter/confirmToken.ts
 * pentru motiv). Pleacă de pe expeditorul `newsletter` (news@isad.academy): e corespondență
 * de marketing, iar o plângere de spam pe el nu are voie să atingă reputația adresei de pe
 * care pleacă chitanțele de plată.
 *
 * Bilingv, spre deosebire de celelalte template-uri de email: aici limba e cunoscută sigur —
 * vine din pagina pe care omul a completat formularul — și e primul contact cu brandul.
 * Un vorbitor de română care primește un email în engleză după ce s-a abonat de pe /ro
 * are toate motivele să creadă că a greșit ceva.
 *
 * NU conține date personale în afara adresei destinatarului și NU promite nimic până la
 * click: dacă emailul ajunge din greșeală la altcineva, ignorarea lui e suficientă.
 */

const COPY = {
  en: {
    subject: 'Confirm your subscription to isad.academy',
    preheader: 'One click and you’re in: confirm your e-mail address.',
    heading: 'Confirm your subscription',
    intro: 'Someone (hopefully you) asked to receive updates from isad.academy at this address.',
    action: 'Please confirm so we know it’s really you:',
    button: 'Confirm subscription',
    fallback: 'If the button doesn’t work, copy this link into your browser:',
    expiry: 'This link works for 48 hours.',
    ignore:
      'If you didn’t request this, simply ignore this e-mail. Nothing will be sent to you and your address is not stored.',
    signoff: 'The isad.academy Team',
    footer:
      'You received this e-mail because your address was entered in the newsletter form on isad.academy. No subscription is active until you confirm.',
  },
  ro: {
    subject: 'Confirmă abonarea la isad.academy',
    preheader: 'Un singur click: confirmă adresa ta de e-mail.',
    heading: 'Confirmă abonarea',
    intro: 'Cineva (sperăm că tu) a cerut să primească noutăți de la isad.academy pe această adresă.',
    action: 'Te rugăm să confirmi, ca să știm că ești chiar tu:',
    button: 'Confirmă abonarea',
    fallback: 'Dacă butonul nu funcționează, copiază linkul acesta în browser:',
    expiry: 'Linkul este valabil 48 de ore.',
    ignore:
      'Dacă nu tu ai cerut asta, ignoră pur și simplu acest e-mail. Nu îți vom trimite nimic, iar adresa ta nu este păstrată.',
    signoff: 'Echipa isad.academy',
    footer:
      'Ai primit acest e-mail pentru că adresa ta a fost introdusă în formularul de newsletter de pe isad.academy. Abonarea nu este activă până nu confirmi.',
  },
} as const

export const renderNewsletterConfirmEmail = (input: {
  confirmUrl: string
  locale: Locale
}): RenderedEmail => {
  const t = COPY[input.locale] ?? COPY.en
  const url = escapeHtml(input.confirmUrl)

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">${t.heading}</h1>
    <p style="margin:0 0 16px;line-height:1.6;">${t.intro}</p>
    <p style="margin:0 0 24px;line-height:1.6;">${t.action}</p>
    <p style="margin:0 0 24px;">
      <a href="${url}" style="display:inline-block;background-color:#1c5d99;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:16px;font-weight:600;">${t.button}</a>
    </p>
    <p style="margin:0 0 8px;line-height:1.6;font-size:13px;color:#666666;">${t.fallback}</p>
    <p style="margin:0 0 24px;line-height:1.6;font-size:13px;word-break:break-all;"><a href="${url}" style="color:#1c5d99;">${url}</a></p>
    <p style="margin:0 0 16px;line-height:1.6;font-size:13px;color:#666666;">${t.expiry}</p>
    <p style="margin:0 0 24px;line-height:1.6;font-size:13px;color:#666666;">${t.ignore}</p>
    <p style="margin:0;line-height:1.6;">${t.signoff}</p>
  `

  const text = [t.heading, t.intro, t.action, input.confirmUrl, t.expiry, t.ignore, t.signoff].join(
    '\n\n',
  )

  return {
    subject: t.subject,
    html: renderBaseLayout({
      title: t.subject,
      preheader: t.preheader,
      bodyHtml,
      footerText: t.footer,
    }),
    text,
  }
}
