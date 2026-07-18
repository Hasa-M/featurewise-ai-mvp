# Organization logo implementation plan

Status: deferred. This document describes a future change and does not represent
current runtime behavior.

## Goal

Allow an authenticated user to add, view, replace, and remove the logo for the
organization in their current workspace. Keep the S3 bucket private and retain
the existing organization-name fallback when no usable logo is available.

This plan follows ADR-0011: image bytes belong in AWS S3, while PostgreSQL stores
only relational data, metadata, and an immutable object key.

## Persistence and contracts

1. Add nullable `logoKey String? @map("logo_key")` to the Prisma
   `Organization` model and create a forward-only migration adding
   `organization.logo_key TEXT NULL`.
2. Add an organization-logo response DTO. Organization reads and name updates
   should report whether a logo exists, but must not expose the raw S3 key to
   the browser.
3. Add an upload DTO and file validation for PNG, JPEG, and WebP images. Limit
   files to 2 MiB and reject empty files, mismatched MIME types, SVG, and other
   executable image formats.
4. Keep `UpdateOrganizationDto` responsible for textual organization
   settings. Do not allow clients to assign arbitrary object keys; only the
   logo service may update `logoKey`.
5. Update Prisma-backed service tests, controller/e2e fixtures, seed data, and
   the in-memory Prisma test double to represent the nullable logo field.

## Storage service

1. Implement the Storage module required by ADR-0011 before adding logo routes.
   Workspace code must depend on the Storage module public API rather than the
   AWS SDK directly.
2. Store each upload under a new immutable key:
   `organizations/{organizationId}/logos/{uuid}.{extension}`.
   Never overwrite a previous key.
3. Keep the S3 bucket private. The browser must never receive AWS credentials
   or a durable public object URL.
4. The storage API needs operations to upload a validated byte stream, read a
   private object as a stream, and delete an object by owned key.
5. Configure S3 content type and content length from validated server-side
   values. Do not trust the filename or MIME type supplied by the browser.

## HTTP API

- `POST /organizations/:organizationId/logo`
  accepts one multipart field named `logo`, verifies current-user
  organization scope, validates the file, uploads a new immutable object, and
  atomically changes the database reference to its key.
- `GET /organizations/:organizationId/logo`
  verifies scope and streams the current object through the authenticated
  backend with its validated content type and private caching headers. Return
  404 when the organization has no logo.
- `DELETE /organizations/:organizationId/logo`
  verifies scope, clears the database reference, and returns 204. Repeating the
  operation is also successful.

The upload sequence is:

1. Validate authorization and the complete file before starting persistence.
2. Upload to a new S3 key.
3. Update `Organization.logoKey` in PostgreSQL.
4. If the database update fails, make a best-effort deletion of the new object
   and return the database failure.
5. After a successful replacement, make a best-effort deletion of the previous
   object. Log deletion failures for later cleanup without rolling back the
   visible replacement.

Removal clears the database reference first. Deleting the old S3 object is
best-effort so a storage outage cannot leave the product pointing at a missing
logo.

## Frontend integration

1. Extend the workspace API DTO/model with `hasLogo: boolean`. Do not add
   `logoKey` to the UI model.
2. Add authenticated API functions for upload, binary read, and removal.
3. Fetch the image as a Blob with the bearer token and create a temporary
   `URL.createObjectURL` value. Revoke the old URL when the logo changes or
   the consuming component unmounts.
4. Replace the current hardcoded organization mark with an image only after it
   loads successfully. Keep the hardcoded mark as the loading, empty, and error
   fallback.
5. Add a file picker to Organization settings with preview, Replace, Remove,
   Save/cancel, progress, validation feedback, and retry behavior.
6. Do not update the visible logo until the backend confirms the upload. On
   failure, retain the previously confirmed logo and explain the error inline.

## Verification

- Unit-test MIME/size validation, immutable key generation, organization
  scoping, replacement ordering, and best-effort cleanup failures.
- E2E-test upload, authenticated read, replacement, removal, missing-logo 404,
  cross-organization 404, invalid files, and the 2 MiB limit.
- Frontend-test placeholder fallback, Blob URL cleanup, successful preview and
  replacement, failed upload retention, removal, and keyboard-accessible file
  controls.
- Run Prisma generation, backend unit/e2e tests, frontend unit and Storybook
  interaction tests, lint, and both production builds.

## Rollout order

1. Storage module and configuration.
2. Prisma field and migration.
3. Backend service, DTOs, routes, and tests.
4. Frontend workspace model and read-only rendering.
5. Frontend add, replace, and remove controls.
6. Orphan-object logging and an operational cleanup procedure.
