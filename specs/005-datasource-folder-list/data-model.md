# Data Model: Datasource & Folder Listing

**Feature**: 005-datasource-folder-list
**Date**: 2026-08-14
**Phase**: Phase 1 Design

## Overview

Two new entities, both read-only projections of Grafana API responses. Neither is persisted locally; both are fetched fresh on every command invocation (consistent with existing Dashboard/Alert entities — see `specs/001-cli-mvp/data-model.md`).

---

## Entity 1: Datasource Info

**Purpose**: Represents a datasource configured on the Grafana server, as returned by the full datasource listing endpoint. Distinct from the existing `Datasource` reference type (see [research.md](./research.md) Decision 3).

**Location**: `src/types/index.ts` (new `DatasourceInfo` interface)

### Fields

| Field       | Type      | Required | Description                                                             | Source               |
| ----------- | --------- | -------- | ----------------------------------------------------------------------- | -------------------- |
| `id`        | `number`  | Yes      | Numeric datasource ID (used by `query execute --datasource`)            | Grafana API response |
| `uid`       | `string`  | No       | Datasource UID (v7.5 may omit for older provisioned datasources)        | Grafana API response |
| `name`      | `string`  | Yes      | Datasource display name                                                 | Grafana API response |
| `type`      | `string`  | Yes      | Datasource type (e.g. "prometheus", "grafana-azure-monitor-datasource") | Grafana API response |
| `isDefault` | `boolean` | Yes      | Whether this is the server's default datasource                         | Grafana API response |

### Relationships

- **Referenced by**: `Query`/`Panel` (existing lightweight `Datasource` type) via numeric id — not modeled as a formal relationship, just a shared id space.

### Validation Rules

1. **ID**: Positive integer.
2. **Name**: Non-empty string.

### State Transitions

N/A (read-only for this feature; datasource configuration itself is out of scope).

### TypeScript Interface

```typescript
export interface DatasourceInfo {
  id: number;
  uid?: string;
  name: string;
  type: string;
  isDefault: boolean;
}
```

---

## Entity 2: Folder

**Purpose**: Represents a Grafana folder that groups dashboards. Already fetched internally (see `resolveFolderId()` in `grafana-client.ts`); this feature adds a full listing.

**Location**: `src/types/index.ts` (new `Folder` interface)

### Fields

| Field   | Type     | Required | Description                                                                     | Source               |
| ------- | -------- | -------- | ------------------------------------------------------------------------------- | -------------------- |
| `id`    | `number` | Yes      | Numeric folder ID (used by `--folderId` filters internally)                     | Grafana API response |
| `uid`   | `string` | No       | Folder UID (stable identifier across renames)                                   | Grafana API response |
| `title` | `string` | Yes      | Folder display name (used by `dashboard list --folder` / `alert list --folder`) | Grafana API response |

### Relationships

- **Referenced by**: `Dashboard.folderTitle`, `Alert.folderTitle` (existing entities reference the folder by title, not by a modeled relationship).

### Validation Rules

1. **ID**: Positive integer.
2. **Title**: Non-empty string.

### State Transitions

N/A (read-only; folder creation/rename is out of scope).

### TypeScript Interface

```typescript
export interface Folder {
  id: number;
  uid?: string;
  title: string;
}
```

---

## Relationships Diagram

```text
DatasourceInfo
  └── shares id space with → Datasource (existing panel/query reference type)

Folder
  └── referenced by title → Dashboard.folderTitle, Alert.folderTitle (existing)
```

## Validation Summary

| Entity         | Validation Location | Validation Rules             |
| -------------- | ------------------- | ---------------------------- |
| DatasourceInfo | Grafana API         | id positive, name non-empty  |
| Folder         | Grafana API         | id positive, title non-empty |

Both entities are fully validated by the Grafana API (trusted source); the CLI performs no additional validation beyond existing 404/403/network error handling in `grafana-client.ts`.
