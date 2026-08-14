# Data Model: Alert Notification Channel Discovery

**Feature**: 006-notification-channels
**Date**: 2026-08-14
**Phase**: Phase 1 Design

## Overview

Two new entities, mirroring the existing `Alert`/`AlertDetail` list/detail split. Both are read-only projections of Grafana API responses; neither is persisted locally.

---

## Entity 1: Notification Channel

**Purpose**: Represents a notification channel as returned by the list endpoint — enough to identify it and pass its id/name elsewhere.

**Location**: `src/types/index.ts` (new `NotificationChannel` interface)

### Fields

| Field       | Type      | Required | Description                                          | Source               |
| ----------- | --------- | -------- | ---------------------------------------------------- | -------------------- |
| `id`        | `number`  | Yes      | Numeric channel ID (used by `notification get <id>`) | Grafana API response |
| `uid`       | `string`  | No       | Channel UID                                          | Grafana API response |
| `name`      | `string`  | Yes      | Channel display name                                 | Grafana API response |
| `type`      | `string`  | Yes      | Channel type (e.g. "email", "slack", "webhook")      | Grafana API response |
| `isDefault` | `boolean` | Yes      | Whether this is the server's default channel         | Grafana API response |

### Validation Rules

1. **ID**: Positive integer.
2. **Name**: Non-empty string.

### TypeScript Interface

```typescript
export interface NotificationChannel {
  id: number;
  uid?: string;
  name: string;
  type: string;
  isDefault: boolean;
}
```

---

## Entity 2: Notification Channel Detail

**Purpose**: Represents the full configuration of a single notification channel, as returned by the get-by-id endpoint.

**Location**: `src/types/index.ts` (new `NotificationChannelDetail` interface)

### Fields

| Field                   | Type                      | Required | Description                                                                                   | Source               |
| ----------------------- | ------------------------- | -------- | --------------------------------------------------------------------------------------------- | -------------------- |
| `id`                    | `number`                  | Yes      | Numeric channel ID                                                                            | Grafana API response |
| `uid`                   | `string`                  | No       | Channel UID                                                                                   | Grafana API response |
| `name`                  | `string`                  | Yes      | Channel display name                                                                          | Grafana API response |
| `type`                  | `string`                  | Yes      | Channel type                                                                                  | Grafana API response |
| `isDefault`             | `boolean`                 | Yes      | Whether this is the server's default channel                                                  | Grafana API response |
| `sendReminder`          | `boolean`                 | Yes      | Whether repeat reminders are sent for firing alerts                                           | Grafana API response |
| `disableResolveMessage` | `boolean`                 | Yes      | Whether the "resolved" notification is suppressed                                             | Grafana API response |
| `frequency`             | `string`                  | No       | Reminder frequency (only meaningful if `sendReminder`)                                        | Grafana API response |
| `created`               | `string`                  | No       | ISO 8601 creation timestamp                                                                   | Grafana API response |
| `updated`               | `string`                  | No       | ISO 8601 last-update timestamp                                                                | Grafana API response |
| `settings`              | `Record<string, unknown>` | Yes      | Type-specific configuration (e.g. email addresses, webhook URL) — server-redacted for secrets | Grafana API response |

### Relationships

- **Referenced by**: Alert rules (not modeled — Grafana's alert rule JSON references channels by id/name in its notification settings, but this feature does not attempt to cross-reference `Alert`/`AlertDetail` with channels; SC-004 is satisfied by the user manually correlating CLI output, not by the CLI joining the two automatically — see spec.md Assumptions).

### Validation Rules

1. **ID**: Positive integer.
2. **Name**: Non-empty string.
3. **Settings**: Object (possibly empty `{}`), never null.

### TypeScript Interface

```typescript
export interface NotificationChannelDetail {
  id: number;
  uid?: string;
  name: string;
  type: string;
  isDefault: boolean;
  sendReminder: boolean;
  disableResolveMessage: boolean;
  frequency?: string;
  created?: string;
  updated?: string;
  settings: Record<string, unknown>;
}
```

---

## Relationships Diagram

```text
NotificationChannel (list shape)
  └── same resource, richer shape → NotificationChannelDetail (get shape)

Alert / AlertDetail (existing)
  └── conceptually routes to → NotificationChannel (not modeled as a formal reference — Grafana v7.5 alert rule JSON stores channel refs separately from the Alert entity this CLI currently parses)
```

## Validation Summary

| Entity                    | Validation Location | Validation Rules                                   |
| ------------------------- | ------------------- | -------------------------------------------------- |
| NotificationChannel       | Grafana API         | id positive, name non-empty                        |
| NotificationChannelDetail | Grafana API         | id positive, name non-empty, settings is an object |

Both entities are fully validated by the Grafana API (trusted source); the CLI performs no additional validation beyond existing 404/403/network error handling in `grafana-client.ts`.
