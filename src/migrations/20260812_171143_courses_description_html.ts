import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "courses_locales" ADD COLUMN "description_html" varchar;
  ALTER TABLE "_courses_v_locales" ADD COLUMN "version_description_html" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "courses_locales" DROP COLUMN "description_html";
  ALTER TABLE "_courses_v_locales" DROP COLUMN "version_description_html";`)
}
