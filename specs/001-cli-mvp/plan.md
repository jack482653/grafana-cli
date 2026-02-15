# Implementation Plan: Grafana CLI Core

**Branch**: `001-cli-mvp` | **Date**: 2026-02-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-cli-mvp/spec.md`

## Summary

Build a command-line interface for Grafana v7.5 that enables DevOps and SRE teams to configure server connections, discover dashboards, execute queries, and monitor alerts from the terminal. The CLI follows MVP-First development with P1-P4 prioritized user stories, focusing on read-only operations for initial release. Technical approach leverages Node.js + TypeScript with Clean Architecture principles, commander for CLI framework, and axios for HTTP client.

## Technical Context

**Language/Version**: Node.js 18+ (LTS), TypeScript 5.x (target: ES2022)
**Primary Dependencies**:
- `commander` (CLI argument parsing and command structure)
- `axios` (HTTP client for Grafana REST API)
- `pnpm` (package manager and Node version management)
- `prettier` + `@trivago/prettier-plugin-sort-imports` (code formatting)
- Test framework: NEEDS CLARIFICATION (jest, vitest, or node:test)

**Storage**: File system (`~/.grafana-cli/config.json` for server configurations)
**Testing**:
- Contract tests for Grafana API endpoints (required)
- Integration tests for user journeys (required)
- Unit tests for complex logic (optional for MVP)
- Test framework: NEEDS CLARIFICATION

**Target Platform**: macOS and Linux (primary), Windows via Git Bash or WSL (secondary)
**Project Type**: Single CLI application (not web/mobile)
**Performance Goals**:
- Command response time <5 seconds (typical operations)
- Memory usage <100MB during normal operations
- Query execution <10 seconds for 1-24 hour time ranges

**Constraints**:
- Grafana HTTP API v7.5 compatibility (see https://grafana.com/docs/grafana/v7.5/http_api/)
- ESM module system (import/export, not require)
- CLI-First Interface protocol (stdin/args → stdout, errors → stderr)
- Exit codes: 0 success, 1 general error, 2 auth error, 3 network error

**Scale/Scope**:
- Single-user, single-process CLI tool
- Support 3+ server configurations
- Handle 100+ dashboards per server
- Execute queries returning megabytes of time-series data

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Principle I: MVP-First Development (NON-NEGOTIABLE)

- **Spec adherence**: User stories prioritized P1-P4, each independently testable
- **YAGNI compliance**: Read-only operations for MVP (no write/update/delete)
- **Simplicity**: No enterprise patterns unless solving demonstrated problem
- **Verification**: Each user story can be implemented and shipped independently

### ✅ Principle II: CLI-First Interface

- **Protocol**: stdin/args → stdout, errors → stderr (FR-032, FR-033)
- **Exit codes**: Meaningful codes defined (FR-034: 0/1/2/3)
- **Output formats**: JSON + human-readable (FR-030, FR-031)
- **Composability**: All commands testable via CLI invocation

### ⚠️ Principle III: Clean Architecture & SOLID (NON-NEGOTIABLE)

- **Status**: To be verified during implementation
- **Required checks**:
  - ✅ Business logic separated from CLI handlers (use cases pattern)
  - ✅ External dependencies (axios, fs) abstracted behind interfaces
  - ✅ Domain entities independent of frameworks
- **Gate**: Pass before Phase 1 design completion

### ✅ Principle IV: Practical Testing

- **Contract tests**: Required for all Grafana API endpoints (FR-009 to FR-029)
- **Integration tests**: Required for P1-P4 user journeys (config, dashboard, query, alert flows)
- **Unit tests**: Optional for MVP, add when complexity demands
- **TDD for contracts**: Write failing test → implement → green test

### ✅ Principle V: Performance & Scalability

- **Response time**: <5s target (SC-005)
- **Memory**: <100MB limit (SC-006)
- **API efficiency**: Batch requests, cache with TTL (per spec assumptions)
- **Measurement**: Profile with `time` command, monitor with `ps aux`

### Gate Status: ✅ PASS (with Phase 1 verification required)

No constitution violations. Proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/001-cli-mvp/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (entities and relationships)
├── quickstart.md        # Phase 1 output (developer onboarding)
├── contracts/           # Phase 1 output (API contracts)
│   ├── config-api.md
│   ├── health-api.md
│   ├── dashboard-api.md
│   ├── query-api.md
│   └── alert-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/              # Core business entities (config, dashboard, panel, query, alert)
│   ├── entities/
│   └── interfaces/
├── usecases/            # Business logic (config management, dashboard ops, query execution)
├── adapters/            # Interface adapters (Grafana API client, config store)
│   ├── grafana/
│   └── storage/
├── cli/                 # CLI command handlers (orchestration only, no logic)
│   ├── commands/
│   └── formatters/
└── index.ts             # CLI entry point

tests/
├── contract/            # Grafana API contract tests
│   ├── health.test.ts
│   ├── dashboards.test.ts
│   ├── queries.test.ts
│   └── alerts.test.ts
├── integration/         # End-to-end user journey tests
│   ├── config-flow.test.ts
│   ├── dashboard-flow.test.ts
│   ├── query-flow.test.ts
│   └── alert-flow.test.ts
└── unit/                # Optional unit tests (add as complexity grows)

# Configuration and tooling
.prettierrc              # Code formatting (from prom-cli reference)
tsconfig.json            # TypeScript configuration (ES2022 target, ESM)
package.json             # pnpm workspace, dependencies, scripts
pnpm-lock.yaml           # Dependency lock file
.nvmrc or .node-version  # Node.js version (18+)
```

**Structure Decision**: Single project structure selected. This is a standalone CLI tool with no frontend/backend separation or mobile components. The layered structure follows Clean Architecture with clear separation between domain (entities/interfaces), use cases (business logic), adapters (external integrations), and CLI (presentation). Tests organized by type (contract, integration, unit) to support constitution's practical testing principle.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. Constitution compliance verified.

---

## Phase 0: Research & Technical Decisions

**Status**: NEEDS CLARIFICATION on test framework choice

### Research Tasks

1. **Test Framework Selection** (NEEDS CLARIFICATION)
   - **Question**: Which test framework should we use?
   - **Options**:
     - `jest`: Popular, full-featured, requires ESM configuration
     - `vitest`: Native ESM support, fast, Vite-based
     - `node:test`: Built-in, minimal deps, Node 18+ native
   - **Decision criteria**: ESM compatibility, contract test support, integration test capabilities

2. **CLI Output Formatting**
   - **Question**: Which library for table formatting in human-readable mode?
   - **Options**:
     - `cli-table3`: Mature, feature-rich tables
     - `table`: Lightweight, simple API
     - Manual formatting with `console.table()`
   - **Decision criteria**: Bundle size, feature set vs. simplicity

3. **Configuration File Management**
   - **Question**: Use library or implement file I/O directly?
   - **Options**:
     - `conf`: Electron-style config management
     - `cosmiconfig`: Multiple format support
     - Native `fs` with JSON.parse/stringify
   - **Decision criteria**: Simplicity, file permissions control (0600 required)

4. **HTTP Client Configuration**
   - **Question**: How to handle Grafana API authentication patterns?
   - **Research**: Grafana v7.5 API key headers, basic auth, token refresh patterns
   - **Reference**: prom-cli implementation for similar patterns

### Research Output Location

All research findings will be documented in `specs/001-cli-mvp/research.md` with format:
- **Decision**: [chosen approach]
- **Rationale**: [why chosen, trade-offs considered]
- **Alternatives**: [other options evaluated]
- **References**: [docs, examples, prior art]

---

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete with all NEEDS CLARIFICATION resolved

### Data Model (data-model.md)

Extract entities from spec and define their structure:

1. **Server Configuration**
   - Fields: name, url, apiKey, username, password, isDefault
   - Validation: URL format, credential presence, unique names

2. **Dashboard**
   - Fields: uid, title, tags, folder, panels, variables
   - Relationships: Has many panels, has many variables

3. **Panel**
   - Fields: id, title, type, datasource, queries
   - Relationships: Belongs to dashboard, has many queries

4. **Query**
   - Fields: refId, datasourceType, expr, timeRange
   - Validation: datasourceType enum, time range format

5. **Alert**
   - Fields: id, title, state, folder, conditions
   - Validation: state enum (alerting/ok/paused/pending)

6. **Query Result**
   - Fields: refId, timestamps, values, labels
   - Format: Time series array structure

### API Contracts (contracts/)

Generate contract definitions for Grafana HTTP API v7.5 endpoints:

1. **Health API** (`health-api.md`)
   - `GET /api/health` → Server health status

2. **Dashboard API** (`dashboard-api.md`)
   - `GET /api/search` → List dashboards (with query params)
   - `GET /api/dashboards/uid/:uid` → Get dashboard by UID

3. **Query API** (`query-api.md`)
   - `POST /api/ds/query` → Execute datasource query
   - Request format: dashboard context, panel context, time range

4. **Alert API** (`alert-api.md`)
   - `GET /api/alerts` → List alerts (with query params)
   - `GET /api/alerts/:id` → Get alert by ID

Each contract file includes:
- Endpoint URL and method
- Request headers (Authorization, Content-Type)
- Request body schema (if applicable)
- Response schema (success + error cases)
- Example requests/responses from Grafana v7.5 docs

### Quickstart Guide (quickstart.md)

Developer onboarding document:

1. **Prerequisites**: Node.js 18+, pnpm, Grafana v7.5 test instance
2. **Setup**: Clone repo, install deps (`pnpm install`), configure test server
3. **Development**: Run CLI locally, hot reload, debugging
4. **Testing**: Run contract tests, integration tests, coverage
5. **Code Style**: Prettier setup, import order, TypeScript strict mode
6. **Architecture**: Quick overview of layers, where to add new commands

### Agent Context Update

Run `.specify/scripts/bash/update-agent-context.sh claude` to:
- Update agent-specific context file with new technology decisions
- Preserve manual additions between markers
- Add: Test framework choice, CLI libraries, architecture patterns

---

## Phase 1 Verification

After Phase 1 completion, re-verify Constitution Check:

### Principle III Verification (Clean Architecture & SOLID)

- [ ] Domain entities defined without framework dependencies
- [ ] Use cases separate from CLI command handlers
- [ ] External dependencies (axios, fs) abstracted behind interfaces
- [ ] No business logic in CLI layer

If verification passes, proceed to Phase 2 (`/speckit.tasks`).

---

## Next Steps

1. **Resolve NEEDS CLARIFICATION**: Choose test framework and other technical decisions
2. **Execute Phase 0**: Generate `research.md` with decisions documented
3. **Execute Phase 1**: Generate data model, contracts, and quickstart guide
4. **Re-verify Constitution**: Ensure Clean Architecture compliance
5. **Run `/speckit.tasks`**: Generate task list for implementation

---

## Notes

- Reference prom-cli for Prometheus CLI patterns (similar architecture)
- Grafana v7.5 API docs: https://grafana.com/docs/grafana/v7.5/http_api/
- ESM import/export required (not CommonJS require)
- Prettier config from $HOME/Code/prom-cli/.prettierrc used for consistency
