import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_event_popups_status" AS ENUM('draft', 'published', 'archived');
  CREATE TABLE "event_popups_speakers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"photo_id" integer
  );
  
  CREATE TABLE "event_popups_speakers_locales" (
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "event_popups_occupations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "event_popups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"internal_name" varchar NOT NULL,
  	"slug" varchar,
  	"status" "enum_event_popups_status" DEFAULT 'draft' NOT NULL,
  	"display_version" numeric DEFAULT 1,
  	"event_date" timestamp(3) with time zone NOT NULL,
  	"start_showing_at" timestamp(3) with time zone NOT NULL,
  	"show_delay_seconds" numeric DEFAULT 5,
  	"newsletter_opt_in_enabled" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_popups_locales" (
  	"title_plain" varchar,
  	"title_gradient" varchar,
  	"description" varchar,
  	"meta_line" varchar,
  	"cta_label" varchar,
  	"join_label" varchar,
  	"newsletter_consent_text" varchar DEFAULT 'I want to receive news from isad.academy',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "event_registrations" ADD COLUMN "popup_id" integer;
  ALTER TABLE "event_registrations" ADD COLUMN "newsletter_opt_in" boolean DEFAULT false;
  ALTER TABLE "event_registrations" ADD COLUMN "consent_snapshot_consent_text" varchar;
  ALTER TABLE "event_registrations" ADD COLUMN "consent_snapshot_consented_at" timestamp(3) with time zone;
  ALTER TABLE "event_registrations" ADD COLUMN "consent_snapshot_ip" varchar;
  ALTER TABLE "event_registrations" ADD COLUMN "consent_snapshot_user_agent" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_popups_id" integer;
  ALTER TABLE "event_popups_speakers" ADD CONSTRAINT "event_popups_speakers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_popups_speakers" ADD CONSTRAINT "event_popups_speakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_popups_speakers_locales" ADD CONSTRAINT "event_popups_speakers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popups_speakers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_popups_occupations" ADD CONSTRAINT "event_popups_occupations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_popups_locales" ADD CONSTRAINT "event_popups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popups"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "event_popups_speakers_order_idx" ON "event_popups_speakers" USING btree ("_order");
  CREATE INDEX "event_popups_speakers_parent_id_idx" ON "event_popups_speakers" USING btree ("_parent_id");
  CREATE INDEX "event_popups_speakers_photo_idx" ON "event_popups_speakers" USING btree ("photo_id");
  CREATE UNIQUE INDEX "event_popups_speakers_locales_locale_parent_id_unique" ON "event_popups_speakers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "event_popups_occupations_order_idx" ON "event_popups_occupations" USING btree ("_order");
  CREATE INDEX "event_popups_occupations_parent_id_idx" ON "event_popups_occupations" USING btree ("_parent_id");
  CREATE INDEX "event_popups_occupations_locale_idx" ON "event_popups_occupations" USING btree ("_locale");
  CREATE UNIQUE INDEX "event_popups_slug_idx" ON "event_popups" USING btree ("slug");
  CREATE INDEX "event_popups_updated_at_idx" ON "event_popups" USING btree ("updated_at");
  CREATE INDEX "event_popups_created_at_idx" ON "event_popups" USING btree ("created_at");
  CREATE INDEX "status_startShowingAt_idx" ON "event_popups" USING btree ("status","start_showing_at");
  CREATE UNIQUE INDEX "event_popups_locales_locale_parent_id_unique" ON "event_popups_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_popup_id_event_popups_id_fk" FOREIGN KEY ("popup_id") REFERENCES "public"."event_popups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_popups_fk" FOREIGN KEY ("event_popups_id") REFERENCES "public"."event_popups"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "event_registrations_popup_idx" ON "event_registrations" USING btree ("popup_id");
  CREATE INDEX "popup_email_idx" ON "event_registrations" USING btree ("popup_id","email");
  CREATE INDEX "payload_locked_documents_rels_event_popups_id_idx" ON "payload_locked_documents_rels" USING btree ("event_popups_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "event_popups_speakers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popups_speakers_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popups_occupations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popups_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "event_popups_speakers" CASCADE;
  DROP TABLE "event_popups_speakers_locales" CASCADE;
  DROP TABLE "event_popups_occupations" CASCADE;
  DROP TABLE "event_popups" CASCADE;
  DROP TABLE "event_popups_locales" CASCADE;
  ALTER TABLE "event_registrations" DROP CONSTRAINT "event_registrations_popup_id_event_popups_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_event_popups_fk";
  
  DROP INDEX "event_registrations_popup_idx";
  DROP INDEX "popup_email_idx";
  DROP INDEX "payload_locked_documents_rels_event_popups_id_idx";
  ALTER TABLE "event_registrations" DROP COLUMN "popup_id";
  ALTER TABLE "event_registrations" DROP COLUMN "newsletter_opt_in";
  ALTER TABLE "event_registrations" DROP COLUMN "consent_snapshot_consent_text";
  ALTER TABLE "event_registrations" DROP COLUMN "consent_snapshot_consented_at";
  ALTER TABLE "event_registrations" DROP COLUMN "consent_snapshot_ip";
  ALTER TABLE "event_registrations" DROP COLUMN "consent_snapshot_user_agent";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "event_popups_id";
  DROP TYPE "public"."enum_event_popups_status";`)
}
