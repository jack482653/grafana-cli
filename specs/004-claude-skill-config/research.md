# Research: Claude Skill & Per-Command Site Selection

**Branch**: `004-claude-skill-config` | **Date**: 2026-03-21

## Decision Log

### 1. `--config` vs `--server` naming

**Decision**: Rename `--server` → `--config` as primary option; keep `--server` as hidden alias.

**Rationale**: The word "config" mirrors the `grafana-cli config use <name>` mental model and is more intuitive. `--server` is a technical term that implies URL, not profile name.

**Alternatives considered**:
- Keep only `--server`: User's request was specifically for `--config` naming.
- Drop `--server` entirely: Would break existing scripts and tests using `--server`.
- Add both as equal options: Confusing UX (which one takes precedence?). Hidden alias is cleaner.

### 2. Global vs per-command option placement

**Decision**: Add `--config` to each individual sub-command (same pattern as `--server` today).

**Rationale**: Commander.js global option propagation to sub-commands requires `passThrough()` or `allowUnknownOption()` which changes parse behavior for all sub-commands — a risky change for a minor UX improvement. Per-command option is simple, explicit, and consistent with existing `--server` / `--json` patterns.

**Alternatives considered**:
- Top-level `program.option("--config <name>")`: Requires `program.opts()` lookup in each command's action — more change surface with no UX benefit (user still types `--config` on the sub-command line).

### 3. Claude skill file location

**Decision**: `.claude/skills/grafana.md`

**Rationale**: Claude Code discovers project-local skills from `.claude/skills/`. This matches the convention already in use in this project (referenced in CLAUDE.md and the speckit skill system).

**Alternatives considered**:
- `CLAUDE.md` inline: Already large; inlining command reference would clutter project instructions.
- `docs/claude-skill.md` + symlink: Unnecessary indirection.

### 4. Skill file trigger design

**Decision**: Trigger on keywords `grafana`, `dashboard`, `alert` — not on generic terms like `query` or `status`.

**Rationale**: `query` and `status` are too generic and would match unrelated contexts. The tool-specific terms (`grafana`, `dashboard`, `alert`) are specific enough to reliably identify intent.
