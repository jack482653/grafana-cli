# Implementation Plan: Alert Notification Channel Discovery

**Branch**: `006-notification-channels` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-notification-channels/spec.md`

## Summary

Add `notification list` and `notification get <id>` so users can see where an alert's notifications actually go (email/Slack/webhook/etc.), completing the visibility `alert list`/`alert get` already provide for state and conditions. Both commands follow the existing command/service/formatter layering, reuse `resolveConfig()` for server targeting and `formatTable`/`formatJson` for output, and add two new read paths in `grafana-client.ts` (`GET /api/alert-notifications`, `GET /api/alert-notifications/:id`).

## Technical Context

**Language/Version**: Node.js 18+, TypeScript 5.x (ES2022)
**Primary Dependencies**: commander 14.x, axios 1.x (existing, no new dependencies)
**Storage**: N/A (no local persistence; reads directly from Grafana API)
**Testing**: vitest (existing framework) — contract tests + integration test
**Target Platform**: macOS / Linux CLI
**Project Type**: Single project (CLI)
**Performance Goals**: Single API call per command, well within existing 5s command budget
**Constraints**: Grafana v7.5 HTTP API compatibility; read-only (no writes); `GET /api/alert-notifications` and `GET /api/alert-notifications/:id` require Editor or Admin role — empirically verified against a live Grafana 7.5.0 instance (Viewer gets 403 on both; the lighter-weight `/api/alert-notifications/lookup` endpoint is Viewer-accessible but deliberately not used here, see research.md Decision 1)
**Scale/Scope**: 1 new sub-command group (`notification`, with `list` + `get <id>`), 2 new service functions, 2 new types

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                       | Status  | Notes                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. MVP-First                    | ✅ PASS | One command group, two operations on one resource (mirrors `alert list`/`alert get` as a single story). No filtering/pagination/caching added beyond what's asked. Reuses every existing helper.                                                                                      |
| II. CLI-First                   | ✅ PASS | `--json` for machine output, table for humans, errors to stderr with existing exit codes (1 general, 2 auth/permission, 3 network).                                                                                                                                                   |
| III. Clean Architecture & SOLID | ✅ PASS | Business logic (API calls, response mapping) stays in `services/grafana-client.ts`; command file stays thin. Matches existing project precedent (simplified layered structure).                                                                                                       |
| IV. Practical Testing           | ✅ PASS | Contract tests for `GET /api/alert-notifications` and `GET /api/alert-notifications/:id` (including the empirically-verified 403-for-Viewer behavior); integration test covering `notification list` → `notification get <id>` flow, cross-referenced against `alert get` per SC-004. |
| V. Performance & Scalability    | ✅ PASS | Single GET request per command, no loops or N+1 calls; well under 5s/100MB budget.                                                                                                                                                                                                    |

No violations. Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/006-notification-channels/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   └── notification-api.md
├── quickstart.md         # Phase 1 output
└── tasks.md               # Phase 2 output (/speckit.tasks — not created by this command)
```

### Source Code (repository root)

```text
src/
├── commands/
│   └── notification.ts   # NEW: createNotificationCommand (list + get <id> sub-commands)
├── services/
│   └── grafana-client.ts # Add listNotificationChannels(); add getNotificationChannel()
├── types/
│   └── index.ts          # Add NotificationChannel and NotificationChannelDetail interfaces
└── index.ts               # Register createNotificationCommand

tests/
├── contract/
│   └── notifications.test.ts        # NEW: GET /api/alert-notifications[/:id] contract tests
└── integration/
    └── notification-flow.test.ts    # NEW: notification list/get flow
```

**Structure Decision**: Single project, simplified layered structure (unchanged from prior features). One new command file (grouping `list` and `get`, matching the `alert.ts` shape exactly), one new service function pair, two new type interfaces.

## Phase 0: Research

See [research.md](./research.md) for full decision log. Summary:

- **Endpoint choice**: Use `GET /api/alert-notifications` (full detail, Editor/Admin-gated) rather than `GET /api/alert-notifications/lookup` (Viewer-accessible but reduced fields: no `settings`, `sendReminder`, `disableResolveMessage`, `created`/`updated`) — same reasoning as 005's datasource-endpoint decision: the discovery command should show enough detail to actually answer "where does this alert notify and how is it configured", not just a name/type pair.
- **Command shape**: `notification list` + `notification get <id>` mirrors `alert list`/`alert get <id>` exactly — same option set, same table/detail-view split, same error conventions.
- **Permission claim verified empirically first**: Unlike 005 (where "Editor or Admin" for datasources was assumed and turned out wrong), this feature's permission requirement was tested against a live Grafana 7.5.0 container with Admin/Editor/Viewer API keys before writing the spec — confirmed Editor and Admin both succeed, Viewer gets 403, on both `GET /api/alert-notifications` and `GET /api/alert-notifications/:id`.

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md) for entity definitions and [contracts/notification-api.md](./contracts/notification-api.md) for the API contract.

### Command Design

```text
grafana-cli notification list [--config <name>] [--json]
grafana-cli notification get <id> [--config <name>] [--json]
```

Mirrors `alert list`/`alert get <id>` exactly: `--config`, `--json`, table for `list`, labeled free-text detail view for `get` (Name/Type/Default/Send Reminder/Disable Resolve Message/Created/Updated, then a Settings section), "No notification channels found." on empty, "not found" message on invalid id, permission-specific message on 403 (mirroring `listDatasources`'s corrected pattern from 005 — this time the role claim is right the first time).

### Service Layer Additions (`src/services/grafana-client.ts`)

- `listNotificationChannels(config: ServerConfig): Promise<NotificationChannel[]>` — `GET /api/alert-notifications`, maps to `{id, uid, name, type, isDefault}`, 403 branch with a permission-specific message before falling through to `handleError`.
- `getNotificationChannel(config: ServerConfig, id: number): Promise<NotificationChannelDetail>` — `GET /api/alert-notifications/:id`, maps to the full detail shape, 404 branch ("channel not found") and 403 branch (permission message) before falling through to `handleError`.

### Agent Context Update

Run `.specify/scripts/bash/update-agent-context.sh claude` in Phase 1 execution to record this feature's tech stack in the active-technologies list (no new stack — same as prior features).
