import type { ReactNode } from 'react'

import { Reveal } from '@/components/ui/Reveal'

import { LegalEntityNote, LegalH2, LegalH3, LegalList, LegalP, LegalTable } from './LegalPage'
import type { LegalBlock, LegalSectionContent } from './content/types'

/**
 * Renders the transcribed legal documents (content/*.ts) onto the Figma legal
 * layout (LegalPage.tsx). Each numbered document section is wrapped in the
 * site-wide `Reveal` (fade-in on scroll); emails and phone numbers found in the
 * text become mailto:/tel: links without altering the displayed text.
 */
const LINK_RE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|(\+?40\d{3} \d{3} \d{3})/g

export function legalText(text: string): ReactNode {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(LINK_RE)) {
    const value = match[0]
    const index = match.index ?? 0
    if (index > last) parts.push(text.slice(last, index))
    const href = match[1]
      ? `mailto:${value}`
      : `tel:${value.startsWith('+') ? '' : '+'}${value.replace(/\s/g, '')}`
    parts.push(
      <a
        key={`${index}-${value}`}
        href={href}
        className="underline underline-offset-2 transition-colors hover:text-[#1c5d99]"
      >
        {value}
      </a>,
    )
    last = index + value.length
  }
  if (parts.length === 0) return text
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case 'p':
      return <LegalP>{legalText(block.text)}</LegalP>
    case 'h3':
      return <LegalH3>{block.text}</LegalH3>
    case 'list':
      return <LegalList items={block.items.map((item) => legalText(item))} />
    case 'table':
      return <LegalTable head={block.head} rows={block.rows} />
    case 'entity':
      return <LegalEntityNote line1={legalText(block.line1)} line2={legalText(block.line2)} />
  }
}

export function LegalSections({ sections }: { sections: LegalSectionContent[] }) {
  return (
    <>
      {sections.map((section, sectionIndex) => (
        <Reveal key={section.heading ?? sectionIndex} className="flex flex-col gap-[18px] lg:gap-6">
          {section.heading ? <LegalH2>{section.heading}</LegalH2> : null}
          {section.blocks.map((block, blockIndex) => (
            <LegalBlockView key={blockIndex} block={block} />
          ))}
        </Reveal>
      ))}
    </>
  )
}
