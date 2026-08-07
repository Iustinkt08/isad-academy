import { describe, expect, it } from 'vitest'

import { renderEventEmail } from '../../../src/lib/email/templates/eventEmail'

const lexical = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          { type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 },
        ],
      },
    ],
  },
})

const vars = {
  firstName: 'Ana',
  lastName: 'Popescu',
  eventTitle: 'AI Governance in Practice',
  eventDate: 'Friday 14 August 2026 at 18:00',
  joinUrl: 'https://zoom.us/j/123',
}

const render = (subject: string, body: string) =>
  renderEventEmail({
    subject,
    body: lexical(body),
    variables: vars,
    eventTitleForFooter: vars.eventTitle,
    contactEmail: 'contact@isad.academy',
  })

describe('renderEventEmail', () => {
  it('substitutes every documented variable in the body', () => {
    const { html } = render(
      'x',
      'Hi {{firstName}} {{lastName}} — {{eventTitle}}, {{eventDate}}, {{joinUrl}}',
    )

    expect(html).toContain('Ana')
    expect(html).toContain('Popescu')
    expect(html).toContain('AI Governance in Practice')
    expect(html).toContain('Friday 14 August 2026 at 18:00')
    expect(html).toContain('https://zoom.us/j/123')
    expect(html).not.toContain('{{')
  })

  it('substitutes variables in the subject too', () => {
    expect(render('Reminder: {{eventTitle}}', 'x').subject).toBe(
      'Reminder: AI Governance in Practice',
    )
  })

  it('tolerates spacing inside the braces', () => {
    // Cineva va scrie `{{ firstName }}` mai devreme sau mai târziu.
    expect(render('x', 'Hi {{ firstName }}').html).toContain('Hi Ana')
  })

  it('escapes recipient data before it reaches the HTML', () => {
    // Numele vin dintr-un formular PUBLIC. Fără escapare, cineva își scrie `<script>` ca
    // prenume și trimite cod în inboxul altcuiva prin emailul nostru.
    const { html } = renderEventEmail({
      subject: 'x',
      body: lexical('Hi {{firstName}}'),
      variables: { ...vars, firstName: '<script>alert(1)</script>' },
      eventTitleForFooter: vars.eventTitle,
      contactEmail: 'contact@isad.academy',
    })

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('does NOT html-escape the subject — it is a header, not markup', () => {
    // `escapeHtml` acolo ar produce „Q&amp;A" vizibil în inbox.
    const { subject } = renderEventEmail({
      subject: '{{eventTitle}}',
      body: lexical('x'),
      variables: { ...vars, eventTitle: 'Q&A with Silviu' },
      eventTitleForFooter: 'x',
      contactEmail: 'contact@isad.academy',
    })

    expect(subject).toBe('Q&A with Silviu')
  })

  it('always states why the recipient is getting this e-mail', () => {
    // Cerință de conformitate: fără ea, un mesaj la luni după înscriere arată ca spam.
    const { html } = render('x', 'body')

    expect(html).toContain('you registered for')
    expect(html).toContain('AI Governance in Practice')
    expect(html).toContain('contact@isad.academy')
  })

  it('leaves an empty join link as empty text, never as the literal placeholder', () => {
    const { html } = renderEventEmail({
      subject: 'x',
      body: lexical('Link: {{joinUrl}}'),
      variables: { ...vars, joinUrl: '' },
      eventTitleForFooter: 'x',
      contactEmail: 'contact@isad.academy',
    })

    expect(html).not.toContain('{{joinUrl}}')
  })
})
