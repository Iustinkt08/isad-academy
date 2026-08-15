import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "course_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "courses" ADD COLUMN "category_id" integer;
  ALTER TABLE "courses" ADD COLUMN "category_key" varchar;
  ALTER TABLE "_courses_v" ADD COLUMN "version_category_id" integer;
  ALTER TABLE "_courses_v" ADD COLUMN "version_category_key" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "course_categories_id" integer;
  CREATE UNIQUE INDEX "course_categories_name_idx" ON "course_categories" USING btree ("name");
  CREATE UNIQUE INDEX "course_categories_slug_idx" ON "course_categories" USING btree ("slug");
  CREATE INDEX "course_categories_updated_at_idx" ON "course_categories" USING btree ("updated_at");
  CREATE INDEX "course_categories_created_at_idx" ON "course_categories" USING btree ("created_at");
  ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_course_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."course_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_version_category_id_course_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."course_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_course_categories_fk" FOREIGN KEY ("course_categories_id") REFERENCES "public"."course_categories"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "courses_category_idx" ON "courses" USING btree ("category_id");
  CREATE INDEX "courses_category_key_idx" ON "courses" USING btree ("category_key");
  CREATE INDEX "_courses_v_version_version_category_idx" ON "_courses_v" USING btree ("version_category_id");
  CREATE INDEX "_courses_v_version_version_category_key_idx" ON "_courses_v" USING btree ("version_category_key");
  CREATE INDEX "payload_locked_documents_rels_course_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("course_categories_id");
  -- Hand-written data step (2026-08-15): the four legacy select options become seeded
  -- category docs with the SAME stable slugs, and existing courses (incl. draft versions)
  -- are remapped onto them BEFORE the old enum column is dropped. category_key keeps
  -- the exact old value, so frontend checks (categoryKey === 'iso') see no change.
  INSERT INTO "course_categories" ("name", "slug") VALUES
    ('ISO/IEC 42001 (AI Management)', 'iso'),
    ('Anti-Fraud', 'antiFraud'),
    ('Security', 'security'),
    ('Other', 'other');
  UPDATE "courses" c SET "category_id" = cc."id", "category_key" = c."category"::text
    FROM "course_categories" cc WHERE cc."slug" = c."category"::text;
  UPDATE "_courses_v" v SET "version_category_id" = cc."id", "version_category_key" = v."version_category"::text
    FROM "course_categories" cc WHERE cc."slug" = v."version_category"::text;
  ALTER TABLE "courses" DROP COLUMN "category";
  ALTER TABLE "_courses_v" DROP COLUMN "version_category";
  DROP TYPE "public"."enum_courses_category";
  DROP TYPE "public"."enum__courses_v_version_category";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_courses_category" AS ENUM('iso', 'antiFraud', 'security', 'other');
  CREATE TYPE "public"."enum__courses_v_version_category" AS ENUM('iso', 'antiFraud', 'security', 'other');
  ALTER TABLE "course_categories" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "course_categories" CASCADE;
  ALTER TABLE "courses" DROP CONSTRAINT "courses_category_id_course_categories_id_fk";
  
  ALTER TABLE "_courses_v" DROP CONSTRAINT "_courses_v_version_category_id_course_categories_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_course_categories_fk";
  
  DROP INDEX "courses_category_idx";
  DROP INDEX "courses_category_key_idx";
  DROP INDEX "_courses_v_version_version_category_idx";
  DROP INDEX "_courses_v_version_version_category_key_idx";
  DROP INDEX "payload_locked_documents_rels_course_categories_id_idx";
  ALTER TABLE "courses" ADD COLUMN "category" "enum_courses_category";
  ALTER TABLE "_courses_v" ADD COLUMN "version_category" "enum__courses_v_version_category";
  ALTER TABLE "courses" DROP COLUMN "category_id";
  ALTER TABLE "courses" DROP COLUMN "category_key";
  ALTER TABLE "_courses_v" DROP COLUMN "version_category_id";
  ALTER TABLE "_courses_v" DROP COLUMN "version_category_key";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "course_categories_id";`)
}
