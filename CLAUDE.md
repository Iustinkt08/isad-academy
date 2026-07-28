# CLAUDE.md — isad.academy

> **Ce e acest fișier:** contextul complet al proiectului pentru Claude Code. Proza e în română; **schema, rutele, identificatorii, variabilele de mediu și exemplele de UI copy sunt în engleză** (codul și site-ul sunt în engleză). Redenumește-l `CLAUDE.md` în rădăcina repo-ului pentru încărcare automată de către Claude Code.
>
> **Status:** Discovery finalizat. Design în Figma + development în paralel. Există un document de structură separat (client-facing). Acest fișier e sursa de adevăr pentru build.

---

## 1. Proiect pe scurt

**isad.academy** = vitrină + checkout pentru cursuri profesionale **live** (predate 1:1 pe Google Meet), cu management self-service prin Payload CMS. Fără LMS, fără conturi de utilizator. Focus de lansare: certificarea **ISO/IEC 42001:2023** (AI Management Systems), plus alte standarde/teme.

- Un singur expert: **Dr. Silviu Gresoi**.
- Un „loc" (seat) = un participant numit (nume + email), nu un cont pe site.
- Modelul de referință al clientului: `apcf.ro` (același trainer, alt site).
- Site **multi-page**, **bilingv EN/RO** (decizie owner 2026-07-13, înlocuiește „doar engleză"): EN canonic la URL-urile fără prefix, RO sub `/ro` (middleware + segment `[locale]`); conținut CMS localizat prin Payload `localization` (fallback EN), UI strings în `src/lib/i18n/dictionaries.ts`.
- Design: paletă albastru/teal pe alb, stil clean/Apple-esque (vezi §12).

---

## 2. Stack tehnic

- **Next.js 15** (App Router, TypeScript, Tailwind CSS)
- **Payload CMS 3** montat la `/admin` (Next-native, auto-generează dashboard + blog din config)
- **Postgres** (compatibil Supabase) — adapter Postgres pentru Payload
- **Payment**: interfață `PaymentProvider` + `MockProvider` default; Stripe / Netopia / EuPlătesc ca stub-uri
- **Email**: interfață `Mailer` → **Brevo** (marketing + tranzacțional)
- Uploads: Payload media (imagini + fișiere descărcabile)

```
DATABASE_URI=postgres://...
PAYLOAD_SECRET=...
NEXT_PUBLIC_SITE_URL=https://isad.academy
BREVO_API_KEY=...
BREVO_NEWSLETTER_LIST_ID=...
# Analytics (consent-gated, lazy)
NEXT_PUBLIC_GA4_ID=
NEXT_PUBLIC_GTM_ID=
# Payment (MockProvider by default; Netopia implementat — API v2 hosted page)
PAYMENT_PROVIDER=mock        # mock | stripe | netopia | euplatesc
NETOPIA_API_KEY=             # din admin Netopia (sandbox: sandbox.netopia-payments.com)
NETOPIA_POS_SIGNATURE=
NETOPIA_SANDBOX=true         # default sandbox; EXACT 'false' pentru live
NETOPIA_PUBLIC_KEY=          # certificat PEM (sau base64) pt. verificarea IPN
# STRIPE_SECRET_KEY= / EUPLATESC_* (later)
```

---

## 3. Principii de arhitectură (non-negociabile)

1. **Fără conturi / fără login de client.** Seats = participanți numiți. Nu construi auth de client. (Excepție: dacă „membru" devine identitate reală — vezi §14, track separat, NU se implementează fără cerere explicită.)
2. **Fără coș.** Checkout pe **o singură ediție per comandă**.
3. **Model de curs = Variant B (CourseSessions).** Un curs are mai multe ediții; fiecare ediție are propria capacitate, propriile ferestre de preț și propriul program.
4. **Locul se consumă la plata CONFIRMATĂ**, cu **decrement atomic** (evită supra-vânzarea ultimului loc la plăți simultane). Niciodată la add-to-form.
5. **Admin Payload-native.** Nu scrie dashboard custom; totul se gestionează prin colecții/globals.
6. **Provider-e swappable.** `PaymentProvider` și `Mailer` sunt interfețe; nu lega logica de un vendor.
7. **Deciziile de business TBD sunt config-driven** (vezi §13), nu hardcodate.
8. **Fără chatbot.** Quiz + FAQ acoperă nevoia.
9. **Analytics + scripturi third-party = consent-gated + lazy** (protejează Core Web Vitals).

---

## 4. Model de date (Payload)

> Identificatori în engleză. `richText` = editor Lexical. Slug-urile se generează automat din titlu.

### Collections

**`courses`** — teaser + conținut partajat la nivel de curs (NU date/preț/locuri).
- `title` (text, required)
- `slug` (text, unique, auto)
- `image` (upload → media) — banner
- `durationHours` (number)
- `category` (select, optional) — **rezervat** pentru filtrare viitoare; fără UI de filtrare la lansare
- `description` (richText) — descriere bogată *(placeholder lorem ipsum până la Silviu)*
- `audience` (array of text sau richText) — „who it's for" / cui se adresează
- `certificationCredits` (number) — credite CPD, **variabile per curs**
- `sessions` — relație hasMany → `courseSessions`
- `seo` (group): `metaTitle`, `metaDescription`, `ogImage`
- `status` (draft | published)
- **FĂRĂ câmp de module.** Ce acoperă cursul rezultă din `description` + `audience`.

**`courseSessions`** — o ediție a unui curs.
- `course` (relationship → courses, required)
- `startDate` (date, required)
- `schedule` (array of `{ date, startTime, endTime }`) — program concret (zile + ore)
- `capacity` (number, required) — total locuri (**diferă per ediție**)
- `seatsSold` (number, default 0) — pentru decrement atomic; `seatsRemaining = capacity - seatsSold`
- `earlyBird` (group): `{ price (number), startDate (date), endDate (date) }`
- `standard` (group): `{ price (number), startDate (date), endDate (date) }`
- status derivat (virtual): `upcoming | past | soldOut | noActiveWindow`

**`orders`**
- `session` (relationship → courseSessions, required)
- `quantity` (number, required)
- `buyer` (group): `{ name, email, phone, isCompany (bool), companyName, cui, address }`
- `participants` (array of `{ name, email }`) — lungime = `quantity`; la `quantity === 1`, buyer = participant
- `pricing` (group, snapshot la cumpărare): `{ basePrice, appliedWindow ('earlyBird'|'standard'), groupDiscount, memberDiscount, code (relationship → discountCodes), codeDiscount, total }`
- `paymentStatus` (select: `pending | confirmed | failed | refunded`)
- `provider` (text), `providerRef` (text)
- **Hook `afterChange`:** la trecerea în `confirmed` → increment atomic `session.seatsSold` (+= quantity); la `refunded` → decrement + eliberare loc.

**`discountCodes`**
- `code` (text, unique)
- `percentage` (number)
- `expiresAt` (date, optional)
- `usageLimit` (number, optional), `usageCount` (number, default 0)
- `type` (select: `general | member`) — codul de tip `member` acordă și prețul de membru
- `isActive` (checkbox)

**`reviews`** — == testimoniale (un singur pool).
- `text` (textarea, required)
- `authorName` (text), `roleCompany` (text)
- `photo` (upload, optional)
- `course` (relationship → courses, optional) — la ce curs se referă
- `source` (select: `emailForm | manual`)
- `showOnHome` (checkbox) — Silviu curează; **max 5** se afișează pe Home (impus în query)
- **Fără rating/stele.**

**`partners`** — logos pe Home.
- `name` (text), `logo` (upload), `url` (text, extern), `order` (number)
- `type` (select, optional: `accreditation | client | trainingPartner`)

**`corporateClients`** — strip de logos în hero-ul Corporate. *(Posibil aceeași listă cu `partners` — TBD Silviu. Ține colecție separată, decidem la confirmare.)*
- `name`, `logo`, `url` (optional), `order`

**`blogPosts`**
- `title`, `slug` (auto)
- `coverImage` (upload, **optional** — articolele pot fi fără imagine)
- `excerpt` (textarea)
- `body` (richText) — suportă: imagini în text, **culoare pe text**, blockquote-uri evidențiate, **link chips** (buton „YouTube" cu hyperlink — NU embed video), **resurse descărcabile**
- `author` (text sau relationship, **default = Silviu**, dar editabil)
- `category` (select, optional) — rezervat
- `readingTime` (number, auto sau manual)
- `leadMagnet` (group, optional): `{ enabled (bool), file (upload) }` — dacă `enabled`, articolul afișează un input de email (gated) pentru livrarea fișierului
- `relatedCourse` (relationship → courses, optional) — toggle „legat de un curs"
- `seo` (group, secțiune separată): `metaTitle`, `metaDescription`, `ogImage`
- `status` (draft | published) + **preview înainte de publicare**
- **Fără comentarii.**
- **Hook `afterChange`:** la `published` (prima dată) → broadcast Brevo către abonați.

**`faqItems`** — FAQ certificare (editabil).
- `question` (text), `answer` (richText), `order` (number)

**`leads`** — submisii formulare Contact + Corporate (dublu scop: email + dashboard).
- `type` (select: `contact | corporate`)
- comune: `name`, `email`, `phone`, `message`, `createdAt`
- contact: `subject` (select: `course | corporate | certification | other`)
- corporate: `companyName`, `contactPerson`, `participantsRange` (text/interval), `topicCourse` (relationship → courses sau text „other"), `preferredPeriod` (`{ from, to }` — date range)
- **Hook `afterChange` (create):** trimite notificare email (Brevo) + persistă. Un singur email de destinație pentru tot.

**`media`** — uploads Payload (imagini + fișiere).

**`users`** — DOAR admin Payload (Silviu + echipă). NU clienți.

### Globals

**`siteSettings`**
- `seatsThreshold` (number, default **5**) — afișează „X seats left" doar când `seatsRemaining < threshold`
- `currency` (select: `EUR | RON`) — **TBD**
- `vatDisplay` (select: `incl | excl`) — **TBD**
- `earlyBirdDisplay` (select: `bothWindows | activeOnly`) — **TBD**
- `stackingPolicy` (select: `stackAll | bestOf | groupMemberStack_codeExclusive`) — **TBD, critic** (vezi §8)
- `legalEntity` (group): `{ name, cui, address, anpcUrl, solUrl }` — **TBD**
- `contact` (group): `{ email, phone, linkedin }`
- `analytics` (group): `{ ga4Id, gtmId, gscVerification }` (sau din env)

**`homepage`**
- `hero`: `{ title, subtitle, ctaText, ctaLink, visual (upload) }`
- `featuredCourses` (relationship hasMany → courses) — Silviu alege
- `whyIsad`: `{ stats (array `{ value, label }`), differentiators (array `{ title, text }`) }`
- `newsletter`: `{ headline, invitationText, leadMagnet (optional) }`
- (band-ul expert trage din `expertBio`; testimonialele din `reviews` cu `showOnHome`; partenerii din `partners`)

**`expertBio`** — un singur expert, reutilizat pe Home (band) + About.
- `name`, `title`, `photo`
- `shortBio` (pentru band Home)
- `fullBio` (richText, pentru About)
- `credentials` (array `{ label, value }` sau câmpuri structurate)
- Seed (din materialul furnizat — **necesită versiune EN + confirmare că e actual**): Dr. Silviu Gresoi; 21+ ani Anti-Fraud / Risk Management / Data Analytics; CFE (2014); PhD AI & ML (Politehnica București); roluri: BancPost, Banca Românească, Garanti Bank, First Bank + energie; speaker AI Expo Europe & AI Summit Europe.

**`certificationInfo`** — conținut global de certificare.
- `issuer` (text, = „APCF"), `apcfLogo` (upload)
- `description` (richText) — ce e certificarea / CPD *(wording defensiv — vezi §9 R2)*
- `process` (array `{ title, description }`) — pașii
- `certificateSample` (upload) — mostră de certificat
- (FAQ vine din colecția `faqItems`; creditele CPD per curs stau pe `courses.certificationCredits`)

---

## 5. Rute (Next.js App Router)

```
/                        Home
/cursuri                 Catalog / showcase
/cursuri/[slug]          Course detail (template reutilizabil)
/checkout                Checkout (o ediție)
/checkout/confirmare     Confirmation
/corporate               Corporate (lead-gen, fără preț/buy)
/despre                  About (+ expert bio)
(/certificare — RETRAS 2026-07-11: redirect 308 → /#certification; certificarea e secțiune pe Home)
/contact                 Contact
/blog                    Blog list
/blog/[slug]             Article
/termeni /gdpr /politica-cookie /politica-livrare   Legal
/admin                   Payload dashboard
```
+ `sitemap.xml` (ambele limbi + hreflang), `robots.txt`, `404` custom, favicon (din logo).
+ Toate rutele de mai sus există și sub prefixul `/ro` (versiunea română); `/en/*` face 308 către forma neprefixată.
Quiz = instrument site-wide (buton evidențiat în nav) — **de definit** (§11).

---

## 6. Structură pe pagini (rezumat pentru build)

- **Home:** hero (stacked centrat, light — certificat CSS + chips, v. docs/UI-REDESIGN-SPEC.md) → featured courses (din dashboard) → expert band → why isad / trust (stats + differentiators) → **certification summary** (R2 copy + pași proces + FAQ accordion, `id="certification"`) → testimonials (max 5) → partners (logos clickabile) → newsletter (footer). *(Fără tile-uri de categorii, fără teaser blog, fără callout corporate pe Home.)*
- **Catalog:** grid curat, fără filtre, **fără search**; sortare după `startDate` (toggle). Card = teaser la nivel de curs (image, title, `durationHours`, badge Early Bird dacă vreo ediție viitoare are EB activ). **Fără dată/preț/locuri pe card.** Buton „View course"; cardul nu e clickabil altfel. Cursuri trecute → secțiune „Past editions" (necumpărabile). Empty state → „Past editions" + „Upcoming editions coming soon" + CTA newsletter.
- **Course detail:** antet (banner, title, expert, `durationHours`, startDate ediție, „Online", share) → bloc preț per ediție (base + ferestre EB/Standard + linia de reduceri) → `description` → `audience` → **program** per ediție → **certificare** (APCF + credite CPD) → selecție/afișare ediții disponibile (fiecare cu locuri + ferestre proprii) → buton „Enrol" + selector cantitate. „X seats left" doar sub prag. Sold out → „Notify me next edition". Fără fereastră activă → „Enrolment coming soon". **Fără secțiune de recenzii pe pagina de curs.** Callout jos: corporate + contact. **Fără module. Fără „cursuri similare".**
- **Checkout:** o ediție/comandă. Formulare dinamice: `quantity` locuri → `quantity` × (name + email); la 1 loc buyer=participant. Buyer: name/email/phone + (B2B) companyName/cui/address. Reduceri aplicate (§8). Plată MockProvider (dev). Loc consumat la confirmare (atomic).
- **Confirmare:** recap comandă + „Meet invite will follow X days before". Invitația Meet trimisă **manual de Silviu** la lansare (dashboard arată lista de participanți per comandă).
- **Corporate:** lead-gen. Hero (cu strip logos clienți corporate jos) → ce oferi → beneficii → teme livrabile (= cursurile din catalog) → formular corporate. **Temele = cursurile existente**, nu teme separate; diferența = livrare în grup vs 1:1. Formular → email + dashboard. După submit: mulțumire + „we'll get back to you" (fără interval de ore).
- **Certification:** ~~pagină separată~~ **RETRAS (decizie owner, 2026-07-11)** — sumar ca secțiune pe Home (v. mai sus); `/certificare` face redirect la `/#certification`.
- **About:** hero → expert bio (`expertBio.fullBio`) → misiune/abordare (scurt) → credibilitate (stats + APCF) → CTA dublu (See courses / Contact). isad se prezintă **independent**; APCF apare doar la certificare.
- **Contact:** titlu → formular + detalii directe alături (email, telefon, LinkedIn). **Fără hartă, fără adresă** pe pagină. Formular: name, email, phone (opt), subject (dropdown), message → email + dashboard. Un singur email. **Fără WhatsApp.**
- **Blog:** listă cronologică, fără featured, fără filtre (categorie rezervată). Card: coverImage (opt), title, excerpt, date, category, readingTime. Articol: breadcrumb → cover (opt) → title → author + date + readingTime → body → share (LinkedIn) → CTA jos (newsletter mereu + bloc curs relevant dacă `relatedCourse`). Empty state (0 articole): „Articles coming soon" + CTA newsletter (nu ascunde din meniu).

---

## 7. Header / Footer / Globale

**Header:** nav = Courses · Corporate · Blog · About + selector limbă RO/EN (Home = click pe logo). *(Certification + Contact scoase din nav — 2026-07-11; butonul See courses + Quiz scoase din nav — decizie owner 2026-07-12: Quiz-ul e accesibil din pagina de cursuri.)*

**Footer:** alb (redesign 2026-07-12): card newsletter + 3 coloane — Legal (Cookies, Confidențialitate, Politica de livrare — pagina de livrare include și Termenii), Explore (Corporate, About, Blog), Altele (Contact, Certification, Not sure? → quiz) + contact + badge-uri oficiale ANPC SAL/SOL (public/anpc/) + entitate/CUI/copyright + watermark mare isad.academy (negru, opacitate mică).

**Cookie consent:** pop-up accept/refuz, privacy-first (respinge non-esențialele by default).

**Analytics:** GA4 + Search Console + GTM, **consent-gated + lazy** (nu strica CWV). Nu încărca scripturile înainte de consimțământ.

**SEO:** meta + OpenGraph per pagină (câmpuri în colecții), `sitemap.xml`, `robots.txt`, OG defaults, Schema.org unde e relevant (Course, Organization).

**Limbă:** **bilingv EN/RO** (owner 2026-07-13). EN = default, neprefixat; RO = prefix `/ro`. Switcher în navbar (setează cookie `locale` + navighează la ruta-pereche; middleware-ul redirecționează vizitatorii recurenți cu cookie `ro`). Paginile sunt statice per limbă; salvările din dashboard revalidează on-demand (`src/lib/revalidateSite.ts`). Câmpurile de conținut din Payload sunt `localized: true` (EN+RO, fallback EN); hreflang prin sitemap.

---

## 8. Logica de preț & reduceri (motor)

Funcție centrală, ex. `computeOrderPricing(session, quantity, code?, isMember?)`:

1. **Base price** = fereastra activă după data curentă:
   - dacă `now ∈ [earlyBird.startDate, earlyBird.endDate]` → `earlyBird.price`
   - altfel dacă `now ∈ [standard.startDate, standard.endDate]` → `standard.price`
   - altfel → **nicio fereastră activă → cursul NU e cumpărabil** („Enrolment coming soon")
2. **Group discount:** 10% automat dacă `quantity >= 3` (aceeași ediție).
3. **Member discount:** % dacă `isMember` (definiție + % **TBD**).
4. **Code:** procent, valid (activ, neexpirat, sub `usageLimit`).

**Stacking = `siteSettings.stackingPolicy` (TBD, CRITIC).** Implementează ca **strategy pattern**, toate trei variantele, cu **teste unit explicite pentru fiecare combinație** (group × member × code):
- `stackAll` — se cumulează toate (compus). *(Lean-ul curent: apcf afișează „Discounturile se cumulează!" — probabil asta va alege Silviu. Confirmă înainte de a bloca.)*
- `bestOf` — doar cea mai mare reducere.
- `groupMemberStack_codeExclusive` — group+member se cumulează, codul e exclusiv.

> ⚠️ Aceasta e **zona cu cel mai mare risc de bug** din proiect. Snapshot al breakdown-ului de preț se salvează pe `order.pricing`. QA dedicat obligatoriu.

**Consumul de loc:** la `paymentStatus → confirmed`, increment atomic `session.seatsSold += quantity` (tranzacție / update condiționat `WHERE seatsSold + quantity <= capacity`). Respinge dacă nu mai sunt locuri. „X seats left" citește `capacity - seatsSold` și se afișează doar sub `seatsThreshold`.

---

## 9. Reconcilieri (necesită Silviu — nu presupune)

- **R1 — ISO:** standardul e **ISO/IEC 42001:2023** (AI Management Systems), nu „420001". Folosește designația corectă în copy/SEO.
- **R2 — Wording certificare: REZOLVAT (doc „întrebări deschise", iulie 2026).** Certificarea se obține **direct de la PECB** — după plată, participanții sunt înrolați în platforma PECB (C2). Cursuri la lansare: PECB ISO/IEC 42001 Foundation / Lead Implementer / Lead Auditor + un curs propriu (AI Governance & Responsible AI). Pentru cursurile proprii: diplomă PDF proprie (semnături, nume schimbat manual) (C5). CPD: **1 oră = 1 credit** (C3). Copy-ul: „training that prepares you for ISO/IEC 42001" + „certification obtained directly through PECB" + CPD. APCF rămâne relevant doar pentru definiția de **membru** (B4).
- **R3 — Module: REZOLVAT → fără module.** Nu adăuga câmp de module / secțiune „Course Contents".

---

## 10. Recenzii & 11. Email (Brevo)

**Recenzii:** colectate prin **email auto-trimis după `session` end date** (necesită **cron / scheduled job zilnic** care găsește ediții tocmai încheiate și trimite linkul de review) → participanții completează (`source: emailForm`). Silviu poate adăuga și manual (`source: manual`). Curare din dashboard (`showOnHome`), max 5 pe Home. Fără rating.

**Email — Brevo (single provider, EU/GDPR).** Interfață `Mailer`, Brevo ca provider concret. Acoperă:
- **Marketing:** newsletter cu **double opt-in** (footer + inline în blog); **broadcast automat** la publicarea unui articol nou.
- **Tranzacțional:** confirmare de plată; email cu factura (vezi mai jos).
- **Nu** e nevoie de un al doilea provider (Resend etc.).

**Factură:** GENERAREA facturii (serie fiscală / TVA / e-Factura ANAF) **NU** e Brevo — e SmartBill/Oblio, **track separat** (vezi §14). Dacă Silviu confirmă facturare automată: fie programul o trimite direct pe email, fie generează PDF-ul și `Mailer` (Brevo) îl trimite ca atașament.

---

## 11. Quiz (de definit — rundă separată)

Instrument de descoperire site-wide care **înlocuiește filtrele** din catalog; buton evidențiat în nav. Ajută cine nu știe ce curs îi trebuie → recomandă un curs la final. **Recomandare: rules-based** (răspuns → curs), NU LLM (evită cost recurent de tokeni + instabilitate). Nu implementa încă — se definesc întrebările, logica de mapare și output-ul într-o rundă separată.

---

## 12. Direcție vizuală

Paletă oficială (Brand Book p.10): Deep Blue `#1C5D99`, Steel Blue `#407EA2`, Ink `#222222`, Mist `#BBCDE5`, White `#FFFFFF` — **fără aqua** (`#639FAB` nu există în brand). Gradient de brand pe suprafețe deschise: **Steel Blue → Deep Blue → Steel Blue** (linear); suprafețele dark folosesc gradientul din Figma clientului: **`#1C5D99` la 44% → `#091F33` la 100%** (linear) — brandul nu pune niciodată text cu gradient pe dark (acolo: alb solid sau Mist). Limbaj: clean/Apple-esque, titluri foarte mari cu letter-spacing strâns, panouri glassmorphism/blur, butoane pill, washuri radiale. **„Brand Book isad.academy.pdf" (rădăcina repo) = sursa vizuală autoritativă**; logo-urile (variante aprobate: Gradient / Blue / White-on-dark / Black; lockup min. 120px pe ecran, sub — doar icon; fără recolorare/distorsionare) stau în `public/brand/`; font: **Poppins self-hosted** (next/font — Bold titluri / SemiBold subtitluri & labels / Regular body); numele brandului se scrie **întotdeauna lowercase: isad.academy**.

> Notă: paleta site-ului (albastru/teal) e distinctă de brandul livrabilelor de agenție ⚡UP! (dark/gold).

---

## 13. Decizii deschise — TBD de la Silviu (fă-le CONFIG-DRIVEN, nu hardcoda)

> Răspunsuri primite în doc-ul „isad-academy-intrebari-deschise" (iulie 2026) — status per punct:

- [x] **Currency** — **DUAL: EUR pentru non-RO, RON pentru RO (B1)** ⚠️ scope change: schema actuală are un singur preț/`currency` — necesită preț per monedă + selecție; de proiectat separat
- [x] **VAT display** — **fără TVA (B2: ISAD neplătitoare de TVA)** → `vatDisplay: excl` (seedat)
- [ ] **Early Bird display** (ambele ferestre vs doar activa) → `siteSettings.earlyBirdDisplay` — încă nedecis
- [x] **Stacking policy** — **`stackAll` confirmat (B3: „Se acumuleaza")** (seedat)
- [x] **Member** — **membrii organizației APCF; primesc cod/ID înrolat ca voucher (B4)** — mecanismul `discountCodes type: member` existent se potrivește; % încă necomunicat
- [x] **Payment processor** — mock până la semnare, confirmat (B7)
- [x] **Invoicing** — **DA, automat, SmartBill (B8)** → track separat de ofertat
- [x] **Legal entity + CUI** — **International Security and Defence SRL (ISAD), CIF 44849076 (A1)** (seedat în `legalEntity`)
- [x] **Legal texts** — le trimite clientul (A2); politica de anulare: definită în A3 (rambursare/reprogramare; anulare de către ISAD → rambursare integrală / transfer gratuit / voucher opțional; refund → seat eliberat — implementat)
- [x] **RO legal pages** — „ideal da" (A4) — de planificat (doar paginile legale, site-ul rămâne EN)
- [ ] „Next date" indicator pe card (da/nu); email de recuperare abandon (da/nu)
- [x] **Credential** — **PECB (C2), REZOLVAT — v. §9 R2**; mostră diplomă proprie: o trimite clientul (C5)
- [x] Catalog scope — **4 cursuri la lansare (E1):** PECB ISO/IEC 42001 Foundation · Lead Implementer · Lead Auditor · AI Governance & Responsible AI (curs propriu)
- Alte date primite: expert band (D4 — nume/rol/frază, seedate), stats propuse D5 (20+ ani · 2.000+ companii · 100+ sesiuni — „to be finalized", NU seedate încă), partener inițial: **PECB.com** (D8, logo din PECB Brand Resource Center), testimoniale + logo-uri corporate: revin (D7/G2), copy Corporate G1 (RO — necesită EN)

---

## 14. În afara scope-ului / track-uri separate (NU implementa fără cerere explicită)

- **Facturare automată** (SmartBill/Oblio + e-Factura ANAF) — track separat, cost propriu.
- **Conturi de client cu login** — doar dacă „membru" trebuie să fie identitate reală (~8–15 m-h). Default: cod de membru / allowlist, fără auth.
- **Auto-invitație Google Meet** (Calendar API) — la lansare invitațiile sunt manuale (Silviu).

---

## 15. Convenții pentru agentul de cod

- Deciziile TBD (§13) sunt **config în `siteSettings` / env**, niciodată hardcodate.
- `PaymentProvider` și `Mailer` = interfețe; `MockProvider` + Brevo sunt implementările curente. Nu lega logica de business de un vendor.
- **Decrement atomic de locuri** la plata confirmată — obligatoriu, cu update condiționat pe capacitate.
- **Motorul de preț** primește teste pentru fiecare combinație de reduceri; snapshot pe `order.pricing`.
- **Copy:** lorem ipsum **doar** unde textul depinde de verificarea lui Silviu (course `description`/`audience`, `expertBio`, cifre reale, formulările de certificare). Restul — **UI copy real în engleză** (labels, buttons, empty states, nav, generic CTAs), nu lorem ipsum. Vocabular consistent (butonul „Enrol" → toast „Enrolled").
- **Certificare:** copy conservator (R2) — „prepares you for ISO/IEC 42001" + certificat APCF + CPD; a nu implica acreditare inexistentă.
- **Fără module, fără coș, fără conturi, fără chatbot** — nu le reintroduce.
- Quality floor: responsive până la mobil, focus vizibil pe tastatură, `prefers-reduced-motion` respectat, analytics/third-party consent-gated + lazy (CWV).

---

## 16. Definition of done (pe feature)

- Motor de preț: teste verzi pe toate combinațiile group × member × code, pentru fiecare `stackingPolicy`.
- Checkout: formulare dinamice corecte (N participanți), decrement atomic sub concurență, MockProvider end-to-end.
- Catalog + course detail: card fără dată/preț/locuri; „seats left" doar sub prag; stările edge (no window / sold out / past) → notify-me → newsletter.
- Blog: editor cu link chips + culoare + resurse + lead magnet gated + preview; broadcast Brevo la publish; SEO section.
- Globale: cookie consent + GA4/GTM lazy; footer cu entitate/CUI/ANPC/SOL (când datele sunt disponibile); sitemap/robots/404/OG.
