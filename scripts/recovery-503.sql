-- =============================================================================
-- RECUPERARE 503 — isad.academy (incident 2026-07-29 → 2026-07-31)
--
-- CE FACE: aduce baza de producție la schema pe care o așteaptă build-ul deja
-- aflat pe server (cel cu Netopia + Brevo + popup), creând cele 7 tabele lipsă
-- (event_popup*, event_registrations, newsletters) + coloanele/indexurile/FK-urile
-- aferente, și marchează TOATE migrațiile cunoscute ca aplicate în
-- payload_migrations. După rulare + restart, aplicația pornește fără să mai
-- ruleze nicio migrație la boot:
--   - bundle-ul VECHI de pe server (migrațiile 20260727_235321 / 20260729_000347,
--     rupte) le vede înregistrate → le sare → boot curat;
--   - bundle-ul NOU (migrația 20260730_010559 din fix-ul dfc817c) o vede
--     înregistrată → no-op → deploy-urile viitoare pornesc curat.
--
-- DDL-ul este COPIA FIDELĂ a migrației 20260730_010559_event_popup_and_newsletters
-- (generată cu unealta Payload din starea reală a producției, verificată local),
-- cu guards de idempotență (IF NOT EXISTS / duplicate_object) ca scriptul să fie
-- sigur de rulat inclusiv peste o bază parțial reparată manual.
--
-- CUM SE RULEAZĂ (pe server, prin cPanel → Terminal):
--   psql "$DATABASE_URI" -f recovery-503.sql
-- sau linie cu linie în phpPgAdmin (SQL tab), dacă Terminalul nu e disponibil.
-- =============================================================================

BEGIN;

-- Tabelele existente ale aplicației sunt deținute de userul din DATABASE_URI, nu de
-- contul cPanel (isadacad) cu care se conectează psql-pe-socket / phpPgAdmin — iar
-- ALTER TABLE cere proprietarul (prima rulare, 2026-07-31, a picat exact așa:
-- „must be owner of table payload_locked_documents_rels", cu rollback complet).
-- Blocul de mai jos preia automat rolul proprietarului; dacă membership-ul lipsește,
-- anunță și continuă — caz în care rulează scriptul conectat direct cu DATABASE_URI.
DO $$ DECLARE o text; BEGIN
  SELECT tableowner INTO o FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'payload_locked_documents_rels';
  BEGIN
    EXECUTE format('SET ROLE %I', o);
  EXCEPTION WHEN insufficient_privilege THEN
    BEGIN
      -- fără membership direct: încearcă auto-acordarea (merge dacă contul cPanel
      -- are CREATEROLE / admin option pe rolul aplicației), apoi reia SET ROLE
      EXECUTE format('GRANT %I TO %I', o, current_user);
      EXECUTE format('SET ROLE %I', o);
    EXCEPTION WHEN OTHERS THEN
      -- oprire CURATĂ înainte de a crea obiecte cu proprietar greșit (aplicația
      -- n-ar avea drepturi pe ele la runtime) — rulează atunci scriptul conectat
      -- direct cu DATABASE_URI (userul aplicației = proprietarul).
      RAISE EXCEPTION 'Nu pot prelua rolul % — rulează scriptul conectat cu DATABASE_URI.', o;
    END;
  END;
END $$;

-- ---------------------------------------------------------------- tabele noi

CREATE TABLE IF NOT EXISTS "newsletters" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" varchar NOT NULL,
	"preheader" varchar,
	"body" jsonb NOT NULL,
	"send_now" boolean DEFAULT false,
	"sent_at" timestamp(3) with time zone,
	"last_result" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "event_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"occupation" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "event_popup" (
	"id" serial PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT false,
	"event_date" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone
);

CREATE TABLE IF NOT EXISTS "event_popup_speakers" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"photo_id" integer
);

CREATE TABLE IF NOT EXISTS "event_popup_speakers_locales" (
	"role" varchar,
	"id" serial PRIMARY KEY NOT NULL,
	"_locale" "_locales" NOT NULL,
	"_parent_id" varchar NOT NULL
);

CREATE TABLE IF NOT EXISTS "event_popup_occupations" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"_locale" "_locales" NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"label" varchar NOT NULL
);

CREATE TABLE IF NOT EXISTS "event_popup_locales" (
	"title_plain" varchar,
	"title_gradient" varchar,
	"description" varchar,
	"meta_line" varchar,
	"cta_label" varchar,
	"join_label" varchar,
	"id" serial PRIMARY KEY NOT NULL,
	"_locale" "_locales" NOT NULL,
	"_parent_id" integer NOT NULL
);

-- ------------------------------------------- coloane noi pe tabele existente

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "newsletters_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "event_registrations_id" integer;

-- ------------------------------------------------- foreign keys (cu guards)

DO $$ BEGIN
  ALTER TABLE "event_popup_speakers" ADD CONSTRAINT "event_popup_speakers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "event_popup_speakers" ADD CONSTRAINT "event_popup_speakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "event_popup_speakers_locales" ADD CONSTRAINT "event_popup_speakers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup_speakers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "event_popup_occupations" ADD CONSTRAINT "event_popup_occupations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "event_popup_locales" ADD CONSTRAINT "event_popup_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletters_fk" FOREIGN KEY ("newsletters_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_registrations_fk" FOREIGN KEY ("event_registrations_id") REFERENCES "public"."event_registrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------------ indexuri

CREATE INDEX IF NOT EXISTS "newsletters_updated_at_idx" ON "newsletters" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "newsletters_created_at_idx" ON "newsletters" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "event_registrations_event_id_idx" ON "event_registrations" USING btree ("event_id");
CREATE INDEX IF NOT EXISTS "event_registrations_updated_at_idx" ON "event_registrations" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "event_registrations_created_at_idx" ON "event_registrations" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "event_popup_speakers_order_idx" ON "event_popup_speakers" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "event_popup_speakers_parent_id_idx" ON "event_popup_speakers" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "event_popup_speakers_photo_idx" ON "event_popup_speakers" USING btree ("photo_id");
CREATE UNIQUE INDEX IF NOT EXISTS "event_popup_speakers_locales_locale_parent_id_unique" ON "event_popup_speakers_locales" USING btree ("_locale","_parent_id");
CREATE INDEX IF NOT EXISTS "event_popup_occupations_order_idx" ON "event_popup_occupations" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "event_popup_occupations_parent_id_idx" ON "event_popup_occupations" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "event_popup_occupations_locale_idx" ON "event_popup_occupations" USING btree ("_locale");
CREATE UNIQUE INDEX IF NOT EXISTS "event_popup_locales_locale_parent_id_unique" ON "event_popup_locales" USING btree ("_locale","_parent_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_newsletters_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletters_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_event_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("event_registrations_id");

-- ------------------- marchează migrațiile ca aplicate (batch 2, idempotent)
-- Numele vechi (bundle-ul de pe server) + numele nou (fix-ul dfc817c). Payload
-- sare orice migrație al cărei nume există deja în payload_migrations.

INSERT INTO "payload_migrations" ("name", "batch")
SELECT '20260727_235321_event_popup', 2
WHERE NOT EXISTS (SELECT 1 FROM "payload_migrations" WHERE "name" = '20260727_235321_event_popup');

INSERT INTO "payload_migrations" ("name", "batch")
SELECT '20260729_000347_newsletters', 2
WHERE NOT EXISTS (SELECT 1 FROM "payload_migrations" WHERE "name" = '20260729_000347_newsletters');

INSERT INTO "payload_migrations" ("name", "batch")
SELECT '20260730_010559_event_popup_and_newsletters', 2
WHERE NOT EXISTS (SELECT 1 FROM "payload_migrations" WHERE "name" = '20260730_010559_event_popup_and_newsletters');

COMMIT;

-- Verificare rapidă după rulare (opțional):
--   SELECT name, batch FROM payload_migrations ORDER BY id;
--   \dt event_popup*
