# API Contract: Grafana Health API

**Feature**: 001-cli-mvp
**API Version**: Grafana v7.5
**Base URL**: `{server_url}/api`

## Purpose

Health endpoint provides server status, version information, and database connectivity check. Used by `grafana-cli status` command (FR-009 to FR-012).

---

## GET /api/health

**Description**: Check Grafana server health and retrieve version information.

**Authentication**: Not required (public endpoint)

**Request**

```http
GET /api/health HTTP/1.1
Host: grafana.example.com
Accept: application/json
```

**Success Response (200 OK)**

```json
{
  "version": "7.5.0",
  "database": "ok",
  "commit": "a1b2c3d4e5"
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `version` | `string` | Grafana version (semver format) |
| `database` | `string` | Database status ("ok" or error message) |
| `commit` | `string` | Git commit hash (short form) |

**Error Responses**

| Status | Description | Response Body |
|--------|-------------|---------------|
| 503 Service Unavailable | Database connection failed | `{"database": "error connecting to database"}` |

**CLI Mapping**

- Command: `grafana-cli status [--server <name>]`
- Exit code: 0 on 200, 1 on 503
- Output: Table with version, database status, commit

**Example CLI Output**

```text
Server Status: grafana.example.com

VERSION   DATABASE   COMMIT
7.5.0     ok         a1b2c3d
```

**Test Cases (Contract Tests)**

1. **Happy path**: GET /api/health returns 200 with version, database "ok", commit
2. **Database down**: GET /api/health returns 503 with database error message
3. **Unauthenticated**: GET /api/health (no auth headers) returns 200 (public endpoint)

**References**

- Grafana v7.5 Health API: https://grafana.com/docs/grafana/v7.5/http_api/other/#health-api
