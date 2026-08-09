BEGIN;

CREATE SEQUENCE "project_public_number_seq"
  AS INTEGER
  MINVALUE 1
  START WITH 1
  NO CYCLE;

CREATE SEQUENCE "feature_public_number_seq"
  AS INTEGER
  MINVALUE 1
  START WITH 1
  NO CYCLE;

ALTER TABLE "project" ADD COLUMN "public_number" INTEGER;
ALTER TABLE "feature" ADD COLUMN "public_number" INTEGER;

ALTER TABLE "project"
  ALTER COLUMN "public_number" SET DEFAULT nextval('project_public_number_seq'::regclass);
ALTER TABLE "feature"
  ALTER COLUMN "public_number" SET DEFAULT nextval('feature_public_number_seq'::regclass);

ALTER SEQUENCE "project_public_number_seq" OWNED BY "project"."public_number";
ALTER SEQUENCE "feature_public_number_seq" OWNED BY "feature"."public_number";

UPDATE "project"
SET "public_number" = nextval('project_public_number_seq'::regclass)
WHERE "public_number" IS NULL;

UPDATE "feature"
SET "public_number" = nextval('feature_public_number_seq'::regclass)
WHERE "public_number" IS NULL;

ALTER TABLE "project"
  ALTER COLUMN "public_number" SET NOT NULL,
  ADD CONSTRAINT "project_public_number_positive" CHECK ("public_number" > 0);
ALTER TABLE "feature"
  ALTER COLUMN "public_number" SET NOT NULL,
  ADD CONSTRAINT "feature_public_number_positive" CHECK ("public_number" > 0);

CREATE UNIQUE INDEX "project_public_number_key" ON "project"("public_number");
CREATE UNIQUE INDEX "feature_public_number_key" ON "feature"("public_number");

CREATE FUNCTION "reject_public_number_update"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."public_number" IS DISTINCT FROM OLD."public_number" THEN
    RAISE EXCEPTION 'public_number is immutable on %', TG_TABLE_NAME
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "project_public_number_immutable"
BEFORE UPDATE OF "public_number" ON "project"
FOR EACH ROW
EXECUTE FUNCTION "reject_public_number_update"();

CREATE TRIGGER "feature_public_number_immutable"
BEFORE UPDATE OF "public_number" ON "feature"
FOR EACH ROW
EXECUTE FUNCTION "reject_public_number_update"();

COMMIT;
