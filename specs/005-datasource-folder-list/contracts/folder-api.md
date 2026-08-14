# API Contract: Grafana Folder API

**Feature**: 005-datasource-folder-list
**API Version**: Grafana v7.5
**Base URL**: `{server_url}/api`

## Purpose

Folder endpoint supports listing all folders configured on the server. Used by `grafana-cli folder list` (FR-001). Already called internally by `resolveFolderId()` in `grafana-client.ts` for `alert list --folder`; this feature adds a public, full-listing path over the same endpoint.

---

## GET /api/folders

**Description**: List all folders visible to the authenticated user.

**Authentication**: Required (API key or basic auth). No elevated role required — any authenticated user sees the folders they have view access to.

**Query Parameters**

| Parameter | Type     | Required | Description                           |
| --------- | -------- | -------- | ------------------------------------- |
| `limit`   | `number` | No       | Max results to return (default: 1000) |

**Request Example**

```http
GET /api/folders HTTP/1.1
Host: grafana.example.com
Authorization: Bearer <api-key>
Accept: application/json
```

**Success Response (200 OK)**

```json
[
  {
    "id": 42,
    "uid": "prod-folder",
    "title": "Production"
  },
  {
    "id": 43,
    "uid": "staging-folder",
    "title": "Staging"
  }
]
```

**Response Fields**

| Field   | Type     | Description                                                       |
| ------- | -------- | ----------------------------------------------------------------- |
| `id`    | `number` | Numeric folder ID                                                 |
| `uid`   | `string` | Folder UID (stable identifier across renames)                     |
| `title` | `string` | Folder display name (matches `--folder` filter on other commands) |

**Error Responses**

| Status                    | Description                | Response Body                          |
| ------------------------- | -------------------------- | -------------------------------------- |
| 401 Unauthorized          | Invalid or missing API key | `{"message": "Unauthorized"}`          |
| 500 Internal Server Error | Server error               | `{"message": "Internal server error"}` |

**CLI Mapping**

- Command: `grafana-cli folder list [--config <name>] [--json]`
- Output: Table with ID, UID, TITLE

**Example CLI Output**

```text
Folders (2 total)

ID   UID              TITLE
42   prod-folder      Production
43   staging-folder   Staging
```

**Example CLI Output (Empty)**

```text
No folders found.
```

**Test Cases (Contract Tests)**

1. **List folders**: `GET /api/folders` returns 200 with array of folder objects.
2. **Response shape**: each item has `id`, `uid`, `title`.
3. **Empty result**: server with no custom folders returns 200 with `[]` (CLI shows "No folders found.").
4. **Unauthorized**: `GET /api/folders` with no/invalid auth returns 401.

**References**

- Grafana v7.5 Folder API: https://grafana.com/docs/grafana/v7.5/http_api/folder/#get-all-folders
