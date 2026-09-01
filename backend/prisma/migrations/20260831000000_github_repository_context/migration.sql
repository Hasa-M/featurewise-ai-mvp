BEGIN;

CREATE TYPE "RepositoryConnectionStatus" AS ENUM ('connected', 'inaccessible', 'rate_limited');
CREATE TYPE "GitHubConnectionAttemptStatus" AS ENUM ('pending', 'verifying', 'verified', 'consumed', 'failed', 'expired');

CREATE SEQUENCE "project_repository_connection_public_number_seq"
  AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;

CREATE TABLE "project_repository_connection" (
  "project_repository_connection_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_number" INTEGER NOT NULL DEFAULT nextval('project_repository_connection_public_number_seq'::regclass),
  "project_id" UUID NOT NULL,
  "installation_id" BIGINT NOT NULL,
  "repository_id" BIGINT NOT NULL,
  "owner" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "private" BOOLEAN NOT NULL,
  "default_branch" TEXT NOT NULL,
  "base_branch" TEXT NOT NULL,
  "configuration_version" INTEGER NOT NULL DEFAULT 1,
  "status" "RepositoryConnectionStatus" NOT NULL DEFAULT 'connected',
  "last_checked_at" TIMESTAMPTZ(6),
  "rate_limit_reset_at" TIMESTAMPTZ(6),
  "last_error_code" TEXT,
  "last_error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_repository_connection_pkey" PRIMARY KEY ("project_repository_connection_id"),
  CONSTRAINT "project_repository_connection_public_number_positive" CHECK ("public_number" > 0),
  CONSTRAINT "project_repository_connection_configuration_version_positive" CHECK ("configuration_version" > 0)
);

ALTER SEQUENCE "project_repository_connection_public_number_seq"
  OWNED BY "project_repository_connection"."public_number";

CREATE TABLE "feature_repository_context" (
  "feature_repository_context_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "feature_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "branch_override" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feature_repository_context_pkey" PRIMARY KEY ("feature_repository_context_id")
);

CREATE TABLE "feature_repository_selected_file" (
  "feature_repository_selected_file_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "feature_repository_context_id" UUID NOT NULL,
  "path" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feature_repository_selected_file_pkey" PRIMARY KEY ("feature_repository_selected_file_id")
);

CREATE TABLE "github_connection_attempt" (
  "github_connection_attempt_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "state_digest" BYTEA NOT NULL,
  "status" "GitHubConnectionAttemptStatus" NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "verified_installation_id" BIGINT,
  "verified_at" TIMESTAMPTZ(6),
  "consumed_at" TIMESTAMPTZ(6),
  "failed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "github_connection_attempt_pkey" PRIMARY KEY ("github_connection_attempt_id")
);

CREATE UNIQUE INDEX "project_repository_connection_public_number_key" ON "project_repository_connection"("public_number");
CREATE UNIQUE INDEX "project_repository_connection_project_id_key" ON "project_repository_connection"("project_id");
CREATE UNIQUE INDEX "project_repository_connection_id_project_id_key" ON "project_repository_connection"("project_repository_connection_id", "project_id");
CREATE INDEX "project_repository_connection_installation_id_idx" ON "project_repository_connection"("installation_id");
CREATE UNIQUE INDEX "feature_id_project_id_key" ON "feature"("feature_id", "project_id");
CREATE UNIQUE INDEX "feature_repository_context_feature_id_key" ON "feature_repository_context"("feature_id");
CREATE UNIQUE INDEX "feature_repository_context_feature_project_key" ON "feature_repository_context"("feature_id", "project_id");
CREATE INDEX "feature_repository_context_connection_id_idx" ON "feature_repository_context"("connection_id");
CREATE INDEX "feature_repository_context_project_id_idx" ON "feature_repository_context"("project_id");
CREATE UNIQUE INDEX "feature_repository_selected_file_context_path_key" ON "feature_repository_selected_file"("feature_repository_context_id", "path");
CREATE UNIQUE INDEX "github_connection_attempt_state_digest_key" ON "github_connection_attempt"("state_digest");
CREATE INDEX "github_connection_attempt_project_user_status_idx" ON "github_connection_attempt"("project_id", "user_id", "status");
CREATE UNIQUE INDEX "one_active_github_attempt_per_project_user"
  ON "github_connection_attempt"("project_id", "user_id")
  WHERE "status" IN ('pending', 'verifying', 'verified');

ALTER TABLE "project_repository_connection" ADD CONSTRAINT "project_repository_connection_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feature_repository_context" ADD CONSTRAINT "feature_repository_context_feature_project_fkey"
  FOREIGN KEY ("feature_id", "project_id") REFERENCES "feature"("feature_id", "project_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feature_repository_context" ADD CONSTRAINT "feature_repository_context_connection_project_fkey"
  FOREIGN KEY ("connection_id", "project_id") REFERENCES "project_repository_connection"("project_repository_connection_id", "project_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feature_repository_selected_file" ADD CONSTRAINT "feature_repository_selected_file_context_id_fkey"
  FOREIGN KEY ("feature_repository_context_id") REFERENCES "feature_repository_context"("feature_repository_context_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "github_connection_attempt" ADD CONSTRAINT "github_connection_attempt_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "github_connection_attempt" ADD CONSTRAINT "github_connection_attempt_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER "project_repository_connection_public_number_immutable"
BEFORE UPDATE OF "public_number" ON "project_repository_connection"
FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();

COMMIT;
