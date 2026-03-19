# API Contract: Grafana Dashboard API

**Feature**: 001-cli-mvp
**API Version**: Grafana v7.5
**Base URL**: `{server_url}/api`

## Purpose

Dashboard endpoints support listing, searching, and retrieving dashboard definitions. Used by `grafana-cli dashboard` commands (FR-013 to FR-018).

---

## GET /api/search

**Description**: Search for dashboards and folders. Returns list of dashboards with metadata (no panel details).

**Authentication**: Required (API key or basic auth)

**Query Parameters**

| Parameter   | Type     | Required | Description                                                          |
| ----------- | -------- | -------- | -------------------------------------------------------------------- |
| `query`     | `string` | No       | Search query (matches dashboard title, partial match)                |
| `tag`       | `string` | No       | Filter by tag (can repeat for multiple tags)                         |
| `folderIds` | `number` | No       | Filter by folder ID (can repeat)                                     |
| `type`      | `string` | No       | Filter by type ("dash-db" for dashboards, "dash-folder" for folders) |
| `limit`     | `number` | No       | Max results to return (default: 1000)                                |

**Request Examples**

```http
# List all dashboards
GET /api/search?type=dash-db HTTP/1.1
Host: grafana.example.com
Authorization: Bearer <api-key>
Accept: application/json

# Search dashboards by title
GET /api/search?query=infrastructure&type=dash-db HTTP/1.1

# Filter by tag
GET /api/search?tag=monitoring&type=dash-db HTTP/1.1

# Filter by folder
GET /api/search?folderIds=42&type=dash-db HTTP/1.1
```

**Success Response (200 OK)**

```json
[
  {
    "id": 1,
    "uid": "cIBgcSjkk",
    "title": "Infrastructure Dashboard",
    "url": "/d/cIBgcSjkk/infrastructure-dashboard",
    "type": "dash-db",
    "tags": ["monitoring", "infrastructure"],
    "folderTitle": "Production",
    "folderId": 42,
    "folderUid": "prod-folder"
  },
  {
    "id": 2,
    "uid": "xyz789",
    "title": "Application Metrics",
    "url": "/d/xyz789/application-metrics",
    "type": "dash-db",
    "tags": ["monitoring"],
    "folderTitle": "Production",
    "folderId": 42,
    "folderUid": "prod-folder"
  }
]
```

**Response Fields**

| Field         | Type       | Description                                         |
| ------------- | ---------- | --------------------------------------------------- |
| `id`          | `number`   | Internal dashboard ID (numeric)                     |
| `uid`         | `string`   | Dashboard UID (preferred identifier)                |
| `title`       | `string`   | Dashboard title                                     |
| `url`         | `string`   | Relative dashboard URL                              |
| `type`        | `string`   | "dash-db" for dashboards, "dash-folder" for folders |
| `tags`        | `string[]` | Dashboard tags                                      |
| `folderTitle` | `string`   | Folder name containing dashboard                    |
| `folderId`    | `number`   | Folder ID                                           |
| `folderUid`   | `string`   | Folder UID                                          |

**Error Responses**

| Status                    | Description                | Response Body                          |
| ------------------------- | -------------------------- | -------------------------------------- |
| 401 Unauthorized          | Invalid or missing API key | `{"message": "Unauthorized"}`          |
| 403 Forbidden             | Insufficient permissions   | `{"message": "Permission denied"}`     |
| 500 Internal Server Error | Server error               | `{"message": "Internal server error"}` |

**CLI Mapping**

- Command: `grafana-cli dashboard list [--folder <name>] [--tag <tag>] [--query <text>]`
- Output: Table with UID, title, folder, tags

**Example CLI Output**

```text
Dashboards (2 total)

UID         TITLE                      FOLDER      TAGS
cIBgcSjkk   Infrastructure Dashboard   Production  monitoring, infrastructure
xyz789      Application Metrics        Production  monitoring
```

---

## GET /api/dashboards/uid/:uid

**Description**: Get full dashboard definition by UID. Returns complete dashboard JSON including panels, queries, variables.

**Authentication**: Required (API key or basic auth)

**Path Parameters**

| Parameter | Type     | Required | Description   |
| --------- | -------- | -------- | ------------- |
| `uid`     | `string` | Yes      | Dashboard UID |

**Request**

```http
GET /api/dashboards/uid/cIBgcSjkk HTTP/1.1
Host: grafana.example.com
Authorization: Bearer <api-key>
Accept: application/json
```

**Success Response (200 OK)**

```json
{
  "meta": {
    "type": "db",
    "canSave": false,
    "canEdit": false,
    "canAdmin": false,
    "canStar": true,
    "slug": "infrastructure-dashboard",
    "url": "/d/cIBgcSjkk/infrastructure-dashboard",
    "expires": "0001-01-01T00:00:00Z",
    "created": "2021-01-01T12:00:00Z",
    "updated": "2021-06-15T10:30:00Z",
    "updatedBy": "admin",
    "createdBy": "admin",
    "version": 5,
    "hasAcl": false,
    "isFolder": false,
    "folderId": 42,
    "folderTitle": "Production",
    "folderUrl": "/dashboards/f/prod-folder/production",
    "provisioned": false,
    "provisionedExternalId": ""
  },
  "dashboard": {
    "uid": "cIBgcSjkk",
    "title": "Infrastructure Dashboard",
    "tags": ["monitoring", "infrastructure"],
    "timezone": "browser",
    "schemaVersion": 27,
    "version": 5,
    "refresh": "30s",
    "panels": [
      {
        "id": 2,
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
        "type": "graph",
        "title": "CPU Usage",
        "datasource": {
          "type": "prometheus",
          "uid": "prom-uid-123"
        },
        "targets": [
          {
            "refId": "A",
            "expr": "rate(cpu_usage_seconds_total[5m])",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "id": 3,
        "gridPos": { "x": 12, "y": 0, "w": 12, "h": 8 },
        "type": "graph",
        "title": "Memory Usage",
        "datasource": {
          "type": "prometheus",
          "uid": "prom-uid-123"
        },
        "targets": [
          {
            "refId": "A",
            "expr": "memory_usage_bytes / 1024 / 1024",
            "legendFormat": "{{instance}}"
          }
        ]
      }
    ],
    "templating": {
      "list": []
    },
    "annotations": {
      "list": []
    }
  }
}
```

**Response Fields (meta)**

| Field         | Type     | Description                            |
| ------------- | -------- | -------------------------------------- |
| `type`        | `string` | "db" for dashboard                     |
| `version`     | `number` | Dashboard version (increments on save) |
| `created`     | `string` | ISO 8601 creation timestamp            |
| `updated`     | `string` | ISO 8601 last update timestamp         |
| `folderId`    | `number` | Folder ID                              |
| `folderTitle` | `string` | Folder name                            |

**Response Fields (dashboard)**

| Field             | Type         | Description                                            |
| ----------------- | ------------ | ------------------------------------------------------ |
| `uid`             | `string`     | Dashboard UID                                          |
| `title`           | `string`     | Dashboard title                                        |
| `tags`            | `string[]`   | Dashboard tags                                         |
| `panels`          | `Panel[]`    | Array of panel definitions (see Panel structure below) |
| `templating.list` | `Variable[]` | Template variables (MVP: not used)                     |

**Panel Structure**

| Field        | Type       | Description                                  |
| ------------ | ---------- | -------------------------------------------- |
| `id`         | `number`   | Panel ID (unique within dashboard)           |
| `type`       | `string`   | Panel type (graph, table, stat, gauge, etc.) |
| `title`      | `string`   | Panel title                                  |
| `datasource` | `object`   | Datasource config `{type, uid}`              |
| `targets`    | `Target[]` | Query targets (see Target structure)         |

**Target (Query) Structure**

| Field        | Type     | Description                                         |
| ------------ | -------- | --------------------------------------------------- |
| `refId`      | `string` | Query reference ID (A, B, C, ...)                   |
| `expr`       | `string` | Prometheus PromQL query (for Prometheus datasource) |
| `query`      | `string` | Query string (for other datasources)                |
| `datasource` | `object` | Override datasource for this query (optional)       |

**Error Responses**

| Status           | Description                | Response Body                        |
| ---------------- | -------------------------- | ------------------------------------ |
| 401 Unauthorized | Invalid or missing API key | `{"message": "Unauthorized"}`        |
| 404 Not Found    | Dashboard UID not found    | `{"message": "Dashboard not found"}` |
| 403 Forbidden    | Insufficient permissions   | `{"message": "Permission denied"}`   |

**CLI Mapping**

- Command: `grafana-cli dashboard get <uid>`
- Output: JSON (default) or formatted text with panels list

**Example CLI Output (Text)**

```text
Dashboard: Infrastructure Dashboard (cIBgcSjkk)
Folder: Production
Tags: monitoring, infrastructure
Version: 5
Updated: 2021-06-15 10:30:00

Panels (2):
  [2] CPU Usage (graph)
      Datasource: prometheus (prom-uid-123)
      Query A: rate(cpu_usage_seconds_total[5m])

  [3] Memory Usage (graph)
      Datasource: prometheus (prom-uid-123)
      Query A: memory_usage_bytes / 1024 / 1024
```

**Test Cases (Contract Tests)**

1. **List dashboards**: GET /api/search?type=dash-db returns 200 with array of dashboards
2. **Search by title**: GET /api/search?query=infrastructure returns dashboards matching query
3. **Filter by tag**: GET /api/search?tag=monitoring returns only tagged dashboards
4. **Filter by folder**: GET /api/search?folderIds=42 returns dashboards in folder 42
5. **Get dashboard by UID**: GET /api/dashboards/uid/:uid returns 200 with full dashboard JSON
6. **Dashboard not found**: GET /api/dashboards/uid/invalid returns 404
7. **Unauthorized**: GET /api/search (no auth) returns 401

**References**

- Grafana v7.5 Search API: https://grafana.com/docs/grafana/v7.5/http_api/dashboard/#search-dashboards
- Grafana v7.5 Dashboard API: https://grafana.com/docs/grafana/v7.5/http_api/dashboard/#get-dashboard-by-uid
