import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "courses_certification_card_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_courses_v_version_certification_card_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "courses_locales" ADD COLUMN "certification_card_title" varchar;
  ALTER TABLE "courses_locales" ADD COLUMN "certification_card_body" varchar;
  ALTER TABLE "_courses_v_locales" ADD COLUMN "version_certification_card_title" varchar;
  ALTER TABLE "_courses_v_locales" ADD COLUMN "version_certification_card_body" varchar;
  ALTER TABLE "courses_certification_card_steps" ADD CONSTRAINT "courses_certification_card_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_certification_card_steps" ADD CONSTRAINT "_courses_v_version_certification_card_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "courses_certification_card_steps_order_idx" ON "courses_certification_card_steps" USING btree ("_order");
  CREATE INDEX "courses_certification_card_steps_parent_id_idx" ON "courses_certification_card_steps" USING btree ("_parent_id");
  CREATE INDEX "courses_certification_card_steps_locale_idx" ON "courses_certification_card_steps" USING btree ("_locale");
  CREATE INDEX "_courses_v_version_certification_card_steps_order_idx" ON "_courses_v_version_certification_card_steps" USING btree ("_order");
  CREATE INDEX "_courses_v_version_certification_card_steps_parent_id_idx" ON "_courses_v_version_certification_card_steps" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_certification_card_steps_locale_idx" ON "_courses_v_version_certification_card_steps" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "courses_certification_card_steps" CASCADE;
  DROP TABLE "_courses_v_version_certification_card_steps" CASCADE;
  ALTER TABLE "courses_locales" DROP COLUMN "certification_card_title";
  ALTER TABLE "courses_locales" DROP COLUMN "certification_card_body";
  ALTER TABLE "_courses_v_locales" DROP COLUMN "version_certification_card_title";
  ALTER TABLE "_courses_v_locales" DROP COLUMN "version_certification_card_body";`)
}
