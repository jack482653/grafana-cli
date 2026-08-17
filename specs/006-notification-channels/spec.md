# Feature Specification: Alert Notification Channel Discovery

**Feature Branch**: `006-notification-channels`
**Created**: 2026-08-14
**Status**: Draft
**Input**: User description: "新增唯讀查詢指令 notification list 和 notification get，讓使用者查詢 Grafana 伺服器上設定的 alert notification channel（email/slack/webhook 等通知管道），補齊 alert list/get 缺少的通知路徑資訊"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Discover Alert Notification Channels (Priority: P1)

A user reviewing alerts with `alert list` / `alert get <id>` can see an alert's state and conditions, but has no way from the CLI to see _where_ that alert's notifications actually go (which email address, Slack channel, or webhook). They want to list all notification channels configured on the server, and look up one channel's full configuration by its identifier, so they can answer "where does this alert notify?" without opening the Grafana web UI.

**Why this priority**: This is the only user story in this feature — listing and viewing a single channel are two operations on the same resource (consistent with how `alert list`/`alert get` and `dashboard list`/`get` are each treated as one story). It directly completes the alert-visibility picture the CLI already provides.

**Independent Test**: Can be fully tested by running the channel listing command against a server with several notification channels and confirming each one's name, type, and default indicator is shown; then using one of the displayed identifiers with the detail command and confirming the full configuration (including type-specific settings) is shown. Also verified by confirming a Viewer-only credential sees a clear permission message instead of a raw error.

**Acceptance Scenarios**:

1. **Given** a Grafana server with multiple notification channels configured, **When** the user runs the channel listing command, **Then** every channel is displayed with its name, type, and whether it is the default.
2. **Given** a specific channel identifier from the listing, **When** the user runs the channel detail command with that identifier, **Then** the channel's full configuration is displayed, including its type-specific settings and whether reminders/resolve messages are enabled.
3. **Given** the user's credentials do not have sufficient permission to view notification channels, **When** they run either command, **Then** they see a clear, actionable message explaining the permission gap rather than a raw/opaque error.
4. **Given** a Grafana server with no notification channels configured, **When** the user runs the listing command, **Then** the output clearly states none were found rather than showing a blank or error output.
5. **Given** a channel identifier that does not exist on the server, **When** the user runs the detail command with that identifier, **Then** the output clearly states the channel was not found rather than a raw error.
6. **Given** the user targets a specific configured server (without changing their default), **When** they run either command against it, **Then** results reflect that server only.

---

### Edge Cases

- What happens when the target server has zero notification channels configured?
- How does the system respond when the user's credentials are below the required permission tier?
- What happens when a requested channel identifier does not exist on the server?
- What happens when the user targets an unknown/unconfigured server name?
- How does the system respond when the target server is unreachable or the request times out?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a command that lists every notification channel on the target Grafana server, showing at minimum each channel's name, type, and whether it is the default.
- **FR-002**: System MUST provide a command that shows the full configuration of a single notification channel by its identifier, including its type-specific settings and reminder/resolve-message behavior.
- **FR-003**: Users MUST be able to target either command at any of their configured servers using the same per-command server-selection option already used by other commands, without changing their default active server.
- **FR-004**: Users MUST be able to request output from either command as machine-readable structured data, in addition to the default human-readable display, consistent with existing list/get-style commands.
- **FR-005**: System MUST show a clear, actionable message — not a generic or raw error — when the user's credentials lack sufficient permission to view notification channels.
- **FR-006**: System MUST show a clear "none found" message — not a blank or ambiguous output — when a server has no notification channels configured.
- **FR-007**: System MUST show a clear "not found" message — not a raw error — when the requested channel identifier does not exist on the server.
- **FR-008**: Both commands MUST behave consistently with existing list/get-style commands (`alert list`/`alert get`) in output formatting, error handling, and server-targeting conventions, so users do not need to learn a new interaction pattern.
- **FR-009**: Neither command MUST create, modify, or delete any notification channel or other server data — both are strictly read-only.

### Key Entities

- **Notification Channel**: A configured destination Grafana sends alert notifications to (e.g. email, Slack, webhook, PagerDuty). Key attributes: name, type, whether it is the server's default channel, whether reminders are sent, whether resolve messages are suppressed, type-specific settings (e.g. an email address list), when it was created/last updated. Referenced today only indirectly — alert rules route to one or more of these channels, but the CLI currently has no way to inspect them.

### Assumptions

- The target server has already been configured via the existing server-configuration workflow (`config set` / `config use`); this feature does not configure a connection itself.
- The per-command server-selection option already available on other commands can be reused as-is for these two commands.
- Viewing notification channel configuration requires a permission tier above the most restricted (read-only) role; users without that tier will see a permission message rather than the data (see FR-005).
- Both commands operate against a single target server per invocation, consistent with all existing commands (no cross-server aggregation).
- Channel-specific settings that may contain secrets (e.g. webhook auth tokens) are returned by the server already redacted/excluded from the response; the CLI displays whatever the server returns without additional filtering.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can find the correct notification channel name or identifier in under 10 seconds, without needing to open the Grafana web UI.
- **SC-002**: 100% of the output formatting and error-handling conventions match the existing `alert list`/`alert get` commands, so a user familiar with those needs no new mental model to read the results.
- **SC-003**: Users with insufficient permission receive a message that clearly explains the permission issue, measured by zero raw/opaque HTTP error text reaching the terminal.
- **SC-004**: A user can determine which channel a given alert would notify by cross-referencing `alert get` output with the channel listing, without inspecting raw API responses or the Grafana web UI.
