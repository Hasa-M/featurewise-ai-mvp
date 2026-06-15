CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "FeatureOrigin" AS ENUM ('brand_new', 'mapped_existing');
CREATE TYPE "AssetType" AS ENUM ('image', 'file');
CREATE TYPE "SpecRunKind" AS ENUM ('generation', 'consolidation');
CREATE TYPE "SpecRunStatus" AS ENUM (
  'queued',
  'preparing_context',
  'calling_llm',
  'validating_output',
  'repairing_output',
  'checking_quality',
  'persisting',
  'completed',
  'failed'
);
CREATE TYPE "LlmCallPurpose" AS ENUM ('generation', 'schema_repair');
CREATE TYPE "LlmCallOutcome" AS ENUM ('success', 'error');

CREATE TABLE "organization" (
  "organization_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "organization_pkey" PRIMARY KEY ("organization_id")
);

CREATE TABLE "user" (
  "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "project" (
  "project_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "project_pkey" PRIMARY KEY ("project_id")
);

CREATE TABLE "project_context_summary" (
  "summary_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "project_context_summary_pkey" PRIMARY KEY ("summary_id")
);

CREATE TABLE "feature" (
  "feature_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "brief" TEXT,
  "origin" "FeatureOrigin" NOT NULL,
  "include_in_project_context" BOOLEAN NOT NULL DEFAULT false,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),

  CONSTRAINT "feature_pkey" PRIMARY KEY ("feature_id")
);

CREATE TABLE "feature_update" (
  "feature_update_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "feature_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "brief" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),

  CONSTRAINT "feature_update_pkey" PRIMARY KEY ("feature_update_id")
);

CREATE TABLE "context_artifact" (
  "context_artifact_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "feature_id" UUID,
  "feature_update_id" UUID,
  "content" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "context_artifact_pkey" PRIMARY KEY ("context_artifact_id"),
  CONSTRAINT "context_artifact_exactly_one_owner" CHECK (num_nonnulls("feature_id", "feature_update_id") = 1)
);

CREATE TABLE "storage_object" (
  "storage_object_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "context_artifact_id" UUID NOT NULL,
  "s3_key" TEXT NOT NULL,
  "asset_type" "AssetType" NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "extracted_text" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "storage_object_pkey" PRIMARY KEY ("storage_object_id")
);

CREATE TABLE "spec_run" (
  "spec_run_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "feature_id" UUID NOT NULL,
  "feature_update_id" UUID,
  "run_kind" "SpecRunKind" NOT NULL,
  "status" "SpecRunStatus" NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "gen_settings" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "context_snapshot" JSONB NOT NULL,
  "error_message" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "spec_run_pkey" PRIMARY KEY ("spec_run_id"),
  CONSTRAINT "spec_run_consolidation_feature_target_only" CHECK ("run_kind" <> 'consolidation' OR "feature_update_id" IS NULL)
);

CREATE TABLE "generated_spec" (
  "generated_spec_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "feature_id" UUID NOT NULL,
  "feature_update_id" UUID,
  "spec_run_id" UUID,
  "parent_spec_id" UUID,
  "version" INTEGER NOT NULL DEFAULT 0,
  "content" JSONB NOT NULL,
  "schema_version" TEXT NOT NULL,
  "valid" BOOLEAN NOT NULL DEFAULT false,
  "warnings" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "incorporated_updates" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "generated_spec_pkey" PRIMARY KEY ("generated_spec_id")
);

CREATE TABLE "llm_call_log" (
  "llm_call_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "spec_run_id" UUID NOT NULL,
  "purpose" "LlmCallPurpose" NOT NULL,
  "attempt" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "input_tokens" INTEGER NOT NULL,
  "output_tokens" INTEGER NOT NULL,
  "latency_ms" INTEGER NOT NULL,
  "outcome" "LlmCallOutcome" NOT NULL,
  "error_message" TEXT,
  "raw_response" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "llm_call_log_pkey" PRIMARY KEY ("llm_call_id")
);

CREATE UNIQUE INDEX "user_organization_id_key" ON "user"("organization_id");
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");
CREATE UNIQUE INDEX "project_organization_id_key" ON "project"("organization_id");
CREATE UNIQUE INDEX "project_context_summary_project_id_key" ON "project_context_summary"("project_id");
CREATE INDEX "feature_project_id_idx" ON "feature"("project_id");
CREATE INDEX "feature_created_by_idx" ON "feature"("created_by");
CREATE INDEX "feature_update_feature_id_idx" ON "feature_update"("feature_id");
CREATE INDEX "feature_update_created_by_idx" ON "feature_update"("created_by");
CREATE UNIQUE INDEX "context_artifact_feature_id_key" ON "context_artifact"("feature_id");
CREATE UNIQUE INDEX "context_artifact_feature_update_id_key" ON "context_artifact"("feature_update_id");
CREATE UNIQUE INDEX "storage_object_s3_key_key" ON "storage_object"("s3_key");
CREATE INDEX "storage_object_context_artifact_id_idx" ON "storage_object"("context_artifact_id");
CREATE INDEX "spec_run_feature_id_idx" ON "spec_run"("feature_id");
CREATE INDEX "spec_run_feature_update_id_idx" ON "spec_run"("feature_update_id");
CREATE INDEX "spec_run_created_by_idx" ON "spec_run"("created_by");
CREATE UNIQUE INDEX "generated_spec_spec_run_id_key" ON "generated_spec"("spec_run_id");
CREATE INDEX "generated_spec_feature_id_idx" ON "generated_spec"("feature_id");
CREATE INDEX "generated_spec_feature_update_id_idx" ON "generated_spec"("feature_update_id");
CREATE INDEX "generated_spec_parent_spec_id_idx" ON "generated_spec"("parent_spec_id");
CREATE INDEX "llm_call_log_spec_run_id_idx" ON "llm_call_log"("spec_run_id");

CREATE UNIQUE INDEX "one_active_run_per_feature" ON "spec_run"("feature_id")
  WHERE "feature_update_id" IS NULL AND "status" NOT IN ('completed', 'failed');
CREATE UNIQUE INDEX "one_active_run_per_update" ON "spec_run"("feature_update_id")
  WHERE "feature_update_id" IS NOT NULL AND "status" NOT IN ('completed', 'failed');

CREATE UNIQUE INDEX "spec_version_per_feature" ON "generated_spec"("feature_id", "version")
  WHERE "feature_update_id" IS NULL AND "version" > 0;
CREATE UNIQUE INDEX "spec_version_per_update" ON "generated_spec"("feature_update_id", "version")
  WHERE "feature_update_id" IS NOT NULL AND "version" > 0;

CREATE UNIQUE INDEX "one_valid_spec_per_feature" ON "generated_spec"("feature_id")
  WHERE "valid" AND "feature_update_id" IS NULL;
CREATE UNIQUE INDEX "one_valid_spec_per_update" ON "generated_spec"("feature_update_id")
  WHERE "valid" AND "feature_update_id" IS NOT NULL;

ALTER TABLE "user" ADD CONSTRAINT "user_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organization"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_context_summary" ADD CONSTRAINT "project_context_summary_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feature" ADD CONSTRAINT "feature_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "feature" ADD CONSTRAINT "feature_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "feature_update" ADD CONSTRAINT "feature_update_feature_id_fkey"
  FOREIGN KEY ("feature_id") REFERENCES "feature"("feature_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "feature_update" ADD CONSTRAINT "feature_update_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "context_artifact" ADD CONSTRAINT "context_artifact_feature_id_fkey"
  FOREIGN KEY ("feature_id") REFERENCES "feature"("feature_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "context_artifact" ADD CONSTRAINT "context_artifact_feature_update_id_fkey"
  FOREIGN KEY ("feature_update_id") REFERENCES "feature_update"("feature_update_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "storage_object" ADD CONSTRAINT "storage_object_context_artifact_id_fkey"
  FOREIGN KEY ("context_artifact_id") REFERENCES "context_artifact"("context_artifact_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "spec_run" ADD CONSTRAINT "spec_run_feature_id_fkey"
  FOREIGN KEY ("feature_id") REFERENCES "feature"("feature_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "spec_run" ADD CONSTRAINT "spec_run_feature_update_id_fkey"
  FOREIGN KEY ("feature_update_id") REFERENCES "feature_update"("feature_update_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "spec_run" ADD CONSTRAINT "spec_run_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "generated_spec" ADD CONSTRAINT "generated_spec_feature_id_fkey"
  FOREIGN KEY ("feature_id") REFERENCES "feature"("feature_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "generated_spec" ADD CONSTRAINT "generated_spec_feature_update_id_fkey"
  FOREIGN KEY ("feature_update_id") REFERENCES "feature_update"("feature_update_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "generated_spec" ADD CONSTRAINT "generated_spec_spec_run_id_fkey"
  FOREIGN KEY ("spec_run_id") REFERENCES "spec_run"("spec_run_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "generated_spec" ADD CONSTRAINT "generated_spec_parent_spec_id_fkey"
  FOREIGN KEY ("parent_spec_id") REFERENCES "generated_spec"("generated_spec_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "llm_call_log" ADD CONSTRAINT "llm_call_log_spec_run_id_fkey"
  FOREIGN KEY ("spec_run_id") REFERENCES "spec_run"("spec_run_id") ON DELETE RESTRICT ON UPDATE CASCADE;
