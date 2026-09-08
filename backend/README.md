# Featurewise Backend

NestJS + TypeScript REST API for the Featurewise local-first MVP.

The modular-monolith API currently includes authentication, Organization and
Project ownership, Features with user-authored specifications, editable
feature and project context, private S3 context file attachments, and a
provider-neutral repository-context module with a read-only GitHub App adapter. A
non-executing Analysis module defines versioned contracts and reproducible
input capture. Analyzer execution, analysis HTTP endpoints, and findings and
review workflows remain separately scoped future work under the architecture
ADRs.

GitHub is disabled by default. When enabled, all App/OAuth configuration is
validated at startup and temporary GitHub tokens are never persisted. See the
[local GitHub App guide](../docs/integrations/github-app-local-development.md)
and [GitHub data handling](../docs/github-data-handling.md).

## Commands

For isolated integration tests, Swagger, database inspection, and captured input
reports, see the [development harness runbook](../docs/testing/development-harness.md).

```bash
npm install
npm run start:dev
npm run build
npm test
npm run test:e2e
npx prisma migrate deploy
```

The server listens on `PORT` when set, otherwise `3000`.

## Development database seed

The API uses username/password login and bearer JWTs. Set `SEED_PASSWORD` in
`.env`, apply the migrations, and seed the local development database:

```bash
npm run prisma:seed
```

The seed is idempotent. It creates the `Featurewise` development organization,
the `Featurewise MVP` project, and the `dev.operator` user when absent; later
runs reactivate that user, update its Argon2id password hash from
`SEED_PASSWORD`, and preserve existing workspace names and data.

Log in with:

```http
POST /auth/login
Content-Type: application/json

{ "username": "dev.operator", "password": "<SEED_PASSWORD>" }
```

Set `Authorization: Bearer <accessToken>` on protected API requests. `GET
/health` and `POST /auth/login` remain public.

## Private Context file storage

Context files use a real private, versioned AWS S3 bucket in local development.
The browser uploads directly with a 15-minute backend-authorized presigned POST;
NestJS controls metadata, confirmation, preparation, selection, archive access,
and cleanup.

Required outside the application:

1. An AWS account and AWS CLI v2. On macOS: `brew install awscli`.
2. A named profile. Prefer SSO:

   ```bash
   aws configure sso --profile featurewise-dev
   aws sso login --profile featurewise-dev
   ```

   If SSO is unavailable, configure a dedicated IAM user with `aws configure
   --profile featurewise-dev`. Never put AWS access keys in this repository or
   the backend `.env`.
3. LibreOffice for DOC/DOCX/PPT/PPTX/ODT/ODP to PDF preparation. On macOS:

   ```bash
   brew install --cask libreoffice
   ```

From `backend/`, bootstrap the development bucket in Milan:

```bash
AWS_PROFILE=featurewise-dev ./scripts/aws/bootstrap-context-storage.sh
```

The command is idempotent. It creates/configures
`featurewise-dev-<account-id>-eu-south-1` with full public-access blocking,
bucket-owner-enforced ownership, SSE-S3, versioning, localhost CORS, TLS-only
access, and a one-day lifecycle only for `dev/staging/`. Confirmed originals
and prepared derivatives do not expire.

The profile used to bootstrap needs S3 administration rights. By default the
script prints the least-privilege runtime policy. Set
`FEATUREWISE_RUNTIME_IAM_USER=<name>` to attach that inline policy to an
existing dedicated IAM user. A profile using that runtime identity needs only
the printed policy; the application uses the normal AWS SDK credential chain.

Copy the reported bucket/profile/region values into `.env` together with the
storage defaults from `.env.example`. No Terraform, Lambda, queue, worker,
MinIO, LocalStack, public bucket, or customer-managed KMS key is required.
