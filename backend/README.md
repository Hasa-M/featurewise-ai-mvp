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
