# API Contract: Grafana Query API

**Feature**: 001-cli-mvp
**API Version**: Grafana v7.5
**Base URL**: `{server_url}/api`

## Purpose

Datasource query endpoint executes panel queries and returns time-series data. Used by `grafana-cli query execute` command (FR-019 to FR-025).

---

## POST /api/ds/query

**Description**: Execute datasource queries via Grafana datasource proxy. Supports Prometheus, Azure Monitor, GCP, and other datasources configured in Grafana.

**Authentication**: Required (API key or basic auth)

**Request Headers**

```http
POST /api/ds/query HTTP/1.1
Host: grafana.example.com
Authorization: Bearer <api-key>
Content-Type: application/json
Accept: application/json
```

**Request Body**

```json
{
  "queries": [
    {
      "refId": "A",
      "datasource": {
        "type": "prometheus",
        "uid": "prom-uid-123"
      },
      "expr": "rate(cpu_usage_seconds_total{instance=\"server01\"}[5m])",
      "instant": false,
      "range": true,
      "intervalMs": 30000,
      "maxDataPoints": 1000
    },
    {
      "refId": "B",
      "datasource": {
        "type": "prometheus",
        "uid": "prom-uid-123"
      },
      "expr": "memory_usage_bytes{instance=\"server01\"} / 1024 / 1024",
      "instant": false,
      "range": true,
      "intervalMs": 30000,
      "maxDataPoints": 1000
    }
  ],
  "from": "1609459200000",
  "to": "1609545600000"
}
```

**Request Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `queries` | `Query[]` | Yes | Array of queries to execute |
| `from` | `string` | Yes | Start time (Unix timestamp in milliseconds) |
| `to` | `string` | Yes | End time (Unix timestamp in milliseconds) |

**Query Object**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refId` | `string` | Yes | Query reference ID (A, B, C, ...) |
| `datasource` | `object` | Yes | Datasource config `{type, uid}` |
| `expr` | `string` | Conditional | PromQL expression (for Prometheus) |
| `query` | `string` | Conditional | Query string (for other datasources) |
| `instant` | `boolean` | No | Instant query (default: false) |
| `range` | `boolean` | No | Range query (default: true) |
| `intervalMs` | `number` | No | Step interval in milliseconds |
| `maxDataPoints` | `number` | No | Max data points to return |

**Success Response (200 OK)**

```json
{
  "results": {
    "A": {
      "status": 200,
      "frames": [
        {
          "schema": {
            "name": "cpu_usage",
            "fields": [
              {
                "name": "Time",
                "type": "time",
                "typeInfo": {"frame": "time.Time"}
              },
              {
                "name": "Value",
                "type": "number",
                "typeInfo": {"frame": "float64"},
                "labels": {"instance": "server01", "cpu": "0"}
              }
            ]
          },
          "data": {
            "values": [
              [1609459200000, 1609459230000, 1609459260000],
              [0.23, 0.25, 0.22]
            ]
          }
        }
      ]
    },
    "B": {
      "status": 200,
      "frames": [
        {
          "schema": {
            "name": "memory_usage",
            "fields": [
              {
                "name": "Time",
                "type": "time"
              },
              {
                "name": "Value",
                "type": "number",
                "labels": {"instance": "server01"}
              }
            ]
          },
          "data": {
            "values": [
              [1609459200000, 1609459230000, 1609459260000],
              [2048.5, 2050.2, 2045.8]
            ]
          }
        }
      ]
    }
  }
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `results` | `object` | Map of refId → query result |
| `results[refId].status` | `number` | HTTP status for this query (200 = success) |
| `results[refId].frames` | `Frame[]` | Array of data frames (time-series) |

**Frame Structure**

| Field | Type | Description |
|-------|------|-------------|
| `schema.name` | `string` | Series name |
| `schema.fields` | `Field[]` | Field definitions (Time, Value, labels) |
| `data.values` | `array[]` | 2D array: first array is timestamps, subsequent arrays are values |

**Field Structure**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Field name (Time, Value, etc.) |
| `type` | `string` | Field type (time, number, string) |
| `labels` | `object` | Labels/tags for this series |

**Error Responses**

| Status | Description | Response Body |
|--------|-------------|---------------|
| 400 Bad Request | Invalid query syntax | `{"message": "invalid query", "error": "parse error"}` |
| 401 Unauthorized | Invalid or missing API key | `{"message": "Unauthorized"}` |
| 403 Forbidden | Insufficient datasource permissions | `{"message": "Permission denied"}` |
| 500 Internal Server Error | Datasource query failed | `{"message": "Query execution failed", "error": "..."}` |
| 504 Gateway Timeout | Query timeout | `{"message": "Query timeout"}` |

**Partial Errors**

If multiple queries are executed and some fail, the response is 200 OK with per-query status:

```json
{
  "results": {
    "A": {
      "status": 200,
      "frames": [...]
    },
    "B": {
      "status": 400,
      "error": "invalid query: parse error at position 10"
    }
  }
}
```

**CLI Mapping**

- Command: `grafana-cli query execute --dashboard <uid> --panel <id> [--from <time>] [--to <time>]`
- CLI resolves: Dashboard UID → Panel ID → Queries → API request
- Output: Table with timestamps and values per query (refId)

**Example CLI Workflow**

1. User runs: `grafana-cli query execute --dashboard cIBgcSjkk --panel 2 --from "now-1h" --to "now"`
2. CLI fetches dashboard: `GET /api/dashboards/uid/cIBgcSjkk`
3. CLI finds panel 2, extracts queries (targets)
4. CLI parses time range: "now-1h" → Unix timestamp
5. CLI builds query request with panel's datasource and queries
6. CLI posts: `POST /api/ds/query`
7. CLI formats results as table

**Example CLI Output (Text)**

```text
Query Results: CPU Usage (panel 2)
Time Range: 2021-01-01 00:00:00 to 2021-01-01 01:00:00

Query A: rate(cpu_usage_seconds_total{instance="server01"}[5m])

TIMESTAMP             VALUE     LABELS
2021-01-01 00:00:00   0.23      instance=server01, cpu=0
2021-01-01 00:00:30   0.25      instance=server01, cpu=0
2021-01-01 00:01:00   0.22      instance=server01, cpu=0

Query B: memory_usage_bytes{instance="server01"} / 1024 / 1024

TIMESTAMP             VALUE     LABELS
2021-01-01 00:00:00   2048.5    instance=server01
2021-01-01 00:00:30   2050.2    instance=server01
2021-01-01 00:01:00   2045.8    instance=server01
```

**Example CLI Output (JSON)**

```json
{
  "dashboard": "cIBgcSjkk",
  "panel": 2,
  "from": "2021-01-01T00:00:00Z",
  "to": "2021-01-01T01:00:00Z",
  "queries": [
    {
      "refId": "A",
      "expr": "rate(cpu_usage_seconds_total{instance=\"server01\"}[5m])",
      "datapoints": [
        {"timestamp": 1609459200000, "value": 0.23, "labels": {"instance": "server01", "cpu": "0"}},
        {"timestamp": 1609459230000, "value": 0.25, "labels": {"instance": "server01", "cpu": "0"}}
      ]
    },
    {
      "refId": "B",
      "expr": "memory_usage_bytes{instance=\"server01\"} / 1024 / 1024",
      "datapoints": [
        {"timestamp": 1609459200000, "value": 2048.5, "labels": {"instance": "server01"}},
        {"timestamp": 1609459230000, "value": 2050.2, "labels": {"instance": "server01"}}
      ]
    }
  ]
}
```

**Time Range Formats**

CLI supports Grafana's relative time syntax and absolute times:

| Input | Interpretation |
|-------|----------------|
| `now-1h` | 1 hour ago |
| `now-24h` | 24 hours ago |
| `now-7d` | 7 days ago |
| `now` | Current time |
| `2021-01-01T00:00:00Z` | ISO 8601 absolute time |
| `1609459200` | Unix timestamp (seconds) |

**Template Variables (Future)**

For MVP, template variables in queries are NOT substituted. If a query contains `$variable`, it will be sent as-is to Grafana (Grafana will handle substitution if variables are defined in dashboard context).

Future enhancement: `--var "variable=value"` flag to substitute before sending query.

**Test Cases (Contract Tests)**

1. **Single query**: POST /api/ds/query with one query returns 200 with one result
2. **Multiple queries**: POST /api/ds/query with two queries returns 200 with two results
3. **Invalid query syntax**: POST /api/ds/query with malformed expr returns 400 or partial error
4. **Unauthorized**: POST /api/ds/query (no auth) returns 401
5. **Datasource not found**: POST /api/ds/query with invalid datasource UID returns 404 or error
6. **Query timeout**: POST /api/ds/query with very long-running query returns 504 (if Grafana times out)

**References**

- Grafana v7.5 Datasource Query API: https://grafana.com/docs/grafana/v7.5/http_api/data_source/#query-a-data-source
- Grafana Data Frames: https://grafana.com/docs/grafana/v7.5/developers/plugins/data-frames/
