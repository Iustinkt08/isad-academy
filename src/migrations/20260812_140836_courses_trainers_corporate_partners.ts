import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_corporate_page_form_fields_field_type" AS ENUM('text', 'email', 'phone', 'textarea', 'select', 'courseTopic', 'period');
  CREATE TABLE "trainers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"photo_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "trainers_locales" (
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "partners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"logo_id" integer NOT NULL,
  	"show_on_home" boolean DEFAULT true,
  	"show_on_corporate" boolean DEFAULT false,
  	"url" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "leads_form_data" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "corporate_page_benefits_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "corporate_page_benefits_items_locales" (
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "corporate_page_benefits_industries" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "corporate_page_benefits_industries_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "corporate_page_form_fields_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "corporate_page_form_fields_options_locales" (
  	"option" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "corporate_page_form_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field_type" "enum_corporate_page_form_fields_field_type" DEFAULT 'text' NOT NULL,
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "corporate_page_form_fields_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "corporate_page_aside_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "corporate_page_aside_steps_locales" (
  	"text" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "corporate_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "corporate_page_locales" (
  	"hero_pill" varchar,
  	"hero_title_top" varchar,
  	"hero_title_bottom_prefix" varchar,
  	"hero_title_bottom_highlight" varchar,
  	"hero_subtitle" varchar,
  	"hero_cta_primary" varchar,
  	"hero_cta_secondary" varchar,
  	"benefits_title_plain" varchar,
  	"benefits_title_highlight" varchar,
  	"benefits_ideal_for" varchar,
  	"form_title" varchar,
  	"form_subtitle" varchar,
  	"aside_next_title" varchar,
  	"aside_talk_title" varchar,
  	"aside_talk_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "courses" ADD COLUMN "trainer_id" integer;
  ALTER TABLE "courses_locales" ADD COLUMN "callouts_team_title" varchar;
  ALTER TABLE "courses_locales" ADD COLUMN "callouts_team_body" varchar;
  ALTER TABLE "courses_locales" ADD COLUMN "callouts_questions_title" varchar;
  ALTER TABLE "courses_locales" ADD COLUMN "callouts_questions_body" varchar;
  ALTER TABLE "_courses_v" ADD COLUMN "version_trainer_id" integer;
  ALTER TABLE "_courses_v_locales" ADD COLUMN "version_callouts_team_title" varchar;
  ALTER TABLE "_courses_v_locales" ADD COLUMN "version_callouts_team_body" varchar;
  ALTER TABLE "_courses_v_locales" ADD COLUMN "version_callouts_questions_title" varchar;
  ALTER TABLE "_courses_v_locales" ADD COLUMN "version_callouts_questions_body" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "trainers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "partners_id" integer;
  ALTER TABLE "trainers" ADD CONSTRAINT "trainers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "trainers_locales" ADD CONSTRAINT "trainers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads_form_data" ADD CONSTRAINT "leads_form_data_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_benefits_items" ADD CONSTRAINT "corporate_page_benefits_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_benefits_items_locales" ADD CONSTRAINT "corporate_page_benefits_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page_benefits_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_benefits_industries" ADD CONSTRAINT "corporate_page_benefits_industries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_benefits_industries_locales" ADD CONSTRAINT "corporate_page_benefits_industries_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page_benefits_industries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_form_fields_options" ADD CONSTRAINT "corporate_page_form_fields_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page_form_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_form_fields_options_locales" ADD CONSTRAINT "corporate_page_form_fields_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page_form_fields_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_form_fields" ADD CONSTRAINT "corporate_page_form_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_form_fields_locales" ADD CONSTRAINT "corporate_page_form_fields_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page_form_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_aside_steps" ADD CONSTRAINT "corporate_page_aside_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_aside_steps_locales" ADD CONSTRAINT "corporate_page_aside_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page_aside_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corporate_page_locales" ADD CONSTRAINT "corporate_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corporate_page"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "trainers_photo_idx" ON "trainers" USING btree ("photo_id");
  CREATE INDEX "trainers_updated_at_idx" ON "trainers" USING btree ("updated_at");
  CREATE INDEX "trainers_created_at_idx" ON "trainers" USING btree ("created_at");
  CREATE UNIQUE INDEX "trainers_locales_locale_parent_id_unique" ON "trainers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "partners_logo_idx" ON "partners" USING btree ("logo_id");
  CREATE INDEX "partners_updated_at_idx" ON "partners" USING btree ("updated_at");
  CREATE INDEX "partners_created_at_idx" ON "partners" USING btree ("created_at");
  CREATE INDEX "leads_form_data_order_idx" ON "leads_form_data" USING btree ("_order");
  CREATE INDEX "leads_form_data_parent_id_idx" ON "leads_form_data" USING btree ("_parent_id");
  CREATE INDEX "corporate_page_benefits_items_order_idx" ON "corporate_page_benefits_items" USING btree ("_order");
  CREATE INDEX "corporate_page_benefits_items_parent_id_idx" ON "corporate_page_benefits_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "corporate_page_benefits_items_locales_locale_parent_id_uniqu" ON "corporate_page_benefits_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "corporate_page_benefits_industries_order_idx" ON "corporate_page_benefits_industries" USING btree ("_order");
  CREATE INDEX "corporate_page_benefits_industries_parent_id_idx" ON "corporate_page_benefits_industries" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "corporate_page_benefits_industries_locales_locale_parent_id_" ON "corporate_page_benefits_industries_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "corporate_page_form_fields_options_order_idx" ON "corporate_page_form_fields_options" USING btree ("_order");
  CREATE INDEX "corporate_page_form_fields_options_parent_id_idx" ON "corporate_page_form_fields_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "corporate_page_form_fields_options_locales_locale_parent_id_" ON "corporate_page_form_fields_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "corporate_page_form_fields_order_idx" ON "corporate_page_form_fields" USING btree ("_order");
  CREATE INDEX "corporate_page_form_fields_parent_id_idx" ON "corporate_page_form_fields" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "corporate_page_form_fields_locales_locale_parent_id_unique" ON "corporate_page_form_fields_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "corporate_page_aside_steps_order_idx" ON "corporate_page_aside_steps" USING btree ("_order");
  CREATE INDEX "corporate_page_aside_steps_parent_id_idx" ON "corporate_page_aside_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "corporate_page_aside_steps_locales_locale_parent_id_unique" ON "corporate_page_aside_steps_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "corporate_page_locales_locale_parent_id_unique" ON "corporate_page_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "courses" ADD CONSTRAINT "courses_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_version_trainer_id_trainers_id_fk" FOREIGN KEY ("version_trainer_id") REFERENCES "public"."trainers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_trainers_fk" FOREIGN KEY ("trainers_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partners_fk" FOREIGN KEY ("partners_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "courses_trainer_idx" ON "courses" USING btree ("trainer_id");
  CREATE INDEX "_courses_v_version_version_trainer_idx" ON "_courses_v" USING btree ("version_trainer_id");
  CREATE INDEX "payload_locked_documents_rels_trainers_id_idx" ON "payload_locked_documents_rels" USING btree ("trainers_id");
  CREATE INDEX "payload_locked_documents_rels_partners_id_idx" ON "payload_locked_documents_rels" USING btree ("partners_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "trainers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "trainers_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "partners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "leads_form_data" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_benefits_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_benefits_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_benefits_industries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_benefits_industries_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_form_fields_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_form_fields_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_form_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_form_fields_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_aside_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_aside_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "corporate_page_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "trainers" CASCADE;
  DROP TABLE "trainers_locales" CASCADE;
  DROP TABLE "partners" CASCADE;
  DROP TABLE "leads_form_data" CASCADE;
  DROP TABLE "corporate_page_benefits_items" CASCADE;
  DROP TABLE "corporate_page_benefits_items_locales" CASCADE;
  DROP TABLE "corporate_page_benefits_industries" CASCADE;
  DROP TABLE "corporate_page_benefits_industries_locales" CASCADE;
  DROP TABLE "corporate_page_form_fields_options" CASCADE;
  DROP TABLE "corporate_page_form_fields_options_locales" CASCADE;
  DROP TABLE "corporate_page_form_fields" CASCADE;
  DROP TABLE "corporate_page_form_fields_locales" CASCADE;
  DROP TABLE "corporate_page_aside_steps" CASCADE;
  DROP TABLE "corporate_page_aside_steps_locales" CASCADE;
  DROP TABLE "corporate_page" CASCADE;
  DROP TABLE "corporate_page_locales" CASCADE;
  ALTER TABLE "courses" DROP CONSTRAINT "courses_trainer_id_trainers_id_fk";
  
  ALTER TABLE "_courses_v" DROP CONSTRAINT "_courses_v_version_trainer_id_trainers_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_trainers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_partners_fk";
  
  DROP INDEX "courses_trainer_idx";
  DROP INDEX "_courses_v_version_version_trainer_idx";
  DROP INDEX "payload_locked_documents_rels_trainers_id_idx";
  DROP INDEX "payload_locked_documents_rels_partners_id_idx";
  ALTER TABLE "courses" DROP COLUMN "trainer_id";
  ALTER TABLE "courses_locales" DROP COLUMN "callouts_team_title";
  ALTER TABLE "courses_locales" DROP COLUMN "callouts_team_body";
  ALTER TABLE "courses_locales" DROP COLUMN "callouts_questions_title";
  ALTER TABLE "courses_locales" DROP COLUMN "callouts_questions_body";
  ALTER TABLE "_courses_v" DROP COLUMN "version_trainer_id";
  ALTER TABLE "_courses_v_locales" DROP COLUMN "version_callouts_team_title";
  ALTER TABLE "_courses_v_locales" DROP COLUMN "version_callouts_team_body";
  ALTER TABLE "_courses_v_locales" DROP COLUMN "version_callouts_questions_title";
  ALTER TABLE "_courses_v_locales" DROP COLUMN "version_callouts_questions_body";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "trainers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "partners_id";
  DROP TYPE "public"."enum_corporate_page_form_fields_field_type";`)
}
