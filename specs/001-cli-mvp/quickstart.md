# Quickstart Guide: Grafana CLI Core Development

**Feature**: 001-cli-mvp
**Date**: 2026-02-15
**Audience**: Developers onboarding to grafana-cli project

## Purpose

This guide helps you set up your development environment, understand the project structure, and start contributing to grafana-cli within 15 minutes.

---

## Prerequisites

### Required

- **Node.js 18+** (LTS version recommended)

  ```bash
  node --version  # Should be v18.x or higher
  ```

- **pnpm 10.15.1+** (package manager)

  ```bash
  npm install -g pnpm
  pnpm --version  # Should be 10.15.1 or higher
  ```

- **Grafana v7.5+ test instance** (for testing)
  - Option 1: Run locally with Docker: `docker run -p 3000:3000 grafana/grafana:7.5.0`
  - Option 2: Use existing Grafana server
  - Create API key: Grafana UI → Configuration → API Keys → Add key (Viewer role)

### Optional but Recommended

- **tsx** (hot reload during development - installed as dev dependency)
- **VSCode** with Prettier extension (automatic formatting)
- **nvm** or **volta** (Node version management)

---

## Quick Setup (5 minutes)

### 1. Clone and Install

```bash
# Clone repository
git clone <repo-url> grafana-cli
cd grafana-cli

# Install dependencies
pnpm install

# Verify installation
pnpm run build   # Should compile TypeScript without errors
```

### 2. Configure Grafana Test Server

```bash
# Set up your test Grafana server
node dist/index.js config set \\
  --url http://localhost:3000 \\
  --api-key <your-api-key> \\
  --name local

# Verify connection
node dist/index.js status
```

Expected output:

```
Server Status: http://localhost:3000

VERSION   DATABASE   COMMIT
7.5.0     ok         a1b2c3d
```

### 3. Run Development Server

```bash
# Hot reload mode (recommended for development)
pnpm dev status

# Build and run
pnpm build && node dist/index.js status
```

---

## Project Structure

```
grafana-cli/
├── src/                      # Source code
│   ├── commands/             # CLI command handlers (thin layer)
│   │   ├── config.ts         # Config management: set, list, delete
│   │   ├── status.ts         # Server health check
│   │   ├── dashboard.ts      # Dashboard operations: list, get
│   │   ├── query.ts          # Query execution
│   │   └── alert.ts          # Alert operations: list, get
│   ├── services/             # Business logic (testable, framework-independent)
│   │   ├── config-store.ts   # Config file I/O, validation
│   │   ├── grafana-client.ts # HTTP client, auth, error handling
│   │   └── time-parser.ts    # Time range parsing (now-1h → Unix timestamp)
│   ├── formatters/           # Output formatting
│   │   ├── json.ts           # JSON formatter (--json flag)
│   │   └── table.ts          # Table formatter (default output)
│   ├── types/                # TypeScript interfaces
│   │   └── index.ts          # All types (ServerConfig, Dashboard, Panel, etc.)
│   └── index.ts              # CLI entry point (commander setup)
├── tests/                    # Test files
│   ├── contract/             # Grafana API contract tests
│   ├── integration/          # End-to-end user journey tests
│   └── unit/                 # Unit tests (optional for MVP)
├── specs/                    # Feature specs and design docs
│   └── 001-cli-mvp/
│       ├── spec.md           # Feature specification
│       ├── plan.md           # Implementation plan
│       ├── research.md       # Technical decisions
│       ├── data-model.md     # Entity definitions
│       ├── contracts/        # API contracts
│       └── quickstart.md     # This file
├── .prettierrc               # Code formatting rules
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Test configuration
├── package.json              # Dependencies and scripts
└── pnpm-lock.yaml            # Dependency lock file
```

**Key Principles**:

- **Commands**: Thin orchestration layer, no business logic
- **Services**: Business logic, testable independently
- **Formatters**: Output rendering, swappable (JSON vs. table)
- **Types**: Shared interfaces, single source of truth

---

## Development Workflow

### Adding a New Command

1. **Define types** in `src/types/index.ts`

   ```typescript
   export interface MyEntity {
     id: number;
     name: string;
   }
   ```

2. **Create service** in `src/services/my-service.ts`

   ```typescript
   import type { MyEntity } from "../types/index.js";

   export async function fetchMyEntity(id: number): Promise<MyEntity> {
     // Business logic here
   }
   ```

3. **Create command** in `src/commands/my-command.ts`

   ```typescript
   import { Command } from "commander";

   import { formatJson } from "../formatters/json.js";
   import { fetchMyEntity } from "../services/my-service.js";

   export function createMyCommand(): Command {
     const cmd = new Command("my-command");
     cmd.description("Do something");
     cmd.option("--json", "Output as JSON");

     cmd.action(async (options) => {
       const result = await fetchMyEntity(123);
       if (options.json) {
         console.log(formatJson(result));
       } else {
         // Format as table
       }
     });

     return cmd;
   }
   ```

4. **Register command** in `src/index.ts`

   ```typescript
   import { createMyCommand } from "./commands/my-command.js";

   program.addCommand(createMyCommand());
   ```

5. **Write tests** in `tests/`

   ```typescript
   import { describe, expect, it } from "vitest";

   import { fetchMyEntity } from "../src/services/my-service.js";

   describe("fetchMyEntity", () => {
     it("should fetch entity by ID", async () => {
       const result = await fetchMyEntity(123);
       expect(result.id).toBe(123);
     });
   });
   ```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (recommended during development)
pnpm test --watch

# Run specific test file
pnpm test tests/config-store.test.ts

# Run tests with coverage
pnpm test --coverage
```

### Code Formatting

```bash
# Check formatting (CI)
pnpm format:check

# Auto-fix formatting
pnpm format

# VSCode: Enable "Format on Save" for automatic formatting
```

**Prettier rules** (from `.prettierrc`):

- Semicolons: Yes
- Quotes: Double quotes
- Tab width: 2 spaces
- Trailing commas: Always
- Print width: 100 characters
- Import order: node: → third-party → local

---

## Testing

### Test Structure

```
tests/
├── contract/               # Grafana API contract tests (required)
│   ├── health.test.ts      # Test /api/health endpoint
│   ├── dashboards.test.ts  # Test /api/search, /api/dashboards/uid/:uid
│   ├── queries.test.ts     # Test /api/ds/query
│   └── alerts.test.ts      # Test /api/alerts
├── integration/            # End-to-end user journey tests (required)
│   ├── config-flow.test.ts # Test config set → list → status flow
│   ├── dashboard-flow.test.ts  # Test dashboard list → get flow
│   ├── query-flow.test.ts      # Test dashboard get → query execute flow
│   └── alert-flow.test.ts      # Test alert list → get flow
└── unit/                   # Unit tests (optional for MVP)
    ├── config-store.test.ts
    ├── time-parser.test.ts
    └── formatters.test.ts
```

### Contract Tests

Contract tests verify our client code matches Grafana HTTP API v7.5 behavior.

```typescript
// tests/contract/health.test.ts
import { describe, expect, it } from "vitest";

import { createClient } from "../src/services/grafana-client.js";

describe("Health API Contract", () => {
  it("GET /api/health returns version and database status", async () => {
    const client = createClient({
      url: "http://localhost:3000",
      apiKey: process.env.GRAFANA_API_KEY,
    });

    const response = await client.get("/api/health");

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("version");
    expect(response.data).toHaveProperty("database");
    expect(response.data.database).toBe("ok");
  });
});
```

### Integration Tests

Integration tests verify complete user journeys work end-to-end.

```typescript
// tests/integration/config-flow.test.ts
import { execSync } from "child_process";
import { describe, expect, it } from "vitest";

describe("Config Flow", () => {
  it("should configure server, verify status, and list config", () => {
    // Set config
    const setOutput = execSync(
      "node dist/index.js config set --url http://localhost:3000 --api-key test123 --name test",
      { encoding: "utf-8" },
    );
    expect(setOutput).toContain("Configuration saved");

    // Verify status
    const statusOutput = execSync("node dist/index.js status", { encoding: "utf-8" });
    expect(statusOutput).toContain("VERSION");
    expect(statusOutput).toContain("DATABASE");

    // List config
    const listOutput = execSync("node dist/index.js config list", { encoding: "utf-8" });
    expect(listOutput).toContain("test");
    expect(listOutput).toContain("http://localhost:3000");
  });
});
```

### Test Environment Setup

```bash
# Set Grafana test server URL and API key
export GRAFANA_TEST_URL=http://localhost:3000
export GRAFANA_API_KEY=your-api-key-here

# Run contract tests (requires Grafana server)
pnpm test tests/contract/

# Run integration tests (requires Grafana server)
pnpm test tests/integration/

# Run unit tests (no external dependencies)
pnpm test tests/unit/
```

---

## Architecture Overview

### Clean Architecture Principles

grafana-cli follows Clean Architecture principles with a simplified structure for MVP:

```
┌──────────────────────────────────────────┐
│          CLI Interface (index.ts)         │  ← Entry point
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│  Commands (commands/*.ts)                 │  ← Thin orchestration
│  - Parse args                             │
│  - Call services                          │
│  - Format output                          │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│  Services (services/*.ts)                 │  ← Business logic
│  - config-store.ts (file I/O)            │
│  - grafana-client.ts (HTTP API)          │
│  - time-parser.ts (time range parsing)   │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│  External Dependencies                    │  ← Frameworks
│  - fs (file system)                      │
│  - axios (HTTP client)                   │
│  - Grafana API v7.5                      │
└──────────────────────────────────────────┘
```

**Layer Rules**:

1. **Commands depend on Services**: Commands call services, services never call commands
2. **Services are testable**: Services have no dependency on CLI framework (commander)
3. **No business logic in Commands**: Commands only orchestrate and format output
4. **Types are shared**: All layers use types from `src/types/index.ts`

### Error Handling

```typescript
// services/grafana-client.ts
export function handleError(error: unknown, serverUrl: string): never {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401) {
      console.error("Error: Authentication failed.");
      console.error("Check your API key with: grafana-cli config list");
      process.exit(2); // Exit code 2 = auth error
    }

    if (error.code === "ECONNREFUSED") {
      console.error(`Error: Cannot connect to Grafana server.`);
      console.error(`URL: ${serverUrl}`);
      console.error("Check if Grafana is running.");
      process.exit(3); // Exit code 3 = network error
    }
  }

  console.error("Error:", error.message);
  process.exit(1); // Exit code 1 = general error
}
```

**Exit Codes**:

- `0`: Success
- `1`: General error
- `2`: Authentication error
- `3`: Network error

---

## Common Tasks

### Debugging

```bash
# Run with TypeScript source maps
pnpm dev <command>

# Add breakpoints in VSCode
# 1. Set breakpoint in source file
# 2. Press F5 (Run > Start Debugging)
# 3. Select "Node.js" configuration

# Log HTTP requests
export DEBUG=axios
pnpm dev <command>
```

### Adding a New Datasource Type

grafana-cli MVP supports Prometheus, Azure Monitor, and GCP. To add a new datasource:

1. Update `Query` type in `src/types/index.ts` to include datasource-specific fields
2. Update query execution logic in `src/services/grafana-client.ts` to handle new datasource structure
3. Add contract tests in `tests/contract/queries.test.ts` for new datasource
4. Document datasource in API contract: `specs/001-cli-mvp/contracts/query-api.md`

### Handling Time Ranges

```typescript
// src/services/time-parser.ts
export function parseTimeRange(from: string, to: string): { fromMs: number; toMs: number } {
  // now-1h → Unix timestamp milliseconds
  // 2021-01-01T00:00:00Z → Unix timestamp milliseconds
  // 1609459200 → Unix timestamp milliseconds
}
```

Use `time-parser.ts` service for all time range conversions.

---

## Troubleshooting

### pnpm install fails

```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript compilation errors

```bash
# Check TypeScript version (should be 5.x)
pnpm list typescript

# Check tsconfig.json is correct
cat tsconfig.json

# Clean build
rm -rf dist
pnpm build
```

### Tests fail with "Cannot connect to Grafana"

```bash
# Check Grafana is running
curl http://localhost:3000/api/health

# Check API key is valid
export GRAFANA_API_KEY=your-key
curl -H "Authorization: Bearer $GRAFANA_API_KEY" http://localhost:3000/api/dashboards/uid/test

# Set test environment variables
export GRAFANA_TEST_URL=http://localhost:3000
export GRAFANA_API_KEY=your-key
```

### Prettier formatting conflicts

```bash
# Install Prettier VSCode extension
# Enable "Format on Save" in VSCode settings

# Manually format all files
pnpm format

# Check which files have formatting issues
pnpm format:check
```

---

## Reference

- **Project Constitution**: `.specify/memory/constitution.md` (MVP-First, Clean Architecture, Practical Testing)
- **Feature Spec**: `specs/001-cli-mvp/spec.md` (User stories, requirements, success criteria)
- **Implementation Plan**: `specs/001-cli-mvp/plan.md` (Technical context, structure, complexity tracking)
- **Research**: `specs/001-cli-mvp/research.md` (Technical decisions, alternatives considered)
- **Data Model**: `specs/001-cli-mvp/data-model.md` (Entity definitions, relationships)
- **API Contracts**: `specs/001-cli-mvp/contracts/*.md` (Grafana HTTP API v7.5 endpoints)
- **Grafana v7.5 API Docs**: https://grafana.com/docs/grafana/v7.5/http_api/

---

## Next Steps

1. **Read the feature spec**: `specs/001-cli-mvp/spec.md` to understand user stories and requirements
2. **Explore the code**: Start with `src/index.ts` and trace through a command (e.g., `status`)
3. **Run tests**: `pnpm test` to see examples of contract and integration tests
4. **Pick a task**: Check `specs/001-cli-mvp/tasks.md` (generated by `/speckit.tasks`) for implementation tasks
5. **Make changes**: Follow the "Adding a New Command" workflow above
6. **Submit PR**: Run `pnpm format` and `pnpm test` before pushing

Welcome to grafana-cli! 🚀
