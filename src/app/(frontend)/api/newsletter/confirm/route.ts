import { getMailer } from '../../../../../lib/email'
import { localePath, type Locale } from '../../../../../lib/i18n/config'
import { verifyConfirmToken } from '../../../../../lib/newsletter/confirmToken'

/**
 * `GET /api/newsletter/confirm?token=…` — pasul 2 (și ultimul) al double opt-in-ului:
 * ținta butonului din emailul de confirmare. Abia AICI adresa devine abonată.
 *
 * De ce GET, deși are efect de scriere: ținta e un link dintr-un email, iar clientul e
 * clientul de mail al omului. Efectul nu e declanșabil de un terț — cere o semnătură HMAC
 * validă pe care doar noi o putem produce, deci nu există suprafață de CSRF.
 *
 * Răspunde ÎNTOTDEAUNA cu un redirect către o pagină, niciodată cu JSON: la capătul
 * linkului e un om cu un browser, nu un program.
 *
 * Un token invalid sau expirat NU primește o pagină de eroare proprie — aterizează pe
 * aceeași pagină de confirmare, cu `?status=invalid`. Motivul e deliberat: pagina nu are
 * voie să devină un oracol care spune „adresa asta chiar aștepta confirmarea", iar cineva
 * care redeschide un link vechi din inbox nu merită o alarmă roșie.
 */
export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token') ?? ''

  const publicOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') || new URL(request.url).origin
  const landing = (locale: Locale, status?: 'invalid' | 'failed') =>
    new URL(
      `${localePath(locale, '/newsletter/confirmed')}${status ? `?status=${status}` : ''}`,
      publicOrigin,
    )

  const verified = verifyConfirmToken(token)
  if (!verified.ok) {
    // Limba e necunoscută aici — tokenul e tocmai partea în care nu putem avea încredere.
    console.warn(`[newsletter:confirm] rejected token (${verified.reason})`)
    return Response.redirect(landing('en', 'invalid'), 303)
  }

  const { email, locale } = verified.payload
  const result = await getMailer().addToNewsletterList({ email })

  if (!result.ok) {
    // Consimțământul E dovedit, dar Brevo n-a răspuns. Nu-i spunem omului „ești abonat" când
    // nu e — l-am pierde tăcut. Îl trimitem pe aceeași pagină cu `?status=failed`, iar
    // eroarea reală rămâne în loguri, unde o putem repara.
    console.error(`[newsletter:confirm] provider refused to add ${email}: ${result.error}`)
    return Response.redirect(landing(locale, 'failed'), 303)
  }

  // Adăugarea în listă e evenimentul pe care Brevo îl folosește ca declanșator pentru
  // Automation-ul de bun-venit („contact added to list") — de aceea emailul „You're
  // subscribed" nu se trimite din codul nostru. Vezi docs/EMAIL.md §1.
  console.info(`[newsletter:confirm] subscribed ${email} (${locale})`)
  return Response.redirect(landing(locale), 303)
}
