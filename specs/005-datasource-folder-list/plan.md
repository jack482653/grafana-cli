# Implementation Plan: Datasource & Folder Listing

**Branch**: `005-datasource-folder-list` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-datasource-folder-list/spec.md`

## Summary

Add two read-only listing commands — `datasource list` and `folder list` — so users can discover valid values for the `--datasource` option on `query execute` and the `--folder` option already present on `dashboard list` / `alert list`, without leaving the terminal. Both commands follow the existing command/service/formatter layering, reuse `resolveConfig()` for server targeting and `formatTable`/`formatJson` for output, and add one new read path each in `grafana-client.ts` (`GET /api/datasources`, `GET /api/folders` — the latter already called internally by `listAlerts()` and now also exposed directly).

## Technical Context

**Language/Version**: Node.js 18+, TypeScript 5.x (ES2022)
**Primary Dependencies**: commander 14.x, axios 1.x (existing, no new dependencies)
**Storage**: N/A (no local persistence; reads directly from Grafana API)
**Testing**: vitest (existing framework) — contract tests + integration test
**Target Platform**: macOS / Linux CLI
**Project Type**: Single project (CLI)
**Performance Goals**: Single API call per command, well within existing 5s command budget
**Constraints**: Grafana v7.5 HTTP API compatibility; read-only (no writes); `GET /api/datasources` requires Admin role (Viewer and Editor are both denied)
**Scale/Scope**: 2 new sub-commands, 1 new service function (`listDatasources`; `listFolders` wraps the existing internal folder fetch), 2 new types

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                       | Status  | Notes                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. MVP-First                    | ✅ PASS | Two flat `list` sub-commands, no filtering/pagination/caching added beyond what's asked. Reuses every existing helper (`resolveConfig`, `formatTable`, `formatJson`, `handleError`).                                                                                                               |
| II. CLI-First                   | ✅ PASS | `--json` for machine output, table for humans, errors to stderr with existing exit codes (1 general, 2 auth/permission, 3 network).                                                                                                                                                                |
| III. Clean Architecture & SOLID | ✅ PASS | Business logic (API calls, response mapping) stays in `services/grafana-client.ts`; command files stay thin (parse → call service → format). Matches existing project precedent (already a simplified layered structure, not full DI/interfaces — see `specs/001-cli-mvp/research.md` Decision 5). |
| IV. Practical Testing           | ✅ PASS | Contract tests for `GET /api/datasources` and `GET /api/folders`; integration test covering `folder list` → `dashboard list --folder` and `datasource list` → `query execute --datasource` cross-use.                                                                                              |
| V. Performance & Scalability    | ✅ PASS | Single GET request per command, no loops or N+1 calls; well under 5s/100MB budget.                                                                                                                                                                                                                 |

No violations. Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/005-datasource-folder-list/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   ├── datasource-api.md
│   └── folder-api.md
├── quickstart.md         # Phase 1 output
└── tasks.md               # Phase 2 output (/speckit.tasks — not created by this command)
```

### Source Code (repository root)

```text
src/
├── commands/
│   ├── datasource.ts     # NEW: createDatasourceCommand (list sub-command)
│   └── folder.ts         # NEW: createFolderCommand (list sub-command)
├── services/
│   └── grafana-client.ts # Add listDatasources(); add listFolders() wrapping existing folder fetch
├── types/
│   └── index.ts          # Add DatasourceInfo and Folder interfaces
└── index.ts               # Register createDatasourceCommand, createFolderCommand

tests/
├── contract/
│   ├── datasources.test.ts   # NEW: GET /api/datasources contract tests
│   └── folders.test.ts       # NEW: GET /api/folders contract tests
└── integration/
    ├── folder-flow.test.ts       # NEW: folder list flow (US1)
    └── datasource-flow.test.ts   # NEW: datasource list flow (US2)
```

**Structure Decision**: Single project, simplified layered structure (unchanged from 001-cli-mvp / 004-claude-skill-config). No new directories — two new command files alongside the existing five, one new service function pair, two new type interfaces.

## Phase 0: Research

See [research.md](./research.md) for full decision log. Summary:

- **Datasource endpoint choice**: Use `GET /api/datasources` (full list, Admin-gated — Viewer and Editor are both denied) rather than the already-used `GET /api/frontend/settings` (Viewer-accessible but undocumented/internal), because the user-facing command should be built on the documented public contract and clearly surface the permission requirement (FR-005) rather than silently depending on an internal endpoint.
- **Folder endpoint reuse**: `GET /api/folders` is already called internally by `listAlerts()` via `resolveFolderId()`. This feature adds a public `listFolders()` that returns the full array directly — no new endpoint, just a new exposed path through an existing, already-proven call.
- **Type naming**: The existing `Datasource` interface in `src/types/index.ts` is a _lightweight reference_ (used inside `Panel`/`Query` — `{type?, uid?, id?}`). The new full-listing shape is named `DatasourceInfo` to avoid colliding with that existing type.

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md) for entity definitions and [contracts/](./contracts/) for the two API contracts.

### Command Design

```text
grafana-cli datasource list [--config <name>] [--json]
grafana-cli folder list [--config <name>] [--json]
```

Both mirror the exact option set and behavior of existing single-sub-command groups (pattern: `alert list`, `dashboard list`) — `--config` (with `--server` accepted silently for consistency, though not advertised since these are new commands with no legacy `--server` users), `--json`, table output by default, "No X found." message on empty results.

### Service Layer Additions (`src/services/grafana-client.ts`)

- `listDatasources(config: ServerConfig): Promise<DatasourceInfo[]>` — `GET /api/datasources`, maps response to `{id, uid, name, type, isDefault}`, surfaces 403 with a permission-specific message (FR-005) via a new branch before falling through to the generic `handleError`.
- `listFolders(config: ServerConfig): Promise<Folder[]>` — `GET /api/folders`, maps response to `{id, uid, title}`. The existing internal `resolveFolderId()` helper is unchanged; this is an independent exported function (no shared state, avoids coupling the internal helper's signature to the new public command).

### Agent Context Update

Ran `.specify/scripts/bash/update-agent-context.sh claude` (see below) to record the new commands in the active-technologies list for agent context continuity.
