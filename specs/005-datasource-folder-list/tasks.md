# Tasks: Datasource & Folder Listing

**Input**: Design documents from `/specs/005-datasource-folder-list/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Contract tests and integration tests are REQUIRED per constitution Principle IV (Practical Testing) and explicitly requested in spec.md's Input.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (existing simplified structure: commands, services, formatters, types)

---

## Phase 1: Setup

**No tasks required.** This feature adds no new dependencies, directories, or tooling — it reuses the existing commander/axios/vitest scaffolding from 001-cli-mvp unchanged.

---

## Phase 2: Foundational (Blocking Prerequisites)

**No tasks required.** User Story 1 (folders) and User Story 2 (datasources) touch different types, service functions, command files, and API endpoints — neither blocks the other, so there is no shared foundational work beyond what each story does itself.

---

## Phase 3: User Story 1 - Discover Available Folders (Priority: P1) 🎯 MVP

**Goal**: Let users list every folder on the target Grafana server via a new `folder list` command, so they can find valid values for the existing `--folder` option on `dashboard list` / `alert list`.

**Independent Test**: Run `grafana-cli folder list` against a server with multiple folders and confirm every folder's title and identifier is shown; then run `grafana-cli dashboard list --folder <title>` using one of the displayed titles and confirm it returns matching results.

### Tests for User Story 1 (Required by Constitution)

- [x] T001 [P] [US1] Contract test for GET /api/folders in tests/contract/folders.test.ts (test returns 200 with array of folder objects; verify each item has `id`, `uid`, `title`; test empty folder list returns 200 with `[]`)
- [x] T002 [P] [US1] Integration test for folder list flow in tests/integration/folder-flow.test.ts (test `folder list` table output contains folder titles and ids; test `folder list --json` produces a valid JSON array; test `folder list --config <name>` targets the specified server; test empty result prints "No folders found.")

### Implementation for User Story 1

- [x] T003 [P] [US1] Add `Folder` interface to src/types/index.ts (`id: number`, `uid?: string`, `title: string`)
- [x] T004 [US1] Implement `listFolders` service in src/services/grafana-client.ts (fetch `GET /api/folders`, map response to `Folder[]`, reuse existing `handleError` for network/auth errors)
- [x] T005 [US1] Create folder command in src/commands/folder.ts (`createFolderCommand` factory, subcommand `list` with `--config <name>` and `--json` options, table output with columns ID/UID/TITLE via `formatTable`, "No folders found." message on empty, JSON output via `formatJson`)
- [x] T006 [US1] Register folder command in src/index.ts (import `createFolderCommand`, call `program.addCommand`)

**Checkpoint**: At this point, `folder list` is fully functional and independently testable — users can discover folder names before using `--folder` on other commands.

---

## Phase 4: User Story 2 - Discover Available Datasources (Priority: P2)

**Goal**: Let users list every datasource on the target Grafana server via a new `datasource list` command, so they can find valid values for `query execute --datasource`.

**Independent Test**: Run `grafana-cli datasource list` against a server with multiple datasources and confirm each one's name, type, and default indicator is shown; then run `grafana-cli query execute --datasource <name>` using one of the returned names and confirm it resolves correctly. Also verify that Viewer-only credentials produce a clear permission message rather than a raw error.

### Tests for User Story 2 (Required by Constitution)

- [x] T007 [P] [US2] Contract test for GET /api/datasources in tests/contract/datasources.test.ts (test returns 200 with array of datasource objects; verify each item has `id`, `uid`, `name`, `type`, `isDefault`; test that credentials without Editor/Admin role return 403)
- [x] T008 [P] [US2] Integration test for datasource list flow in tests/integration/datasource-flow.test.ts (test `datasource list` table output contains name/type/default columns; test `datasource list --json` produces a valid JSON array; test `datasource list --config <name>` targets the specified server; test empty result prints "No datasources found.")

### Implementation for User Story 2

- [x] T009 [P] [US2] Add `DatasourceInfo` interface to src/types/index.ts (`id: number`, `uid?: string`, `name: string`, `type: string`, `isDefault: boolean`)
- [x] T010 [US2] Implement `listDatasources` service in src/services/grafana-client.ts (fetch `GET /api/datasources`, map response to `DatasourceInfo[]`, add a 403-specific branch with message "Listing datasources requires Editor or Admin role. Check your account role or API key permissions." before falling through to the generic `handleError`)
- [x] T011 [US2] Create datasource command in src/commands/datasource.ts (`createDatasourceCommand` factory, subcommand `list` with `--config <name>` and `--json` options, table output with columns ID/NAME/TYPE/DEFAULT (yes/no) via `formatTable`, "No datasources found." message on empty, JSON output via `formatJson`)
- [x] T012 [US2] Register datasource command in src/index.ts (import `createDatasourceCommand`, call `program.addCommand`)

**Checkpoint**: At this point, both `folder list` and `datasource list` should be independently functional — full feature scope complete.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect the whole feature

- [x] T013 [P] Update README.md with `folder list` and `datasource list` command reference sections (mirror the existing `dashboard`/`alert` sections' style)
- [x] T014 [P] Update .claude/skills/grafana.md to document the two new sub-commands (purpose, options, one usage example each)
- [x] T015 Run format check (`pnpm format:check`) and type check (`pnpm build`), verify both pass with no errors
- [x] T016 Run full test suite (`pnpm test:run`) and verify new contract/integration tests pass alongside the existing suite with no regressions
- [x] T017 Validate quickstart.md examples manually against a real or test Grafana v7.5 instance — validated against `grafana/grafana:7.5.0` in Docker: `folder list`, `datasource list` (table + `--json`), cross-use with `dashboard list --folder` and `query execute --datasource`, `jq` scripting examples, Viewer-role 403 permission message, unknown `--config` error. All 4 new test files (14 tests) pass against the live server; container removed after validation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks — nothing to wait on
- **Foundational (Phase 2)**: No tasks — nothing blocks the user stories
- **User Stories (Phase 3-4)**: Both can start immediately and proceed in parallel (if staffed) or sequentially in priority order (P1 → P2)
- **Polish (Phase 5)**: Depends on both user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories — fully independent
- **User Story 2 (P2)**: No dependencies on User Story 1 — fully independent (different endpoint, type, service function, and command file)

### Within Each User Story

- Contract tests MUST be written and FAIL before implementation
- Types before services
- Services before commands
- Commands before registration in src/index.ts
- Story complete before moving to the next priority

### Parallel Opportunities

- **Phase 3 (US1)**: T001, T002 in parallel (different test files); T003 in parallel with T001/T002 (different file, no dependency)
- **Phase 4 (US2)**: T007, T008 in parallel (different test files); T009 in parallel with T007/T008 (different file, no dependency)
- **Between User Stories**: Once each story's tests are written, US1 (T003-T006) and US2 (T009-T012) can be implemented fully in parallel by different developers — no shared files
- **Phase 5 (Polish)**: T013, T014 in parallel (different files)

---

## Parallel Example: User Story 1

```bash
# Launch both tests for User Story 1 together:
Task: "Contract test for GET /api/folders in tests/contract/folders.test.ts"          # T001
Task: "Integration test for folder list flow in tests/integration/folder-flow.test.ts" # T002

# Type addition can run alongside the tests (different file):
Task: "Add Folder interface to src/types/index.ts"                                     # T003

# Then sequential (same file / dependency chain):
Task: "Implement listFolders service in src/services/grafana-client.ts"                # T004 (depends on T003)
Task: "Create folder command in src/commands/folder.ts"                                # T005 (depends on T004)
Task: "Register folder command in src/index.ts"                                        # T006 (depends on T005)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (`folder list`) — 6 tasks
2. **STOP and VALIDATE**: Run `grafana-cli folder list` against a real server, confirm output, cross-check with `dashboard list --folder <title>`
3. Ship/demo if ready

**MVP Task Count**: 6 tasks (User Story 1 only, no setup/foundational overhead)

### Incremental Delivery

1. **MVP (US1)**: `folder list` → 6 tasks → test independently → **6 tasks total** → ship
2. **P2 (US2)**: Add `datasource list` → 6 tasks → test independently → **12 tasks total** → ship
3. **Polish**: Final improvements → 5 tasks → **17 tasks total** → done

### Parallel Team Strategy

With two developers:

1. Developer A: User Story 1 (`folder list`) — 6 tasks
2. Developer B: User Story 2 (`datasource list`) — 6 tasks
3. Both stories complete and integrate independently (different files throughout, only converge briefly at `src/index.ts` registration — trivial to merge)
4. Team completes Polish together (5 tasks)

---

## Task Count Summary

- **Phase 1 (Setup)**: 0 tasks
- **Phase 2 (Foundational)**: 0 tasks
- **Phase 3 (User Story 1 - P1)**: 6 tasks (2 test + 4 implementation)
- **Phase 4 (User Story 2 - P2)**: 6 tasks (2 test + 4 implementation)
- **Phase 5 (Polish)**: 5 tasks

**Total**: 17 tasks

**MVP Scope (User Story 1 only)**: 6 tasks

**Test Tasks**: 2 contract tests + 2 integration tests = 4 test tasks (24% of total)

---

## Notes

- All tasks follow strict checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability (US1, US2)
- Each user story is independently completable and testable
- Contract tests and integration tests are REQUIRED per constitution Principle IV
- Verify tests fail before implementing (TDD for contract tests)
- Commit after each task or logical group
- Stop at the Phase 3 checkpoint to validate `folder list` independently before starting `datasource list`
