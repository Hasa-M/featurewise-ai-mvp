# Featurewise Backend

NestJS + TypeScript REST API for the Featurewise local-first MVP.

This first scaffold intentionally contains only the application shell and
`GET /health`. Domain modules, Prisma, migrations, auth, S3, and LLM generation
will be added after the architecture docs are used as the implementation source
of truth.

## Commands

```bash
npm install
npm run start:dev
npm run build
npm test
npm run test:e2e
```

The server listens on `PORT` when set, otherwise `3000`.

## Development database seed

The API uses username/password login and bearer JWTs. Set `SEED_PASSWORD` in
`.env`, apply the migrations, and seed the local development database:

```bash
npm run prisma:seed
```

The seed is idempotent. It creates the phase 1 organization, project, and
`dev.operator` user when absent; later runs reactivate that user, update its
Argon2id password hash from `SEED_PASSWORD`, and preserve existing workspace
names and data.

Log in with:

```http
POST /auth/login
Content-Type: application/json

{ "username": "dev.operator", "password": "<SEED_PASSWORD>" }
```

Set `Authorization: Bearer <accessToken>` on protected API requests. `GET
/health` and `POST /auth/login` remain public.
