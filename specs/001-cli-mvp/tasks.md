# Tasks: Grafana CLI Core

**Input**: Design documents from `/specs/001-cli-mvp/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Contract tests and integration tests are REQUIRED per constitution Principle IV (Practical Testing).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below use simplified structure (commands, services, formatters, types)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize Node.js + TypeScript project with dependencies and tooling

- [x] T001 Initialize pnpm workspace with package.json (name: grafana-cli, version: 0.1.0, type: module, bin: grafana-cli)
- [x] T002 [P] Install dependencies: commander@^14.0.2, axios@^1.13.2
- [x] T003 [P] Install dev dependencies: typescript@^5.9.3, vitest@^4.0.16, @vitest/coverage-v8@^4.0.16, tsx@^4.21.0, prettier@^3.7.4, @trivago/prettier-plugin-sort-imports@^6.0.0, @types/node@^25.0.3
- [x] T004 [P] Create .nvmrc with Node.js version 18
- [x] T005 [P] Create tsconfig.json (target: ES2022, module: Node16, moduleResolution: node16, strict: true, esModuleInterop: true, outDir: dist, rootDir: src)
- [x] T006 [P] Create .prettierrc (copy from prom-cli: semi: true, singleQuote: false, tabWidth: 2, trailingComma: all, printWidth: 100, plugins: @trivago/prettier-plugin-sort-imports, importOrder: ["^node:", "<THIRD_PARTY_MODULES>", "^[./]"])
- [x] T007 [P] Create vitest.config.ts (test file pattern: *.test.ts, coverage provider: v8)
- [x] T008 [P] Add scripts to package.json (dev: tsx src/index.ts, build: tsc, start: node dist/index.js, test: vitest, test:run: vitest run, test:coverage: vitest run --coverage, format: prettier --write ., format:check: prettier --check .)
- [x] T009 Create src/ directory structure (commands/, services/, formatters/, types/)
- [x] T010 Create tests/ directory structure (contract/, integration/, unit/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Create TypeScript types in src/types/index.ts (ServerConfig, ConfigStore, Dashboard, Panel, Query, QueryResult, Alert, ServerStatus, Datasource, TimeSeries, Datapoint, AlertState enum)
- [x] T012 [P] Create JSON formatter in src/formatters/json.ts (formatJson function, pretty print with 2-space indent)
- [x] T013 [P] Create table formatter in src/formatters/table.ts (formatTable function with columns array, calculateWidths, padEnd helpers - manual implementation like prom-cli)
- [x] T014 Create config store service in src/services/config-store.ts (loadConfigStore, saveConfigStore, addConfig, removeConfig, setActiveConfig, getActiveConfig functions with atomic write pattern using temp file + rename, file permissions 0600)
- [x] T015 Create Grafana HTTP client service in src/services/grafana-client.ts (createClient function returning axios instance with baseURL, auth headers for API key/basic auth, timeout 30s, handleError function for 401/403/network errors with exit codes 2/3)
- [x] T016 [P] Create CLI entry point in src/index.ts (#!/usr/bin/env node shebang, commander setup with program name/description/version, parse args)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Server Configuration and Verification (Priority: P1) 🎯 MVP

**Goal**: Enable users to configure Grafana server connections and verify connectivity

**Independent Test**: Configure server → verify status command works → confirm config persists

### Contract Tests for User Story 1 (Required by Constitution)

- [x] T017 [P] [US1] Contract test for GET /api/health in tests/contract/health.test.ts (test returns 200 with version, database "ok", commit fields)
- [x] T018 [P] [US1] Contract test for authentication failure in tests/contract/health.test.ts (test returns 401 with invalid API key, 403 with insufficient permissions)

### Integration Tests for User Story 1 (Required by Constitution)

- [x] T019 [P] [US1] Integration test for config flow in tests/integration/config-flow.test.ts (test config set → config list → status command → verify output contains version and database status)

### Implementation for User Story 1

- [x] T020 [P] [US1] Create config command in src/commands/config.ts (createConfigCommand factory, subcommands: set [--url] [--name] [--api-key] [--username] [--password], list, delete [name], show, use [name])
- [x] T021 [P] [US1] Create status command in src/commands/status.ts (createStatusCommand factory, options: --server [name], --json, calls getServerStatus service, formats output as table or JSON)
- [x] T022 [US1] Implement getServerStatus service in src/services/grafana-client.ts (fetch GET /api/health, return ServerStatus object, handle errors with meaningful messages)
- [x] T023 [US1] Register config and status commands in src/index.ts (import createConfigCommand and createStatusCommand, call program.addCommand for each)
- [x] T024 [US1] Add config file error handling in src/services/config-store.ts (handle missing directory, corrupted JSON, permission errors, provide actionable error messages to stderr)
- [x] T025 [US1] Add URL validation in src/services/config-store.ts (validate https?:// protocol, valid URL format using new URL() constructor, provide clear error messages)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - users can configure servers and check status

---

## Phase 4: User Story 2 - Dashboard Discovery and Exploration (Priority: P2)

**Goal**: Enable users to list, search, and retrieve dashboard definitions

**Independent Test**: List dashboards → filter by folder/tag → get dashboard by UID → verify panels displayed

### Contract Tests for User Story 2 (Required by Constitution)

- [x] T026 [P] [US2] Contract test for GET /api/search in tests/contract/dashboards.test.ts (test returns 200 with array of dashboards, verify fields: uid, title, tags, folderTitle)
- [x] T027 [P] [US2] Contract test for GET /api/search with filters in tests/contract/dashboards.test.ts (test query param, tag param, folderIds param return filtered results)
- [x] T028 [P] [US2] Contract test for GET /api/dashboards/uid/:uid in tests/contract/dashboards.test.ts (test returns 200 with dashboard object containing panels array, verify panel structure: id, title, type, datasource, targets)
- [x] T029 [P] [US2] Contract test for dashboard not found in tests/contract/dashboards.test.ts (test GET /api/dashboards/uid/invalid returns 404)

### Integration Tests for User Story 2 (Required by Constitution)

- [x] T030 [P] [US2] Integration test for dashboard flow in tests/integration/dashboard-flow.test.ts (test dashboard list → dashboard get [uid] → verify output contains panels with IDs and queries)

### Implementation for User Story 2

- [x] T031 [P] [US2] Create dashboard command in src/commands/dashboard.ts (createDashboardCommand factory, subcommands: list [--folder] [--tag] [--query] [--server] [--json], get [uid] [--server] [--json])
- [x] T032 [US2] Implement listDashboards service in src/services/grafana-client.ts (fetch GET /api/search?type=dash-db with query params, return Dashboard[], handle filters: folderIds, tag, query)
- [x] T033 [US2] Implement getDashboard service in src/services/grafana-client.ts (fetch GET /api/dashboards/uid/:uid, return Dashboard object with panels, handle 404 not found)
- [x] T034 [US2] Register dashboard command in src/index.ts (import createDashboardCommand, call program.addCommand)
- [x] T035 [US2] Add dashboard list table formatting in src/commands/dashboard.ts (format dashboard list output with columns: UID, TITLE, FOLDER, TAGS - use formatTable from formatters)
- [x] T036 [US2] Add dashboard get output formatting in src/commands/dashboard.ts (format dashboard details with panels list showing panel ID, title, type, datasource, query preview)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can configure servers, check status, and explore dashboards

---

## Phase 5: User Story 3 - Data Query Execution (Priority: P3)

**Goal**: Enable users to execute panel queries and retrieve time-series data

**Independent Test**: Get dashboard → identify panel → execute query with time range → verify data returned

### Contract Tests for User Story 3 (Required by Constitution)

- [x] T037 [P] [US3] Contract test for POST /api/ds/query in tests/contract/queries.test.ts (test single query returns 200 with results object, verify frame structure: schema.fields, data.values arrays)
- [x] T038 [P] [US3] Contract test for POST /api/ds/query with multiple queries in tests/contract/queries.test.ts (test multiple queries return results keyed by refId: A, B, C)
- [x] T039 [P] [US3] Contract test for invalid query syntax in tests/contract/queries.test.ts (test returns 400 or partial error with message)
- [x] T040 [P] [US3] Contract test for query timeout in tests/contract/queries.test.ts (test long-running query returns 504 or timeout error)

### Integration Tests for User Story 3 (Required by Constitution)

- [x] T041 [P] [US3] Integration test for query flow in tests/integration/query-flow.test.ts (test dashboard get → query execute --dashboard [uid] --panel [id] --from "now-1h" --to "now" → verify output contains timestamps and values)

### Implementation for User Story 3

- [x] T042 [P] [US3] Create query command in src/commands/query.ts (createQueryCommand factory, subcommand: execute --dashboard [uid] --panel [id] --from [time] --to [time] [--var key=value] [--server] [--json])
- [x] T043 [P] [US3] Create time parser service in src/services/time-parser.ts (parseTimeRange function to convert "now-1h", "now-24h", ISO 8601 strings, Unix timestamps to milliseconds)
- [x] T044 [US3] Implement executeQuery service in src/services/grafana-client.ts (fetch dashboard by UID, extract panel by ID, build query request with datasource and targets, POST /api/ds/query, return QueryResult[], handle multiple queries per panel)
- [x] T045 [US3] Register query command in src/index.ts (import createQueryCommand, call program.addCommand)
- [x] T046 [US3] Add query result table formatting in src/commands/query.ts (format query results with columns: TIMESTAMP, VALUE, LABELS - one table per query refId, handle multiple time series per query)
- [x] T047 [US3] Add template variable support in src/commands/query.ts (parse --var flags, substitute variables in query expressions before execution - note: basic string replacement for MVP, full dashboard variable context deferred)
- [x] T048 [US3] Add progress indicator for long-running queries in src/commands/query.ts (write "Executing query..." to stderr, handle Ctrl+C cancellation with axios cancel token)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - users can configure, explore, and query dashboards

---

## Phase 6: User Story 4 - Alert Monitoring (Priority: P4)

**Goal**: Enable users to list alerts and view alert details

**Independent Test**: List alerts → filter by state → get alert details → verify conditions displayed

### Contract Tests for User Story 4 (Required by Constitution)

- [ ] T049 [P] [US4] Contract test for GET /api/alerts in tests/contract/alerts.test.ts (test returns 200 with array of alerts, verify fields: id, name, state, dashboardId, panelId, folderTitle)
- [ ] T050 [P] [US4] Contract test for GET /api/alerts with state filter in tests/contract/alerts.test.ts (test ?state=alerting returns only alerting alerts, test ?state=ok returns only ok alerts)
- [ ] T051 [P] [US4] Contract test for GET /api/alerts/:id in tests/contract/alerts.test.ts (test returns 200 with alert object containing settings.conditions array, verify condition structure)
- [ ] T052 [P] [US4] Contract test for alert not found in tests/contract/alerts.test.ts (test GET /api/alerts/9999 returns 404)

### Integration Tests for User Story 4 (Required by Constitution)

- [ ] T053 [P] [US4] Integration test for alert flow in tests/integration/alert-flow.test.ts (test alert list → alert list --state alerting → alert get [id] → verify output contains alert state and conditions)

### Implementation for User Story 4

- [ ] T054 [P] [US4] Create alert command in src/commands/alert.ts (createAlertCommand factory, subcommands: list [--state] [--folder] [--server] [--json], get [id] [--server] [--json])
- [ ] T055 [US4] Implement listAlerts service in src/services/grafana-client.ts (fetch GET /api/alerts with query params, return Alert[], handle filters: state, folderId, query)
- [ ] T056 [US4] Implement getAlert service in src/services/grafana-client.ts (fetch GET /api/alerts/:id, return Alert object with settings, handle 404 not found)
- [ ] T057 [US4] Register alert command in src/index.ts (import createAlertCommand, call program.addCommand)
- [ ] T058 [US4] Add alert list table formatting in src/commands/alert.ts (format alert list output with columns: ID, NAME, STATE, DASHBOARD, FOLDER - use formatTable from formatters)
- [ ] T059 [US4] Add alert get output formatting in src/commands/alert.ts (format alert details with state, message, conditions summary, evaluation frequency, notification channels)

**Checkpoint**: All user stories should now be independently functional - full MVP feature set complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T060 [P] Add README.md with installation instructions (npm install -g grafana-cli or pnpm install -g grafana-cli), quick start guide (config set, status, dashboard list), command reference
- [ ] T061 [P] Add error message improvements across all commands in src/services/grafana-client.ts (ensure all errors include actionable next steps, e.g., "Run 'grafana-cli config list' to verify settings")
- [ ] T062 [P] Add comprehensive JSDoc comments to all service functions in src/services/ (document parameters, return types, throws, examples)
- [ ] T063 Run format check in CI (pnpm format:check) and verify all code passes prettier rules
- [ ] T064 Run test coverage report (pnpm test:coverage) and verify contract + integration tests cover all API endpoints and user flows
- [ ] T065 Validate quickstart.md instructions by following setup steps on clean machine and verifying all commands work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on User Story 1 (independently testable)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No hard dependency on User Story 2, but benefits from dashboard get functionality for identifying panels (independently testable with hardcoded dashboard UID)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - No dependencies on other stories (independently testable)

### Within Each User Story

- Contract tests (if included) MUST be written and FAIL before implementation
- Models/types before services (defined in Foundational phase)
- Services before commands
- Commands before integration tests verify end-to-end flow
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: All tasks marked [P] can run in parallel (T002-T008, T009-T010 sequential)
- **Phase 2 (Foundational)**: Tasks T012, T013, T016 can run in parallel (no file dependencies); T014, T015 sequential after T011
- **User Story Tests**: All contract tests marked [P] within a story can run in parallel (different test files)
- **User Story Implementation**: Tasks marked [P] within a story can run in parallel (different source files)
- **Between User Stories**: Once Foundational phase completes, all user stories (Phase 3-6) can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all contract tests for User Story 1 together:
# Task T017: Contract test for GET /api/health
# Task T018: Contract test for authentication failure

# Then launch all integration tests:
# Task T019: Integration test for config flow

# Then launch all implementation tasks that are parallelizable:
# Task T020: Create config command in src/commands/config.ts
# Task T021: Create status command in src/commands/status.ts

# Then sequential tasks:
# Task T022: Implement getServerStatus service (depends on grafana-client setup)
# Task T023: Register commands (depends on commands being created)
# Task T024: Add error handling (enhances existing service)
# Task T025: Add URL validation (enhances existing service)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (10 tasks)
2. Complete Phase 2: Foundational (6 tasks) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (9 tasks - contract tests, integration test, implementation)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Verify: config set → config list → status command works
   - Verify: Invalid API key returns clear error message
   - Verify: Config file persists across CLI invocations
5. Deploy/demo if ready

**MVP Task Count**: 10 (setup) + 6 (foundational) + 9 (US1) = **25 tasks for MVP**

### Incremental Delivery

1. **Foundation**: Complete Setup + Foundational → 16 tasks → Foundation ready
2. **MVP (US1)**: Add User Story 1 → 9 tasks → Test independently → **25 tasks total** → Deploy/Demo
3. **P2 (US2)**: Add User Story 2 → 11 tasks → Test independently → **36 tasks total** → Deploy/Demo
4. **P3 (US3)**: Add User Story 3 → 12 tasks → Test independently → **48 tasks total** → Deploy/Demo
5. **P4 (US4)**: Add User Story 4 → 11 tasks → Test independently → **59 tasks total** → Deploy/Demo
6. **Polish**: Final improvements → 6 tasks → **65 tasks total** → Production ready

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (16 tasks)
2. Once Foundational is done:
   - Developer A: User Story 1 (9 tasks)
   - Developer B: User Story 2 (11 tasks)
   - Developer C: User Story 3 (12 tasks)
   - Developer D: User Story 4 (11 tasks)
3. Stories complete and integrate independently
4. Team completes Polish together (6 tasks)

---

## Task Count Summary

- **Phase 1 (Setup)**: 10 tasks
- **Phase 2 (Foundational)**: 6 tasks
- **Phase 3 (User Story 1 - P1)**: 9 tasks (3 test + 6 implementation)
- **Phase 4 (User Story 2 - P2)**: 11 tasks (4 test + 7 implementation)
- **Phase 5 (User Story 3 - P3)**: 12 tasks (4 test + 8 implementation)
- **Phase 6 (User Story 4 - P4)**: 11 tasks (4 test + 7 implementation)
- **Phase 7 (Polish)**: 6 tasks

**Total**: 65 tasks

**MVP Scope (User Story 1 only)**: 25 tasks (Setup + Foundational + US1)

**Test Tasks**: 15 contract tests + 4 integration tests = 19 test tasks (29% of total)

**Parallel Opportunities**:
- Setup phase: 7 parallelizable tasks out of 10
- Foundational phase: 3 parallelizable tasks out of 6
- User Story 1: 2 parallelizable test tasks + 2 parallelizable implementation tasks
- User Story 2: 4 parallelizable test tasks + 2 parallelizable implementation tasks
- User Story 3: 4 parallelizable test tasks + 3 parallelizable implementation tasks
- User Story 4: 4 parallelizable test tasks + 2 parallelizable implementation tasks
- Polish phase: 4 parallelizable tasks out of 6

---

## Notes

- All tasks follow strict checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4)
- Each user story is independently completable and testable
- Contract tests and integration tests are REQUIRED per constitution Principle IV
- Verify tests fail before implementing (TDD for contract tests)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Simplified structure (commands, services, formatters, types) per research.md Decision 5
