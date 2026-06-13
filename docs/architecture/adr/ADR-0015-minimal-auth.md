# ADR-0015: Add Minimal Username/Password Authentication for Phase 1

Date: 2026-06-04

Status: accepted

## Context

The application stores project context, uploaded files, images, generated specifications, and LLM logs. Even in a prototype, completely unauthenticated access would create unnecessary risk and make later evolution harder.

The MVP does not need teams, roles, permissions, invitations, 2FA, ownership rules, or multi-user collaboration yet.

## Decision

Add minimal username/password authentication in phase 1.

The system will include a `User` entity with minimal data:

- `id`;
- `username`;
- `passwordHash`;
- `organizationId`;
- `isActive`;
- timestamps.

The first setup can use a single manually created admin/operator user.

Passwords must be stored using a standard password hashing algorithm such as Argon2id. The system must not implement custom password salting or hashing logic.

The backend will issue authentication tokens or sessions and expose protected REST endpoints to the web app.

For phase 1:

- one user belongs to one organization;
- one organization has only one user;
- one organization has only one project;
- teams, roles, permissions, project visibility, feature visibility, ownership rules, 2FA, password reset, and invitation flows are deferred.

## Consequences

- The MVP is safer to use with real or semi-real project context.
- The app can still remain simple and local-first.
- Object storage files must remain private and be accessed through backend-controlled authorization.