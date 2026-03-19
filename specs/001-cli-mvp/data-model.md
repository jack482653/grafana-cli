# Data Model: Grafana CLI Core

**Feature**: 001-cli-mvp
**Date**: 2026-02-15
**Phase**: Phase 1 Design

## Overview

This document defines the core entities and their relationships for the Grafana CLI. Entities are derived from functional requirements in spec.md and Grafana HTTP API v7.5 response schemas. All entities are TypeScript interfaces (no classes) following constitution principle of simplicity for MVP.

---

## Entity 1: Server Configuration

**Purpose**: Represents a configured Grafana server connection with authentication credentials.

**Location**: `src/types/index.ts` (ServerConfig interface)

### Fields

| Field       | Type      | Required | Description                               | Validation                                            |
| ----------- | --------- | -------- | ----------------------------------------- | ----------------------------------------------------- |
| `name`      | `string`  | Yes      | Human-readable identifier for this server | Unique, 1-50 chars, alphanumeric + hyphens            |
| `url`       | `string`  | Yes      | Grafana server base URL                   | Must start with http:// or https://, valid URL format |
| `apiKey`    | `string`  | No       | Grafana API key for Bearer token auth     | Mutually exclusive with username/password             |
| `username`  | `string`  | No       | Username for basic auth                   | Required if password present                          |
| `password`  | `string`  | No       | Password for basic auth                   | Required if username present                          |
| `isDefault` | `boolean` | Yes      | Whether this is the active/default server | Only one server can be default                        |
| `timeout`   | `number`  | No       | Request timeout in milliseconds           | Default: 30000, range: 1000-300000                    |

### Relationships

- **One-to-many** with Query operations: A server config can be used for multiple queries
- **Stored in**: ConfigStore (see Entity 2)

### Validation Rules

1. **URL format**: Must match regex `^https?://` and pass new URL() constructor
2. **Auth completeness**: Either apiKey OR (username + password) OR neither (no auth)
3. **Name uniqueness**: No two configs can have same name (case-insensitive)
4. **Default enforcement**: Exactly one config must have `isDefault: true` when multiple configs exist

### State Transitions

N/A (stateless entity, no lifecycle)

### TypeScript Interface

```typescript
export interface ServerConfig {
  name: string;
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
  isDefault: boolean;
  timeout?: number;
}
```

---

## Entity 2: Config Store

**Purpose**: Container for all server configurations and active server pointer.

**Location**: `src/types/index.ts` (ConfigStore interface)

### Fields

| Field          | Type                           | Required | Description                       |
| -------------- | ------------------------------ | -------- | --------------------------------- |
| `configs`      | `Record<string, ServerConfig>` | Yes      | Map of server name → ServerConfig |
| `activeConfig` | `string \| undefined`          | Yes      | Name of currently active server   |

### Relationships

- **Contains**: Multiple ServerConfig entities (keyed by name)
- **Persisted to**: `~/.grafana-cli/config.json`

### Validation Rules

1. **Active config exists**: If activeConfig is set, configs[activeConfig] must exist
2. **Consistent default**: If activeConfig is set, configs[activeConfig].isDefault must be true

### TypeScript Interface

```typescript
export interface ConfigStore {
  configs: Record<string, ServerConfig>;
  activeConfig?: string;
}
```

---

## Entity 3: Dashboard

**Purpose**: Represents a Grafana dashboard with metadata and panels.

**Location**: `src/types/index.ts` (Dashboard interface)

### Fields

| Field         | Type       | Required | Description                                  | Source                        |
| ------------- | ---------- | -------- | -------------------------------------------- | ----------------------------- |
| `uid`         | `string`   | Yes      | Unique dashboard identifier                  | Grafana API response          |
| `title`       | `string`   | Yes      | Dashboard display title                      | Grafana API response          |
| `tags`        | `string[]` | No       | Dashboard tags for categorization            | Grafana API response          |
| `folderTitle` | `string`   | No       | Folder name containing dashboard             | Grafana API response (search) |
| `url`         | `string`   | No       | Relative dashboard URL                       | Grafana API response          |
| `panels`      | `Panel[]`  | No       | Array of panels (only in full dashboard GET) | Grafana API response (get)    |

### Relationships

- **Has many**: Panel entities (panels field)
- **Belongs to**: Folder (via folderTitle, not modeled as entity)

### Validation Rules

1. **UID format**: Non-empty string, typically alphanumeric
2. **Title**: Non-empty string

### State Transitions

N/A (read-only for MVP)

### TypeScript Interface

```typescript
export interface Dashboard {
  uid: string;
  title: string;
  tags?: string[];
  folderTitle?: string;
  url?: string;
  panels?: Panel[];
}
```

---

## Entity 4: Panel

**Purpose**: Represents a dashboard panel with queries and visualization config.

**Location**: `src/types/index.ts` (Panel interface)

### Fields

| Field        | Type         | Required | Description                           | Source                 |
| ------------ | ------------ | -------- | ------------------------------------- | ---------------------- |
| `id`         | `number`     | Yes      | Panel ID within dashboard             | Grafana dashboard JSON |
| `title`      | `string`     | No       | Panel display title                   | Grafana dashboard JSON |
| `type`       | `string`     | Yes      | Panel type (graph, table, stat, etc.) | Grafana dashboard JSON |
| `datasource` | `Datasource` | No       | Datasource configuration              | Grafana dashboard JSON |
| `targets`    | `Query[]`    | Yes      | Array of queries (targets in Grafana) | Grafana dashboard JSON |

### Relationships

- **Belongs to**: Dashboard (parent dashboard)
- **Has many**: Query entities (targets field)
- **References**: Datasource (inline object)

### Validation Rules

1. **ID**: Positive integer
2. **Targets**: At least one query required

### TypeScript Interface

```typescript
export interface Panel {
  id: number;
  title?: string;
  type: string;
  datasource?: Datasource;
  targets: Query[];
}

export interface Datasource {
  type: string;
  uid: string;
}
```

---

## Entity 5: Query

**Purpose**: Represents a datasource query (Prometheus, Azure Monitor, GCP, etc.).

**Location**: `src/types/index.ts` (Query interface)

### Fields

| Field        | Type         | Required | Description                                               | Source                 |
| ------------ | ------------ | -------- | --------------------------------------------------------- | ---------------------- |
| `refId`      | `string`     | Yes      | Query reference ID (A, B, C, ...)                         | Grafana dashboard JSON |
| `datasource` | `Datasource` | No       | Datasource for this query (can override panel datasource) | Grafana dashboard JSON |
| `expr`       | `string`     | No       | Query expression (Prometheus PromQL, etc.)                | Grafana dashboard JSON |
| `query`      | `string`     | No       | Alternative query field (used by some datasources)        | Grafana dashboard JSON |
| `queryType`  | `string`     | No       | Query type (e.g., "timeSeriesQuery" for Azure)            | Grafana dashboard JSON |
| `rawQuery`   | `any`        | No       | Datasource-specific query object                          | Grafana dashboard JSON |

### Relationships

- **Belongs to**: Panel (parent panel)
- **References**: Datasource (inline object)

### Validation Rules

1. **RefId**: Non-empty string, typically single letter (A-Z)
2. **Query expression**: At least one of expr, query, or rawQuery must be present

### Notes

Query structure varies by datasource type:

- **Prometheus**: `expr` contains PromQL
- **Azure Monitor**: `rawQuery` contains azureMonitor object
- **GCP**: `rawQuery` contains GCP-specific query structure

### TypeScript Interface

```typescript
export interface Query {
  refId: string;
  datasource?: Datasource;
  expr?: string;
  query?: string;
  queryType?: string;
  rawQuery?: any; // Datasource-specific structure
}
```

---

## Entity 6: Query Result

**Purpose**: Represents time-series data returned from query execution.

**Location**: `src/types/index.ts` (QueryResult interface)

### Fields

| Field    | Type           | Required | Description                              | Source                     |
| -------- | -------------- | -------- | ---------------------------------------- | -------------------------- |
| `refId`  | `string`       | Yes      | Query reference ID (matches Query.refId) | Grafana query API response |
| `series` | `TimeSeries[]` | Yes      | Array of time series                     | Grafana query API response |

### Relationships

- **Corresponds to**: Query entity (via refId)

### TypeScript Interface

```typescript
export interface QueryResult {
  refId: string;
  series: TimeSeries[];
}

export interface TimeSeries {
  name: string;
  labels: Record<string, string>;
  datapoints: Datapoint[];
}

export interface Datapoint {
  timestamp: number; // Unix timestamp (milliseconds)
  value: number | null;
}
```

---

## Entity 7: Alert

**Purpose**: Represents a Grafana alert with its current state.

**Location**: `src/types/index.ts` (Alert interface)

### Fields

| Field         | Type         | Required | Description                   | Source               |
| ------------- | ------------ | -------- | ----------------------------- | -------------------- |
| `id`          | `number`     | Yes      | Alert ID                      | Grafana API response |
| `dashboardId` | `number`     | No       | Dashboard ID containing alert | Grafana API response |
| `panelId`     | `number`     | No       | Panel ID containing alert     | Grafana API response |
| `name`        | `string`     | Yes      | Alert name                    | Grafana API response |
| `state`       | `AlertState` | Yes      | Current alert state           | Grafana API response |
| `folderTitle` | `string`     | No       | Folder containing alert       | Grafana API response |
| `message`     | `string`     | No       | Alert message/description     | Grafana API response |

### Relationships

- **Belongs to**: Dashboard (via dashboardId)
- **Belongs to**: Panel (via panelId)

### Validation Rules

1. **ID**: Positive integer
2. **State**: Must be one of valid AlertState enum values

### State Transitions

Alert states (read-only for MVP, no state changes via CLI):

```
pending → ok
pending → alerting
ok → alerting
alerting → ok
(any state) → paused (manual user action in Grafana UI)
```

### TypeScript Interface

```typescript
export interface Alert {
  id: number;
  dashboardId?: number;
  panelId?: number;
  name: string;
  state: AlertState;
  folderTitle?: string;
  message?: string;
}

export enum AlertState {
  OK = "ok",
  PAUSED = "paused",
  ALERTING = "alerting",
  PENDING = "pending",
  NO_DATA = "no_data",
  EXECUTION_ERROR = "execution_error",
}
```

---

## Entity 8: Server Status

**Purpose**: Represents Grafana server health and version information.

**Location**: `src/types/index.ts` (ServerStatus interface)

### Fields

| Field      | Type     | Required | Description                     | Source               |
| ---------- | -------- | -------- | ------------------------------- | -------------------- |
| `version`  | `string` | Yes      | Grafana version (e.g., "7.5.0") | /api/health response |
| `database` | `string` | Yes      | Database status ("ok" or error) | /api/health response |
| `commit`   | `string` | No       | Git commit hash                 | /api/health response |

### Relationships

None (standalone status entity)

### TypeScript Interface

```typescript
export interface ServerStatus {
  version: string;
  database: string;
  commit?: string;
}
```

---

## Relationships Diagram

```text
ConfigStore
  └── contains many → ServerConfig

Dashboard
  └── has many → Panel
      └── has many → Query
          └── produces → QueryResult

Alert
  ├── belongs to → Dashboard (via dashboardId)
  └── belongs to → Panel (via panelId)

ServerConfig
  └── used by → (all API operations)
```

---

## Data Flow

### Configuration Flow

1. User runs `grafana-cli config set --url <url> --name <name>`
2. CLI loads ConfigStore from `~/.grafana-cli/config.json`
3. CLI creates ServerConfig entity
4. CLI adds ServerConfig to ConfigStore.configs
5. CLI saves ConfigStore to disk (atomic write)

### Query Execution Flow

1. User runs `grafana-cli query execute --dashboard <uid> --panel <id>`
2. CLI loads active ServerConfig from ConfigStore
3. CLI fetches Dashboard by UID from Grafana API
4. CLI finds Panel by ID in Dashboard.panels
5. CLI extracts Query entities from Panel.targets
6. CLI executes queries via Grafana datasource proxy API
7. CLI receives QueryResult entities
8. CLI formats and displays results

---

## MVP Simplifications

1. **No Template Variables**: Variables in dashboards not modeled (future: add Variable entity)
2. **No Annotations**: Annotations not supported (out of scope)
3. **No Alert Rules**: Alert rule details not modeled (future: expand Alert entity)
4. **Simplified Datasource**: Only type and UID stored (not full datasource config)
5. **Generic Query**: Single Query entity for all datasource types (not per-datasource entities)

---

## Future Enhancements (Post-MVP)

1. **Variable entity**: Model dashboard template variables ($server, $interval, etc.)
2. **Folder entity**: Full folder hierarchy with permissions
3. **Datasource entity**: Full datasource configuration (not just type/UID reference)
4. **Alert Rule entity**: Detailed alert conditions, evaluation frequency, notifications
5. **Snapshot entity**: Dashboard snapshot with expiration

---

## Validation Summary

| Entity       | Validation Location            | Validation Rules                               |
| ------------ | ------------------------------ | ---------------------------------------------- |
| ServerConfig | `src/services/config-store.ts` | URL format, auth completeness, name uniqueness |
| ConfigStore  | `src/services/config-store.ts` | Active config exists, default consistency      |
| Dashboard    | Grafana API                    | UID non-empty                                  |
| Panel        | Grafana API                    | ID positive, targets non-empty                 |
| Query        | Grafana API                    | RefId non-empty, query expression present      |
| Alert        | Grafana API                    | ID positive, state valid enum                  |

Most validation handled by Grafana API (trusted data source). CLI validates only user input (config, URLs, time ranges).
