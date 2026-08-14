# Feature Specification: Datasource & Folder Listing

**Feature Branch**: `005-datasource-folder-list`
**Created**: 2026-08-14
**Status**: Draft
**Input**: User description: "新增兩個唯讀查詢指令到 grafana-cli：`datasource list` 和 `folder list`，讓使用者能查詢伺服器上已設定的 datasource 和 folder 清單，供 dashboard/alert/query 指令的 --folder 與 --datasource 參數使用"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Discover Available Folders (Priority: P1)

A user who wants to filter dashboards or alerts by folder (using the existing `--folder` option on `dashboard list` and `alert list`) currently has to already know the exact folder name, or guess and get an empty/error result. They want a quick way to see every folder that exists on the target server before filtering by it.

**Why this priority**: This is the simpler of the two capabilities (no special permission tier, smaller data shape) and directly unblocks an option (`--folder`) that already exists on two other commands today. It delivers immediate, low-risk value.

**Independent Test**: Can be fully tested by running the folder listing command against a server with several folders and confirming every folder's title and identifier is shown, then using one of the displayed titles with `dashboard list --folder <title>` and confirming it returns matching results.

**Acceptance Scenarios**:

1. **Given** a Grafana server with multiple folders, **When** the user runs the folder listing command, **Then** every folder is displayed with its title and identifier.
2. **Given** a Grafana server with no folders beyond the default root, **When** the user runs the command, **Then** the output clearly states no folders were found rather than showing a blank or error output.
3. **Given** the user targets a specific configured server (without changing their default), **When** they run the folder listing command against it, **Then** results reflect that server only.

---

### User Story 2 - Discover Available Datasources (Priority: P2)

A user who wants to run `query execute --datasource <name>` or simply understand which datasource powers a panel currently has no way to see the list of datasources configured on the server from the CLI. They want to list all datasources, their type, and which one is the default, so they can supply the correct value elsewhere.

**Why this priority**: Valuable but secondary to folders — it depends on a permission tier (Admin only) that not every user holds, so it's less universally usable and slightly riskier to get right (needs a clear message when the user lacks permission).

**Independent Test**: Can be fully tested by running the datasource listing command against a server with several datasources and confirming each one's name, type, and default indicator is shown, then using one of the returned names with `query execute --datasource <name>` and confirming it resolves correctly.

**Acceptance Scenarios**:

1. **Given** a Grafana server with multiple datasources configured, **When** the user runs the datasource listing command, **Then** every datasource is displayed with its name, type, and whether it is the default.
2. **Given** the user's credentials do not have sufficient permission to list datasources, **When** they run the command, **Then** they see a clear, actionable message explaining the permission gap rather than a raw/opaque error.
3. **Given** a Grafana server with no datasources configured, **When** the user runs the command, **Then** the output clearly states none were found rather than showing a blank or error output.

---

### Edge Cases

- What happens when the target server has zero folders (all dashboards live in the default root)?
- What happens when the target server has zero datasources configured?
- How does the system respond when the user's credentials only grant Viewer- or Editor-level access (both are below the Admin tier the datasource listing endpoint requires) and they run the datasource listing command?
- What happens when the user targets an unknown/unconfigured server name?
- How does the system respond when the target server is unreachable or the request times out?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a command that lists every folder on the target Grafana server, showing at minimum each folder's title and identifier.
- **FR-002**: System MUST provide a command that lists every datasource on the target Grafana server, showing at minimum each datasource's name, type, and whether it is the default.
- **FR-003**: Users MUST be able to target either listing command at any of their configured servers using the same per-command server-selection option already used by other commands, without changing their default active server.
- **FR-004**: Users MUST be able to request output from either listing command as machine-readable structured data, in addition to the default human-readable display, consistent with existing list-style commands.
- **FR-005**: System MUST show a clear, actionable message — not a generic or raw error — when the user's credentials lack sufficient permission to list datasources.
- **FR-006**: System MUST show a clear "none found" message — not a blank or ambiguous output — when a server has no folders or no datasources.
- **FR-007**: Both commands MUST behave consistently with existing list-style commands (`dashboard list`, `alert list`) in output formatting, error handling, and server-targeting conventions, so users do not need to learn a new interaction pattern.
- **FR-008**: Neither command MUST create, modify, or delete any folder, datasource, or other server data — both are strictly read-only.

### Key Entities

- **Folder**: A container that groups dashboards together on the Grafana server. Key attributes: title, identifier. Used today as an input to filtering dashboards and alerts.
- **Datasource**: A connection to a metrics/data backend configured on the Grafana server that dashboard panels and queries read from. Key attributes: name, type, whether it is the server's default datasource. Used today as an input to executing panel queries.

### Assumptions

- The target server has already been configured via the existing server-configuration workflow (`config set` / `config use`); neither new command configures a connection itself.
- The per-command server-selection option already available on other commands can be reused as-is for these two listings.
- "Default" datasource designation is a concept the server itself tracks and reports, not something this feature needs to compute.
- Both commands operate against a single target server per invocation, consistent with all existing commands (no cross-server aggregation).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can find the correct folder title to use with `--folder` in under 10 seconds, without needing to open the Grafana web UI.
- **SC-002**: A user can find the correct datasource name to use with `query execute --datasource` in under 10 seconds, without needing to open the Grafana web UI.
- **SC-003**: 100% of the output formatting and error-handling conventions match existing list commands, so a user familiar with `dashboard list` or `alert list` needs no new mental model to read the results.
- **SC-004**: Users with insufficient permission for the datasource listing receive a message that clearly explains the permission issue, measured by zero raw/opaque HTTP error text reaching the terminal.
