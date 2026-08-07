import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "corporate_clients" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "certification_info_process" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "certification_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "certification_info_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "corporate_clients" CASCADE;
  DROP TABLE "certification_info_process" CASCADE;
  DROP TABLE "certification_info" CASCADE;
  DROP TABLE "certification_info_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_corporate_clients_fk";
  
  DROP INDEX "payload_locked_documents_rels_corporate_clients_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "corporate_clients_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "corporate_clients" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"logo_id" integer,
  	"url" varchar,
  	"order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "certification_info_process" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "certification_info" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"issuer" varchar DEFAULT 'APCF',
  	"apcf_logo_id" integer,
  	"certificate_sample_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "certification_info_locales" (
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "corporate_clients_id" integer;
  ALTER TABLE "corporate_clients" ADD CONSTRAINT "corporate_clients_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "certification_info_process" ADD CONSTRAINT "certification_info_process_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."certification_info"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "certification_info" ADD CONSTRAINT "certification_info_apcf_logo_id_media_id_fk" FOREIGN KEY ("apcf_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "certification_info" ADD CONSTRAINT "certification_info_certificate_sample_id_media_id_fk" FOREIGN KEY ("certificate_sample_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "certification_info_locales" ADD CONSTRAINT "certification_info_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."certification_info"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "corporate_clients_logo_idx" ON "corporate_clients" USING btree ("logo_id");
  CREATE INDEX "corporate_clients_updated_at_idx" ON "corporate_clients" USING btree ("updated_at");
  CREATE INDEX "corporate_clients_created_at_idx" ON "corporate_clients" USING btree ("created_at");
  CREATE INDEX "certification_info_process_order_idx" ON "certification_info_process" USING btree ("_order");
  CREATE INDEX "certification_info_process_parent_id_idx" ON "certification_info_process" USING btree ("_parent_id");
  CREATE INDEX "certification_info_process_locale_idx" ON "certification_info_process" USING btree ("_locale");
  CREATE INDEX "certification_info_apcf_logo_idx" ON "certification_info" USING btree ("apcf_logo_id");
  CREATE INDEX "certification_info_certificate_sample_idx" ON "certification_info" USING btree ("certificate_sample_id");
  CREATE UNIQUE INDEX "certification_info_locales_locale_parent_id_unique" ON "certification_info_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_corporate_clients_fk" FOREIGN KEY ("corporate_clients_id") REFERENCES "public"."corporate_clients"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_corporate_clients_id_idx" ON "payload_locked_documents_rels" USING btree ("corporate_clients_id");`)
}
