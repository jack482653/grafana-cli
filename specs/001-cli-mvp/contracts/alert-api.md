# API Contract: Grafana Alert API

**Feature**: 001-cli-mvp
**API Version**: Grafana v7.5
**Base URL**: `{server_url}/api`

## Purpose

Alert endpoints support listing and retrieving alert definitions and their current state. Used by `grafana-cli alert` commands (FR-026 to FR-029).

---

## GET /api/alerts

**Description**: Get all alerts with optional filtering by state, dashboard, folder, or query.

**Authentication**: Required (API key or basic auth)

**Query Parameters**

| Parameter     | Type     | Required | Description                                                                                       |
| ------------- | -------- | -------- | ------------------------------------------------------------------------------------------------- |
| `state`       | `string` | No       | Filter by alert state: "all", "no_data", "paused", "alerting", "ok", "pending", "execution_error" |
| `query`       | `string` | No       | Search query (matches alert name, partial match)                                                  |
| `dashboardId` | `number` | No       | Filter by dashboard ID                                                                            |
| `panelId`     | `number` | No       | Filter by panel ID                                                                                |
| `folderId`    | `number` | No       | Filter by folder ID                                                                               |
| `limit`       | `number` | No       | Max results to return (default: 1000)                                                             |

**Request Examples**

```http
# List all alerts
GET /api/alerts HTTP/1.1
Host: grafana.example.com
Authorization: Bearer <api-key>
Accept: application/json

# Filter by state (alerting only)
GET /api/alerts?state=alerting HTTP/1.1

# Search by name
GET /api/alerts?query=cpu HTTP/1.1

# Filter by dashboard
GET /api/alerts?dashboardId=123 HTTP/1.1
```

**Success Response (200 OK)**

```json
[
  {
    "id": 1,
    "dashboardId": 123,
    "dashboardUId": "cIBgcSjkk",
    "dashboardSlug": "infrastructure-dashboard",
    "panelId": 2,
    "name": "CPU Usage High",
    "state": "alerting",
    "newStateDate": "2021-06-15T10:30:00Z",
    "evalDate": "2021-06-15T10:30:00Z",
    "evalData": {
      "evalMatches": [
        {
          "value": 85.5,
          "metric": "cpu_usage",
          "tags": { "instance": "server01" }
        }
      ]
    },
    "executionError": "",
    "url": "/d/cIBgcSjkk/infrastructure-dashboard?viewPanel=2",
    "folderTitle": "Production"
  },
  {
    "id": 2,
    "dashboardId": 123,
    "dashboardUId": "cIBgcSjkk",
    "dashboardSlug": "infrastructure-dashboard",
    "panelId": 3,
    "name": "Memory Usage High",
    "state": "ok",
    "newStateDate": "2021-06-15T09:00:00Z",
    "evalDate": "2021-06-15T10:30:00Z",
    "evalData": null,
    "executionError": "",
    "url": "/d/cIBgcSjkk/infrastructure-dashboard?viewPanel=3",
    "folderTitle": "Production"
  },
  {
    "id": 3,
    "dashboardId": 456,
    "dashboardUId": "xyz789",
    "dashboardSlug": "application-metrics",
    "panelId": 5,
    "name": "API Response Time",
    "state": "paused",
    "newStateDate": "2021-06-14T18:00:00Z",
    "evalDate": "2021-06-14T18:00:00Z",
    "evalData": null,
    "executionError": "",
    "url": "/d/xyz789/application-metrics?viewPanel=5",
    "folderTitle": "Production"
  }
]
```

**Response Fields**

| Field            | Type     | Description                                   |
| ---------------- | -------- | --------------------------------------------- |
| `id`             | `number` | Alert ID                                      |
| `dashboardId`    | `number` | Dashboard ID containing alert                 |
| `dashboardUId`   | `string` | Dashboard UID                                 |
| `dashboardSlug`  | `string` | Dashboard URL slug                            |
| `panelId`        | `number` | Panel ID containing alert                     |
| `name`           | `string` | Alert name                                    |
| `state`          | `string` | Current alert state (see Alert States below)  |
| `newStateDate`   | `string` | ISO 8601 timestamp of last state change       |
| `evalDate`       | `string` | ISO 8601 timestamp of last evaluation         |
| `evalData`       | `object` | Evaluation data (matches, values) if alerting |
| `executionError` | `string` | Error message if state is "execution_error"   |
| `url`            | `string` | Relative URL to dashboard panel               |
| `folderTitle`    | `string` | Folder name containing dashboard              |

**Alert States**

| State             | Description                                   |
| ----------------- | --------------------------------------------- |
| `ok`              | Alert condition is not met                    |
| `alerting`        | Alert condition is met (firing)               |
| `pending`         | Alert condition met but within pending period |
| `paused`          | Alert evaluation paused by user               |
| `no_data`         | No data received from datasource              |
| `execution_error` | Error executing alert query                   |

**Error Responses**

| Status                    | Description                | Response Body                          |
| ------------------------- | -------------------------- | -------------------------------------- |
| 401 Unauthorized          | Invalid or missing API key | `{"message": "Unauthorized"}`          |
| 403 Forbidden             | Insufficient permissions   | `{"message": "Permission denied"}`     |
| 500 Internal Server Error | Server error               | `{"message": "Internal server error"}` |

**CLI Mapping**

- Command: `grafana-cli alert list [--state <state>] [--folder <name>]`
- Output: Table with ID, name, state, dashboard, folder

**Example CLI Output**

```text
Alerts (3 total)

ID   NAME                  STATE      DASHBOARD                   FOLDER
1    CPU Usage High        alerting   Infrastructure Dashboard    Production
2    Memory Usage High     ok         Infrastructure Dashboard    Production
3    API Response Time     paused     Application Metrics         Production
```

**Example CLI Output (Filtered by state)**

```bash
$ grafana-cli alert list --state alerting

Alerts in 'alerting' state (1 total)

ID   NAME                  DASHBOARD                   FOLDER      EVAL DATE
1    CPU Usage High        Infrastructure Dashboard    Production  2021-06-15 10:30:00
```

---

## GET /api/alerts/:id

**Description**: Get alert details by ID. Returns full alert configuration including conditions, notifications, and evaluation history.

**Authentication**: Required (API key or basic auth)

**Path Parameters**

| Parameter | Type     | Required | Description |
| --------- | -------- | -------- | ----------- |
| `id`      | `number` | Yes      | Alert ID    |

**Request**

```http
GET /api/alerts/1 HTTP/1.1
Host: grafana.example.com
Authorization: Bearer <api-key>
Accept: application/json
```

**Success Response (200 OK)**

```json
{
  "id": 1,
  "dashboardId": 123,
  "dashboardUId": "cIBgcSjkk",
  "dashboardSlug": "infrastructure-dashboard",
  "panelId": 2,
  "name": "CPU Usage High",
  "state": "alerting",
  "newStateDate": "2021-06-15T10:30:00Z",
  "evalDate": "2021-06-15T10:30:00Z",
  "evalData": {
    "evalMatches": [
      {
        "value": 85.5,
        "metric": "cpu_usage",
        "tags": { "instance": "server01" }
      }
    ]
  },
  "executionError": "",
  "url": "/d/cIBgcSjkk/infrastructure-dashboard?viewPanel=2",
  "message": "CPU usage exceeded 80% threshold",
  "settings": {
    "conditions": [
      {
        "evaluator": {
          "params": [80],
          "type": "gt"
        },
        "operator": {
          "type": "and"
        },
        "query": {
          "params": ["A", "5m", "now"]
        },
        "reducer": {
          "params": [],
          "type": "avg"
        },
        "type": "query"
      }
    ],
    "executionErrorState": "alerting",
    "frequency": "60s",
    "handler": 1,
    "name": "CPU Usage High",
    "noDataState": "no_data",
    "notifications": [{ "uid": "slack-notifier" }]
  },
  "folderTitle": "Production"
}
```

**Response Fields (Extended)**

Additional fields beyond GET /api/alerts:

| Field                          | Type     | Description                                                |
| ------------------------------ | -------- | ---------------------------------------------------------- |
| `message`                      | `string` | Alert message/description                                  |
| `settings`                     | `object` | Alert configuration (conditions, frequency, notifications) |
| `settings.conditions`          | `array`  | Alert condition rules                                      |
| `settings.frequency`           | `string` | Evaluation frequency (e.g., "60s", "5m")                   |
| `settings.noDataState`         | `string` | State when no data ("no_data", "alerting", "ok")           |
| `settings.executionErrorState` | `string` | State when execution fails                                 |
| `settings.notifications`       | `array`  | Notification channels (UIDs)                               |

**Error Responses**

| Status           | Description                | Response Body                      |
| ---------------- | -------------------------- | ---------------------------------- |
| 401 Unauthorized | Invalid or missing API key | `{"message": "Unauthorized"}`      |
| 404 Not Found    | Alert ID not found         | `{"message": "Alert not found"}`   |
| 403 Forbidden    | Insufficient permissions   | `{"message": "Permission denied"}` |

**CLI Mapping**

- Command: `grafana-cli alert get <id>`
- Output: Formatted text with alert details, conditions, notifications

**Example CLI Output**

```text
Alert: CPU Usage High (ID: 1)
Dashboard: Infrastructure Dashboard (cIBgcSjkk)
Panel: 2
Folder: Production
State: alerting (since 2021-06-15 10:30:00)

Message:
  CPU usage exceeded 80% threshold

Condition:
  Query A (avg over 5m) > 80

Evaluation:
  Frequency: 60s
  Last eval: 2021-06-15 10:30:00
  Current value: 85.5 (instance=server01)

Notifications:
  - slack-notifier

States:
  No data: no_data
  Execution error: alerting
```

**Test Cases (Contract Tests)**

1. **List all alerts**: GET /api/alerts returns 200 with array of alerts
2. **Filter by state (alerting)**: GET /api/alerts?state=alerting returns only alerting alerts
3. **Filter by state (ok)**: GET /api/alerts?state=ok returns only ok alerts
4. **Filter by state (paused)**: GET /api/alerts?state=paused returns only paused alerts
5. **Search by name**: GET /api/alerts?query=cpu returns alerts matching "cpu"
6. **Filter by dashboard**: GET /api/alerts?dashboardId=123 returns alerts from dashboard 123
7. **Get alert by ID**: GET /api/alerts/1 returns 200 with full alert details
8. **Alert not found**: GET /api/alerts/9999 returns 404
9. **Unauthorized**: GET /api/alerts (no auth) returns 401

**References**

- Grafana v7.5 Alert API: https://grafana.com/docs/grafana/v7.5/http_api/alerting/
