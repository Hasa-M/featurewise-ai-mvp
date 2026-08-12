# ADR-0011: Use Object Storage for Images and Raw Context Artifacts

Date: 2026-06-02

Status: accepted

Amended by: ADR-0029

## Context

Featurewise needs to support images from the start, especially design screenshots and visual context artifacts.

Storing large binary files directly in PostgreSQL would make the database heavier and less appropriate for file storage.

## Decision

Use object storage for uploaded images and raw context artifact files.

For phase 1, AWS S3 is the target object storage provider.

PostgreSQL stores artifact metadata, extracted text when available, artifact scope, usage flags, and the object storage key/reference.

## Consequences

- Uploaded images and raw files are stored in a system designed for binary objects.
- PostgreSQL remains focused on relational data, metadata, normalized context, spec runs, generated specs, and logs.
- The backend needs a Storage module that hides AWS/S3 implementation details from the rest of the application.
- S3 setup adds some complexity, but this is acceptable because image support is part of the MVP.
- Advanced storage features such as CDN, public buckets, complex lifecycle policies, and multi-provider storage are deferred.

## Amendment (ADR-0029)

The bucket is private and versioned. Browsers upload to immutable staging keys
with short-lived backend-authorized presigned POSTs; they never receive AWS
credentials. NestJS confirms the object, copies it to an immutable final key,
records the exact S3 version, prepares any model derivative, and controls
short-lived authorized reads.

Ready objects persist while selected or in the Context's Files archive. They
are physically purgeable only when no SpecRun has snapshotted them. A lifecycle
rule applies only to abandoned staging versions; confirmed originals and model
derivatives have no phase-1 expiry.
