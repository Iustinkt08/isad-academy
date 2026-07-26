/**
 * Block model for the legal documents (Privacy / Terms / Cookies), transcribed
 * 1:1 from the owner's .docx files in the repo root ("privacy EN.docx",
 * "privacy RO.docx", "terms and conditions EN.docx", "terms and conditions RO.docx",
 * "cookies EN.docx", "cookies RO.docx"). The .docx files are the source of truth —
 * wording must never be edited here without a new document from the owner.
 */
export type LegalBlock =
  | { kind: 'p'; text: string }
  /** Sub-heading inside a numbered section (e.g. "3.1. Provider", "Identification data"). */
  | { kind: 'h3'; text: string }
  | { kind: 'list'; items: string[] }
  /** Two-column table (privacy §20 retention periods). */
  | { kind: 'table'; head: [string, string]; rows: [string, string][] }
  /** Company-details panel (#f6f6f6) — only where the document itself lists the firm data. */
  | { kind: 'entity'; line1: string; line2: string }

export type LegalSectionContent = {
  /** Numbered section heading, verbatim from the document (absent for the preamble). */
  heading?: string
  blocks: LegalBlock[]
}

export type LegalDocContent = {
  /** H1 segment before the gradient word(s). */
  titlePlain: string
  /** H1 gradient segment (last word, per Figma 3977-765 / 3977-800). */
  titleGradient: string
  /** Real page title, used for the <title> metadata (layout appends "| isad.academy"). */
  metaTitle: string
  /** Verbatim "Last updated" / "Ultima actualizare" line from the document. */
  lastUpdated: string
  sections: LegalSectionContent[]
}
