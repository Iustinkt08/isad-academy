import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_event_emails_status" AS ENUM('draft', 'sent', 'failed');
  CREATE TABLE "event_emails_failures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email" varchar,
  	"error" varchar
  );
  
  CREATE TABLE "event_emails" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"popup_id" integer NOT NULL,
  	"subject" varchar NOT NULL,
  	"body" jsonb NOT NULL,
  	"send_test_now" boolean DEFAULT false,
  	"send_now" boolean DEFAULT false,
  	"status" "enum_event_emails_status" DEFAULT 'draft',
  	"last_result" varchar,
  	"sent_at" timestamp(3) with time zone,
  	"sent_by_id" integer,
  	"recipient_count" numeric,
  	"success_count" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "event_popups" ADD COLUMN "join_url" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_emails_id" integer;
  ALTER TABLE "event_emails_failures" ADD CONSTRAINT "event_emails_failures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."event_emails"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_emails" ADD CONSTRAINT "event_emails_popup_id_event_popups_id_fk" FOREIGN KEY ("popup_id") REFERENCES "public"."event_popups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_emails" ADD CONSTRAINT "event_emails_sent_by_id_users_id_fk" FOREIGN KEY ("sent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "event_emails_failures_order_idx" ON "event_emails_failures" USING btree ("_order");
  CREATE INDEX "event_emails_failures_parent_id_idx" ON "event_emails_failures" USING btree ("_parent_id");
  CREATE INDEX "event_emails_popup_idx" ON "event_emails" USING btree ("popup_id");
  CREATE INDEX "event_emails_sent_by_idx" ON "event_emails" USING btree ("sent_by_id");
  CREATE INDEX "event_emails_updated_at_idx" ON "event_emails" USING btree ("updated_at");
  CREATE INDEX "event_emails_created_at_idx" ON "event_emails" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_emails_fk" FOREIGN KEY ("event_emails_id") REFERENCES "public"."event_emails"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_event_emails_id_idx" ON "payload_locked_documents_rels" USING btree ("event_emails_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "event_emails_failures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_emails" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "event_emails_failures" CASCADE;
  DROP TABLE "event_emails" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_event_emails_fk";
  
  DROP INDEX "payload_locked_documents_rels_event_emails_id_idx";
  ALTER TABLE "event_popups" DROP COLUMN "join_url";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "event_emails_id";
  DROP TYPE "public"."enum_event_emails_status";`)
}
