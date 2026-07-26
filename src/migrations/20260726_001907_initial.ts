import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'ro');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TYPE "public"."enum_courses_quiz_profile_outcomes" AS ENUM('overview', 'practicalSkills', 'implementationPlan', 'auditPrep', 'certification', 'foundationForMore');
  CREATE TYPE "public"."enum_courses_quiz_profile_domains" AS ENUM('isoManagement', 'quality', 'sustainability', 'riskCompliance', 'infosec', 'ai', 'leadership', 'audit');
  CREATE TYPE "public"."enum_courses_category" AS ENUM('iso', 'antiFraud', 'security', 'other');
  CREATE TYPE "public"."enum_courses_quiz_profile_level" AS ENUM('introductory', 'intermediate', 'advanced', 'specialization');
  CREATE TYPE "public"."enum_courses_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__courses_v_version_quiz_profile_outcomes" AS ENUM('overview', 'practicalSkills', 'implementationPlan', 'auditPrep', 'certification', 'foundationForMore');
  CREATE TYPE "public"."enum__courses_v_version_quiz_profile_domains" AS ENUM('isoManagement', 'quality', 'sustainability', 'riskCompliance', 'infosec', 'ai', 'leadership', 'audit');
  CREATE TYPE "public"."enum__courses_v_version_category" AS ENUM('iso', 'antiFraud', 'security', 'other');
  CREATE TYPE "public"."enum__courses_v_version_quiz_profile_level" AS ENUM('introductory', 'intermediate', 'advanced', 'specialization');
  CREATE TYPE "public"."enum__courses_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__courses_v_published_locale" AS ENUM('en', 'ro');
  CREATE TYPE "public"."enum_orders_pricing_currency" AS ENUM('EUR', 'RON');
  CREATE TYPE "public"."enum_orders_pricing_applied_window" AS ENUM('earlyBird', 'standard');
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('pending', 'confirmed', 'failed', 'refunded');
  CREATE TYPE "public"."enum_discount_codes_type" AS ENUM('general', 'member');
  CREATE TYPE "public"."enum_reviews_source" AS ENUM('emailForm', 'manual');
  CREATE TYPE "public"."enum_partners_type" AS ENUM('accreditation', 'client', 'trainingPartner');
  CREATE TYPE "public"."enum_blog_posts_category" AS ENUM('aiGovernance', 'antiFraud', 'riskManagement', 'other');
  CREATE TYPE "public"."enum_blog_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_posts_v_version_category" AS ENUM('aiGovernance', 'antiFraud', 'riskManagement', 'other');
  CREATE TYPE "public"."enum__blog_posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_posts_v_published_locale" AS ENUM('en', 'ro');
  CREATE TYPE "public"."enum_faq_items_category" AS ENUM('discover', 'learn', 'validate', 'access');
  CREATE TYPE "public"."enum_leads_type" AS ENUM('contact', 'corporate');
  CREATE TYPE "public"."enum_leads_subject" AS ENUM('course', 'corporate', 'certification', 'other');
  CREATE TYPE "public"."enum_legal_pages_page" AS ENUM('privacy', 'cookies', 'terms');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'sendReviewRequests');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'sendReviewRequests');
  CREATE TYPE "public"."enum_site_settings_currency" AS ENUM('EUR', 'RON');
  CREATE TYPE "public"."enum_site_settings_vat_display" AS ENUM('incl', 'excl');
  CREATE TYPE "public"."enum_site_settings_early_bird_display" AS ENUM('bothWindows', 'activeOnly');
  CREATE TYPE "public"."enum_site_settings_stacking_policy" AS ENUM('stackAll', 'bestOf', 'groupMemberStack_codeExclusive');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "enum_users_role" DEFAULT 'admin' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "courses_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "courses_quiz_profile_outcomes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_courses_quiz_profile_outcomes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "courses_quiz_profile_domains" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_courses_quiz_profile_domains",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "courses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"image_id" integer,
  	"duration_hours" numeric,
  	"category" "enum_courses_category",
  	"certification_credits" numeric,
  	"quiz_profile_level" "enum_courses_quiz_profile_level",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_courses_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "courses_locales" (
  	"title" varchar,
  	"short_description" varchar,
  	"description" jsonb,
  	"quiz_profile_quiz_pitch" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_courses_v_version_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v_version_quiz_profile_outcomes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__courses_v_version_quiz_profile_outcomes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_courses_v_version_quiz_profile_domains" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__courses_v_version_quiz_profile_domains",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_courses_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_image_id" integer,
  	"version_duration_hours" numeric,
  	"version_category" "enum__courses_v_version_category",
  	"version_certification_credits" numeric,
  	"version_quiz_profile_level" "enum__courses_v_version_quiz_profile_level",
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__courses_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__courses_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_courses_v_locales" (
  	"version_title" varchar,
  	"version_short_description" varchar,
  	"version_description" jsonb,
  	"version_quiz_profile_quiz_pitch" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "course_sessions_schedule" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"start_time" varchar NOT NULL,
  	"end_time" varchar NOT NULL
  );
  
  CREATE TABLE "course_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"course_id" integer NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"capacity" numeric NOT NULL,
  	"seats_sold" numeric DEFAULT 0,
  	"review_request_sent_at" timestamp(3) with time zone,
  	"early_bird_price" numeric,
  	"early_bird_price_r_o_n" numeric,
  	"early_bird_start_date" timestamp(3) with time zone,
  	"early_bird_end_date" timestamp(3) with time zone,
  	"standard_price" numeric,
  	"standard_price_r_o_n" numeric,
  	"standard_start_date" timestamp(3) with time zone,
  	"standard_end_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_participants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" integer NOT NULL,
  	"quantity" numeric NOT NULL,
  	"buyer_name" varchar NOT NULL,
  	"buyer_email" varchar NOT NULL,
  	"buyer_phone" varchar,
  	"buyer_is_company" boolean DEFAULT false,
  	"buyer_company_name" varchar,
  	"buyer_cui" varchar,
  	"buyer_address" varchar,
  	"pricing_base_price" numeric,
  	"pricing_currency" "enum_orders_pricing_currency",
  	"pricing_applied_window" "enum_orders_pricing_applied_window",
  	"pricing_group_discount" numeric DEFAULT 0,
  	"pricing_member_discount" numeric DEFAULT 0,
  	"pricing_code_id" integer,
  	"pricing_code_discount" numeric DEFAULT 0,
  	"pricing_total" numeric,
  	"payment_status" "enum_orders_payment_status" DEFAULT 'pending' NOT NULL,
  	"provider" varchar,
  	"provider_ref" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"discount_codes_id" integer
  );
  
  CREATE TABLE "discount_codes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"percentage" numeric NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"usage_limit" numeric,
  	"usage_count" numeric DEFAULT 0,
  	"type" "enum_discount_codes_type" DEFAULT 'general' NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"author_name" varchar,
  	"role_company" varchar,
  	"photo_id" integer,
  	"course_id" integer,
  	"source" "enum_reviews_source" DEFAULT 'manual' NOT NULL,
  	"show_on_home" boolean DEFAULT false,
  	"submission_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews_locales" (
  	"text" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "partners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"logo_id" integer,
  	"url" varchar,
  	"order" numeric,
  	"type" "enum_partners_type",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "corporate_clients" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"logo_id" integer,
  	"url" varchar,
  	"order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "blog_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"cover_image_id" integer,
  	"author" varchar DEFAULT 'Dr. Silviu Gresoi',
  	"category" "enum_blog_posts_category",
  	"lead_magnet_enabled" boolean DEFAULT false,
  	"lead_magnet_file_id" integer,
  	"related_course_id" integer,
  	"send_newsletter_on_publish" boolean DEFAULT true,
  	"broadcast_sent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_blog_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "blog_posts_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"body" jsonb,
  	"reading_time" numeric,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_blog_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_cover_image_id" integer,
  	"version_author" varchar DEFAULT 'Dr. Silviu Gresoi',
  	"version_category" "enum__blog_posts_v_version_category",
  	"version_lead_magnet_enabled" boolean DEFAULT false,
  	"version_lead_magnet_file_id" integer,
  	"version_related_course_id" integer,
  	"version_send_newsletter_on_publish" boolean DEFAULT true,
  	"version_broadcast_sent_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__blog_posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__blog_posts_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_blog_posts_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_body" jsonb,
  	"version_reading_time" numeric,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "faq_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" "enum_faq_items_category",
  	"order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "faq_items_locales" (
  	"question" varchar NOT NULL,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_leads_type" NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"message" varchar,
  	"subject" "enum_leads_subject",
  	"company_name" varchar,
  	"contact_person" varchar,
  	"participants_range" varchar,
  	"topic_course_id" integer,
  	"topic_other" varchar,
  	"preferred_period_from" timestamp(3) with time zone,
  	"preferred_period_to" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "legal_pages_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL,
  	"body" jsonb
  );
  
  CREATE TABLE "legal_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"page" "enum_legal_pages_page" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "legal_pages_locales" (
  	"title" varchar NOT NULL,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"courses_id" integer,
  	"course_sessions_id" integer,
  	"orders_id" integer,
  	"discount_codes_id" integer,
  	"reviews_id" integer,
  	"partners_id" integer,
  	"corporate_clients_id" integer,
  	"blog_posts_id" integer,
  	"faq_items_id" integer,
  	"leads_id" integer,
  	"legal_pages_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seats_threshold" numeric DEFAULT 5,
  	"currency" "enum_site_settings_currency" DEFAULT 'EUR',
  	"vat_display" "enum_site_settings_vat_display" DEFAULT 'incl',
  	"early_bird_display" "enum_site_settings_early_bird_display" DEFAULT 'bothWindows',
  	"stacking_policy" "enum_site_settings_stacking_policy" DEFAULT 'stackAll',
  	"member_discount_percent" numeric DEFAULT 0,
  	"legal_entity_name" varchar,
  	"legal_entity_cui" varchar,
  	"legal_entity_address" varchar,
  	"legal_entity_anpc_url" varchar,
  	"legal_entity_sol_url" varchar,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"contact_linkedin" varchar,
  	"analytics_ga4_id" varchar,
  	"analytics_gtm_id" varchar,
  	"analytics_gsc_verification" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "homepage_why_isad_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "homepage_why_isad_differentiators" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "homepage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_cta_link" varchar,
  	"hero_visual_id" integer,
  	"newsletter_lead_magnet_enabled" boolean DEFAULT false,
  	"newsletter_lead_magnet_file_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "homepage_locales" (
  	"hero_title" varchar,
  	"hero_subtitle" varchar,
  	"hero_cta_text" varchar,
  	"newsletter_headline" varchar,
  	"newsletter_invitation_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "homepage_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"courses_id" integer
  );
  
  CREATE TABLE "expert_bio_credentials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "expert_bio" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"photo_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "expert_bio_locales" (
  	"title" varchar,
  	"short_bio" varchar,
  	"full_bio" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
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
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_audience" ADD CONSTRAINT "courses_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_quiz_profile_outcomes" ADD CONSTRAINT "courses_quiz_profile_outcomes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_quiz_profile_domains" ADD CONSTRAINT "courses_quiz_profile_domains_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses" ADD CONSTRAINT "courses_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "courses_locales" ADD CONSTRAINT "courses_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "courses_locales" ADD CONSTRAINT "courses_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_audience" ADD CONSTRAINT "_courses_v_version_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_quiz_profile_outcomes" ADD CONSTRAINT "_courses_v_version_quiz_profile_outcomes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_quiz_profile_domains" ADD CONSTRAINT "_courses_v_version_quiz_profile_domains_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_parent_id_courses_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v_locales" ADD CONSTRAINT "_courses_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v_locales" ADD CONSTRAINT "_courses_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "course_sessions_schedule" ADD CONSTRAINT "course_sessions_schedule_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."course_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_participants" ADD CONSTRAINT "orders_participants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_course_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."course_sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_pricing_code_id_discount_codes_id_fk" FOREIGN KEY ("pricing_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_discount_codes_fk" FOREIGN KEY ("discount_codes_id") REFERENCES "public"."discount_codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews_locales" ADD CONSTRAINT "reviews_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "corporate_clients" ADD CONSTRAINT "corporate_clients_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_lead_magnet_file_id_media_id_fk" FOREIGN KEY ("lead_magnet_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_related_course_id_courses_id_fk" FOREIGN KEY ("related_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts_locales" ADD CONSTRAINT "blog_posts_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts_locales" ADD CONSTRAINT "blog_posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_parent_id_blog_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_lead_magnet_file_id_media_id_fk" FOREIGN KEY ("version_lead_magnet_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_related_course_id_courses_id_fk" FOREIGN KEY ("version_related_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v_locales" ADD CONSTRAINT "_blog_posts_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v_locales" ADD CONSTRAINT "_blog_posts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faq_items_locales" ADD CONSTRAINT "faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_topic_course_id_courses_id_fk" FOREIGN KEY ("topic_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "legal_pages_sections" ADD CONSTRAINT "legal_pages_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_pages_locales" ADD CONSTRAINT "legal_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_courses_fk" FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_course_sessions_fk" FOREIGN KEY ("course_sessions_id") REFERENCES "public"."course_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_discount_codes_fk" FOREIGN KEY ("discount_codes_id") REFERENCES "public"."discount_codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partners_fk" FOREIGN KEY ("partners_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_corporate_clients_fk" FOREIGN KEY ("corporate_clients_id") REFERENCES "public"."corporate_clients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faq_items_fk" FOREIGN KEY ("faq_items_id") REFERENCES "public"."faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legal_pages_fk" FOREIGN KEY ("legal_pages_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_why_isad_stats" ADD CONSTRAINT "homepage_why_isad_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_why_isad_differentiators" ADD CONSTRAINT "homepage_why_isad_differentiators_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_hero_visual_id_media_id_fk" FOREIGN KEY ("hero_visual_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage" ADD CONSTRAINT "homepage_newsletter_lead_magnet_file_id_media_id_fk" FOREIGN KEY ("newsletter_lead_magnet_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "homepage_locales" ADD CONSTRAINT "homepage_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_rels" ADD CONSTRAINT "homepage_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_rels" ADD CONSTRAINT "homepage_rels_courses_fk" FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "expert_bio_credentials" ADD CONSTRAINT "expert_bio_credentials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."expert_bio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "expert_bio" ADD CONSTRAINT "expert_bio_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "expert_bio_locales" ADD CONSTRAINT "expert_bio_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."expert_bio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "certification_info_process" ADD CONSTRAINT "certification_info_process_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."certification_info"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "certification_info" ADD CONSTRAINT "certification_info_apcf_logo_id_media_id_fk" FOREIGN KEY ("apcf_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "certification_info" ADD CONSTRAINT "certification_info_certificate_sample_id_media_id_fk" FOREIGN KEY ("certificate_sample_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "certification_info_locales" ADD CONSTRAINT "certification_info_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."certification_info"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "courses_audience_order_idx" ON "courses_audience" USING btree ("_order");
  CREATE INDEX "courses_audience_parent_id_idx" ON "courses_audience" USING btree ("_parent_id");
  CREATE INDEX "courses_audience_locale_idx" ON "courses_audience" USING btree ("_locale");
  CREATE INDEX "courses_quiz_profile_outcomes_order_idx" ON "courses_quiz_profile_outcomes" USING btree ("order");
  CREATE INDEX "courses_quiz_profile_outcomes_parent_idx" ON "courses_quiz_profile_outcomes" USING btree ("parent_id");
  CREATE INDEX "courses_quiz_profile_domains_order_idx" ON "courses_quiz_profile_domains" USING btree ("order");
  CREATE INDEX "courses_quiz_profile_domains_parent_idx" ON "courses_quiz_profile_domains" USING btree ("parent_id");
  CREATE UNIQUE INDEX "courses_slug_idx" ON "courses" USING btree ("slug");
  CREATE INDEX "courses_image_idx" ON "courses" USING btree ("image_id");
  CREATE INDEX "courses_updated_at_idx" ON "courses" USING btree ("updated_at");
  CREATE INDEX "courses_created_at_idx" ON "courses" USING btree ("created_at");
  CREATE INDEX "courses__status_idx" ON "courses" USING btree ("_status");
  CREATE INDEX "courses_meta_meta_image_idx" ON "courses_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "courses_locales_locale_parent_id_unique" ON "courses_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_courses_v_version_audience_order_idx" ON "_courses_v_version_audience" USING btree ("_order");
  CREATE INDEX "_courses_v_version_audience_parent_id_idx" ON "_courses_v_version_audience" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_audience_locale_idx" ON "_courses_v_version_audience" USING btree ("_locale");
  CREATE INDEX "_courses_v_version_quiz_profile_outcomes_order_idx" ON "_courses_v_version_quiz_profile_outcomes" USING btree ("order");
  CREATE INDEX "_courses_v_version_quiz_profile_outcomes_parent_idx" ON "_courses_v_version_quiz_profile_outcomes" USING btree ("parent_id");
  CREATE INDEX "_courses_v_version_quiz_profile_domains_order_idx" ON "_courses_v_version_quiz_profile_domains" USING btree ("order");
  CREATE INDEX "_courses_v_version_quiz_profile_domains_parent_idx" ON "_courses_v_version_quiz_profile_domains" USING btree ("parent_id");
  CREATE INDEX "_courses_v_parent_idx" ON "_courses_v" USING btree ("parent_id");
  CREATE INDEX "_courses_v_version_version_slug_idx" ON "_courses_v" USING btree ("version_slug");
  CREATE INDEX "_courses_v_version_version_image_idx" ON "_courses_v" USING btree ("version_image_id");
  CREATE INDEX "_courses_v_version_version_updated_at_idx" ON "_courses_v" USING btree ("version_updated_at");
  CREATE INDEX "_courses_v_version_version_created_at_idx" ON "_courses_v" USING btree ("version_created_at");
  CREATE INDEX "_courses_v_version_version__status_idx" ON "_courses_v" USING btree ("version__status");
  CREATE INDEX "_courses_v_created_at_idx" ON "_courses_v" USING btree ("created_at");
  CREATE INDEX "_courses_v_updated_at_idx" ON "_courses_v" USING btree ("updated_at");
  CREATE INDEX "_courses_v_snapshot_idx" ON "_courses_v" USING btree ("snapshot");
  CREATE INDEX "_courses_v_published_locale_idx" ON "_courses_v" USING btree ("published_locale");
  CREATE INDEX "_courses_v_latest_idx" ON "_courses_v" USING btree ("latest");
  CREATE INDEX "_courses_v_version_meta_version_meta_image_idx" ON "_courses_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_courses_v_locales_locale_parent_id_unique" ON "_courses_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "course_sessions_schedule_order_idx" ON "course_sessions_schedule" USING btree ("_order");
  CREATE INDEX "course_sessions_schedule_parent_id_idx" ON "course_sessions_schedule" USING btree ("_parent_id");
  CREATE INDEX "course_sessions_course_idx" ON "course_sessions" USING btree ("course_id");
  CREATE INDEX "course_sessions_updated_at_idx" ON "course_sessions" USING btree ("updated_at");
  CREATE INDEX "course_sessions_created_at_idx" ON "course_sessions" USING btree ("created_at");
  CREATE INDEX "orders_participants_order_idx" ON "orders_participants" USING btree ("_order");
  CREATE INDEX "orders_participants_parent_id_idx" ON "orders_participants" USING btree ("_parent_id");
  CREATE INDEX "orders_session_idx" ON "orders" USING btree ("session_id");
  CREATE INDEX "orders_pricing_pricing_code_idx" ON "orders" USING btree ("pricing_code_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "orders_rels_order_idx" ON "orders_rels" USING btree ("order");
  CREATE INDEX "orders_rels_parent_idx" ON "orders_rels" USING btree ("parent_id");
  CREATE INDEX "orders_rels_path_idx" ON "orders_rels" USING btree ("path");
  CREATE INDEX "orders_rels_discount_codes_id_idx" ON "orders_rels" USING btree ("discount_codes_id");
  CREATE UNIQUE INDEX "discount_codes_code_idx" ON "discount_codes" USING btree ("code");
  CREATE INDEX "discount_codes_updated_at_idx" ON "discount_codes" USING btree ("updated_at");
  CREATE INDEX "discount_codes_created_at_idx" ON "discount_codes" USING btree ("created_at");
  CREATE INDEX "reviews_photo_idx" ON "reviews" USING btree ("photo_id");
  CREATE INDEX "reviews_course_idx" ON "reviews" USING btree ("course_id");
  CREATE UNIQUE INDEX "reviews_submission_key_idx" ON "reviews" USING btree ("submission_key");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "reviews_locales_locale_parent_id_unique" ON "reviews_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "partners_logo_idx" ON "partners" USING btree ("logo_id");
  CREATE INDEX "partners_updated_at_idx" ON "partners" USING btree ("updated_at");
  CREATE INDEX "partners_created_at_idx" ON "partners" USING btree ("created_at");
  CREATE INDEX "corporate_clients_logo_idx" ON "corporate_clients" USING btree ("logo_id");
  CREATE INDEX "corporate_clients_updated_at_idx" ON "corporate_clients" USING btree ("updated_at");
  CREATE INDEX "corporate_clients_created_at_idx" ON "corporate_clients" USING btree ("created_at");
  CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");
  CREATE INDEX "blog_posts_cover_image_idx" ON "blog_posts" USING btree ("cover_image_id");
  CREATE INDEX "blog_posts_lead_magnet_lead_magnet_file_idx" ON "blog_posts" USING btree ("lead_magnet_file_id");
  CREATE INDEX "blog_posts_related_course_idx" ON "blog_posts" USING btree ("related_course_id");
  CREATE INDEX "blog_posts_updated_at_idx" ON "blog_posts" USING btree ("updated_at");
  CREATE INDEX "blog_posts_created_at_idx" ON "blog_posts" USING btree ("created_at");
  CREATE INDEX "blog_posts__status_idx" ON "blog_posts" USING btree ("_status");
  CREATE INDEX "blog_posts_meta_meta_image_idx" ON "blog_posts_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "blog_posts_locales_locale_parent_id_unique" ON "blog_posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_blog_posts_v_parent_idx" ON "_blog_posts_v" USING btree ("parent_id");
  CREATE INDEX "_blog_posts_v_version_version_slug_idx" ON "_blog_posts_v" USING btree ("version_slug");
  CREATE INDEX "_blog_posts_v_version_version_cover_image_idx" ON "_blog_posts_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_blog_posts_v_version_lead_magnet_version_lead_magnet_fi_idx" ON "_blog_posts_v" USING btree ("version_lead_magnet_file_id");
  CREATE INDEX "_blog_posts_v_version_version_related_course_idx" ON "_blog_posts_v" USING btree ("version_related_course_id");
  CREATE INDEX "_blog_posts_v_version_version_updated_at_idx" ON "_blog_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_blog_posts_v_version_version_created_at_idx" ON "_blog_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_blog_posts_v_version_version__status_idx" ON "_blog_posts_v" USING btree ("version__status");
  CREATE INDEX "_blog_posts_v_created_at_idx" ON "_blog_posts_v" USING btree ("created_at");
  CREATE INDEX "_blog_posts_v_updated_at_idx" ON "_blog_posts_v" USING btree ("updated_at");
  CREATE INDEX "_blog_posts_v_snapshot_idx" ON "_blog_posts_v" USING btree ("snapshot");
  CREATE INDEX "_blog_posts_v_published_locale_idx" ON "_blog_posts_v" USING btree ("published_locale");
  CREATE INDEX "_blog_posts_v_latest_idx" ON "_blog_posts_v" USING btree ("latest");
  CREATE INDEX "_blog_posts_v_version_meta_version_meta_image_idx" ON "_blog_posts_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_blog_posts_v_locales_locale_parent_id_unique" ON "_blog_posts_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faq_items_updated_at_idx" ON "faq_items" USING btree ("updated_at");
  CREATE INDEX "faq_items_created_at_idx" ON "faq_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "faq_items_locales_locale_parent_id_unique" ON "faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "leads_topic_course_idx" ON "leads" USING btree ("topic_course_id");
  CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");
  CREATE INDEX "legal_pages_sections_order_idx" ON "legal_pages_sections" USING btree ("_order");
  CREATE INDEX "legal_pages_sections_parent_id_idx" ON "legal_pages_sections" USING btree ("_parent_id");
  CREATE INDEX "legal_pages_sections_locale_idx" ON "legal_pages_sections" USING btree ("_locale");
  CREATE UNIQUE INDEX "legal_pages_page_idx" ON "legal_pages" USING btree ("page");
  CREATE INDEX "legal_pages_updated_at_idx" ON "legal_pages" USING btree ("updated_at");
  CREATE INDEX "legal_pages_created_at_idx" ON "legal_pages" USING btree ("created_at");
  CREATE UNIQUE INDEX "legal_pages_locales_locale_parent_id_unique" ON "legal_pages_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_courses_id_idx" ON "payload_locked_documents_rels" USING btree ("courses_id");
  CREATE INDEX "payload_locked_documents_rels_course_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("course_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_discount_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("discount_codes_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_partners_id_idx" ON "payload_locked_documents_rels" USING btree ("partners_id");
  CREATE INDEX "payload_locked_documents_rels_corporate_clients_id_idx" ON "payload_locked_documents_rels" USING btree ("corporate_clients_id");
  CREATE INDEX "payload_locked_documents_rels_blog_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_posts_id");
  CREATE INDEX "payload_locked_documents_rels_faq_items_id_idx" ON "payload_locked_documents_rels" USING btree ("faq_items_id");
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_legal_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("legal_pages_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "homepage_why_isad_stats_order_idx" ON "homepage_why_isad_stats" USING btree ("_order");
  CREATE INDEX "homepage_why_isad_stats_parent_id_idx" ON "homepage_why_isad_stats" USING btree ("_parent_id");
  CREATE INDEX "homepage_why_isad_stats_locale_idx" ON "homepage_why_isad_stats" USING btree ("_locale");
  CREATE INDEX "homepage_why_isad_differentiators_order_idx" ON "homepage_why_isad_differentiators" USING btree ("_order");
  CREATE INDEX "homepage_why_isad_differentiators_parent_id_idx" ON "homepage_why_isad_differentiators" USING btree ("_parent_id");
  CREATE INDEX "homepage_why_isad_differentiators_locale_idx" ON "homepage_why_isad_differentiators" USING btree ("_locale");
  CREATE INDEX "homepage_hero_hero_visual_idx" ON "homepage" USING btree ("hero_visual_id");
  CREATE INDEX "homepage_newsletter_lead_magnet_newsletter_lead_magnet_f_idx" ON "homepage" USING btree ("newsletter_lead_magnet_file_id");
  CREATE UNIQUE INDEX "homepage_locales_locale_parent_id_unique" ON "homepage_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "homepage_rels_order_idx" ON "homepage_rels" USING btree ("order");
  CREATE INDEX "homepage_rels_parent_idx" ON "homepage_rels" USING btree ("parent_id");
  CREATE INDEX "homepage_rels_path_idx" ON "homepage_rels" USING btree ("path");
  CREATE INDEX "homepage_rels_courses_id_idx" ON "homepage_rels" USING btree ("courses_id");
  CREATE INDEX "expert_bio_credentials_order_idx" ON "expert_bio_credentials" USING btree ("_order");
  CREATE INDEX "expert_bio_credentials_parent_id_idx" ON "expert_bio_credentials" USING btree ("_parent_id");
  CREATE INDEX "expert_bio_credentials_locale_idx" ON "expert_bio_credentials" USING btree ("_locale");
  CREATE INDEX "expert_bio_photo_idx" ON "expert_bio" USING btree ("photo_id");
  CREATE UNIQUE INDEX "expert_bio_locales_locale_parent_id_unique" ON "expert_bio_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "certification_info_process_order_idx" ON "certification_info_process" USING btree ("_order");
  CREATE INDEX "certification_info_process_parent_id_idx" ON "certification_info_process" USING btree ("_parent_id");
  CREATE INDEX "certification_info_process_locale_idx" ON "certification_info_process" USING btree ("_locale");
  CREATE INDEX "certification_info_apcf_logo_idx" ON "certification_info" USING btree ("apcf_logo_id");
  CREATE INDEX "certification_info_certificate_sample_idx" ON "certification_info" USING btree ("certificate_sample_id");
  CREATE UNIQUE INDEX "certification_info_locales_locale_parent_id_unique" ON "certification_info_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "courses_audience" CASCADE;
  DROP TABLE "courses_quiz_profile_outcomes" CASCADE;
  DROP TABLE "courses_quiz_profile_domains" CASCADE;
  DROP TABLE "courses" CASCADE;
  DROP TABLE "courses_locales" CASCADE;
  DROP TABLE "_courses_v_version_audience" CASCADE;
  DROP TABLE "_courses_v_version_quiz_profile_outcomes" CASCADE;
  DROP TABLE "_courses_v_version_quiz_profile_domains" CASCADE;
  DROP TABLE "_courses_v" CASCADE;
  DROP TABLE "_courses_v_locales" CASCADE;
  DROP TABLE "course_sessions_schedule" CASCADE;
  DROP TABLE "course_sessions" CASCADE;
  DROP TABLE "orders_participants" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "orders_rels" CASCADE;
  DROP TABLE "discount_codes" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "reviews_locales" CASCADE;
  DROP TABLE "partners" CASCADE;
  DROP TABLE "corporate_clients" CASCADE;
  DROP TABLE "blog_posts" CASCADE;
  DROP TABLE "blog_posts_locales" CASCADE;
  DROP TABLE "_blog_posts_v" CASCADE;
  DROP TABLE "_blog_posts_v_locales" CASCADE;
  DROP TABLE "faq_items" CASCADE;
  DROP TABLE "faq_items_locales" CASCADE;
  DROP TABLE "leads" CASCADE;
  DROP TABLE "legal_pages_sections" CASCADE;
  DROP TABLE "legal_pages" CASCADE;
  DROP TABLE "legal_pages_locales" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "homepage_why_isad_stats" CASCADE;
  DROP TABLE "homepage_why_isad_differentiators" CASCADE;
  DROP TABLE "homepage" CASCADE;
  DROP TABLE "homepage_locales" CASCADE;
  DROP TABLE "homepage_rels" CASCADE;
  DROP TABLE "expert_bio_credentials" CASCADE;
  DROP TABLE "expert_bio" CASCADE;
  DROP TABLE "expert_bio_locales" CASCADE;
  DROP TABLE "certification_info_process" CASCADE;
  DROP TABLE "certification_info" CASCADE;
  DROP TABLE "certification_info_locales" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_courses_quiz_profile_outcomes";
  DROP TYPE "public"."enum_courses_quiz_profile_domains";
  DROP TYPE "public"."enum_courses_category";
  DROP TYPE "public"."enum_courses_quiz_profile_level";
  DROP TYPE "public"."enum_courses_status";
  DROP TYPE "public"."enum__courses_v_version_quiz_profile_outcomes";
  DROP TYPE "public"."enum__courses_v_version_quiz_profile_domains";
  DROP TYPE "public"."enum__courses_v_version_category";
  DROP TYPE "public"."enum__courses_v_version_quiz_profile_level";
  DROP TYPE "public"."enum__courses_v_version_status";
  DROP TYPE "public"."enum__courses_v_published_locale";
  DROP TYPE "public"."enum_orders_pricing_currency";
  DROP TYPE "public"."enum_orders_pricing_applied_window";
  DROP TYPE "public"."enum_orders_payment_status";
  DROP TYPE "public"."enum_discount_codes_type";
  DROP TYPE "public"."enum_reviews_source";
  DROP TYPE "public"."enum_partners_type";
  DROP TYPE "public"."enum_blog_posts_category";
  DROP TYPE "public"."enum_blog_posts_status";
  DROP TYPE "public"."enum__blog_posts_v_version_category";
  DROP TYPE "public"."enum__blog_posts_v_version_status";
  DROP TYPE "public"."enum__blog_posts_v_published_locale";
  DROP TYPE "public"."enum_faq_items_category";
  DROP TYPE "public"."enum_leads_type";
  DROP TYPE "public"."enum_leads_subject";
  DROP TYPE "public"."enum_legal_pages_page";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_site_settings_currency";
  DROP TYPE "public"."enum_site_settings_vat_display";
  DROP TYPE "public"."enum_site_settings_early_bird_display";
  DROP TYPE "public"."enum_site_settings_stacking_policy";`)
}
