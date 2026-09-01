import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'

import type { LexicalBlock } from '@/lib/richtext/plainText'

import { publicAsset } from './assets'

/**
 * The course one-pager served by `/courses/[slug]/pdf` (owner 2026-09-01): big title,
 * the SAME description as the page, editions & pricing, programme, certification and
 * the trainer(s). Server-only — `@react-pdf/renderer` runs in Node, no headless
 * browser (Passenger-safe). All strings arrive pre-localized from the route; this file
 * only lays them out. Brand: Poppins (public/fonts), Deep Blue #1C5D99 accents on
 * white, EB green #009E56 — same palette as the page (Brand Book p.10).
 */

Font.register({
  family: 'Poppins',
  fonts: [
    { src: publicAsset('fonts', 'Poppins-Regular.ttf'), fontWeight: 400 },
    { src: publicAsset('fonts', 'Poppins-Medium.ttf'), fontWeight: 500 },
    { src: publicAsset('fonts', 'Poppins-SemiBold.ttf'), fontWeight: 600 },
    { src: publicAsset('fonts', 'Poppins-Bold.ttf'), fontWeight: 700 },
  ],
})
// No mid-word hyphenation — matches the site's clean look; text wraps at spaces only.
Font.registerHyphenationCallback((word) => [word])

export type CoursePdfData = {
  /** Title split like the page header: everything + LAST word in Deep Blue. */
  titlePlain: string
  titleAccent: string
  pill: string
  teaser: string
  /** "40 hours · 40 CPD credits · Live on Zoom" */
  metaLine: string
  /** Brand logo as PNG data URI (rasterized from public/brand), or null. */
  logoPng: string | null
  about: { title: string; blocks: LexicalBlock[] }
  audience: { title: string; items: string[] }
  programme: {
    title: string
    hours: string
    rows: { day: string; date: string; topic: string }[]
  } | null
  editions: {
    title: string
    items: {
      dateRange: string
      soldOut: string | null
      /** Active price line ("Early Bird €900 until 01.12.2026" / "Standard €1,200"). */
      primary: string | null
      primaryTone: 'eb' | 'std'
      /** Secondary line (standard window / "Enrolment opens later"). */
      secondary: string | null
    }[]
  }
  certification: { title: string; body: string; steps: string[]; cpdLine: string | null }
  trainers: { title: string; items: { name: string; role: string; photoPng: string | null }[] }
  /** Fine print: VAT note, refund note, discounts note. */
  notes: string[]
  footerLeft: string
  footerRight: string
}

const BLUE = '#1c5d99'
const INK = '#222222'
const GREY = '#595959'
const GREY_SOFT = '#959595'
const EB_GREEN = '#009e56'
const PANEL = '#f0f5f9'
const HAIRLINE = '#e6e6e6'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Poppins',
    fontSize: 10,
    color: INK,
    paddingTop: 42,
    paddingHorizontal: 48,
    paddingBottom: 70,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { height: 24, objectFit: 'contain' },
  pill: { fontSize: 8, fontWeight: 500, color: BLUE },
  title: { marginTop: 20, fontSize: 25, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.25 },
  titleAccent: { color: BLUE },
  teaser: { marginTop: 8, fontSize: 10.5, lineHeight: 1.55, color: GREY },
  metaLine: { marginTop: 10, fontSize: 9, fontWeight: 600, color: BLUE },
  divider: { marginTop: 16, marginBottom: 16, height: 1, backgroundColor: HAIRLINE },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: 600, letterSpacing: -0.2, marginBottom: 6 },
  paragraph: { fontSize: 10, lineHeight: 1.55, color: '#444444', marginBottom: 5 },
  blockHeading: { fontSize: 11, fontWeight: 600, color: INK, marginTop: 4, marginBottom: 4 },
  bulletRow: { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { width: 12, fontSize: 10, color: BLUE },
  bulletText: { flex: 1, fontSize: 10, lineHeight: 1.5, color: '#444444' },
  editionBox: {
    backgroundColor: PANEL,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 6,
  },
  editionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editionDate: { fontSize: 11, fontWeight: 600 },
  editionSoldOut: { fontSize: 9, fontWeight: 500, color: GREY_SOFT },
  editionPrimary: { marginTop: 3, fontSize: 10.5, fontWeight: 600 },
  editionSecondary: { marginTop: 2, fontSize: 9, color: GREY },
  programmeRow: { flexDirection: 'row', marginBottom: 3 },
  programmeDay: { width: 52, fontSize: 10, fontWeight: 600, color: BLUE },
  programmeText: { flex: 1, fontSize: 10, color: '#444444' },
  programmeHours: { fontSize: 9, color: GREY_SOFT, marginBottom: 6 },
  stepRow: { flexDirection: 'row', marginBottom: 3 },
  stepNum: { width: 16, fontSize: 10, fontWeight: 600, color: BLUE },
  cpdLine: { marginTop: 4, fontSize: 9.5, color: GREY },
  trainerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  trainerPhoto: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  trainerName: { fontSize: 11, fontWeight: 600 },
  trainerRole: { fontSize: 9.5, color: GREY, marginTop: 1 },
  notes: { marginTop: 4 },
  noteLine: { fontSize: 8.5, lineHeight: 1.5, color: GREY_SOFT },
  footer: {
    position: 'absolute',
    left: 48,
    right: 48,
    bottom: 26,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerBrand: { fontSize: 9, fontWeight: 600, color: BLUE },
  footerNote: { fontSize: 8.5, color: GREY_SOFT },
})

function AboutBlock({ block }: { block: LexicalBlock }) {
  if (block.kind === 'heading') return <Text style={styles.blockHeading}>{block.text}</Text>
  if (block.kind === 'listItem')
    return (
      <View style={styles.bulletRow}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{block.text}</Text>
      </View>
    )
  return <Text style={styles.paragraph}>{block.text}</Text>
}

function CoursePdf({ data }: { data: CoursePdfData }) {
  return (
    <Document title={`${data.titlePlain}${data.titleAccent}`.trim()} author="isad.academy">
      <Page size="A4" style={styles.page}>
        {/* Header: brand logo + track pill */}
        <View style={styles.headerRow}>
          {data.logoPng ? <Image src={data.logoPng} style={styles.logo} /> : <Text />}
          <Text style={styles.pill}>{data.pill}</Text>
        </View>

        {/* Big title — last word in Deep Blue, like the page header */}
        <Text style={styles.title}>
          {data.titlePlain}
          <Text style={styles.titleAccent}>{data.titleAccent}</Text>
        </Text>
        {data.teaser ? <Text style={styles.teaser}>{data.teaser}</Text> : null}
        {data.metaLine ? <Text style={styles.metaLine}>{data.metaLine}</Text> : null}
        <View style={styles.divider} />

        {/* About — the SAME description as the page, paragraphs/bullets preserved */}
        {data.about.blocks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{data.about.title}</Text>
            {data.about.blocks.map((block, i) => (
              <AboutBlock key={i} block={block} />
            ))}
          </View>
        )}

        {/* Who it's for */}
        {data.audience.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{data.audience.title}</Text>
            {data.audience.items.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming editions & pricing */}
        {data.editions.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{data.editions.title}</Text>
            {data.editions.items.map((edition, i) => (
              <View key={i} style={styles.editionBox} wrap={false}>
                <View style={styles.editionHead}>
                  <Text style={styles.editionDate}>{edition.dateRange}</Text>
                  {edition.soldOut ? (
                    <Text style={styles.editionSoldOut}>{edition.soldOut}</Text>
                  ) : null}
                </View>
                {edition.primary ? (
                  <Text
                    style={[
                      styles.editionPrimary,
                      { color: edition.primaryTone === 'eb' ? EB_GREEN : BLUE },
                    ]}
                  >
                    {edition.primary}
                  </Text>
                ) : null}
                {edition.secondary ? (
                  <Text style={styles.editionSecondary}>{edition.secondary}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Programme of the earliest upcoming edition */}
        {data.programme && data.programme.rows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{data.programme.title}</Text>
            {data.programme.hours ? (
              <Text style={styles.programmeHours}>{data.programme.hours}</Text>
            ) : null}
            {data.programme.rows.map((row, i) => (
              <View key={i} style={styles.programmeRow} wrap={false}>
                <Text style={styles.programmeDay}>{row.day}</Text>
                <Text style={styles.programmeText}>
                  {row.date} · {row.topic}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Certification — wrap={false}: the body, steps and CPD line stay together */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>{data.certification.title}</Text>
          <Text style={styles.paragraph}>{data.certification.body}</Text>
          {data.certification.steps.map((step, i) => (
            <View key={i} style={styles.stepRow} wrap={false}>
              <Text style={styles.stepNum}>{i + 1}.</Text>
              <Text style={styles.bulletText}>{step}</Text>
            </View>
          ))}
          {data.certification.cpdLine ? (
            <Text style={styles.cpdLine}>{data.certification.cpdLine}</Text>
          ) : null}
        </View>

        {/* Trainer(s) — wrap={false}: keeps the heading and its rows on the same page */}
        {data.trainers.items.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{data.trainers.title}</Text>
            {data.trainers.items.map((trainer, i) => (
              <View key={i} style={styles.trainerRow} wrap={false}>
                {trainer.photoPng ? (
                  <Image src={trainer.photoPng} style={styles.trainerPhoto} />
                ) : null}
                <View>
                  <Text style={styles.trainerName}>{trainer.name}</Text>
                  <Text style={styles.trainerRole}>{trainer.role}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Fine print */}
        {data.notes.length > 0 && (
          <View style={styles.notes}>
            {data.notes.map((note, i) => (
              <Text key={i} style={styles.noteLine}>
                {note}
              </Text>
            ))}
          </View>
        )}

        {/* Footer on every page */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>{data.footerLeft}</Text>
          <Text style={styles.footerNote}>{data.footerRight}</Text>
        </View>
      </Page>
    </Document>
  )
}

/** Render the document to a Buffer for the route handler (no JSX allowed in route.ts). */
export const renderCoursePdf = (data: CoursePdfData): Promise<Buffer> =>
  renderToBuffer(<CoursePdf data={data} />)
