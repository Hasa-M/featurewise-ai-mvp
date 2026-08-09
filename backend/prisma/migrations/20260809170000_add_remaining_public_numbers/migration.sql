BEGIN;

CREATE SEQUENCE "organization_public_number_seq" AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE "user_public_number_seq" AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE "project_context_summary_public_number_seq" AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE "feature_update_public_number_seq" AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE "context_artifact_public_number_seq" AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE "storage_object_public_number_seq" AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE "spec_run_public_number_seq" AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE "generated_spec_public_number_seq" AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE "llm_call_log_public_number_seq" AS INTEGER MINVALUE 1 START WITH 1 NO CYCLE;

ALTER TABLE "organization" ADD COLUMN "public_number" INTEGER;
ALTER TABLE "user" ADD COLUMN "public_number" INTEGER;
ALTER TABLE "project_context_summary" ADD COLUMN "public_number" INTEGER;
ALTER TABLE "feature_update" ADD COLUMN "public_number" INTEGER;
ALTER TABLE "context_artifact" ADD COLUMN "public_number" INTEGER;
ALTER TABLE "storage_object" ADD COLUMN "public_number" INTEGER;
ALTER TABLE "spec_run" ADD COLUMN "public_number" INTEGER;
ALTER TABLE "generated_spec" ADD COLUMN "public_number" INTEGER;
ALTER TABLE "llm_call_log" ADD COLUMN "public_number" INTEGER;

ALTER TABLE "organization" ALTER COLUMN "public_number" SET DEFAULT nextval('organization_public_number_seq'::regclass);
ALTER TABLE "user" ALTER COLUMN "public_number" SET DEFAULT nextval('user_public_number_seq'::regclass);
ALTER TABLE "project_context_summary" ALTER COLUMN "public_number" SET DEFAULT nextval('project_context_summary_public_number_seq'::regclass);
ALTER TABLE "feature_update" ALTER COLUMN "public_number" SET DEFAULT nextval('feature_update_public_number_seq'::regclass);
ALTER TABLE "context_artifact" ALTER COLUMN "public_number" SET DEFAULT nextval('context_artifact_public_number_seq'::regclass);
ALTER TABLE "storage_object" ALTER COLUMN "public_number" SET DEFAULT nextval('storage_object_public_number_seq'::regclass);
ALTER TABLE "spec_run" ALTER COLUMN "public_number" SET DEFAULT nextval('spec_run_public_number_seq'::regclass);
ALTER TABLE "generated_spec" ALTER COLUMN "public_number" SET DEFAULT nextval('generated_spec_public_number_seq'::regclass);
ALTER TABLE "llm_call_log" ALTER COLUMN "public_number" SET DEFAULT nextval('llm_call_log_public_number_seq'::regclass);

ALTER SEQUENCE "organization_public_number_seq" OWNED BY "organization"."public_number";
ALTER SEQUENCE "user_public_number_seq" OWNED BY "user"."public_number";
ALTER SEQUENCE "project_context_summary_public_number_seq" OWNED BY "project_context_summary"."public_number";
ALTER SEQUENCE "feature_update_public_number_seq" OWNED BY "feature_update"."public_number";
ALTER SEQUENCE "context_artifact_public_number_seq" OWNED BY "context_artifact"."public_number";
ALTER SEQUENCE "storage_object_public_number_seq" OWNED BY "storage_object"."public_number";
ALTER SEQUENCE "spec_run_public_number_seq" OWNED BY "spec_run"."public_number";
ALTER SEQUENCE "generated_spec_public_number_seq" OWNED BY "generated_spec"."public_number";
ALTER SEQUENCE "llm_call_log_public_number_seq" OWNED BY "llm_call_log"."public_number";

UPDATE "organization" SET "public_number" = nextval('organization_public_number_seq'::regclass) WHERE "public_number" IS NULL;
UPDATE "user" SET "public_number" = nextval('user_public_number_seq'::regclass) WHERE "public_number" IS NULL;
UPDATE "project_context_summary" SET "public_number" = nextval('project_context_summary_public_number_seq'::regclass) WHERE "public_number" IS NULL;
UPDATE "feature_update" SET "public_number" = nextval('feature_update_public_number_seq'::regclass) WHERE "public_number" IS NULL;
UPDATE "context_artifact" SET "public_number" = nextval('context_artifact_public_number_seq'::regclass) WHERE "public_number" IS NULL;
UPDATE "storage_object" SET "public_number" = nextval('storage_object_public_number_seq'::regclass) WHERE "public_number" IS NULL;
UPDATE "spec_run" SET "public_number" = nextval('spec_run_public_number_seq'::regclass) WHERE "public_number" IS NULL;
UPDATE "generated_spec" SET "public_number" = nextval('generated_spec_public_number_seq'::regclass) WHERE "public_number" IS NULL;
UPDATE "llm_call_log" SET "public_number" = nextval('llm_call_log_public_number_seq'::regclass) WHERE "public_number" IS NULL;

ALTER TABLE "organization" ALTER COLUMN "public_number" SET NOT NULL, ADD CONSTRAINT "organization_public_number_positive" CHECK ("public_number" > 0);
ALTER TABLE "user" ALTER COLUMN "public_number" SET NOT NULL, ADD CONSTRAINT "user_public_number_positive" CHECK ("public_number" > 0);
ALTER TABLE "project_context_summary" ALTER COLUMN "public_number" SET NOT NULL, ADD CONSTRAINT "project_context_summary_public_number_positive" CHECK ("public_number" > 0);
ALTER TABLE "feature_update" ALTER COLUMN "public_number" SET NOT NULL, ADD CONSTRAINT "feature_update_public_number_positive" CHECK ("public_number" > 0);
ALTER TABLE "context_artifact" ALTER COLUMN "public_number" SET NOT NULL, ADD CONSTRAINT "context_artifact_public_number_positive" CHECK ("public_number" > 0);
ALTER TABLE "storage_object" ALTER COLUMN "public_number" SET NOT NULL, ADD CONSTRAINT "storage_object_public_number_positive" CHECK ("public_number" > 0);
ALTER TABLE "spec_run" ALTER COLUMN "public_number" SET NOT NULL, ADD CONSTRAINT "spec_run_public_number_positive" CHECK ("public_number" > 0);
ALTER TABLE "generated_spec" ALTER COLUMN "public_number" SET NOT NULL, ADD CONSTRAINT "generated_spec_public_number_positive" CHECK ("public_number" > 0);
ALTER TABLE "llm_call_log" ALTER COLUMN "public_number" SET NOT NULL, ADD CONSTRAINT "llm_call_log_public_number_positive" CHECK ("public_number" > 0);

CREATE UNIQUE INDEX "organization_public_number_key" ON "organization"("public_number");
CREATE UNIQUE INDEX "user_public_number_key" ON "user"("public_number");
CREATE UNIQUE INDEX "project_context_summary_public_number_key" ON "project_context_summary"("public_number");
CREATE UNIQUE INDEX "feature_update_public_number_key" ON "feature_update"("public_number");
CREATE UNIQUE INDEX "context_artifact_public_number_key" ON "context_artifact"("public_number");
CREATE UNIQUE INDEX "storage_object_public_number_key" ON "storage_object"("public_number");
CREATE UNIQUE INDEX "spec_run_public_number_key" ON "spec_run"("public_number");
CREATE UNIQUE INDEX "generated_spec_public_number_key" ON "generated_spec"("public_number");
CREATE UNIQUE INDEX "llm_call_log_public_number_key" ON "llm_call_log"("public_number");

CREATE TRIGGER "organization_public_number_immutable" BEFORE UPDATE OF "public_number" ON "organization" FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "user_public_number_immutable" BEFORE UPDATE OF "public_number" ON "user" FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "project_context_summary_public_number_immutable" BEFORE UPDATE OF "public_number" ON "project_context_summary" FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "feature_update_public_number_immutable" BEFORE UPDATE OF "public_number" ON "feature_update" FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "context_artifact_public_number_immutable" BEFORE UPDATE OF "public_number" ON "context_artifact" FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "storage_object_public_number_immutable" BEFORE UPDATE OF "public_number" ON "storage_object" FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "spec_run_public_number_immutable" BEFORE UPDATE OF "public_number" ON "spec_run" FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "generated_spec_public_number_immutable" BEFORE UPDATE OF "public_number" ON "generated_spec" FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();
CREATE TRIGGER "llm_call_log_public_number_immutable" BEFORE UPDATE OF "public_number" ON "llm_call_log" FOR EACH ROW EXECUTE FUNCTION "reject_public_number_update"();

COMMIT;
