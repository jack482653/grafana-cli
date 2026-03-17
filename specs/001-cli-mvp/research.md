# Research & Technical Decisions: Grafana CLI Core

**Feature**: 001-cli-mvp
**Date**: 2026-02-15
**Phase**: Phase 0 Research

## Overview

This document captures all technical decisions made during Phase 0 research to resolve NEEDS CLARIFICATION items from the implementation plan. Decisions are informed by:
- Reference project: prom-cli ($HOME/Code/prom-cli)
- Project constitution (MVP-First, Clean Architecture, Practical Testing)
- Grafana HTTP API v7.5 capabilities
- Node.js 18+ and TypeScript 5.x ecosystem

---

## Decision 1: Test Framework

**Chosen**: `vitest` version 4.x

**Rationale**:
- **Native ESM support**: Works seamlessly with `"type": "module"` in package.json (no configuration hacks required)
- **Fast execution**: Vite-powered, significantly faster than Jest for small to medium projects
- **Modern API**: Compatible with Jest API but optimized for modern JavaScript/TypeScript
- **Reference project**: prom-cli uses vitest successfully with same ESM + TypeScript stack
- **Coverage built-in**: `@vitest/coverage-v8` provides code coverage without additional setup
- **Watch mode**: Excellent DX with instant test re-runs during development

**Alternatives considered**:
- `jest`: Popular but requires ESM configuration workarounds, slower in ESM mode
- `node:test`: Built-in but less mature tooling, limited assertion library, no coverage built-in

**Implementation details**:
- Package: `vitest@^4.0.16`, `@vitest/coverage-v8@^4.0.16` (dev dependencies)
- Config file: `vitest.config.ts` at project root
- Test file pattern: `*.test.ts` in `tests/` directory
- Coverage: HTML + text reports, thresholds TBD based on MVP scope

**References**:
- prom-cli package.json: vitest 4.0.16
- Vitest docs: https://vitest.dev/

---

## Decision 2: CLI Output Formatting

**Chosen**: Manual table formatting implementation (no external library)

**Rationale**:
- **Simplicity**: Custom table formatting ~50 lines of code vs. library dependency
- **Bundle size**: Zero additional dependencies for table output
- **MVP alignment**: Matches constitution Principle I (YAGNI, simple first)
- **Reference project**: prom-cli implements manual table formatter (`src/formatters/table.ts`) with column alignment
- **Flexibility**: Easy to customize output format for Grafana-specific data structures (dashboards with tags, panels with queries)
- **No over-engineering**: MVP needs basic aligned columns, not ASCII art borders or complex layouts

**Alternatives considered**:
- `cli-table3`: Feature-rich (Unicode borders, word wrap) but 200KB+ minified, overkill for MVP
- `table`: Lightweight (~20KB) but limited customization for Grafana nested data
- `console.table()`: Built-in but poor control over column widths and header formatting

**Implementation details**:
- Location: `src/formatters/table.ts`
- Functions:
  - `formatTable(columns, data)`: Main table rendering
  - `calculateWidths()`: Auto-size columns based on content
  - `padEnd()`: Align text within columns
- Pattern: Same as prom-cli with column headers, data rows, automatic width calculation

**References**:
- prom-cli formatter: $HOME/Code/prom-cli/src/formatters/table.ts

---

## Decision 3: Configuration File Management

**Chosen**: Direct Node.js `fs` module with atomic write pattern (no config library)

**Rationale**:
- **Security control**: Direct file permissions control (chmod 0600) for credentials
- **Simplicity**: Config is JSON-only, no need for multi-format support
- **Atomic writes**: Temp file + rename pattern prevents corruption during writes
- **Reference project**: prom-cli uses same pattern (`src/services/config-store.ts`)
- **Testing**: Easy to override config path via env var (GRAFANA_CLI_CONFIG_PATH) for tests
- **MVP alignment**: No speculative features (YAML/TOML support, schema validation libraries)

**Alternatives considered**:
- `conf`: Electron-style config (190KB, overkill for CLI), schema validation not needed for MVP
- `cosmiconfig`: Multi-format support unnecessary (we only need JSON), adds complexity
- **Winner**: Native `fs` + JSON.parse/stringify is sufficient for MVP

**Implementation details**:
- Location: `src/services/config-store.ts`
- Config path: `~/.grafana-cli/config.json` (override via `GRAFANA_CLI_CONFIG_PATH` env var)
- Functions:
  - `loadConfigStore()`: Read JSON, return empty store if missing, throw on corruption
  - `saveConfigStore()`: Atomic write (temp file → rename), ensure dir exists
  - `addConfig()`, `removeConfig()`, `setActiveConfig()`: Config manipulation
- File structure:
  ```json
  {
    "configs": {
      "production": {
        "name": "production",
        "url": "https://grafana.example.com",
        "apiKey": "...",
        "isDefault": true
      }
    },
    "activeConfig": "production"
  }
  ```
- Permissions: Set 0600 after save (owner read/write only)

**References**:
- prom-cli config-store: $HOME/Code/prom-cli/src/services/config-store.ts
- Node.js fs docs: https://nodejs.org/api/fs.html

---

## Decision 4: HTTP Client Configuration (Grafana API Authentication)

**Chosen**: `axios` with instance-per-config pattern, API key via `Authorization: Bearer <token>` header

**Rationale**:
- **Grafana API auth**: v7.5 supports API keys via `Authorization: Bearer <api-key>` header
- **Basic auth support**: Username/password encoded as `Authorization: Basic <base64(user:pass)>`
- **Reference project**: prom-cli uses axios with similar auth header pattern
- **Instance pattern**: Create axios instance per server config (baseURL, timeout, auth headers)
- **Error handling**: Centralized error handler for 401 (auth), 404 (not found), network timeouts
- **Timeout**: Default 30 seconds (configurable per server), matches prom-cli

**Alternatives considered**:
- `node-fetch`: Lower-level, requires manual header management and timeout implementation
- `got`: Similar to axios but less familiar ecosystem
- **Winner**: axios proven in prom-cli, excellent TypeScript support, rich error handling

**Implementation details**:
- Location: `src/services/grafana-client.ts`
- Functions:
  - `createClient(config)`: Build axios instance with baseURL and auth headers
  - `handleError(error)`: Convert axios errors to user-friendly messages (401 → "Invalid API key", ECONNREFUSED → "Server unreachable")
- Authentication:
  - API key: `headers: { "Authorization": "Bearer <api-key>" }`
  - Basic auth: `headers: { "Authorization": "Basic <base64>" }`
- Timeout: 30 seconds default (30000ms), configurable via config
- Base URL: Full Grafana server URL (e.g., https://grafana.example.com)
- Error codes:
  - 401 Unauthorized → Exit code 2 (auth error)
  - Network errors (ECONNREFUSED, ETIMEDOUT) → Exit code 3 (network error)
  - 4xx/5xx API errors → Exit code 1 (general error)

**Grafana HTTP API v7.5 Specifics**:
- API key creation: Grafana UI → Configuration → API Keys → Add key
- Required permissions: Viewer role sufficient for all read operations (dashboards, queries, alerts)
- API key header: Must use `Bearer` scheme (not `X-API-Key` custom header)
- Base path: Most endpoints under `/api/` (e.g., `/api/health`, `/api/dashboards/uid/:uid`)

**References**:
- prom-cli HTTP client: $HOME/Code/prom-cli/src/services/prometheus.ts
- Grafana v7.5 API auth: https://grafana.com/docs/grafana/v7.5/http_api/auth/
- Axios docs: https://axios-http.com/docs/intro

---

## Decision 5: Project Structure Refinement

**Chosen**: Simplified Clean Architecture with `services/` layer (not full domain/usecases/adapters)

**Rationale**:
- **MVP alignment**: Full Clean Architecture layers (domain entities, use cases, adapters, frameworks) is over-engineering for MVP
- **Reference project**: prom-cli uses simplified structure (commands, services, formatters, types) successfully
- **Gradual complexity**: Start simple, refactor to full Clean Architecture if complexity grows
- **Constitution compliance**: Still maintains Principle III (SOLID, testable boundaries) without ceremony
- **Services layer**: Contains business logic (config management, API client) separate from CLI commands
- **Testability**: Services can be tested independently of CLI framework

**Governance exception — Principle I vs Principle III (DIP)**:

Constitution Principle III mandates Dependency Inversion (interfaces like `IConfigStore`, `IGrafanaClient`) and Principle III is marked NON-NEGOTIABLE. However, introducing these interfaces for MVP with a single implementation each would add abstraction purely for hypothetical future use — violating Principle I (YAGNI).

**Resolution**: Principle I takes precedence during MVP phase. DIP abstraction is deferred.

**Migration trigger**: Introduce `IGrafanaClient` / `IConfigStore` interfaces when ANY of the following occurs:
1. A second implementation of either interface is needed (e.g., mock client for unit tests, or multiple config backends)
2. Unit tests require mocking `grafana-client.ts` or `config-store.ts` in isolation
3. US3 (Query Execution) is implemented and complexity of `grafana-client.ts` exceeds ~200 lines

This exception is scoped to MVP (US1-US2). Re-evaluate before shipping US3.

**Structure comparison**:

| Full Clean Architecture (Planned) | Simplified (Chosen for MVP) |
|-----------------------------------|----------------------------|
| `src/domain/entities/`           | `src/types/` (TypeScript interfaces) |
| `src/domain/interfaces/`         | Implied by service function signatures |
| `src/usecases/`                  | `src/services/` (combined use cases + adapters) |
| `src/adapters/grafana/`          | `src/services/grafana-client.ts` |
| `src/adapters/storage/`          | `src/services/config-store.ts` |
| `src/cli/commands/`              | `src/commands/` |
| `src/cli/formatters/`            | `src/formatters/` |

**Final structure**:
```text
src/
├── commands/          # CLI command handlers (thin orchestration)
│   ├── config.ts
│   ├── status.ts
│   ├── dashboard.ts
│   ├── query.ts
│   └── alert.ts
├── services/          # Business logic (config, Grafana API, time parsing)
│   ├── config-store.ts
│   ├── grafana-client.ts
│   └── time-parser.ts
├── formatters/        # Output formatting (JSON, table)
│   ├── json.ts
│   └── table.ts
├── types/             # TypeScript interfaces and types
│   └── index.ts
└── index.ts           # CLI entry point
```

**Migration path**:
If complexity grows (e.g., multiple datasource types, complex query transformations), refactor to full Clean Architecture:
- Extract domain entities (Dashboard, Panel, Query, Alert)
- Create use case layer (GetDashboard, ExecuteQuery)
- Abstract external dependencies behind interfaces (IGrafanaClient, IConfigStore)

**References**:
- prom-cli structure: $HOME/Code/prom-cli/src/
- Constitution Principle I: MVP-First, YAGNI

---

## Decision 6: TypeScript Configuration

**Chosen**: Strict mode, ES2022 target, ESM module, Node.js 18+ types

**Rationale**:
- **Type safety**: Strict mode catches errors early, aligns with constitution code quality principle
- **Modern syntax**: ES2022 target enables top-level await, ?? nullish coalescing, optional chaining
- **ESM native**: `"module": "Node16"` and `"moduleResolution": "node16"` for native ESM support — TypeScript requires these to match; `ESNext` with `node16` resolution raises a compilation error
- **Node.js built-ins**: `@types/node` for fs, path, os module types
- **Reference project**: prom-cli uses similar config (TypeScript 5.9.3, strict mode)

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Key settings**:
- `"type": "module"` in package.json (ESM not CommonJS)
- Import extensions: `.js` required in imports (e.g., `./config.js` not `./config`)
- Build: `tsc` compiles to `dist/`, preserves ESM structure
- Dev: `tsx src/index.ts` for hot reload during development

**References**:
- prom-cli tsconfig: $HOME/Code/prom-cli/tsconfig.json
- TypeScript ESM guide: https://www.typescriptlang.org/docs/handbook/esm-node.html

---

## Decision 7: Package Manager Configuration

**Chosen**: `pnpm` version 10.15.1+ with workspace support

**Rationale**:
- **User requirement**: Specified in plan input ("使用 pnpm 進行套件管理和 node 版本管理")
- **Reference project**: prom-cli uses pnpm@10.15.1 successfully
- **Workspace support**: If project grows to multiple packages (e.g., grafana-client library), pnpm workspaces ready
- **Node version management**: `.nvmrc` or `.node-version` file for Node.js 18+ enforcement
- **Disk efficiency**: pnpm's content-addressable store saves disk space vs. npm/yarn
- **Fast installs**: Symlink-based approach faster than npm

**Configuration**:
- `"packageManager": "pnpm@10.15.1"` in package.json (Corepack enforcement)
- `.nvmrc`: `18` or `18.20.0` (LTS version)
- Scripts:
  - `pnpm install`: Install dependencies
  - `pnpm dev`: Run CLI in development (tsx hot reload)
  - `pnpm build`: Compile TypeScript to dist/
  - `pnpm test`: Run vitest tests
  - `pnpm format`: Run prettier formatting
  - `pnpm format:check`: Check formatting (CI)

**References**:
- prom-cli package.json: `"packageManager": "pnpm@10.15.1"`
- pnpm docs: https://pnpm.io/

---

## Decision 8: Code Formatting Configuration

**Chosen**: Prettier with `@trivago/prettier-plugin-sort-imports`

**Rationale**:
- **User requirement**: Specified in plan input (prettier + import sorting plugin)
- **Reference config**: Use prom-cli's `.prettierrc` configuration
- **Consistency**: Automated formatting eliminates style debates
- **Import ordering**: Plugin sorts imports into logical groups (node: builtins, third-party, local)
- **Constitution alignment**: Pre-commit quality gate requires formatting pass

**.prettierrc** (from prom-cli):
```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["@trivago/prettier-plugin-sort-imports"],
  "importOrder": ["^node:", "<THIRD_PARTY_MODULES>", "^[./]"],
  "importOrderSeparation": true,
  "importOrderSortSpecifiers": true
}
```

**Import order groups**:
1. Node.js built-ins (e.g., `import fs from "node:fs"`)
2. Third-party modules (e.g., `import axios from "axios"`)
3. Local imports (e.g., `import { config } from "./config.js"`)

**Integration**:
- Dev dependency: `prettier@^3.7.4`, `@trivago/prettier-plugin-sort-imports@^6.0.0`
- Pre-commit: Run `prettier --check .` (CI)
- Auto-fix: `prettier --write .` or IDE integration

**References**:
- prom-cli .prettierrc: $HOME/Code/prom-cli/.prettierrc
- Trivago plugin: https://github.com/trivago/prettier-plugin-sort-imports

---

## Summary of Resolved NEEDS CLARIFICATION

| Item | Decision | Source |
|------|----------|--------|
| Test framework | vitest 4.x | prom-cli reference, ESM native support |
| CLI output formatting | Manual table implementation | prom-cli pattern, MVP simplicity |
| Config file management | Native fs + atomic writes | prom-cli pattern, security control |
| HTTP client auth | axios with Bearer token | Grafana API v7.5 docs, prom-cli pattern |
| Project structure | Simplified services layer | prom-cli reference, MVP alignment |
| TypeScript config | Strict mode, ES2022, ESM | prom-cli reference, Node.js 18+ |
| Package manager | pnpm 10.15.1+ | User requirement, prom-cli reference |
| Code formatting | prettier + import sort plugin | User requirement, prom-cli reference |

All technical decisions resolved. Proceed to Phase 1 (Design & Contracts).

---

## Next Phase Prerequisites

Phase 1 (Design & Contracts) can now proceed with:
- ✅ Test framework chosen (vitest)
- ✅ Output formatting approach (manual tables)
- ✅ Config storage pattern (fs + atomic writes)
- ✅ HTTP client pattern (axios + Bearer auth)
- ✅ Project structure defined (commands, services, formatters, types)
- ✅ TypeScript config (strict, ES2022, ESM)
- ✅ Package manager (pnpm)
- ✅ Code formatting (prettier + import sort)

Ready to generate: data-model.md, contracts/, quickstart.md
