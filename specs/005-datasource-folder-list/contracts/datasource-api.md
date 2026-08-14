# API Contract: Grafana Datasource API

**Feature**: 005-datasource-folder-list
**API Version**: Grafana v7.5
**Base URL**: `{server_url}/api`

## Purpose

Datasource endpoint supports listing all datasources configured on the server. Used by `grafana-cli datasource list` (FR-002).

---

## GET /api/datasources

**Description**: List all datasources configured on the Grafana server.

**Authentication**: Required (API key or basic auth). **Requires Admin role** — Viewer and Editor credentials both receive `403 Forbidden` (the response can include datasource credentials, so Grafana restricts it to Admin only; confirmed empirically against Grafana 7.5.0).

**Query Parameters**: None.

**Request Example**

```http
GET /api/datasources HTTP/1.1
Host: grafana.example.com
Authorization: Bearer <api-key>
Accept: application/json
```

**Success Response (200 OK)**

```json
[
  {
    "id": 1,
    "uid": "prom-uid-123",
    "orgId": 1,
    "name": "Prometheus",
    "type": "prometheus",
    "typeName": "Prometheus",
    "access": "proxy",
    "url": "http://prometheus:9090",
    "isDefault": true,
    "readOnly": false
  },
  {
    "id": 2,
    "uid": "azure-uid-456",
    "orgId": 1,
    "name": "Azure Monitor",
    "type": "grafana-azure-monitor-datasource",
    "typeName": "Azure Monitor",
    "access": "proxy",
    "url": "",
    "isDefault": false,
    "readOnly": false
  }
]
```

**Response Fields**

| Field       | Type      | Description                                                       |
| ----------- | --------- | ----------------------------------------------------------------- |
| `id`        | `number`  | Numeric datasource ID (used in `query execute --datasource <id>`) |
| `uid`       | `string`  | Datasource UID                                                    |
| `name`      | `string`  | Datasource display name                                           |
| `type`      | `string`  | Datasource type identifier (e.g. "prometheus")                    |
| `isDefault` | `boolean` | Whether this datasource is the server's default                   |

(Other fields — `orgId`, `typeName`, `access`, `url`, `readOnly`, `password`, `basicAuth`, `jsonData` — exist in the response but are not surfaced by the CLI for this feature; only the fields above map to `DatasourceInfo`.)

**Error Responses**

| Status                    | Description                                      | Response Body                          |
| ------------------------- | ------------------------------------------------ | -------------------------------------- |
| 401 Unauthorized          | Invalid or missing API key                       | `{"message": "Unauthorized"}`          |
| 403 Forbidden             | Insufficient permissions (Viewer or Editor role) | `{"message": "Permission denied"}`     |
| 500 Internal Server Error | Server error                                     | `{"message": "Internal server error"}` |

**CLI Mapping**

- Command: `grafana-cli datasource list [--config <name>] [--json]`
- Output: Table with ID, NAME, TYPE, DEFAULT
- On 403: CLI MUST print a message explaining the Admin requirement (FR-005), not the raw `{"message": "Permission denied"}` body.

**Example CLI Output**

```text
Datasources (2 total)

ID   NAME             TYPE                              DEFAULT
1    Prometheus       prometheus                         yes
2    Azure Monitor     grafana-azure-monitor-datasource   no
```

**Example CLI Output (Permission Error)**

```text
Error: Permission denied listing datasources.
Server: https://grafana.example.com
Listing datasources requires Admin role. Check your account role or API key permissions.
```

**Test Cases (Contract Tests)**

1. **List datasources**: `GET /api/datasources` returns 200 with array of datasource objects.
2. **Response shape**: each item has `id`, `name`, `type`, `isDefault` (`uid` optional).
3. **Insufficient permission (Viewer)**: `GET /api/datasources` with a Viewer-role API key returns 403.
4. **Insufficient permission (Editor)**: `GET /api/datasources` with an Editor-role API key also returns 403 — Editor is not sufficient, only Admin is.
5. **Unauthorized**: `GET /api/datasources` with no/invalid auth returns 401.

**References**

- Grafana v7.5 Data Source API: https://grafana.com/docs/grafana/v7.5/http_api/data_source/#get-all-datasources
