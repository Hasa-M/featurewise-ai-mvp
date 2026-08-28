BEGIN;

DO $$
DECLARE
  feature_update_count BIGINT;
  update_context_artifact_count BIGINT;
  update_storage_object_count BIGINT;
  spec_run_count BIGINT;
  generated_spec_count BIGINT;
  llm_call_log_count BIGINT;
BEGIN
  SELECT count(*) INTO feature_update_count FROM "feature_update";
  SELECT count(*) INTO update_context_artifact_count
  FROM "context_artifact"
  WHERE "feature_update_id" IS NOT NULL;
  SELECT count(*) INTO update_storage_object_count
  FROM "storage_object" AS storage
  INNER JOIN "context_artifact" AS context
    ON context."context_artifact_id" = storage."context_artifact_id"
  WHERE context."feature_update_id" IS NOT NULL;
  SELECT count(*) INTO spec_run_count FROM "spec_run";
  SELECT count(*) INTO generated_spec_count FROM "generated_spec";
  SELECT count(*) INTO llm_call_log_count FROM "llm_call_log";

  IF feature_update_count <> 0
    OR update_context_artifact_count <> 0
    OR update_storage_object_count <> 0
    OR spec_run_count <> 0
    OR generated_spec_count <> 0
    OR llm_call_log_count <> 0 THEN
    RAISE EXCEPTION
      'Specification analysis migration preflight failed: feature_update=%, update_context_artifact=%, update_storage_object=%, spec_run=%, generated_spec=%, llm_call_log=%',
      feature_update_count,
      update_context_artifact_count,
      update_storage_object_count,
      spec_run_count,
      generated_spec_count,
      llm_call_log_count
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

ALTER TABLE "feature" RENAME COLUMN "brief" TO "specification_content";
UPDATE "feature"
SET "specification_content" = ''
WHERE "specification_content" IS NULL;
ALTER TABLE "feature"
  ALTER COLUMN "specification_content" SET DEFAULT '',
  ALTER COLUMN "specification_content" SET NOT NULL;

ALTER TABLE "context_artifact" RENAME COLUMN "prompt_content" TO "content";
INSERT INTO "context_artifact" ("feature_id", "content")
SELECT feature."feature_id", ''
FROM "feature"
WHERE NOT EXISTS (
  SELECT 1
  FROM "context_artifact"
  WHERE "context_artifact"."feature_id" = feature."feature_id"
);

ALTER TABLE "context_artifact"
  DROP CONSTRAINT "context_artifact_exactly_one_owner",
  DROP CONSTRAINT "context_artifact_feature_update_id_fkey";
DROP INDEX "context_artifact_feature_update_id_key";
ALTER TABLE "context_artifact"
  DROP COLUMN "feature_update_id",
  ALTER COLUMN "feature_id" SET NOT NULL;

ALTER TABLE "project_context_summary" RENAME TO "project_context";
ALTER TABLE "project_context" RENAME COLUMN "summary_id" TO "project_context_id";
ALTER SEQUENCE "project_context_summary_public_number_seq"
  RENAME TO "project_context_public_number_seq";
ALTER TABLE "project_context"
  RENAME CONSTRAINT "project_context_summary_pkey" TO "project_context_pkey";
ALTER TABLE "project_context"
  RENAME CONSTRAINT "project_context_summary_project_id_fkey" TO "project_context_project_id_fkey";
ALTER TABLE "project_context"
  RENAME CONSTRAINT "project_context_summary_public_number_positive" TO "project_context_public_number_positive";
ALTER INDEX "project_context_summary_project_id_key"
  RENAME TO "project_context_project_id_key";
ALTER INDEX "project_context_summary_public_number_key"
  RENAME TO "project_context_public_number_key";
ALTER TRIGGER "project_context_summary_public_number_immutable"
  ON "project_context"
  RENAME TO "project_context_public_number_immutable";

ALTER SEQUENCE "spec_run_public_number_seq" OWNED BY NONE;
ALTER SEQUENCE "llm_call_log_public_number_seq" OWNED BY NONE;

DROP TABLE "llm_call_log";
DROP TABLE "generated_spec";
DROP TABLE "spec_run";
DROP TABLE "feature_update";

ALTER TABLE "feature"
  DROP COLUMN "origin",
  DROP COLUMN "include_in_project_context";

DROP TYPE "FeatureOrigin";
DROP TYPE "SpecRunKind";
DROP TYPE "SpecRunStatus";
DROP TYPE "LlmCallPurpose";

ALTER SEQUENCE "spec_run_public_number_seq"
  RENAME TO "analysis_run_public_number_seq";

CREATE TYPE "AnalysisRunStatus" AS ENUM (
  'queued',
  'preparing_context',
  'analyzing',
  'validating_output',
  'repairing_output',
  'verifying_findings',
  'persisting',
  'completed',
  'failed'
);
CREATE TYPE "FindingReviewDecision" AS ENUM (
  'accepted',
  'dismissed',
  'resolved',
  'deferred'
);
CREATE TYPE "LlmCallPurpose" AS ENUM (
  'candidate_analysis',
  'finding_verification',
  'schema_repair'
);

CREATE SEQUENCE "analysis_finding_public_number_seq"
  AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE "finding_review_public_number_seq"
  AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;

CREATE TABLE "analysis_run" (
  "analysis_run_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_number" INTEGER NOT NULL DEFAULT nextval('analysis_run_public_number_seq'::regclass),
  "feature_id" UUID NOT NULL,
  "status" "AnalysisRunStatus" NOT NULL,
  "analyzer_version" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "analysis_settings" JSONB NOT NULL,
  "input_snapshot" JSONB NOT NULL,
  "prepared_context_snapshot" JSONB,
  "error_message" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "analysis_run_pkey" PRIMARY KEY ("analysis_run_id"),
  CONSTRAINT "analysis_run_public_number_positive" CHECK ("public_number" > 0)
);

CREATE TABLE "analysis_finding" (
  "analysis_finding_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_number" INTEGER NOT NULL DEFAULT nextval('analysis_finding_public_number_seq'::regclass),
  "analysis_run_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "why_it_matters" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "suggested_resolutions" JSONB NOT NULL,
  "verification_metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "analysis_finding_pkey" PRIMARY KEY ("analysis_finding_id"),
  CONSTRAINT "analysis_finding_public_number_positive" CHECK ("public_number" > 0)
);

CREATE TABLE "finding_review" (
  "finding_review_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_number" INTEGER NOT NULL DEFAULT nextval('finding_review_public_number_seq'::regclass),
  "finding_id" UUID NOT NULL,
  "decision" "FindingReviewDecision" NOT NULL,
  "reason" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "finding_review_pkey" PRIMARY KEY ("finding_review_id"),
  CONSTRAINT "finding_review_public_number_positive" CHECK ("public_number" > 0)
);

CREATE TABLE "llm_call_log" (
  "llm_call_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_number" INTEGER NOT NULL DEFAULT nextval('llm_call_log_public_number_seq'::regclass),
  "analysis_run_id" UUID NOT NULL,
  "purpose" "LlmCallPurpose" NOT NULL,
  "attempt" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "latency_ms" INTEGER,
  "estimated_cost_micros" BIGINT,
  "outcome" "LlmCallOutcome" NOT NULL,
  "error_message" TEXT,
  "raw_response" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "llm_call_log_pkey" PRIMARY KEY ("llm_call_id"),
  CONSTRAINT "llm_call_log_public_number_positive" CHECK ("public_number" > 0)
);

ALTER SEQUENCE "analysis_run_public_number_seq"
  OWNED BY "analysis_run"."public_number";
ALTER SEQUENCE "analysis_finding_public_number_seq"
  OWNED BY "analysis_finding"."public_number";
ALTER SEQUENCE "finding_review_public_number_seq"
  OWNED BY "finding_review"."public_number";
ALTER SEQUENCE "llm_call_log_public_number_seq"
  OWNED BY "llm_call_log"."public_number";

CREATE UNIQUE INDEX "analysis_run_public_number_key"
  ON "analysis_run"("public_number");
CREATE INDEX "analysis_run_feature_id_idx"
  ON "analysis_run"("feature_id");
CREATE INDEX "analysis_run_created_by_idx"
  ON "analysis_run"("created_by");
CREATE UNIQUE INDEX "one_active_analysis_run_per_feature"
  ON "analysis_run"("feature_id")
  WHERE "status" NOT IN ('completed', 'failed');

CREATE UNIQUE INDEX "analysis_finding_public_number_key"
  ON "analysis_finding"("public_number");
CREATE UNIQUE INDEX "analysis_finding_run_position_key"
  ON "analysis_finding"("analysis_run_id", "position");
CREATE INDEX "analysis_finding_analysis_run_id_idx"
  ON "analysis_finding"("analysis_run_id");

CREATE UNIQUE INDEX "finding_review_public_number_key"
  ON "finding_review"("public_number");
CREATE INDEX "finding_review_finding_id_idx"
  ON "finding_review"("finding_id");
CREATE INDEX "finding_review_created_by_idx"
  ON "finding_review"("created_by");

CREATE UNIQUE INDEX "llm_call_log_public_number_key"
  ON "llm_call_log"("public_number");
CREATE INDEX "llm_call_log_analysis_run_id_idx"
  ON "llm_call_log"("analysis_run_id");

ALTER TABLE "analysis_run" ADD CONSTRAINT "analysis_run_feature_id_fkey"
  FOREIGN KEY ("feature_id") REFERENCES "feature"("feature_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "analysis_run" ADD CONSTRAINT "analysis_run_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "analysis_finding" ADD CONSTRAINT "analysis_finding_analysis_run_id_fkey"
  FOREIGN KEY ("analysis_run_id") REFERENCES "analysis_run"("analysis_run_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finding_review" ADD CONSTRAINT "finding_review_finding_id_fkey"
  FOREIGN KEY ("finding_id") REFERENCES "analysis_finding"("analysis_finding_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finding_review" ADD CONSTRAINT "finding_review_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "llm_call_log" ADD CONSTRAINT "llm_call_log_analysis_run_id_fkey"
  FOREIGN KEY ("analysis_run_id") REFERENCES "analysis_run"("analysis_run_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "analysis_run_public_number_immutable"
BEFORE UPDATE OF "public_number" ON "analysis_run"
FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "analysis_finding_public_number_immutable"
BEFORE UPDATE OF "public_number" ON "analysis_finding"
FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "finding_review_public_number_immutable"
BEFORE UPDATE OF "public_number" ON "finding_review"
FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "llm_call_log_public_number_immutable"
BEFORE UPDATE OF "public_number" ON "llm_call_log"
FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();

CREATE FUNCTION "guard_analysis_run_snapshots"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."input_snapshot" IS DISTINCT FROM OLD."input_snapshot" THEN
    RAISE EXCEPTION 'AnalysisRun input_snapshot is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF OLD."prepared_context_snapshot" IS NOT NULL
    AND NEW."prepared_context_snapshot" IS DISTINCT FROM OLD."prepared_context_snapshot" THEN
    RAISE EXCEPTION 'AnalysisRun prepared_context_snapshot is write-once'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "analysis_run_snapshots_immutable"
BEFORE UPDATE ON "analysis_run"
FOR EACH ROW EXECUTE FUNCTION "guard_analysis_run_snapshots"();

CREATE FUNCTION "reject_immutable_record_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% records are immutable', TG_TABLE_NAME
    USING ERRCODE = '23514';

  RETURN NULL;
END;
$$;

CREATE TRIGGER "analysis_finding_immutable"
BEFORE UPDATE OR DELETE ON "analysis_finding"
FOR EACH ROW EXECUTE FUNCTION "reject_immutable_record_mutation"();
CREATE TRIGGER "finding_review_append_only"
BEFORE UPDATE OR DELETE ON "finding_review"
FOR EACH ROW EXECUTE FUNCTION "reject_immutable_record_mutation"();

COMMIT;
