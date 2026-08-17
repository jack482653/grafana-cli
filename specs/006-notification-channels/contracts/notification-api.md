# API Contract: Grafana Alert Notification Channel API

**Feature**: 006-notification-channels
**API Version**: Grafana v7.5
**Base URL**: `{server_url}/api`

## Purpose

Alert notification channel endpoints support listing and inspecting the destinations Grafana sends alert notifications to. Used by `grafana-cli notification list`/`get` (FR-001, FR-002).

All permission behavior below was verified empirically against a live `grafana/grafana:7.5.0` container with Admin/Editor/Viewer-role API keys (see research.md Decision 2).

---

## GET /api/alert-notifications

**Description**: List all notification channels configured on the server (full detail shape).

**Authentication**: Required (API key or basic auth). **Requires Editor or Admin role** — Viewer credentials receive `403 Forbidden` (verified empirically).

**Query Parameters**: None.

**Request Example**

```http
GET /api/alert-notifications HTTP/1.1
Host: grafana.example.com
Authorization: Bearer <api-key>
Accept: application/json
```

**Success Response (200 OK)**

```json
[
  {
    "id": 1,
    "uid": "SQzlfmUvz",
    "name": "Ops Email",
    "type": "email",
    "isDefault": true,
    "sendReminder": false,
    "disableResolveMessage": false,
    "frequency": "",
    "created": "2026-08-14T10:19:43Z",
    "updated": "2026-08-14T10:19:43Z",
    "settings": { "addresses": "ops@example.com" },
    "secureFields": {}
  }
]
```

**Response Fields**

| Field                   | Type      | Description                                                        |
| ----------------------- | --------- | ------------------------------------------------------------------ |
| `id`                    | `number`  | Numeric channel ID (used in `notification get <id>`)               |
| `uid`                   | `string`  | Channel UID                                                        |
| `name`                  | `string`  | Channel display name                                               |
| `type`                  | `string`  | Channel type identifier (e.g. "email", "slack", "webhook")         |
| `isDefault`             | `boolean` | Whether this channel is the server's default                       |
| `sendReminder`          | `boolean` | Whether repeat reminders are sent for firing alerts                |
| `disableResolveMessage` | `boolean` | Whether the "resolved" notification is suppressed                  |
| `frequency`             | `string`  | Reminder frequency (only meaningful if `sendReminder`)             |
| `created` / `updated`   | `string`  | ISO 8601 timestamps                                                |
| `settings`              | `object`  | Type-specific configuration (server redacts secret fields already) |

(`secureFields` exists in the response but is not surfaced by the CLI — it only indicates which secret keys are set, not their values.)

**Error Responses**

| Status                    | Description                            | Response Body                          |
| ------------------------- | -------------------------------------- | -------------------------------------- |
| 401 Unauthorized          | Invalid or missing API key             | `{"message": "Unauthorized"}`          |
| 403 Forbidden             | Insufficient permissions (Viewer role) | `{"message": "Permission denied"}`     |
| 500 Internal Server Error | Server error                           | `{"message": "Internal server error"}` |

**CLI Mapping**

- Command: `grafana-cli notification list [--config <name>] [--json]`
- Output: Table with ID, NAME, TYPE, DEFAULT
- On 403: CLI MUST print a message explaining the Editor/Admin requirement (FR-005), not the raw `{"message": "Permission denied"}` body.

**Example CLI Output**

```text
ID   NAME       TYPE    DEFAULT
1    Ops Email  email   yes
```

**Example CLI Output (Permission Error)**

```text
Error: Permission denied listing notification channels.
Server: https://grafana.example.com
Listing notification channels requires Editor or Admin role. Check your account role or API key permissions.
```

---

## GET /api/alert-notifications/:id

**Description**: Get full configuration of a single notification channel by numeric ID.

**Authentication**: Required (API key or basic auth). **Requires Editor or Admin role** — Viewer credentials receive `403 Forbidden` (verified empirically, same as the list endpoint).

**Path Parameters**

| Parameter | Type     | Required | Description |
| --------- | -------- | -------- | ----------- |
| `id`      | `number` | Yes      | Channel ID  |

**Request Example**

```http
GET /api/alert-notifications/1 HTTP/1.1
Host: grafana.example.com
Authorization: Bearer <api-key>
Accept: application/json
```

**Success Response (200 OK)**: Same shape as one item in the list response above.

**Error Responses**

| Status           | Description                       | Response Body                                 |
| ---------------- | --------------------------------- | --------------------------------------------- |
| 401 Unauthorized | Invalid or missing API key        | `{"message": "Unauthorized"}`                 |
| 403 Forbidden    | Insufficient permissions (Viewer) | `{"message": "Permission denied"}`            |
| 404 Not Found    | Channel ID not found              | `{"message": "Alert notification not found"}` |

**CLI Mapping**

- Command: `grafana-cli notification get <id> [--config <name>] [--json]`
- Output (text): labeled fields (Name/Type/Default/Send Reminder/Disable Resolve Message/Created/Updated), then a Settings section listing each key/value pair. If `settings` has zero keys, print `Settings: (none)` instead of an empty section header with nothing under it.
- On 404: CLI MUST print "channel not found" style message referencing `notification list`, not the raw error body.
- On 403: same permission message as `notification list`.

**Example CLI Output**

```text
Name:                    Ops Email
Type:                    email
Default:                 yes
Send Reminder:           no
Disable Resolve Message: no
Created:                 2026-08-14T10:19:43Z
Updated:                 2026-08-14T10:19:43Z

Settings:
  addresses: ops@example.com
```

**Test Cases (Contract Tests)**

1. **List channels**: `GET /api/alert-notifications` returns 200 with array of channel objects.
2. **Response shape**: each item has `id`, `name`, `type`, `isDefault` (`uid` optional).
3. **Insufficient permission (Viewer)**: `GET /api/alert-notifications` with a Viewer-role API key returns 403.
4. **Get by id**: `GET /api/alert-notifications/:id` returns 200 with full detail shape including `settings`.
5. **Not found**: `GET /api/alert-notifications/:id` with a non-existent id returns 404.
6. **Unauthorized**: either endpoint with no/invalid auth returns 401.

**References**

- Grafana v7.5 Alert Notification Channels API: https://grafana.com/docs/grafana/v7.5/http_api/alerting_notification_channels/
