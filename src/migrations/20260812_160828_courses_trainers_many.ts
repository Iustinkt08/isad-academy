import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "courses_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"trainers_id" integer
  );
  
  CREATE TABLE "_courses_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"trainers_id" integer
  );
  
  ALTER TABLE "courses" DROP CONSTRAINT "courses_trainer_id_trainers_id_fk";
  
  ALTER TABLE "_courses_v" DROP CONSTRAINT "_courses_v_version_trainer_id_trainers_id_fk";
  
  DROP INDEX "courses_trainer_idx";
  DROP INDEX "_courses_v_version_version_trainer_idx";
  ALTER TABLE "courses_rels" ADD CONSTRAINT "courses_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_rels" ADD CONSTRAINT "courses_rels_trainers_fk" FOREIGN KEY ("trainers_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_rels" ADD CONSTRAINT "_courses_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_rels" ADD CONSTRAINT "_courses_v_rels_trainers_fk" FOREIGN KEY ("trainers_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "courses_rels_order_idx" ON "courses_rels" USING btree ("order");
  CREATE INDEX "courses_rels_parent_idx" ON "courses_rels" USING btree ("parent_id");
  CREATE INDEX "courses_rels_path_idx" ON "courses_rels" USING btree ("path");
  CREATE INDEX "courses_rels_trainers_id_idx" ON "courses_rels" USING btree ("trainers_id");
  CREATE INDEX "_courses_v_rels_order_idx" ON "_courses_v_rels" USING btree ("order");
  CREATE INDEX "_courses_v_rels_parent_idx" ON "_courses_v_rels" USING btree ("parent_id");
  CREATE INDEX "_courses_v_rels_path_idx" ON "_courses_v_rels" USING btree ("path");
  CREATE INDEX "_courses_v_rels_trainers_id_idx" ON "_courses_v_rels" USING btree ("trainers_id");
  ALTER TABLE "courses" DROP COLUMN "trainer_id";
  ALTER TABLE "_courses_v" DROP COLUMN "version_trainer_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "courses_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_courses_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "courses_rels" CASCADE;
  DROP TABLE "_courses_v_rels" CASCADE;
  ALTER TABLE "courses" ADD COLUMN "trainer_id" integer;
  ALTER TABLE "_courses_v" ADD COLUMN "version_trainer_id" integer;
  ALTER TABLE "courses" ADD CONSTRAINT "courses_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_version_trainer_id_trainers_id_fk" FOREIGN KEY ("version_trainer_id") REFERENCES "public"."trainers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "courses_trainer_idx" ON "courses" USING btree ("trainer_id");
  CREATE INDEX "_courses_v_version_version_trainer_idx" ON "_courses_v" USING btree ("version_trainer_id");`)
}
