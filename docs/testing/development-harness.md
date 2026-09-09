# Development harness

Run commands from `backend/` with Node/npm and Docker Desktop available. On
Windows use `npm.cmd` if PowerShell's npm wrapper drops forwarded arguments.

## Start and inspect

```powershell
npm.cmd run harness:doctor
npm.cmd run harness:up
npm.cmd run harness:status
npm.cmd run harness:studio
```

The last command runs Studio in the foreground; stop it with Ctrl+C. The
application processes run in the background without terminal windows.

| Surface | Location |
| --- | --- |
| Console | http://127.0.0.1:5174 |
| API | http://127.0.0.1:3100 |
| Swagger | http://127.0.0.1:3100/docs |
| OpenAPI JSON | http://127.0.0.1:3100/docs-json |
| Prisma Studio | http://127.0.0.1:5556 (after starting Studio) |
| Session/fixture identities | `.harness/session.json`, `.harness/fixtures.json` at repo root |
| Logs and reports | `.harness/` at repo root |

Login is `harness.operator`. Its generated password is in the local ignored
`.harness/environment.json`; use it only for login, not in reports or chat.
The second organization belongs to `harness.other`. Public keys are generated;
read the fixture manifest instead of assuming numeric values.

`harness:seed` creates missing fixture users/workspaces and preserves edits.
`harness:reset` stops the harness, removes only its fixed Compose volume,
reapplies migrations, reseeds, and restarts. `harness:down` stops the app and
database but preserves the database volume and artifact history. Stop Studio
before reset. These commands never use the normal development database.

The harness API, frontend, and PostgreSQL bind to loopback. The fixed ports
are deliberate environment identity boundaries. Do not repoint DATABASE_URL
or edit the Compose target to operate against ordinary development data.

## Inspect and capture

Replace the example keys with those in the fixture manifest:

```powershell
npm.cmd run harness:inspect -- --feature FEAT-1
npm.cmd run harness:capture -- --project PRJ-1 --feature FEAT-1
npm.cmd run harness:capture -- --project PRJ-1 --feature FEAT-1 --attachments
npm.cmd run harness:compare -- --left <first-input-snapshot.json> --right <second-input-snapshot.json>
```

Inspection exports current state without marking files used. Capture invokes
the real v2 service and **can set firstUsedAt**. It returns an input snapshot;
it does not create an AnalysisRun or write snapshot columns to PostgreSQL.
Prisma Studio therefore shows domain state and file usage markers, while the
capture artifact contains the snapshot JSON. No model is called.

Each capture directory contains exact input JSON, a readable report, execution
metadata, current file inventory, and a result. Inventory is observed after
capture and is not part of the immutable snapshot. Optional attachment files
contain exact captured versions after size/checksum verification. The report
identifies source IDs, selected representations, repository commit, root and
mandatory selected content, manifest, and truncation. Prepared context is not
generated and the final provider request is not rendered.

Comparison ignores only top-level and repository `capturedAt`; it writes
comparison views without changing either original capture. All artifacts are
ignored by Git. Do not commit credentials, authorization headers, signed URLs,
or private captured content.

## Agent workflow and Chrome setup

1. Read the session manifest and relevant architecture. Run `harness:status`.
2. Inspect the affected API/data and establish expected behavior.
3. Make the change and run the relevant integration tests.
4. Use Chrome DevTools MCP when the task heavily affects a user-visible workflow, navigation, form,
   interaction state, or browser-specific behavior; also use it when requested.
5. Capture inputs or inspect persisted state when needed to verify the result.
6. Record expected/actual results and evidence. Repeat checks only after changes
   affecting them, a failure, or a remaining concern.

Do not browse for unrelated documentation-only or backend changes adequately
covered by focused tests. Browser observations and automated tests are separate
evidence; neither substitutes for an unavailable check in the other layer.

### Codex CLI connection

Use Google's Chrome DevTools MCP server for CLI browser verification. Install it
in the same Codex user/profile that starts your CLI session. On Windows:

```powershell
codex mcp add chrome-devtools -- cmd /c npx -y chrome-devtools-mcp@latest --no-usage-statistics --no-performance-crux
```

Restart Codex CLI, use `/mcp` to confirm the connection, then ask the agent to
list browser pages and open `http://127.0.0.1:5174`. Actual successful tool calls
are the connection acceptance evidence. `codex mcp list` checks the invoking
CLI's configuration; a different profile or host may expose different servers.
If the CLI reports none while another chat has tools, check the active profile
and `CODEX_HOME` before reinstalling or overwriting configuration.

The server launches a separate Chrome profile on demand. Sign into GitHub in
that profile when testing OAuth; the ordinary Chrome session is not implicitly
shared. No OpenAI browser extension is required for this connection. The MCP
server is agent tooling installed outside the app's npm dependencies. It does
not run tests automatically or add a Playwright suite/CI job.

See [official Codex/Windows setup](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/client-configurations.md).
Use DOM snapshots and stable element identifiers to navigate, fill, and click.
Inspect console/network errors or take screenshots when relevant. Never save
tokens, passwords, authorization headers, or signed URLs in verification reports.
After a browser reconnect, list pages again instead of reusing stale page IDs.
If `fill_form` changes visible text but leaves React's character count and dirty
state unchanged, focus the field and use keyboard select-all plus `type_text`.
Observe the updated dirty state before clicking Save; verify persistence after
reload. This fallback was needed for the specification textarea in the setup smoke.
Screenshot export depends on the MCP host's allowed workspace roots. If export
is denied, record the limitation and preserve text/API/capture evidence; do not
claim a screenshot was saved or broaden access silently.

The OpenAI Chrome extension remains an optional **desktop-app** connection,
configured through Computer Use and the actual `@Chrome` selector; it is not
how the CLI setup above works. Do not silently add another browser integration
or enable broad browser permissions.

Connection acceptance: open the harness Console, log in, inspect a Feature,
edit specification text, reload, then verify the text through the API and a
new capture. Record the feature key, expected/actual result, timestamp, and
available screenshot paths in `.harness/chrome-verification.md`. Installation
is not considered verified until this real interaction succeeds.

For a relevant task, preserve a concise browser report with the same fields.
Use DOM/console/network diagnostics only when useful and available. If browser
tools are not exposed, record `not_run: browser connection unavailable` and
continue independent work; never claim the browser check passed.

## Deterministic tests

```powershell
npm.cmd run harness:test
npm.cmd run harness:test:postgres
npm.cmd run harness:test:http
npm.cmd run harness:typecheck
```

Start the harness first. Tests are serial and have no retry loop. Test runs
emit Jest JSON reports into unique `.harness/tests-*` directories. Use a reset
before a baseline test run if you have edited fixtures interactively. Tests
must restore any existing fixture state they modify. Test-created PostgreSQL
fixtures may remain for inspection until reset.

Capture tests deliberately retain first-use markers, just as a normal harness
capture does. Reset the isolated database to restore unused-file fixtures.

Deterministic mode uses a fixed repository with README.md and feature.ts, and
selected/archived/pending/failed file metadata. Original/prepared fixture
bytes are available through `harness:capture --attachments`. Browser uploads
and signed downloads explicitly require live mode; fake metadata is not proof
of S3 transport. Cleanup timers are disabled in the interactive harness.

## Live GitHub and S3

Copy `backend/harness/live.env.example` to `.harness/live.env` and fill in the
test GitHub App settings from the
[GitHub setup guide](../integrations/github-app-local-development.md), and:

```dotenv
AWS_PROFILE=your-test-profile
AWS_REGION=eu-south-1
S3_BUCKET=your-private-versioned-test-bucket
S3_KEY_PREFIX=harness/your-test-session
GITHUB_CALLBACK_URL=http://127.0.0.1:3100/integrations/github/callback
GITHUB_FRONTEND_BASE_URL=http://127.0.0.1:5174
```

Add loopback frontend origin `http://127.0.0.1:5174` to the test bucket's CORS
configuration for browser uploads. Keep the bucket private and versioned.
Keep ordinary `backend/.env` on its normal ports (3000/5173); the harness
overrides belong only in `.harness/live.env`. Add the harness callback as an
additional GitHub App callback instead of replacing the ordinary callback.
An existing installation can authorize through that callback; the App's
installation setup URL is a separate setting to review for new installations.
Grant the test AWS profile access to the chosen harness prefix. A policy
restricted to `dev/*` will not cover it. Add a staging-only lifecycle rule for
`<S3_KEY_PREFIX>/staging/`, preserving other rules; never expire the entire
harness prefix because it includes retained originals and prepared versions.
Configure `LIBREOFFICE_PATH` for rich document conversion on Windows. Use AWS
SSO/profile credentials rather than recording access keys. No ordinary backend
`.env` is loaded by the harness. GitHub settings and this prefix must refer to
explicit test resources, not ordinary working data.

Switch modes with `harness:down` followed by `harness:reset -- --live`. A reset
is necessary when switching because deterministic S3/GitHub identities are not
real resources. Live mode seeds editable context without fake remote objects.
After manual OAuth/account/repository selection in Chrome:

```powershell
npm.cmd run harness:live-check -- --live --feature FEAT-1
```

The live command checks an existing connection, uploads/confirms controlled
text, PNG, and RTF files, waits for readiness (including LibreOffice conversion),
captures inputs, and retrieves exact versions with checksum validation. It does
not automate consent. Each invocation creates three retained test files; archive
or reset metadata as appropriate. Used objects remain retained in S3.

Inspect the capture's `preparationVersion` and prepared MIME types for the PNG
and converted PDF. The RTF check proves that conversion path, not every supported
Office format. Browser upload interactions still require a separate Chrome check.
Without live configuration, `harness:live-check` writes a `not_run` report.

While using the live database, add `-- --live` to environment-dependent commands,
for example `harness:doctor`, `harness:inspect`, `harness:capture`, and
`harness:studio` (combine it with any existing arguments). Deterministic tests
require a switch back with `harness:reset` without `--live`; this clears harness
metadata and OAuth connections. Export useful captures first. Artifact history
and retained S3 originals/prepared versions are not removed by reset.

## Troubleshooting

- Occupied app/control ports: stop the owning harness; do not kill arbitrary PIDs.
- Database connection/migration failure: inspect `docker compose -f harness/compose.yml ps`.
- Startup failure: inspect `.harness/backend.log`, `frontend.log`, and `supervisor.log`.
- External-provider failure: inspect the failed check and verify test credentials; do not switch to ordinary data.
- Capture failure: preserve its result artifact; a successful snapshot may exist even if later byte retrieval failed.
