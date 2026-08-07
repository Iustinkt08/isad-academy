import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "legal_pages_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "legal_pages_blocks_subheading" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "legal_pages_blocks_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "legal_pages_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "legal_pages_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"left" varchar NOT NULL,
  	"right" varchar NOT NULL
  );
  
  CREATE TABLE "legal_pages_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"head_left" varchar NOT NULL,
  	"head_right" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "legal_pages_blocks_entity" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"line1" varchar NOT NULL,
  	"line2" varchar NOT NULL,
  	"block_name" varchar
  );
  
  ALTER TABLE "legal_pages" ALTER COLUMN "page" SET DATA TYPE text;
  DROP TYPE "public"."enum_legal_pages_page";
  CREATE TYPE "public"."enum_legal_pages_page" AS ENUM('terms', 'privacy', 'cookies');
  ALTER TABLE "legal_pages" ALTER COLUMN "page" SET DATA TYPE "public"."enum_legal_pages_page" USING "page"::"public"."enum_legal_pages_page";
  ALTER TABLE "legal_pages_sections" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "legal_pages_locales" ADD COLUMN "meta_title" varchar NOT NULL;
  ALTER TABLE "legal_pages_locales" ADD COLUMN "title_plain" varchar;
  ALTER TABLE "legal_pages_locales" ADD COLUMN "title_gradient" varchar;
  ALTER TABLE "legal_pages_locales" ADD COLUMN "last_updated" varchar;
  ALTER TABLE "legal_pages_blocks_paragraph" ADD CONSTRAINT "legal_pages_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_pages_blocks_subheading" ADD CONSTRAINT "legal_pages_blocks_subheading_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_pages_blocks_list_items" ADD CONSTRAINT "legal_pages_blocks_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages_blocks_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_pages_blocks_list" ADD CONSTRAINT "legal_pages_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_pages_blocks_table_rows" ADD CONSTRAINT "legal_pages_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_pages_blocks_table" ADD CONSTRAINT "legal_pages_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_pages_blocks_entity" ADD CONSTRAINT "legal_pages_blocks_entity_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "legal_pages_blocks_paragraph_order_idx" ON "legal_pages_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "legal_pages_blocks_paragraph_parent_id_idx" ON "legal_pages_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "legal_pages_blocks_paragraph_path_idx" ON "legal_pages_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "legal_pages_blocks_paragraph_locale_idx" ON "legal_pages_blocks_paragraph" USING btree ("_locale");
  CREATE INDEX "legal_pages_blocks_subheading_order_idx" ON "legal_pages_blocks_subheading" USING btree ("_order");
  CREATE INDEX "legal_pages_blocks_subheading_parent_id_idx" ON "legal_pages_blocks_subheading" USING btree ("_parent_id");
  CREATE INDEX "legal_pages_blocks_subheading_path_idx" ON "legal_pages_blocks_subheading" USING btree ("_path");
  CREATE INDEX "legal_pages_blocks_subheading_locale_idx" ON "legal_pages_blocks_subheading" USING btree ("_locale");
  CREATE INDEX "legal_pages_blocks_list_items_order_idx" ON "legal_pages_blocks_list_items" USING btree ("_order");
  CREATE INDEX "legal_pages_blocks_list_items_parent_id_idx" ON "legal_pages_blocks_list_items" USING btree ("_parent_id");
  CREATE INDEX "legal_pages_blocks_list_items_locale_idx" ON "legal_pages_blocks_list_items" USING btree ("_locale");
  CREATE INDEX "legal_pages_blocks_list_order_idx" ON "legal_pages_blocks_list" USING btree ("_order");
  CREATE INDEX "legal_pages_blocks_list_parent_id_idx" ON "legal_pages_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "legal_pages_blocks_list_path_idx" ON "legal_pages_blocks_list" USING btree ("_path");
  CREATE INDEX "legal_pages_blocks_list_locale_idx" ON "legal_pages_blocks_list" USING btree ("_locale");
  CREATE INDEX "legal_pages_blocks_table_rows_order_idx" ON "legal_pages_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "legal_pages_blocks_table_rows_parent_id_idx" ON "legal_pages_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "legal_pages_blocks_table_rows_locale_idx" ON "legal_pages_blocks_table_rows" USING btree ("_locale");
  CREATE INDEX "legal_pages_blocks_table_order_idx" ON "legal_pages_blocks_table" USING btree ("_order");
  CREATE INDEX "legal_pages_blocks_table_parent_id_idx" ON "legal_pages_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "legal_pages_blocks_table_path_idx" ON "legal_pages_blocks_table" USING btree ("_path");
  CREATE INDEX "legal_pages_blocks_table_locale_idx" ON "legal_pages_blocks_table" USING btree ("_locale");
  CREATE INDEX "legal_pages_blocks_entity_order_idx" ON "legal_pages_blocks_entity" USING btree ("_order");
  CREATE INDEX "legal_pages_blocks_entity_parent_id_idx" ON "legal_pages_blocks_entity" USING btree ("_parent_id");
  CREATE INDEX "legal_pages_blocks_entity_path_idx" ON "legal_pages_blocks_entity" USING btree ("_path");
  CREATE INDEX "legal_pages_blocks_entity_locale_idx" ON "legal_pages_blocks_entity" USING btree ("_locale");
  ALTER TABLE "legal_pages_sections" DROP COLUMN "body";
  ALTER TABLE "legal_pages_locales" DROP COLUMN "title";
  ALTER TABLE "legal_pages_locales" DROP COLUMN "intro";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "legal_pages_blocks_paragraph" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_pages_blocks_subheading" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_pages_blocks_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_pages_blocks_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_pages_blocks_table_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_pages_blocks_table" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_pages_blocks_entity" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "legal_pages_blocks_paragraph" CASCADE;
  DROP TABLE "legal_pages_blocks_subheading" CASCADE;
  DROP TABLE "legal_pages_blocks_list_items" CASCADE;
  DROP TABLE "legal_pages_blocks_list" CASCADE;
  DROP TABLE "legal_pages_blocks_table_rows" CASCADE;
  DROP TABLE "legal_pages_blocks_table" CASCADE;
  DROP TABLE "legal_pages_blocks_entity" CASCADE;
  ALTER TABLE "legal_pages" ALTER COLUMN "page" SET DATA TYPE text;
  DROP TYPE "public"."enum_legal_pages_page";
  CREATE TYPE "public"."enum_legal_pages_page" AS ENUM('privacy', 'cookies', 'terms');
  ALTER TABLE "legal_pages" ALTER COLUMN "page" SET DATA TYPE "public"."enum_legal_pages_page" USING "page"::"public"."enum_legal_pages_page";
  ALTER TABLE "legal_pages_sections" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "legal_pages_sections" ADD COLUMN "body" jsonb;
  ALTER TABLE "legal_pages_locales" ADD COLUMN "title" varchar NOT NULL;
  ALTER TABLE "legal_pages_locales" ADD COLUMN "intro" varchar;
  ALTER TABLE "legal_pages_locales" DROP COLUMN "meta_title";
  ALTER TABLE "legal_pages_locales" DROP COLUMN "title_plain";
  ALTER TABLE "legal_pages_locales" DROP COLUMN "title_gradient";
  ALTER TABLE "legal_pages_locales" DROP COLUMN "last_updated";`)
}
