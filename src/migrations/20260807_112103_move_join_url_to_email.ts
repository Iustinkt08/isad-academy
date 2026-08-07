import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "event_emails" ADD COLUMN "join_url" varchar;
  ALTER TABLE "event_popups" DROP COLUMN "join_url";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "event_popups" ADD COLUMN "join_url" varchar;
  ALTER TABLE "event_emails" DROP COLUMN "join_url";`)
}
