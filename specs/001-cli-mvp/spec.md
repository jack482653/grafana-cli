# Feature Specification: Grafana CLI Core

**Feature Branch**: `001-cli-mvp`
**Created**: 2026-02-15
**Status**: Draft
**Input**: User description: "建立 grafana cli 程式，需要可以：1. 設定 grafana 伺服器的 URL 和認證資訊(選填)，並支援多組 config；2. 執行 grafana rest api 支援的查詢，例如：查詢 Dashboard、查詢 Panel、進行 query、查詢 alert 等等；3. 顯示 query 的查詢結果；4. 檢查 grafana 伺服器的狀態"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Server Configuration and Verification (Priority: P1) 🎯 MVP

**Scenario**: As a DevOps engineer, I need to configure access to my Grafana instances and verify connectivity before running queries.

**Why this priority**: Foundation for all other features. Without server configuration and connectivity verification, no other operations are possible.

**Independent Test**: Can be fully tested by configuring a server, verifying connection succeeds, and confirming configuration persists across CLI invocations.

**Acceptance Scenarios**:

1. **Given** no previous configuration exists, **When** I run `grafana-cli config set --url https://grafana.example.com --name production`, **Then** the configuration is saved and confirmed
2. **Given** a configured server, **When** I run `grafana-cli config set --url https://grafana.example.com --api-key abc123 --name production`, **Then** the API key is securely stored and associated with the server
3. **Given** multiple server configurations exist, **When** I run `grafana-cli config list`, **Then** all configured servers are displayed with their names and URLs (credentials masked)
4. **Given** a configured server, **When** I run `grafana-cli status --server production`, **Then** the CLI connects to Grafana and reports server health (version, database status, uptime)
5. **Given** invalid credentials, **When** I run `grafana-cli status`, **Then** the CLI reports authentication failure with clear error message

---

### User Story 2 - Dashboard Discovery and Exploration (Priority: P2)

**Scenario**: As a platform engineer, I need to list and search dashboards across my Grafana instances to understand what monitoring exists.

**Why this priority**: First read operation that provides value. Enables users to discover what data is available before executing complex queries.

**Independent Test**: Can be fully tested by listing dashboards, filtering by tags/folders, and viewing dashboard metadata without executing queries.

**Acceptance Scenarios**:

1. **Given** a configured Grafana server, **When** I run `grafana-cli dashboard list`, **Then** all dashboards are displayed with UID, title, tags, and folder
2. **Given** dashboards exist in multiple folders, **When** I run `grafana-cli dashboard list --folder "Infrastructure"`, **Then** only dashboards in that folder are shown
3. **Given** dashboards with tags, **When** I run `grafana-cli dashboard list --tag monitoring`, **Then** only dashboards tagged "monitoring" are displayed
4. **Given** a dashboard UID, **When** I run `grafana-cli dashboard get <uid>`, **Then** the complete dashboard definition is displayed including panels, queries, and variables
5. **Given** multiple Grafana servers configured, **When** I run `grafana-cli dashboard list --server staging`, **Then** dashboards from the staging server are listed

---

### User Story 3 - Data Query Execution (Priority: P3)

**Scenario**: As a site reliability engineer, I need to execute Grafana panel queries from the command line to retrieve metrics data for analysis and scripting.

**Why this priority**: Core value proposition - enables programmatic access to metrics data. Builds on dashboard discovery (P2) by allowing users to execute queries from discovered panels.

**Independent Test**: Can be fully tested by identifying a panel from a dashboard (P2), executing its query with time range parameters, and verifying metrics data is returned.

**Acceptance Scenarios**:

1. **Given** a dashboard UID and panel ID, **When** I run `grafana-cli query execute --dashboard <uid> --panel <id> --from "now-1h" --to "now"`, **Then** the panel's query is executed and results are displayed
2. **Given** query results, **When** I run `grafana-cli query execute --dashboard <uid> --panel <id> --output json`, **Then** results are formatted as JSON for programmatic consumption
3. **Given** a panel with multiple queries, **When** I run `grafana-cli query execute --dashboard <uid> --panel <id>`, **Then** all queries for that panel are executed and results are labeled by query ref ID
4. **Given** a panel with template variables, **When** I run `grafana-cli query execute --dashboard <uid> --panel <id> --var "server=web01"`, **Then** the query is executed with the specified variable value
5. **Given** a long-running query, **When** execution exceeds expected time, **Then** progress is shown on stderr and user can cancel with Ctrl+C

---

### User Story 4 - Alert Monitoring (Priority: P4)

**Scenario**: As an on-call engineer, I need to check active alerts and their status from the command line to quickly assess system health.

**Why this priority**: Valuable for incident response but not essential for MVP. Users can already access metrics data (P3) to build their own alerting logic if needed.

**Independent Test**: Can be fully tested by listing alerts, filtering by state/folder, and viewing alert details without modifying alert configurations.

**Acceptance Scenarios**:

1. **Given** a configured Grafana server, **When** I run `grafana-cli alert list`, **Then** all alerts are displayed with ID, title, state (alerting/ok/paused), and folder
2. **Given** active alerts, **When** I run `grafana-cli alert list --state alerting`, **Then** only alerts in "alerting" state are shown
3. **Given** an alert ID, **When** I run `grafana-cli alert get <id>`, **Then** the complete alert definition is displayed including conditions, notifications, and current state
4. **Given** alerts in multiple folders, **When** I run `grafana-cli alert list --folder "Production"`, **Then** only alerts in the Production folder are displayed

---

### Edge Cases

- **Configuration**: What happens when config file permissions are incorrect or directory doesn't exist?
- **Authentication**: How does the CLI handle expired API keys or revoked credentials?
- **Network failures**: How does the CLI behave when Grafana server is unreachable or times out?
- **Large result sets**: What happens when a dashboard list or query result exceeds memory limits?
- **Invalid input**: How does the CLI handle malformed dashboard UIDs, non-existent panel IDs, or invalid time ranges?
- **Multiple servers**: What happens when the same operation is requested across multiple servers simultaneously?
- **Concurrent operations**: How does the CLI handle multiple processes trying to modify configuration simultaneously?

## Requirements _(mandatory)_

### Functional Requirements

#### Configuration Management (P1)

- **FR-001**: System MUST allow users to configure Grafana server URL via CLI command
- **FR-002**: System MUST allow users to optionally configure authentication credentials (API key or basic auth)
- **FR-003**: System MUST support multiple named server configurations stored in `~/.grafana-cli/config.json`
- **FR-004**: System MUST provide commands to list, view, update, and delete server configurations
- **FR-005**: System MUST store credentials securely with appropriate file permissions (0600)
- **FR-006**: System MUST allow users to specify which server to use via `--server <name>` flag
- **FR-007**: System MUST use a default server when `--server` flag is not specified
- **FR-008**: System MUST validate server URL format and accessibility during configuration

#### Server Status (P1)

- **FR-009**: System MUST provide a command to check Grafana server health and connectivity
- **FR-010**: System MUST display server version, database status, and basic health metrics
- **FR-011**: System MUST report authentication status (valid/invalid/missing credentials)
- **FR-012**: System MUST provide meaningful error messages for connection failures

#### Dashboard Operations (P2)

- **FR-013**: System MUST provide a command to list all dashboards with UID, title, tags, and folder
- **FR-014**: System MUST support filtering dashboards by folder name
- **FR-015**: System MUST support filtering dashboards by tag
- **FR-016**: System MUST support searching dashboards by title (partial match)
- **FR-017**: System MUST provide a command to retrieve complete dashboard definition by UID
- **FR-018**: System MUST display panel information within dashboard details (panel ID, title, type, datasource)

#### Query Execution (P3)

- **FR-019**: System MUST provide a command to execute panel queries by dashboard UID and panel ID
- **FR-020**: System MUST support time range specification via `--from` and `--to` flags (absolute or relative)
- **FR-021**: System MUST support template variable substitution via `--var` flags
- **FR-022**: System MUST execute all queries within a panel if multiple exist
- **FR-023**: System MUST label query results by query ref ID (A, B, C, etc.)
- **FR-024**: System MUST support datasource query execution for Prometheus, Azure Monitor, and GCP monitoring
- **FR-025**: System MUST handle long-running queries with timeout and cancellation support

#### Alert Operations (P4)

- **FR-026**: System MUST provide a command to list all alerts with ID, title, state, and folder
- **FR-027**: System MUST support filtering alerts by state (alerting/ok/paused/pending)
- **FR-028**: System MUST support filtering alerts by folder name
- **FR-029**: System MUST provide a command to retrieve alert details by ID including conditions and notification settings

#### Output Formatting (All Priorities)

- **FR-030**: System MUST support human-readable output format by default (tables, formatted text)
- **FR-031**: System MUST support JSON output format via `--json` or `--output json` flag
- **FR-032**: System MUST write data output to stdout
- **FR-033**: System MUST write error messages to stderr
- **FR-034**: System MUST exit with code 0 on success, 1 on general error, 2 on authentication error, 3 on network error
- **FR-035**: System MUST display progress indicators on stderr for operations taking longer than 1 second

### Key Entities

- **Server Configuration**: Represents a Grafana server connection (name, URL, credentials, default flag)
- **Dashboard**: Grafana dashboard entity (UID, title, tags, folder, panels, variables)
- **Panel**: Dashboard panel entity (ID, title, type, datasource, queries)
- **Query**: Datasource query entity (ref ID, datasource type, query expression, time range)
- **Alert**: Grafana alert entity (ID, title, state, folder, conditions, notifications)
- **Query Result**: Time series data returned from query execution (timestamps, values, labels/tags)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can configure a Grafana server and verify connectivity in under 30 seconds
- **SC-002**: Users can discover and list all dashboards from a Grafana instance with 100+ dashboards in under 5 seconds
- **SC-003**: Users can execute a panel query and retrieve results in under 10 seconds for typical time ranges (1-24 hours)
- **SC-004**: CLI supports at least 3 different Grafana datasource types (Prometheus, Azure Monitor, GCP)
- **SC-005**: All CLI commands complete within 5 seconds for typical use cases (excluding large data queries)
- **SC-006**: CLI memory usage remains under 100MB during normal operations
- **SC-007**: 95% of errors include actionable error messages directing users to next steps
- **SC-008**: Users can successfully switch between multiple configured Grafana servers without reconfiguration

## Assumptions

1. **Grafana Version**: Target Grafana v7.5 HTTP API (as specified in project context)
2. **Authentication**: Support API key and basic auth; OAuth/SSO not required for MVP
3. **Datasources**: Focus on Prometheus, Azure Monitor, and GCP monitoring datasources (common in target user environments)
4. **Time Ranges**: Support Grafana's relative time syntax (now-1h, now-24h) and ISO 8601 absolute times
5. **Configuration Storage**: Use JSON file format at `~/.grafana-cli/config.json` (aligned with project decisions)
6. **Network**: Assume HTTPS connections; HTTP supported but not recommended (warn user)
7. **Concurrency**: Single-user, single-process model for MVP; concurrent access to config file not supported
8. **Error Handling**: Fail fast with clear messages; no automatic retry logic for MVP
9. **Platform**: Primary support for macOS and Linux; Windows support via Git Bash or WSL
10. **Dependencies**: Leverage existing libraries (axios for HTTP, commander for CLI) rather than building from scratch

## Out of Scope (for MVP)

- **Write operations**: Creating, updating, or deleting dashboards, panels, or alerts
- **Snapshot management**: Creating or managing dashboard snapshots
- **Annotation management**: Viewing or creating annotations
- **User/team management**: Managing Grafana users, teams, or permissions
- **Datasource management**: Adding, modifying, or testing datasources
- **Plugin management**: Installing or configuring Grafana plugins
- **Advanced query features**: Query result transformation, aggregation, or custom formatting
- **Interactive mode**: TUI (Text User Interface) or interactive prompts beyond error recovery
- **Caching**: Local caching of dashboard metadata or query results (may add in future)
- **Batch operations**: Executing queries across multiple dashboards or servers in parallel
- **Export/Import**: Exporting dashboards or query results to files (use shell redirection instead)

## Technical Constraints

- **Grafana API Version**: Must maintain compatibility with Grafana v7.5 HTTP API
- **Node.js Version**: Minimum Node.js 18+ (LTS)
- **Module System**: ESM (import/export) not CommonJS (require)
- **CLI Framework**: commander.js for argument parsing
- **HTTP Client**: axios for REST API calls
- **Configuration Format**: JSON (not YAML or TOML)
- **Output Protocol**: Follow CLI-First Interface principle (stdin/args → stdout, errors → stderr)
- **Architecture**: Follow Clean Architecture & SOLID principles (constitution principle III)
- **Testing**: Contract tests required for Grafana API endpoints, integration tests for user journeys (constitution principle IV)
- **Performance**: 5-second response time, 100MB memory limit (constitution principle V)

## Dependencies

- **Grafana Server**: Requires accessible Grafana v7.5+ instance with HTTP API enabled
- **Network**: Requires network connectivity to Grafana server(s)
- **Node.js**: Requires Node.js 18+ runtime environment
- **File System**: Requires write permissions to `~/.grafana-cli/` directory for configuration storage
- **API Access**: Requires valid Grafana API key or user credentials with appropriate permissions

## Security Considerations

- **Credential Storage**: API keys and passwords stored in `~/.grafana-cli/config.json` with file permissions 0600 (owner read/write only)
- **Credential Display**: Never display full credentials in logs, output, or error messages (mask with `***`)
- **HTTPS**: Warn users when connecting to HTTP (non-TLS) Grafana servers
- **API Key Scope**: Document recommended API key permissions (Viewer role sufficient for read operations)
- **Error Messages**: Avoid leaking sensitive information (credentials, internal paths) in error output
- **Input Validation**: Sanitize user input (URLs, dashboard UIDs) to prevent injection attacks
