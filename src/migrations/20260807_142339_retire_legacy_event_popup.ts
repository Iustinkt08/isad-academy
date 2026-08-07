import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "event_popup_speakers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popup_speakers_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popup_occupations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popup" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popup_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "event_popup_speakers" CASCADE;
  DROP TABLE "event_popup_speakers_locales" CASCADE;
  DROP TABLE "event_popup_occupations" CASCADE;
  DROP TABLE "event_popup" CASCADE;
  DROP TABLE "event_popup_locales" CASCADE;
  DROP INDEX "event_registrations_event_id_idx";
  DROP INDEX "popup_email_idx";
  -- Inscrierile ramase de pe mecanismul vechi nu au popup_id si nu pot fi legate de nimic:
  -- globalul care le dadea identitatea tocmai a fost sters, iar event_id era text liber.
  -- Owner 2026-08-07: inscrierile de pe popup-uri nu conteaza, site-ul nu e inca marketat.
  -- Fara linia de mai jos, ALTER-ul cade si opreste boot-ul (RUN_MIGRATIONS).
  DELETE FROM "event_registrations" WHERE "popup_id" IS NULL;
  ALTER TABLE "event_registrations" ALTER COLUMN "popup_id" SET NOT NULL;
  CREATE UNIQUE INDEX "popup_email_idx" ON "event_registrations" USING btree ("popup_id","email");
  ALTER TABLE "event_registrations" DROP COLUMN "event_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "event_popup_speakers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"photo_id" integer
  );
  
  CREATE TABLE "event_popup_speakers_locales" (
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "event_popup_occupations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "event_popup" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"active" boolean DEFAULT false,
  	"event_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "event_popup_locales" (
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
  
  DROP INDEX "popup_email_idx";
  ALTER TABLE "event_registrations" ALTER COLUMN "popup_id" DROP NOT NULL;
  ALTER TABLE "event_registrations" ADD COLUMN "event_id" varchar NOT NULL;
  ALTER TABLE "event_popup_speakers" ADD CONSTRAINT "event_popup_speakers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_popup_speakers" ADD CONSTRAINT "event_popup_speakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_popup_speakers_locales" ADD CONSTRAINT "event_popup_speakers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup_speakers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_popup_occupations" ADD CONSTRAINT "event_popup_occupations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_popup_locales" ADD CONSTRAINT "event_popup_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "event_popup_speakers_order_idx" ON "event_popup_speakers" USING btree ("_order");
  CREATE INDEX "event_popup_speakers_parent_id_idx" ON "event_popup_speakers" USING btree ("_parent_id");
  CREATE INDEX "event_popup_speakers_photo_idx" ON "event_popup_speakers" USING btree ("photo_id");
  CREATE UNIQUE INDEX "event_popup_speakers_locales_locale_parent_id_unique" ON "event_popup_speakers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "event_popup_occupations_order_idx" ON "event_popup_occupations" USING btree ("_order");
  CREATE INDEX "event_popup_occupations_parent_id_idx" ON "event_popup_occupations" USING btree ("_parent_id");
  CREATE INDEX "event_popup_occupations_locale_idx" ON "event_popup_occupations" USING btree ("_locale");
  CREATE UNIQUE INDEX "event_popup_locales_locale_parent_id_unique" ON "event_popup_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "event_registrations_event_id_idx" ON "event_registrations" USING btree ("event_id");
  CREATE INDEX "popup_email_idx" ON "event_registrations" USING btree ("popup_id","email");`)
}
