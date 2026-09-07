-- Non-secret installation identities verified by transient user OAuth.
ALTER TABLE "github_connection_attempt" ADD COLUMN "verified_installations" JSONB;
