# Feature Specification: Claude Skill & Per-Command Site Selection

**Feature Branch**: `004-claude-skill-config`
**Created**: 2026-03-21
**Status**: Final
**Input**: User description: "1. for claude 使用的 skill，可以快速讓 claude 知道要怎麼使用這個工具; 2. 希望可以每個指令都可透過 --config 指定當前指令要用哪一個 site，這樣就不用事先 grafana-cli config use <site> 設定"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Per-Command Site Selection via --config (Priority: P1)

As a user who manages multiple Grafana instances, I want to specify which site configuration to use directly on any command without first running `grafana-cli config use <site>`, so I can target different servers in a single workflow without global state changes.

**Why this priority**: This is a day-to-day friction point — users must issue a separate `config use` command before every operation against a non-default site. Eliminating that step enables scripting, piping, and multi-server workflows cleanly.

**Independent Test**: Can be fully tested by running any sub-command (e.g., `dashboard list`, `alert list`) with `--config <site>` and verifying results come from that site without altering the active config.

**Acceptance Scenarios**:

1. **Given** a config file with two sites `prod` and `staging`, **When** I run `grafana-cli dashboard list --config staging`, **Then** dashboards from the `staging` site are returned and the global active config is unchanged.
2. **Given** a config file with a default site, **When** I run `grafana-cli alert list` (no `--config`), **Then** the existing active/default site is used as before.
3. **Given** an unknown site name, **When** I run `grafana-cli status --config nonexistent`, **Then** the command exits with a non-zero code and prints an error message referencing the unknown config name.

---

### User Story 2 - Claude Skill for grafana-cli (Priority: P2)

As a Claude AI assistant user, I want a Claude skill definition file installed in the project so that Claude can automatically recognize when to use `grafana-cli` and know its command syntax, options, and common workflows, reducing the need to repeatedly explain the tool in each conversation.

**Why this priority**: Improves the human-AI workflow for everyone using this repository with Claude Code. The skill file is a one-time artifact with high reuse value, but it does not block day-to-day CLI usage.

**Independent Test**: Can be fully tested by verifying the skill file exists in the correct location, contains accurate command examples for all major sub-commands, and that a fresh Claude session correctly interprets a request like "list dashboards on staging" without additional prompting.

**Acceptance Scenarios**:

1. **Given** the skill file is installed, **When** a user asks Claude "list all alerting alerts on prod", **Then** Claude produces the correct `grafana-cli alert list --state alerting --config prod` command without additional context.
2. **Given** the skill file is installed, **When** a new conversation starts, **Then** Claude can describe grafana-cli's capabilities (config, status, dashboard, query, alert sub-commands) and the `--config` flag without reading the README.
3. **Given** the skill file references all sub-commands and options, **Then** every command documented in README.md is reflected in the skill.

---

### Edge Cases

- What happens when `--config` is given but the config file itself does not exist? → Exit non-zero with file-not-found message.
- What happens when `--config` is specified alongside `--server`? → `--server` is now a hidden alias for `--config`; if both are given, `--config` takes precedence (due to `options.config ?? options.server` resolution). Users should use `--config` exclusively going forward.
- What happens when the site name in `--config` has mixed case (e.g., `Prod` vs `prod`)? → Case-sensitive match; error if not found, listing available names.
- What should the skill file do when the tool is not yet installed? → Skill should include installation instructions.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All operational sub-commands (`status`, `dashboard list`, `dashboard get`, `query execute`, `alert list`, `alert get`) MUST accept a `--config <site>` option that selects a named configuration profile for that invocation only. The `config` management sub-commands (set/list/use/show/delete) do not require this flag.
- **FR-002**: When `--config <site>` is provided, the system MUST use the URL and credentials from the named profile without modifying the stored active config.
- **FR-003**: When `--config` is omitted, existing behavior (active config or default) MUST be preserved unchanged.
- **FR-004**: If the named profile does not exist, the system MUST exit with a non-zero code and print an error message referencing the unknown name and directing the user to `grafana-cli config list` to see available profiles.
- **FR-006**: A Claude skill file MUST be created at `.claude/skills/grafana.md` describing grafana-cli's purpose, all sub-commands, key options (including `--config`, `--json`, `--state`, `--server`), and at least one example per sub-command.
- **FR-007**: The skill file MUST be kept in sync with the README command reference (same commands, same option names).
- **FR-008**: The skill file MUST include usage examples that demonstrate the `--config` flag.

### Key Entities

- **Named Profile**: A named entry in the config file with `url`, optional `apiKey`/`username`/`password`, and `isDefault` flag.
- **Skill File**: A markdown document installable by Claude Code that teaches Claude the tool's interface and common patterns.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can run any grafana-cli command against a non-default site in a single command (no prerequisite `config use` step required).
- **SC-002**: All existing commands continue to work without modification when `--config` is not specified.
- **SC-003**: An invalid `--config` value produces a clear error referencing the unknown name and directing the user to `grafana-cli config list`.
- **SC-004**: A fresh Claude Code session, with only the skill file loaded, can generate correct grafana-cli commands for all major use cases without additional context from the user.
- **SC-005**: The skill file covers 100% of sub-commands documented in README.md.

## Assumptions

- The config file format remains `{ configs: { [name]: ServerConfig }, activeConfig?: string }` — no schema changes needed.
- "Per-command" means the `--config` flag is resolved before any API call and does not persist after the command exits.
- The Claude skill install location is `.claude/skills/` relative to the project root (matching Claude Code's skill discovery convention used in this project).
- `--server` is preserved as a hidden backward-compatible alias for `--config`. If both flags are somehow supplied, `--config` takes precedence. New users and documentation should use `--config` exclusively.
