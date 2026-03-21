# Tasks: Claude Skill & Per-Command Site Selection

**Input**: Design documents from `/specs/004-claude-skill-config/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

**Purpose**: Create the `.claude/skills/` directory needed for the Claude skill file.

- [X] T001 Create `.claude/skills/` directory at project root

---

## Phase 2: User Story 1 - Per-Command Site Selection via --config (Priority: P1) 🎯 MVP

**Goal**: Add `--config <name>` as the canonical option on all operational commands, keeping `--server` as a hidden backward-compat alias. Users can target any site in a single command without `config use`.

**Independent Test**: Run `grafana-cli status --config <name>` against a known non-default site — the correct URL is used and global active config is unchanged. Run with an unknown name — exits non-zero with error message.

### Implementation for User Story 1

- [X] T002 [P] [US1] Add `--config <name>` option to `src/commands/status.ts` (hide existing `--server` with `.hideHelp()`, update action to use `options.config ?? options.server`)
- [X] T003 [P] [US1] Add `--config <name>` option to `src/commands/dashboard.ts` list and get sub-commands (hide `--server` with `.hideHelp()`, update both action handlers)
- [X] T004 [P] [US1] Add `--config <name>` option to `src/commands/query.ts` execute sub-command (hide `--server` with `.hideHelp()`, update action handler)
- [X] T005 [P] [US1] Add `--config <name>` option to `src/commands/alert.ts` list and get sub-commands (hide `--server` with `.hideHelp()`, update both action handlers)
- [X] T006 [US1] Add integration tests (T066–T069) in `tests/integration/config-flag.test.ts`: `--config valid-site` routes correctly, `--config invalid` exits non-zero, no `--config` falls back to active config, `--server` hidden alias still works
- [X] T007 [US1] Update `README.md` to replace `--server` examples with `--config` in all command sections; add note that `--server` still works as alias

**Checkpoint**: At this point, all commands accept `--config <name>` and US1 is fully testable independently.

---

## Phase 3: User Story 2 - Claude Skill File (Priority: P2)

**Goal**: Create `.claude/skills/grafana.md` so Claude can understand grafana-cli's commands and generate correct invocations without extra context.

**Independent Test**: Open a fresh Claude Code session in this project — Claude should be able to generate `grafana-cli alert list --state alerting --config prod` from the prompt "list alerting alerts on prod" without reading README.

### Implementation for User Story 2

- [X] T008 [US2] Create `.claude/skills/grafana.md` covering: purpose, installation, all sub-commands (config set/list/use/show/delete, status, dashboard list/get, query execute, alert list/get), key options per command (`--config`, `--json`, `--state`, `--server`), and one usage example per sub-command emphasizing the `--config` flag

**Checkpoint**: Skill file installed and covers 100% of README sub-commands.

---

## Phase 4: Polish & Validation

**Purpose**: Verify build integrity and no regressions across all changes.

- [X] T009 [P] Build project with `npm run build` and verify TypeScript compiles without errors
- [X] T010 [P] Run `npm test` to verify all existing tests still pass (no regressions from option changes)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: No blocking prerequisites; T002–T005 are fully parallel; T006–T007 depend on T002–T005 being complete
- **US2 (Phase 3)**: Depends on T007 (README must be finalized so skill mirrors it); can otherwise start in parallel with US1 if README content is known
- **Polish (Phase 4)**: Depends on all phases complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies — start immediately after Phase 1
- **User Story 2 (P2)**: Logically depends on US1 being complete (skill must document the `--config` flag accurately); T008 can be drafted in parallel but finalized after T007

### Within User Story 1

- T002–T005: Fully parallel (different files)
- T006: After T002–T005 (tests exercise the implemented options)
- T007: After T002–T005 (documents the implemented interface)

### Parallel Opportunities

- T002, T003, T004, T005 — all modify different command files, no conflicts
- T009 and T010 — independent validation steps in Polish phase

---

## Parallel Execution Example: User Story 1

```bash
# All command-file edits can run simultaneously:
Task: "Add --config to src/commands/status.ts"         # T002
Task: "Add --config to src/commands/dashboard.ts"      # T003
Task: "Add --config to src/commands/query.ts"          # T004
Task: "Add --config to src/commands/alert.ts"          # T005

# Then, after T002-T005 complete:
Task: "Write integration tests in tests/integration/config-flag.test.ts"  # T006
Task: "Update README.md --config documentation"                            # T007
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001: Create skills directory
2. T002–T005 in parallel: Add `--config` to all commands
3. T006: Write integration tests
4. T007: Update README
5. **STOP and VALIDATE**: Run `grafana-cli status --config <name>` to confirm it works
6. Proceed to US2 (skill file)

### Incremental Delivery

1. Complete Phase 1 + US1 → `--config` available on all commands
2. Complete US2 → Claude understands the tool natively
3. Polish → Clean build + all tests green

---

## Notes

- [P] tasks = different files, no dependencies on each other within the same phase
- Commander.js `Option.hideHelp()` hides `--server` from `--help` output but keeps it functional
- `resolveConfig()` in `src/services/config-store.ts` requires **no changes** — it already accepts an optional name
- The action handler change is minimal: `resolveConfig(options.server)` → `resolveConfig(options.config ?? options.server)`
- Skill file format follows Claude Code's project skill convention (frontmatter + markdown body)
