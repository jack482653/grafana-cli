# Tasks: Alert Notification Channel Discovery

**Input**: Design documents from `/specs/006-notification-channels/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Contract tests and integration tests are REQUIRED per constitution Principle IV (Practical Testing) and explicitly requested in spec.md's Input.

**Organization**: Single user story (list + get on one resource, matching how `alert list`/`alert get` were treated as one story in 001-cli-mvp).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (the only story in this feature)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (existing simplified structure)

---

## Phase 1: Setup

**No tasks required.** No new dependencies, directories, or tooling — reuses existing scaffolding.

---

## Phase 2: Foundational (Blocking Prerequisites)

**No tasks required.** This feature has a single user story; there is no cross-story foundational work to isolate.

---

## Phase 3: User Story 1 - Discover Alert Notification Channels (Priority: P1) 🎯 MVP

**Goal**: Let users list all notification channels and view a single channel's full configuration via `notification list` / `notification get <id>`, completing the "where does this alert notify" picture alongside `alert list`/`alert get`.

**Independent Test**: Run `grafana-cli notification list` against a server with several channels and confirm each one's name/type/default is shown; run `grafana-cli notification get <id>` with one of the displayed ids and confirm full configuration (including `settings`) is shown; confirm a Viewer-role credential sees a clear permission message on both; confirm an unknown id shows a clear "not found" message.

### Tests for User Story 1 (Required by Constitution)

- [x] T001 [P] [US1] Contract test for GET /api/alert-notifications and GET /api/alert-notifications/:id in tests/contract/notifications.test.ts (test list returns 200 with array of channel objects; verify each item has `id`, `name`, `type`, `isDefault` and optional `uid`; test Viewer-role credentials return 403 on both list and get; test get-by-id returns 200 with full detail shape including `settings`, `sendReminder`, `disableResolveMessage`; test get with a non-existent id returns 404)
- [x] T002 [P] [US1] Integration test for notification flow in tests/integration/notification-flow.test.ts (test `notification list` table output contains ID/NAME/TYPE/DEFAULT columns; test `notification list --json` produces a valid JSON array; test `notification get <id>` detail output contains Name/Type/Settings; test `notification get <invalid-id>` exits non-zero with "not found" message; test `notification list --config <name>` targets the specified server; test empty result prints "No notification channels found.")

### Implementation for User Story 1

- [x] T003 [P] [US1] Add `NotificationChannel` and `NotificationChannelDetail` interfaces to src/types/index.ts (list shape: `id`, `uid?`, `name`, `type`, `isDefault`; detail shape adds `sendReminder`, `disableResolveMessage`, `frequency?`, `created?`, `updated?`, `settings: Record<string, unknown>`)
- [x] T004 [US1] Implement `listNotificationChannels` and `getNotificationChannel` services in src/services/grafana-client.ts (fetch `GET /api/alert-notifications` / `GET /api/alert-notifications/:id`, map to the two types; both functions add a 403-specific branch using the exact same literal message "Listing notification channels requires Editor or Admin role. Check your account role or API key permissions." before falling through to `handleError` — per contracts.md, `get`'s 403 reuses list's message verbatim rather than a separate "Getting..." variant; add a 404 branch on get with "Notification channel <id> not found." referencing `notification list`)
- [x] T005 [US1] Create notification command in src/commands/notification.ts (`createNotificationCommand` factory, subcommands `list` and `get <id>`, both with `--config <name>` and `--json` options; `list` table output with columns ID/NAME/TYPE/DEFAULT via `formatTable`, "No notification channels found." on empty; `get` labeled free-text detail view — Name/Type/Default/Send Reminder/Disable Resolve Message/Created/Updated — followed by a Settings section listing each key/value pair, or `Settings: (none)` when `settings` has zero keys; JSON output via `formatJson` for both)
- [x] T006 [US1] Register notification command in src/index.ts (import `createNotificationCommand`, call `program.addCommand`)

**Checkpoint**: `notification list` and `notification get <id>` are fully functional and independently testable — full feature scope complete (single story).

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect the whole feature

- [x] T007 [P] Update README.md with a `notification` command reference section (mirror the existing `alert` section's style)
- [x] T008 [P] Update .claude/skills/grafana.md to document the new sub-commands (purpose, options, one usage example each, note the Editor/Admin requirement)
- [x] T009 Run format check (`pnpm format:check`) and type check (`pnpm build`), verify both pass with no errors
- [x] T010 Run full test suite (`pnpm test:run`) and verify new contract/integration tests pass alongside the existing suite with no regressions
- [x] T011 Validate quickstart.md examples against a real or test Grafana v7.5 instance with Admin, Editor, and Viewer API keys, plus a not-found id case

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks
- **Foundational (Phase 2)**: No tasks
- **User Story 1 (Phase 3)**: No blocking prerequisites — can start immediately
- **Polish (Phase 4)**: Depends on Phase 3 being complete

### Within User Story 1

- Contract tests (T001) MUST be written and FAIL before implementation
- Types (T003) before services (T004)
- Services (T004) before command (T005)
- Command (T005) before registration (T006)

### Parallel Opportunities

- T001, T002, T003 can all run in parallel (different files, no dependencies on each other)
- T004 depends on T003; T005 depends on T004; T006 depends on T005 (sequential chain within the story)
- T007, T008 in parallel (different files) once T003-T006 are complete

---

## Parallel Example: User Story 1

```bash
# Launch tests and type addition together:
Task: "Contract test in tests/contract/notifications.test.ts"           # T001
Task: "Integration test in tests/integration/notification-flow.test.ts" # T002
Task: "Add types to src/types/index.ts"                                  # T003

# Then sequential (dependency chain):
Task: "Implement services in src/services/grafana-client.ts"             # T004 (depends on T003)
Task: "Create notification command in src/commands/notification.ts"      # T005 (depends on T004)
Task: "Register command in src/index.ts"                                 # T006 (depends on T005)
```

---

## Implementation Strategy

### MVP First (and only) — Single Story

1. Complete Phase 3: User Story 1 — 6 tasks
2. **STOP and VALIDATE**: Run `grafana-cli notification list` / `notification get <id>` against a real server with Editor/Admin/Viewer keys
3. Complete Phase 4: Polish — 5 tasks
4. Ship

**Total Task Count**: 11 tasks (6 story + 5 polish)

**Test Tasks**: 2 (contract + integration) = 18% of total

---

## Notes

- All tasks follow strict checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- [P] tasks = different files, no dependencies
- Contract tests and integration tests are REQUIRED per constitution Principle IV
- Verify tests fail before implementing (TDD for contract tests)
- Commit after each task or logical group
