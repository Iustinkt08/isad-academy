/**
 * Shared inline-styled HTML layout for every transactional/broadcast email (CLAUDE.md §12
 * palette). Deliberately restrained: most email clients strip external stylesheets and a
 * lot of modern CSS, so every rule here is inlined and table-based. Pure string
 * templating — no vendor coupling, no Payload dependency.
 */

const BLUE = '#1c5d99'
const INK = '#222222'
const PAPER = '#ffffff'
const ICE = '#bbcde5'

export type BaseLayoutInput = {
  title: string
  bodyHtml: string
  footerText?: string
}

/** Escapes the five HTML-significant characters — every template interpolates
 * user/CMS-controlled strings (names, titles, messages) through this before it reaches
 * `bodyHtml`. */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const renderBaseLayout = ({ title, bodyHtml, footerText }: BaseLayoutInput): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${ICE}33;font-family:Helvetica,Arial,sans-serif;color:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:${PAPER};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:${BLUE};padding:20px 32px;">
                <span style="color:${PAPER};font-size:18px;font-weight:700;letter-spacing:-0.02em;">isad.academy</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #eeeeee;">
                <span style="font-size:12px;color:${INK}99;">${escapeHtml(
                  footerText ?? 'isad.academy — live, expert-led professional courses.',
                )}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
