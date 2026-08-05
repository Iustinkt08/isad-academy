# Predare proiect — ISAD Academy

Document pentru continuarea lucrului pe proiect. Citește-l înainte de prima sesiune de Claude Code.

## Ce s-a făcut până acum (rezumat)

Istoricul complet e în `git log`, dar pe scurt, ultimele etape majore:

- **Deploy automat prin GitHub Actions pe cPanel** — funcțional. Un incident de blocaj a fost cauzat de multiplexarea SSH (ControlMaster), nu de firewall; a fost scoasă. Deploy manual de rezervă: script dedicat în repo. Incidentul 503 din producție (29–31 iul) și recuperarea sunt documentate în `RECOVERY-503.md`.
- **Integrare Netopia API v2** — plăți funcționale, sandbox e default-ul; verificare sumă în IPN, validare `eventId`.
- **Securitate (primul val)** — headere CSP/HSTS/X-Frame-Options, rate limiting, blocare bypass la create în Payload, întărire useri/cookies/CSRF.
- **Emailuri** — template-urile de la client (receipt comandă + confirmare) integrate; Reply-To global prin `BREVO_REPLY_TO_EMAIL`; reply-to către lead pe notificări.
- **Design mobil fluid** — convenție: Figma mobil = 390px, px ficși → `min(Nvw, Npx)`, pill-urile nu se rup pe două rânduri, audit la 360px. Clamp-uri pe toate textele din CMS în layouturi fixe (carduri curs, quiz result etc.).
- **Quiz result, About, preview-uri** — numeroase fixuri de layout mobil/desktop.

## Ce mai e de făcut (TODO)

### 1. Setare Brevo + toate adresele de email
- Configurat contul Brevo complet: domeniu verificat, SPF/DKIM/DMARC pe domeniu.
- Creat/configurat toate adresele de trimitere: `news@isad...`, `no-reply@isad...`, etc. — fiecare tip de email (newsletter, tranzacțional, notificări) trimite de pe adresa potrivită.
- Variabilele de mediu relevante există deja (ex. `BREVO_REPLY_TO_EMAIL`) — verifică `.env` / configurarea pe server.

### 2. Newsletter cu double opt-in (confirmare prin email) — OBLIGATORIU
Explicat pe îndelete, ca să fie clar de ce:

- Când cineva se abonează pe site, **NU** intră direct în listă. Primește mai întâi un email cu un **buton de confirmare** („Confirmă abonarea").
- Abia după ce apasă butonul din email, adresa devine abonată activ.
- **De ce nu facem abonarea direct din butonul de pe site?** Pentru că oricine poate scrie adresa altcuiva în formular. Fără confirmare, am trimite newslettere unor oameni care nu au cerut asta → plângeri de spam, probleme GDPR (nu putem dovedi consimțământul), iar Brevo poate penaliza/suspenda contul dacă rata de spam crește. Emailul de confirmare este dovada legală a consimțământului. Așa funcționează toate site-urile serioase.
- Brevo are suport nativ pentru double opt-in — folosește-l, nu reinventa.

### 3. Identitatea vizuală Netopia — CERINȚĂ DE LA NETOPIA
- Adaugă pe site elementele de identitate vizuală cerute de Netopia (logo Netopia Payments + siglele cardurilor, de regulă în footer și/sau pe pagina de checkout).
- Verifică în documentația/contractul Netopia exact ce cer (au ghid de branding). Fără asta nu aprobă trecerea pe producție.

### 4. Continuarea testelor de securitate
- Primul val e făcut (vezi commit `72b59d9`). De continuat: testare endpoint-uri Payload, rate limiting pe rutele sensibile rămase, verificare permisiuni pe colecții, teste pe fluxul de plată (IPN), eventual un audit cu `/security-review` în Claude Code.

### 5. Integrare SmartBill
- Emitere automată de facturi la plățile confirmate (după IPN-ul Netopia de succes).
- API SmartBill: necesită cont + token; datele de facturare se iau din comandă.

## Instrucțiuni pentru prima conversație cu Claude Code

1. Deschide Claude Code în directorul repo-ului (`isad-academy`, acolo unde e `.git`).
2. Primul prompt recomandat: *„Citește HANDOFF.md și RECOVERY-503.md, apoi explorează structura proiectului ca să înțelegi stack-ul, și fă-mi un plan pentru primul task din lista TODO."*
3. Lucruri importante de știut / de spus lui Claude:
   - Deploy-ul se face prin **GitHub Actions la push pe `main`** — orice push pe main ajunge în producție. Lucrează pe branch dacă nu ești sigur.
   - **Nu adăuga multiplexare SSH (ControlMaster) în CI** — a mai fost și a blocat deploy-urile.
   - Netopia este pe **API v2, sandbox default** — trecerea pe live e o schimbare de config, nu de cod.
   - Convenția de design mobil: Figma mobil = 390px; dimensiunile fixe devin `min(Nvw, Npx)`; pill-urile/butoanele nu se rup pe două rânduri; verifică la 360px.
   - Emailurile merg prin Brevo; Reply-To global din `BREVO_REPLY_TO_EMAIL`.
4. Pentru migrații de bază de date: verifică mecanismul `RUN_MIGRATIONS` documentat în repo — lipsa unei migrații a cauzat incidentul 503.
