import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "newsletters" (
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
  
  CREATE TABLE "event_registrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" varchar NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"occupation" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
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
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "newsletters_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_registrations_id" integer;
  ALTER TABLE "event_popup_speakers" ADD CONSTRAINT "event_popup_speakers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_popup_speakers" ADD CONSTRAINT "event_popup_speakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_popup_speakers_locales" ADD CONSTRAINT "event_popup_speakers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup_speakers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_popup_occupations" ADD CONSTRAINT "event_popup_occupations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_popup_locales" ADD CONSTRAINT "event_popup_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_popup"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "newsletters_updated_at_idx" ON "newsletters" USING btree ("updated_at");
  CREATE INDEX "newsletters_created_at_idx" ON "newsletters" USING btree ("created_at");
  CREATE INDEX "event_registrations_event_id_idx" ON "event_registrations" USING btree ("event_id");
  CREATE INDEX "event_registrations_updated_at_idx" ON "event_registrations" USING btree ("updated_at");
  CREATE INDEX "event_registrations_created_at_idx" ON "event_registrations" USING btree ("created_at");
  CREATE INDEX "event_popup_speakers_order_idx" ON "event_popup_speakers" USING btree ("_order");
  CREATE INDEX "event_popup_speakers_parent_id_idx" ON "event_popup_speakers" USING btree ("_parent_id");
  CREATE INDEX "event_popup_speakers_photo_idx" ON "event_popup_speakers" USING btree ("photo_id");
  CREATE UNIQUE INDEX "event_popup_speakers_locales_locale_parent_id_unique" ON "event_popup_speakers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "event_popup_occupations_order_idx" ON "event_popup_occupations" USING btree ("_order");
  CREATE INDEX "event_popup_occupations_parent_id_idx" ON "event_popup_occupations" USING btree ("_parent_id");
  CREATE INDEX "event_popup_occupations_locale_idx" ON "event_popup_occupations" USING btree ("_locale");
  CREATE UNIQUE INDEX "event_popup_locales_locale_parent_id_unique" ON "event_popup_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletters_fk" FOREIGN KEY ("newsletters_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_registrations_fk" FOREIGN KEY ("event_registrations_id") REFERENCES "public"."event_registrations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_newsletters_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletters_id");
  CREATE INDEX "payload_locked_documents_rels_event_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("event_registrations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "newsletters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_registrations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popup_speakers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popup_speakers_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popup_occupations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popup" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_popup_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "newsletters" CASCADE;
  DROP TABLE "event_registrations" CASCADE;
  DROP TABLE "event_popup_speakers" CASCADE;
  DROP TABLE "event_popup_speakers_locales" CASCADE;
  DROP TABLE "event_popup_occupations" CASCADE;
  DROP TABLE "event_popup" CASCADE;
  DROP TABLE "event_popup_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_newsletters_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_event_registrations_fk";
  
  DROP INDEX "payload_locked_documents_rels_newsletters_id_idx";
  DROP INDEX "payload_locked_documents_rels_event_registrations_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "newsletters_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "event_registrations_id";`)
}
