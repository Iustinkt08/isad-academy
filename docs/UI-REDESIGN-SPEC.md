# isad.academy — UI Redesign Spec (visual layer only)

> Generated 2026-07-11. Scope: visual layer — no copy rewrite, no route or CMS changes.
> Method note: the 5 reference sites were analyzed from their live HTML/CSS bundles
> (fonts, color tokens, radii, shadows, easings, container widths extracted from source).
> The Chrome extension was unresponsive, so no rendered screenshots — motion findings are
> derived from CSS (`transition`/`@keyframes`/scroll-section markup), which is concrete
> but does not capture choreography. Two sites had partial content access (noted inline).

---

## 1. Per-site analysis

### 1.1 aliremote.com — SaaS device management (webpack SPA, client-rendered)
*Content access: partial (JS-rendered; analyzed via CSS bundle + meta). Confidence: high on tokens, low on layout choreography.*

- **Layout:** container `max-width: 1300px` (sections 1200px), text measure capped at `800px`. Clear two-tier width discipline: wide shell, narrow prose.
- **Typography:** Geist (single family) — the modern SaaS default. Product-led hierarchy.
- **Color:** strict neutral base (`#fff` / `#1a1a1a` dark theme, borders `#eff0f2`) with **one** blue accent (`#007bff` light / `#5a9fe8` dark). Full light/dark theming via CSS vars. Accent-to-neutral ratio is tiny — blue lands on CTAs, links, progress, badges only.
- **Components:** buttons/chips at `border-radius: 999px` (pills, 24 occurrences — the dominant radius), cards 10–24px. Tokenized shadows (`--shadow-1`, `--shadow-2`), typical value `0 6px 20px rgba(0,0,0,.1)` — soft, low-opacity, ambient.
- **Motion:** 150–300ms (`all .3s ease`, `background-color .15s ease-in-out`) and one signature easing: `cubic-bezier(.2,.8,.2,1)` at 450ms on background-position/transform — a fast-out, soft-landing curve that reads premium.
- **What makes it feel expensive:** the single-accent discipline + tokenized soft shadows + one distinctive easing curve reused everywhere. Nothing bounces; everything settles.

### 1.2 wbt.ro — talent agency rebrand (Framer)

- **Layout:** scroll-driven narrative — the homepage is a sequence of full-viewport manifesto slides (repeated sticky H1 blocks in the markup). Story order *is* the layout.
- **Hero:** all-type. `PROUDLY REPRESENTING TALENTS. WORLDWIDE.` at **90–108px**, uppercase, no imagery competing with it.
- **Typography:** IBM Plex Sans + Manrope. Display 90–108px tracked −0.01 to −0.04em; body 14–18px. Extreme display-to-body contrast (~6×) is the entire visual identity.
- **Color:** near-monochrome — `#000`/`#fff`/greys (`#666`, `#969696`, `#e6e6e6`, `#f5f5f5`) + one deep navy `#060a23`. Effectively zero accent color; type size is the accent.
- **Components:** sharp radii (3px, 10px, 16px) — editorial, not friendly.
- **What makes it feel expensive:** total commitment to one idea (type as image), and monochrome restraint. Semantics are a mess (every text block is an `<h1>`) — do not copy that.

### 1.3 nibiru.net — entertainment mega-destination (Next.js/Turbopack)

- **Layout:** container `1313px`, text measure 765–930px. Long, loud, event-card-driven page.
- **Typography:** Helvetica Now (display) + Space Grotesk (labels) + Geist Mono. Uppercase display headlines ("CEA MAI MARE DESTINAȚIE…").
- **Color:** dark base with hot pink accent (`#ffa0d1`, `#db2475`) — shadcn-style token system (`--primary`, `--radius`, `lab()` fallbacks).
- **Components:** radius tokens (`var(--radius)` + 24px + pills), event cards, ticket CTAs.
- **Motion:** Tailwind-default transitions (.15s/.3s).
- **Verdict:** professional build, but the register (festival maximalism, all-caps everywhere, hot accent on dark) is the opposite of our brand. Useful only as a token-architecture reference.

### 1.4 elite.beach-please.ro — festival "Elite" page (Next.js)
*Content access: partial — the fetched `/` served the site's 404 shell ("BEACH, PLEASE! FESTIVAL: 9-13 JULY 2025"). Tokens extracted from the CSS bundle.*

- **Typography:** Augustia (custom display face) + InterDisplay — a characterful display over a neutral body, same pairing strategy as wbt/saem.
- **Color:** dark `#161616` base, gold `#E4B860` + acid green `#A6FF92` accents (+ pastel support colors).
- **Components:** radii 12–18px + `9999px` pills.
- **Verdict:** confirms the pattern set (pills, dark-neutral base + narrow accent, display/body pairing) but its festival palette and dark-first look have nothing for us to adopt directly.

### 1.5 saem.ro — 75-year engineering company (Framer)
*The closest register to ours: a credibility-first B2B services company.*

- **Layout:** calm sections with **numbered structure (01–04)** and generous whitespace; footer with full contact block.
- **Hero:** type-led credibility statement ("With 75+ years of experience, SAEM provides engineering and infrastructure services…") — the number *is* the hero.
- **Typography:** Manrope + Geist + **Geist Mono for eyebrows/captions**. Display 34–54px, tracked −0.02 to −0.04em (213 occurrences of −0.03em — house tracking). Body 14–15–18px.
- **Color:** strict monochrome neutrals — ink `#101014`/`#28282c`/`#3d3d47`, surfaces `#fafafa`/`#e6e6e6`/`#fff`. Zero accent hue; hierarchy from weight and surface value only.
- **Components:** **radii 24–40px** — very soft cards on quiet grounds. This is the friendly-premium radius language.
- **What makes it feel expensive:** wide, soft-cornered cards + disciplined grey ramp + tiny tracked labels against large calm headlines. Credibility through restraint, not decoration.

---

## 2. Cross-site synthesis

| Pattern | Sites using it | Why it works | Adopt / Skip / Adapt |
|---|---|---|---|
| Tight negative tracking on display type (−0.02…−0.04em) | **all 5** | Large geometric/grotesk type looks engineered, not inflated | **Adopt** — already in our tokens (−0.03/−0.035em); keep |
| Neutral base + ONE narrow accent | aliremote, saem, wbt, elite | Accent keeps meaning; page stays calm | **Adopt** — White/Mist ground, Deep Blue only on CTAs/links/key marks |
| Pill buttons & chips (999px) | aliremote, elite, nibiru | Friendly, modern, instantly scannable as "action" | **Adopt** — already our button language |
| Soft large card radii (24–40px) on quiet grounds | saem, aliremote, nibiru | Friendly-premium; softness reads human | **Adopt** — 24px cards (rounded-3xl already), 20px certificate |
| Low-opacity ambient multi-layer shadows | aliremote, saem | Depth without weight; heavy drops read cheap | **Adopt** — tokenized `--shadow-*` ramp below |
| ~1200–1300px shell + ~600–900px text measure | aliremote, nibiru, saem | Reading comfort inside a generous shell | **Adopt** — keep `max-w-6xl` shell, cap prose at ~600–720px |
| One signature easing, 150–450ms | aliremote | Motion becomes a brand asset instead of noise | **Adopt** — `cubic-bezier(.2,.8,.2,1)` as `--ease-brand` |
| Small tracked uppercase eyebrows / labels | saem, nibiru, wbt | Gives sections a quiet nav layer above headlines | **Adopt** — Poppins SemiBold, wide tracking, Deep Blue or grey |
| Display/body pairing with 2nd typeface | wbt, saem, elite, nibiru | Contrast via family change | **Skip** — brand mandates single-family Poppins; get contrast from weight + size (Bold display vs Regular body) |
| Type-as-hero manifesto slides (sticky scroll narrative) | wbt | Total commitment, memorable | **Adapt** — we take the confidence (big centered type-led hero), not the sticky-scroll mechanics |
| Numbered section structure (01–04) | saem, (nibiru events) | Encodes real sequence | **Adapt** — use ONLY where content is a true sequence (certification process steps); nowhere else |
| Mono font for captions | saem, nibiru | Technical flavor | **Skip** — second typeface forbidden; use tracked Poppins SemiBold caps instead |
| Dark-first theme | elite, nibiru, (aliremote optional) | Suits nightlife/dev tools | **Skip** — our brand is light; dark stays a *band* accent (existing gradient sections), not a base |
| All-caps display headlines | wbt, nibiru, elite | Loud | **Skip** — fights the friendly brand; caps only for small eyebrows/labels (never the brand name) |

**Load-bearing (3+ sites):** tight display tracking · neutral+single-accent · pills · soft ambient shadows · wide-shell/narrow-measure · tracked eyebrow labels. These six carry the redesign.

**Explicitly avoid:** hot/festival accents; gradient sprayed across headings (our current site does this — see §5); heavy drop shadows; all-caps H1s; sticky scroll-jacking; a second typeface; dark-first surfaces; `<h1>` soup (wbt).

---

## 3. Token spec

Contrast ratios computed for this spec (WCAG 2.x relative luminance):

| Pairing | Ratio | Verdict |
|---|---|---|
| Ink `#222222` on White | 15.91:1 | AAA |
| Deep Blue `#1C5D99` on White | 6.83:1 | AA normal text ✓ |
| Steel Blue `#407EA2` on White | 4.45:1 | **FAILS AA normal** — ≥24px / ≥19px bold only |
| White on Deep Blue | 6.83:1 | AA ✓ (button labels safe) |
| White on Navy `#091F33` | 16.73:1 | AAA |
| Ink on Mist `#BBCDE5` | 9.83:1 | AA ✓ (only Ink on Mist) |
| Deep Blue on Mist | 4.22:1 | **FAILS** normal text — confirms "no blue text on Mist" |
| `slate #808C99` on White | **3.43:1** | **FAILS — existing violation**, used for captions today → replace |
| grey-700 `#3E4A57` on White | 9.04:1 | AA ✓ |
| grey-600 `#4D5B6A` on White | 6.95:1 | AA ✓ (default muted body) |
| grey-500 `#5D6C7B` on White | 5.39:1 | AA ✓ (captions floor) |
| grey-600 on Mist | 4.30:1 | fails — on Mist use Ink (or grey-700 for large) |

```css
@theme {
  /* — Brand palette (Brand Book p.10 — unchanged) — */
  --color-ink:   #222222;  /* all headings & body */
  --color-paper: #ffffff;  /* base surface */
  --color-blue:  #1c5d99;  /* Deep Blue — primary accent: CTAs, links, active, dots, seal */
  --color-steel: #407ea2;  /* Steel Blue — gradients, hovers, strokes, display ≥24px ONLY */
  --color-ice:   #bbcde5;  /* Mist — surfaces, hairlines, dividers. NEVER text */
  --color-navy:  #091f33;  /* dark-gradient endpoint (Figma dark surfaces) */

  /* — Neutral grey ramp (Ink→White axis, cool cast; all AA on white) — */
  --color-grey-700: #3e4a57;  /* strong muted / muted-on-Mist large  9.04:1 */
  --color-grey-600: #4d5b6a;  /* muted body, subheads               6.95:1 */
  --color-grey-500: #5d6c7b;  /* captions, metadata (floor)         5.39:1 */
  /* --color-slate #808c99 → demoted to DECORATIVE ONLY (3.43:1) — never text */

  /* — Type scale (Poppins only: 700 display / 600 labels / 400 body) — */
  --text-display: clamp(2.75rem, 5vw + 1.25rem, 4.75rem);  /* lh 1.04, ls -0.035em, 700 */
  --text-h1:      clamp(2.25rem, 3.5vw + 1rem, 3.5rem);    /* lh 1.08, ls -0.03em,  700 */
  --text-h2:      clamp(1.75rem, 2.5vw + .75rem, 2.5rem);  /* lh 1.15, ls -0.02em,  700 */
  --text-h3:      clamp(1.375rem, 1vw + 1rem, 1.625rem);   /* lh 1.3,  ls -0.015em, 600 */
  --text-h4:      1.25rem;                                 /* lh 1.4,  ls -0.01em,  600 */
  --text-body-lg: 1.125rem;                                /* lh 1.7 */
  --text-body:    1rem;                                    /* lh 1.65 */
  --text-small:   0.875rem;                                /* lh 1.5 */
  --tracking-eyebrow: 0.14em;   /* uppercase eyebrows (brand name stays lowercase) */

  /* — Spacing rhythm (Tailwind 4px base; section rhythm) — */
  /* section padding: py-20 (80) mobile → py-24/28 (96/112) desktop; hero py-24→py-32 */
  /* prose measure: max-w-xl(576) subheads / max-w-2xl(672) body / shell max-w-6xl(1152) */

  /* — Radii — */
  --radius-chip: 9999px;  /* pills: buttons, badges, chips */
  --radius-card: 1.5rem;  /* 24px — cards, panels (rounded-3xl) */
  --radius-cert: 1.25rem; /* 20px — hero certificate */
  --radius-field: 0.75rem;/* 12px — inputs */

  /* — Shadows (ambient, low-opacity, navy-tinted; never black heavy drops) — */
  --shadow-soft: 0 1px 2px rgb(9 31 51 / .05), 0 8px 24px -8px rgb(9 31 51 / .10);
  --shadow-lift: 0 2px 4px rgb(9 31 51 / .06), 0 16px 32px -12px rgb(9 31 51 / .16);
  --shadow-cert: 0 1px 2px rgb(9 31 51 / .06), 0 12px 24px -8px rgb(9 31 51 / .10),
                 0 32px 64px -24px rgb(28 93 153 / .18);
  --shadow-chip: 0 1px 2px rgb(9 31 51 / .08), 0 8px 20px -6px rgb(9 31 51 / .16);

  /* — Motion — */
  --ease-brand: cubic-bezier(0.2, 0.8, 0.2, 1);  /* fast-out, soft-landing */
  --duration-fast: 150ms;   /* color/opacity hovers */
  --duration-base: 200ms;   /* lifts, fills */
  --duration-slow: 300ms;   /* reveals */
  --duration-tilt: 400ms;   /* certificate straighten */

  /* — Breakpoints (Tailwind defaults, unchanged) — */
  /* sm 640 · md 768 · lg 1024 · xl 1280 — accept 360/768/1024/1440 test grid */
}
```

**Gradient budget (whole site):** the brand gradient appears in exactly **two** places — the certificate **seal** (hero) and the **Quiz** nav pill (existing). `GradientText` on headings is retired everywhere else.

---

## 4. Hero — stacked, centered, CSS certificate

### 4.1 Desktop wireframe (≥1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│                       [header — unchanged]                        │
│                                                                   │
│                LIVE ONLINE TRAINING · ISO/IEC 42001               │  eyebrow, blue, tracked
│                                                                   │
│              Live, expert-led training for                        │  H1 Poppins Bold, Ink
│                AI governance & compliance                         │  max-w ~880px, centered
│                                                                   │
│         Prepare for ISO/IEC 42001:2023 with 1:1 live              │  sub grey-600, max-w 600px
│              sessions taught by Dr. Silviu Gresoi.                │
│                                                                   │
│              [ See courses ]   [ Talk to us → ]                   │  blue fill + ghost
│                                                                   │
│                            (airy gap)                             │
│  (Live 1:1 sessions)· ┌────────────────────────┐ ·(APCF cert.)    │  chips float over edges
│                       │ ┌────────────────────┐ │                  │  cert: ~66% width, A4
│                       │ │ isad.academy   ··· │ │ ·(ISO/IEC        │  landscape, rotateX 8°
│    (CPD credits)·     │ │ CERTIFICATE OF     │ │   42001:2023)    │
│                       │ │ COMPLETION         │ │                  │
│                       │ │ ────────────────── │ │                  │
│                       │ │    Alex Popescu    │ │                  │
│                       │ │  ISO/IEC 42001…    │ │ ·(AI governance) │
│                       │ │ sig.____    ____   │ │                  │
│                       │ │            (seal)◉ │ │                  │
│                       │ └────────────────────┘ │                  │
│                       └────────────────────────┘                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Mobile wireframe (<768px)

```
┌──────────────────────────┐
│    EYEBROW (smaller)     │
│   H1 (clamped, 2-3 ln)   │
│   sub (full measure)     │
│  [ See courses        ]  │   CTAs stacked, full-width
│  [ Talk to us         ]  │
│                          │
│ (APCF)·        ·(ISO/…)  │   3 chips at corners, small
│  ┌────────────────────┐  │   float ±3px; NO tilt (flat)
│  │  certificate card  │  │   width 100%, ratio kept
│  │  (all text intact) │  │
│  └────────────────────┘  │
│         ·(CPD credits)   │
└──────────────────────────┘
```

### 4.3 Certificate DOM (all CSS, no image assets except the brand SVG wordmark/icon)

```
section.hero (bg-paper + bg-radial-wash, overflow-hidden, isolate)
└── Container (max-w-6xl, text-center, pt-20 pb-24 sm:pt-24 sm:pb-32)
    ├── div.hero-copy (flex-col items-center gap-6)
    │   ├── p.hero-eyebrow        — uppercase tracked SemiBold, text-blue
    │   ├── h1.text-display       — Ink, max-w-[880px]
    │   ├── p.hero-sub            — body-lg, text-grey-600, max-w-xl
    │   └── div.hero-ctas         — Button primary + Button ghost
    └── div.hero-stage (relative, mt-14 sm:mt-20, perspective)
        ├── div.certificate (role="img" aria-label="Sample certificate of completion")
        │   │   ~66% width desktop / 100% mobile · aspect 1.414/1 (A4 landscape)
        │   │   bg white→mist gradient · hairline Mist border · radius 20px
        │   │   shadow --shadow-cert · rotateX(8deg) origin-top → 0 on hover
        │   ├── div.certificate-frame   — absolute inset-[18px], 1px Deep Blue/40 border
        │   ├── div.certificate-sheen   — absolute diagonal white sheen @10% opacity
        │   ├── header.certificate-head — wordmark SVG (lowercase, ≥120px) +
        │   │                             small tracked label "CERTIFICATE OF COMPLETION"
        │   ├── hr.certificate-divider  — hairline Mist
        │   ├── div.certificate-body    — name (SemiBold, Ink) over hairline rule +
        │   │                             course line (Regular, grey-600)
        │   └── footer.certificate-foot — sig line left (trainer) · sig line right (date)
        │       └── div.certificate-seal — CSS circle, brand-gradient fill,
        │                                  white brand icon inside (gradient use #1 of 2)
        └── ul.hero-chips (absolute inset-0, pointer-events-none; li pointer-events-auto)
            └── li.chip ×5 — pill, white/75 + backdrop-blur-[12px], Mist hairline,
                             Deep Blue 7px dot, Poppins SemiBold 13px INK label
```

### 4.4 Chips — content, position, z-index

**Credential sourcing (verified against repo content):** the only real credential in the
site content is the **APCF certificate of completion** + **CPD credits**
(`certificationInfo.issuer = "APCF"`, `courses.certificationCredits`). Per CLAUDE.md R2 the
exact APCF accreditation status is **TBC with Silviu** — so chips say *"APCF certificate"*
(true: a certificate issued by APCF) and never "accredited". **No other accreditation
names exist in the content; none were invented.**

Keyword candidates from existing site copy (5): `ISO/IEC 42001:2023` · `Live 1:1 sessions`
· `AI governance` · `Expert-led training` · `Live online`.
**Recommended 3:** `ISO/IEC 42001:2023` (the product — highest information density),
`Live 1:1 sessions` (the actual differentiator vs. recorded courses),
`AI governance` (the category, mirrors the H1). "Expert-led training" duplicates the H1
verbatim and "Live online" is implied by "Live 1:1 sessions" — both dropped.

| # | Label | Type | Desktop position (vs. stage) | z | Float |
|---|---|---|---|---|---|
| 1 | ● APCF certificate | credential | right gutter, top 14%, overlapping right edge | 30 | 3.6s, delay .2s |
| 2 | ● CPD credits | credential | left gutter, top 55%, overlapping left edge | 40 | 4.4s, delay 0s |
| 3 | ● ISO/IEC 42001:2023 | keyword | right gutter, top 44% | 40 | 5s, delay .6s |
| 4 | ● Live 1:1 sessions | keyword | left gutter, top 22% | 30 | 3.2s, delay .35s |
| 5 | ● AI governance | keyword | right gutter, top 72%, mostly outside edge (clears seal) | 20 | 4s, delay .5s |

Mobile keeps 1, 3, 2 (top-right, mid-left, bottom-right-outside — corners clear of
header/signature/seal text), amplitude ±3px. Entrance: fade + translateY(8px), 500ms,
90ms stagger. Hover: lift −2px + `--shadow-lift`. All idle floats desync (3.2–5s).

### 4.5 Hero-specific tokens

```
tilt: rotateX(8deg), perspective 1400px, transform-origin top
straighten: 400ms var(--ease-brand) on hover (flat + no tilt under reduced-motion & <768px)
chip blur: backdrop-blur 12px over rgb(255 255 255 / .75)
chip float: translateY ±5px desktop / ±3px mobile, ease-in-out, durations 3.2–5s
entrance: opacity 0→1 + translateY(8px→0), 500ms var(--ease-brand), stagger 90ms
sheen: linear-gradient(115deg, transparent 40%, rgb(255 255 255/.10) 50%, transparent 60%)
cert bg: linear-gradient(160deg, #fff 55%, color-mix(in srgb, var(--color-ice) 28%, #fff))
```

### 4.6 Bleed decision

**Skip the bottom bleed.** Reasons: (a) the signature lines and seal occupy the bottom
~22% of the card, so any bleed deep enough to read as intentional (>10% of card height)
cuts them — violating the stated constraint; a shallower bleed reads as a layout bug, not
an Apple moment. (b) The next section (Featured courses) starts with content immediately;
the peek effect needs empty runway to work. The rotateX tilt already delivers the
"physical object" cue the bleed was meant to add.

### 4.7 Alternative compositions considered

- **Alt B — split 55/45:** copy left, certificate right at rotateY(−8°). Rejected: reverts
  to the two-column default the brief explicitly moved away from; chips lose the symmetric
  gutters that balance the centered layout.
- **Alt C — flat certificate on layered Mist cards** (two offset Mist rectangles behind,
  no 3D). Safer, fully static, still premium. **Fallback** if the tilt tests poorly on mid
  screens — swap is one CSS class.
- **Recommendation: the spec'd centered + rotateX composition.** The certificate is the
  signature element of the whole redesign (it shows the product outcome — literally what
  the customer buys); centered staging gives it altar-like prominence, and rotateX-on-top
  is the only tilt that stays symmetric in a centered layout.

---

## 5. Application plan (per page/section)

Current state audit: the site is fully built (T1–T14 done). The visual layer today =
dark-gradient page heroes everywhere (`SectionDark`), `GradientText` on nearly every
heading (10 files), captions in non-compliant `slate`, section rhythm `py-16 sm:py-20`.

| # | Area | Current | Change | Why | Effort |
|---|---|---|---|---|---|
| 0 | `globals.css` tokens | palette + type only | add grey ramp, radii/shadow/motion tokens, chip/cert keyframes | everything downstream consumes these | S |
| 1 | Home hero | dark gradient, left-aligned, gradient H1 | light, stacked-centered + CSS certificate + 5 chips (§4) | the signature moment; sells the outcome | L |
| 2 | Home sections | gradient headings, py-16/20, slate captions | solid Ink headings, py-20/24-28 rhythm, grey ramp; Why-isad stays the ONE dark band | restore accent meaning; whitespace = premium | M |
| 3 | CourseCard | gradient title, slate caption, static | Ink title, grey-500 caption, hover lift (200ms ease-brand) | cards must read as quiet units | S |
| 4 | Buttons/Badges | pills, ok | keep; add lift-on-hover shadow, unify durations to tokens | consistency | S |
| 5 | Catalog + course detail | SectionDark header + gradient text | keep dark band header (brand-approved) but strip gradient text → solid; grey swaps; rhythm | dark stays a *band*, not a base | M |
| 6 | Corporate / Certification / About / Contact | same pattern | same treatment; certification process steps MAY use 01-02-03 numbering (true sequence) | consistency; saem pattern where honest | M |
| 7 | Blog list + article | same pattern | same treatment; prose measure ~672px | readability | S |
| 8 | Checkout + confirmation | forms | grey swaps + field radius token only — **no structural change** (money path) | risk containment | S |
| 9 | Header/Footer | sticky, quiz gradient pill | keep; verify blur-on-scroll; footer grey swaps | already on-spec | S |
| 10 | Legal/404 | gradient text | solid headings, grey swaps | consistency | S |
| 11 | Contrast audit | slate violations | sweep every `text-slate`, `text-steel`, `text-ink/60` usage; report | AA everywhere | S |

**Order:** tokens (0) → hero (1) → primitives (3,4) → home sections (2) → other pages (5–7, 10) → forms-safe pass (8,9) → audit + polish (11).

**Functional risk callouts:** hero restructure touches `page.tsx` only (data fetching
untouched); no E2E test pins hero markup (verified — no matches for hero selectors in
`tests/`); checkout intentionally gets cosmetic-only changes; `--color-slate` value stays
(decorative uses) — only *text* usages are remapped, so seeded Lexical content keys are
unaffected.

**Acceptance criteria:**
- Responsive at 360 / 768 / 1024 / 1440 — certificate keeps A4 ratio, chips never cover
  certificate text, no horizontal scroll.
- WCAG AA on every text pairing (table §3); zero Steel-Blue-on-white below 24px/19px-bold;
  zero text on Mist that isn't Ink (or grey-700 large).
- `prefers-reduced-motion`: no float, no tilt, no parallax, no entrance stagger (global
  kill-switch already in `globals.css` + explicit flat tilt).
- Lighthouse (lab targets): Performance ≥ 90, A11y ≥ 95, Best practices ≥ 95 — hero is
  pure CSS (no images beyond 2 inline SVGs), so LCP is the H1 text node.
- `npm run typecheck && npm run lint && npm run test` green.

---

## 6. Open questions / assumptions (proceeding with defaults, flag to Silviu)

1. **Certificate label language:** brief says "CERTIFICAT DE ABSOLVIRE"; the site is
   English-only (CLAUDE.md §1). **Default: "CERTIFICATE OF COMPLETION"** (EN). Swap is
   one string if the real certificate is issued in Romanian.
2. **APCF credential wording (R2):** chips/certificate say "APCF certificate" / "CPD
   credits" — never "accredited". Exact credential name still TBC with Silviu.
3. **Placeholder name on the certificate:** "Alex Popescu" (generic sample). Confirm
   Silviu is comfortable with a sample name vs. "Your name here".
4. **Dark band retention:** keeping `SectionDark` page headers site-wide (brand book has
   dark surfaces) but Home hero goes light. If Silviu wants light heroes everywhere,
   that's a follow-up pass.
5. **Social proof under CTAs:** omitted — no real student counts/ratings exist yet
   (nothing invented). Slot reserved in the layout.
6. Reference-site motion analysis is CSS-derived (Chrome extension was down); if a
   rendered-motion audit is wanted later, rerun with browser tooling.

---

## 7. Implementation record (2026-07-11 — user pre-approved, executed same run)

Implemented: tokens (§3) · hero + certificate + chips (§4) · GradientText retired in 13
files (gradient now only: seal + Quiz pill) · `text-slate` → `text-grey-500` in 24 files ·
section rhythm `py-20 sm:py-28` on all content pages (checkout untouched per §5 row 8) ·
CourseCard hover lift.

**Contrast audit — violations found & fixed:**
| Location | Violation | Fix |
|---|---|---|
| 39 caption usages (site-wide) | `slate #808C99` on white 3.43:1 | → `grey-500` 5.39:1 |
| PricingBreakdown, OrderSummary links | `hover:text-steel` at 12–14px (4.45:1) | → `hover:text-navy` 16.73:1 |
| Button `inverse`, NewsletterForm | `text-blue` on full Mist hover (4.22:1) | → `hover:bg-ice/60` (5.16:1) |

Verified: `typecheck` ✓ · `lint` ✓ · 238 unit tests ✓ · rendered screenshots at 1440/360
(dev server, DB-less degraded mode): centered hero, certificate w/ tilt, chips clear of
certificate text, mobile flat + 3 corner chips, container-query brand mark (icon <120px).
Not yet verified: Lighthouse run + E2E (need Postgres up); 768/1024 spot-check.
