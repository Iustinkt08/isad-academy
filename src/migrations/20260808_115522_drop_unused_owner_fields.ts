import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "courses" DROP CONSTRAINT "courses_image_id_media_id_fk";
  
  ALTER TABLE "_courses_v" DROP CONSTRAINT "_courses_v_version_image_id_media_id_fk";
  
  ALTER TABLE "homepage" DROP CONSTRAINT "homepage_hero_visual_id_media_id_fk";
  
  DROP INDEX "courses_image_idx";
  DROP INDEX "_courses_v_version_version_image_idx";
  DROP INDEX "homepage_hero_hero_visual_idx";
  ALTER TABLE "courses" DROP COLUMN "image_id";
  ALTER TABLE "_courses_v" DROP COLUMN "version_image_id";
  ALTER TABLE "site_settings" DROP COLUMN "member_discount_percent";
  ALTER TABLE "homepage" DROP COLUMN "hero_visual_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "courses" ADD COLUMN "image_id" integer;
  ALTER TABLE "_courses_v" ADD COLUMN "version_image_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "member_discount_percent" numeric DEFAULT 0;
  ALTER TABLE "homepage" ADD COLUMN "hero_visual_id" integer;
  ALTER TABLE "courses" ADD CONSTRAINT "courses_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_hero_visual_id_media_id_fk" FOREIGN KEY ("hero_visual_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "courses_image_idx" ON "courses" USING btree ("image_id");
  CREATE INDEX "_courses_v_version_version_image_idx" ON "_courses_v" USING btree ("version_image_id");
  CREATE INDEX "homepage_hero_hero_visual_idx" ON "homepage" USING btree ("hero_visual_id");`)
}
