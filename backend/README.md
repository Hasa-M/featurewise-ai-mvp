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

## Auth setup

The API uses username/password login and bearer JWTs. Create the first local
operator user manually, with an Argon2id password hash:

```bash
npm run auth:hash-password -- "choose-a-local-password"
```

Use the printed hash as `user.password_hash`, then call:

```http
POST /auth/login
Content-Type: application/json

{ "username": "dev.operator", "password": "choose-a-local-password" }
```

Set `Authorization: Bearer <accessToken>` on protected API requests. `GET
/health` and `POST /auth/login` remain public.
