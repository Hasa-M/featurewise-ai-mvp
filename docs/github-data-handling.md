# How Featurewise handles GitHub data

Featurewise can connect one GitHub repository to a Project through a read-only
GitHub App. This page describes the current data boundary in customer-readable
terms.

## What Featurewise keeps

For a connected repository, Featurewise stores the GitHub installation and
repository identifiers as exact strings, repository owner/name/full name,
privacy flag, GitHub default branch, selected Project base branch, connection
health and audit timestamps. For each Feature it stores an optional branch
override and the normalized paths explicitly selected by the user.

Before an analysis is captured, Featurewise persists only the connection
metadata, branch configuration, and selected paths. It does not persist GitHub
file contents while browsing or configuring a Feature. GitHub OAuth user tokens
and temporary installation tokens are never persisted.

## Filtering and analysis snapshots

Featurewise filters sensitive files, binary content, common vendor directories,
and generated/build output before paths or content reach the Console, database,
logs, or any future model provider. Real `.env` files, credentials, private
keys, certificates, keystores, Git LFS pointers, symlinks, and submodules are
not accepted. This policy has no per-customer override in version 1.

When a future real analysis is started, Featurewise may capture a bounded,
immutable repository snapshot at one resolved commit. Only then are allowed
contents stored: the filtered manifest, recognized root files, and every file
selected for that Feature. The snapshot records exact paths, roles, blob and
commit identities, byte sizes, SHA-256 checksums, and UTF-8 content so results
remain reproducible. Historical snapshots are preserved even if the current
repository connection is later removed.

Allowed repository content may be sent to the configured LLM provider only
during a future analysis. Featurewise does not currently implement that
analysis or send repository content to an LLM. A future engine may split the
input across several calls, but every selected file remains mandatory.

## Access and removal

Featurewise reads GitHub on demand when a user opens repository configuration,
changes a branch, or a future analysis captures its inputs. It does not use
webhooks or background polling. Disconnecting deletes the current connection,
branch overrides, and selected paths from Featurewise, but does not uninstall
the GitHub App or alter immutable historical analysis snapshots.
