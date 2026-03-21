# Implementation Plan: Claude Skill & Per-Command Site Selection

**Branch**: `004-claude-skill-config` | **Date**: 2026-03-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-claude-skill-config/spec.md`

## Summary

Add `--config <name>` as the canonical per-command site selector across all operational sub-commands (replacing the less discoverable `--server` option), and create a Claude skill file at `.claude/skills/grafana.md` that teaches Claude the tool's interface, enabling zero-context grafana-cli usage in Claude Code sessions.

## Technical Context

**Language/Version**: Node.js 18+, TypeScript 5.x (ES2022)
**Primary Dependencies**: commander 11.x, axios (existing)
**Storage**: `~/.grafana-cli/config.json` (existing, no schema changes)
**Testing**: vitest (existing framework)
**Target Platform**: macOS / Linux CLI
**Project Type**: Single project (CLI)
**Performance Goals**: No impact — option parsing is O(1)
**Constraints**: Backward compatibility with `--server` must be preserved

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. MVP-First | ✅ PASS | Minimal change: rename option label + add alias. No new abstractions. |
| II. CLI-First | ✅ PASS | `--config` follows stdin/args → stdout protocol. Skill file is documentation only. |
| III. Clean Architecture | ✅ PASS | `resolveConfig()` already handles name lookup. No business logic added to CLI handlers. |
| IV. Practical Testing | ✅ PASS | Integration tests for `--config` flag; skill file validated by inspection. |
| V. Performance | ✅ PASS | Option parsing is instantaneous; no API calls added. |

No violations. Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/004-claude-skill-config/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── commands/
│   ├── alert.ts         # Add --config option (replace --server description)
│   ├── dashboard.ts     # Add --config option (replace --server description)
│   ├── query.ts         # Add --config option (replace --server description)
│   └── status.ts        # Add --config option (replace --server description)
└── services/
    └── config-store.ts  # No changes needed (resolveConfig already handles name lookup)

.claude/
└── skills/
    └── grafana.md       # New: Claude skill file

tests/
├── integration/
│   └── config-flag.test.ts   # New: --config flag integration tests
```

**Structure Decision**: Single project. All changes are in existing command files plus one new skill file and one new test file. `config-store.ts` requires no changes.

## Phase 0: Research

### Findings

**Decision**: Rename `--server` to `--config` with `--server` kept as hidden alias
- **Rationale**: `--config <name>` is more intuitive (mirrors the `config use <name>` mental model). Backward compat via hidden alias avoids breaking existing scripts.
- **Commander.js pattern**: `cmd.option("--config <name>", "...").addOption(new Option("--server <name>").hideHelp())` — hidden options don't appear in `--help` but still parse correctly.
- **Alternatives considered**:
  - Add only `--config` (no alias): Simpler, but breaks existing `--server` users.
  - Keep only `--server`: Doesn't address the user's request for `--config`.
  - Global option at top-level program: Commander.js requires `.passThrough()` or `.allowUnknownOption()` for sub-command inheritance — adds complexity. Per-sub-command is simpler and consistent with existing pattern.

**Decision**: Claude skill file at `.claude/skills/grafana.md`
- **Rationale**: Claude Code discovers project skills from `.claude/skills/` directory. This is the established convention in this project (referenced in spec assumptions).
- **Content**: Frontmatter (`name`, `description`, `triggers`), then usage guide with one example per sub-command, emphasizing `--config` flag usage.

## Phase 1: Design & Contracts

### Option Change Pattern

All operational commands (`status`, `dashboard list`, `dashboard get`, `query execute`, `alert list`, `alert get`) will follow this pattern:

```typescript
// Before
.option("--server <name>", "Use specific server configuration")
// action: resolveConfig(options.server)

// After
.option("--config <name>", "Use specific site configuration")
.addOption(new Option("--server <name>", "").hideHelp())  // backward compat
// action: resolveConfig(options.config ?? options.server)
```

`resolveConfig()` in `config-store.ts` is unchanged — it already accepts an optional name and falls back to active config.

### resolveConfig Error Message Update

When the named profile is not found, the error should list available names. Current message:
```
Error: Configuration "<name>" not found.
List available configurations with: grafana-cli config list
```
This is already sufficient (user can run `config list`). No change needed.

### Skill File Structure

```markdown
---
name: grafana
description: Interact with Grafana via grafana-cli CLI tool
triggers:
  - grafana
  - dashboard
  - alert
  - prometheus
---

# grafana-cli

[Purpose + installation]
[Sub-command reference with --config examples]
[Common workflows]
```

### Integration Test Contract

File: `tests/integration/config-flag.test.ts`

| Test ID | Description |
|---------|-------------|
| T066 | `--config <valid>` routes to correct site, global active unchanged |
| T067 | `--config <invalid>` exits non-zero with error message |
| T068 | Omitting `--config` falls back to active config as before |
| T069 | `--server` (hidden alias) still works for backward compat |

### quickstart.md

Common usage patterns for multi-server workflows using `--config`:

```bash
# One-shot: check staging without switching default
grafana-cli status --config staging

# Compare alerts across environments
grafana-cli alert list --json --config prod
grafana-cli alert list --json --config staging

# Query specific dashboard on prod
grafana-cli query execute --dashboard <uid> --panel <id> --config prod
```
