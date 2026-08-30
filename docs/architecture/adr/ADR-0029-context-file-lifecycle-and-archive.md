# ADR-0029: Context File Lifecycle, Selection, and Historical Inputs

Date: 2026-08-12

Status: accepted

Amended by:
[ADR-0031](ADR-0031-feature-specifications-and-traceable-analysis-inputs.md)

> The S3 lifecycle, selection/archive behavior, limits, preparation, immutable
> versions, and purge rules remain accepted. ADR-0031 removes FeatureUpdate
> ownership, renames `brief`/`promptContent`, and makes AnalysisRun input
> snapshots the historical-use boundary. Conflicting terminology below is
> retained as implementation history only.

Amends: ADR-0011, ADR-0016, ADR-0017, ADR-0019

## Context

Feature and FeatureUpdate context needs general-purpose files without confusing
them with the short Brief or the editable textual Prompt. Uploads must go
directly from the browser to private S3, remain available for reuse, and keep
historical SpecRun inputs stable when the current Context changes.

Some files also need a model-ready representation. In particular, page visuals
from rich documents are lost when a model extracts only their text.

## Decision

The three Context inputs are distinct:

- `Feature.brief` / `FeatureUpdate.brief` is the short intent description;
- `ContextArtifact.promptContent` is the editable textual Prompt;
- `StorageObject` is an independently selected file input.

Each StorageObject belongs to exactly one ContextArtifact. The browser uploads
to a backend-authorized, short-lived presigned S3 POST. NestJS owns
authorization, metadata, limits, confirmation, validation, preparation,
selection, access, and cleanup.

The file lifecycle is:

```
pending_upload -> processing -> ready | failed
```

A ready file persists under immutable, versioned S3 keys. It is either selected
for the current Context or unselected. The UI calls the unselected collection
the **Files archive**. Selecting an archived file reuses the same StorageObject,
original bytes, and prepared bytes; it does not upload, copy, or convert the
file again. Archives are scoped to one exact ContextArtifact. Project-wide and
cross-Context reuse are deferred.

Per ContextArtifact, phase 1 allows at most 20 retained/in-flight files, of
which at most 10 selected files (including pending/processing uploads) and 50 MB
of selected original bytes may be active. Each original is at most 25 MB.

Original uploads are always retained unchanged. Rich text documents and
presentations receive an immutable PDF derivative through local headless
LibreOffice. Raster images receive a deterministic model derivative capped at
approximately 1500 px. PDFs, spreadsheets, text, code, and structured-data
files use their original bytes. `extractedText` is not stored as the primary
representation.

Only selected, ready files enter a new SpecRun snapshot. Snapshot creation
records the exact original and chosen model-input S3 keys, version IDs, sizes,
MIME types, checksums, and preparation version, and atomically records the
file's first use. Later selection changes cannot alter the snapshot.

A ready file can be permanently purged only when it is unselected and has
never appeared in a SpecRun snapshot. Files used by any run, including a failed
run, can only be unselected. Abandoned staging uploads, failed files, and
purge-eligible files are cleaned asynchronously inside the NestJS process and
with a staging-only S3 lifecycle rule.

Pre-lifecycle StorageObject rows cannot prove whether a historical snapshot
used them, so the migration marks them conservatively as used and failed. They
remain retained but require a new verified upload for current Context use.

GitHub repository integration remains a separate external source/reference.
Individual code or configuration files may be uploaded manually, but a
repository import is not represented as a set of StorageObjects.

## Consequences

- Users can reuse a previously uploaded file without uploading or converting
  it again.
- Brief, Prompt, selected files, and archived files have explicit contracts.
- The private bucket remains inaccessible without a backend-authorized,
  short-lived operation.
- S3 versioning and snapshot metadata provide byte-stable historical inputs.
- Permanent deletion requires a transaction-safe first-use guard.
- LibreOffice is a local runtime prerequisite for rich-document preparation,
  but no queue, worker, Lambda, or local S3 emulator is introduced.
- A future project archive will require separating stored-file identity from
  Context membership and therefore needs a separate ADR.
