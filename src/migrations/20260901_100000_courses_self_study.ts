import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "courses" ADD COLUMN "is_self_study" boolean DEFAULT false;
  ALTER TABLE "_courses_v" ADD COLUMN "version_is_self_study" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "courses" DROP COLUMN "is_self_study";
  ALTER TABLE "_courses_v" DROP COLUMN "version_is_self_study";`)
}
