# Research: Alert Notification Channel Discovery

**Branch**: `006-notification-channels` | **Date**: 2026-08-14

## Decision Log

### 1. Endpoint choice: `/api/alert-notifications` vs `/api/alert-notifications/lookup`

**Decision**: Use `GET /api/alert-notifications` (list) and `GET /api/alert-notifications/:id` (detail) for the new commands.

**Rationale**: Grafana v7.5 exposes two shapes for this resource:

- `GET /api/alert-notifications` / `GET /api/alert-notifications/:id` / `GET /api/alert-notifications/uid/:uid` — full detail: `id, uid, name, type, isDefault, sendReminder, disableResolveMessage, frequency, created, updated, settings, secureFields`. Requires **Editor or Admin** role.
- `GET /api/alert-notifications/lookup` — reduced shape: `id, uid, name, type, isDefault` only. Accessible to **any authenticated role including Viewer**.

The reduced `/lookup` endpoint exists specifically to power Grafana's own alert-rule-editing UI (picking a channel by name), not for inspecting a channel's actual configuration. Since this feature's stated purpose is "where does this alert notify and how is it configured" (spec.md SC-004), the full endpoint is the only one that can answer the "how is it configured" half — the lookup shape has no `settings` field at all. Building the discovery command on the thinner, Viewer-accessible endpoint would mean the `get` command could never show what actually matters (e.g. the email address list, the Slack webhook URL's presence).

**Trade-off accepted**: This means Viewer-only credentials cannot use either new command — this is called out explicitly in the spec (FR-005, Edge Cases) rather than silently avoided, matching the 005 feature's precedent for `datasource list`.

**Alternatives considered**:

- Use `/lookup` for `list` and the full endpoint only for `get`: Rejected — inconsistent permission requirements between the two sub-commands of the same feature would be confusing (a user could list channels then get 403 on every `get`, or vice versa if reversed). A single, consistent permission tier across both operations is simpler to document and reason about (constitution Principle I: MVP-First — don't add a permission-tier branch not required by any stated need).
- Use `/lookup` for both, omitting the `settings`/`sendReminder`/`disableResolveMessage`/`created`/`updated` fields entirely: Rejected — defeats the stated purpose (SC-004) of understanding a channel's actual notification behavior, not just its name.

### 2. Permission claim verified empirically before writing the spec

**Decision**: Test the actual permission behavior against a live Grafana 7.5.0 container (Admin/Editor/Viewer API keys) _before_ writing spec.md, rather than relying on documentation prose or assumption.

**Rationale**: The immediately preceding feature (005-datasource-folder-list) shipped with an incorrect assumption — "Editor or Admin" for `GET /api/datasources` — that turned out to be Admin-only, discovered only after a second `/code-review` pass and live-server verification post-implementation. To avoid repeating that, this feature's permission model was verified first:

```
GET /api/alert-notifications        → Viewer: 403, Editor: 200, Admin: 200
GET /api/alert-notifications/:id    → Viewer: 403, Editor: 200, Admin: 200
GET /api/alert-notifications/lookup → Viewer: 200, Editor: 200, Admin: 200
```

This time "Editor or Admin" for the full endpoints is confirmed correct — the two resources (`/api/datasources` and `/api/alert-notifications`) simply have different permission models in Grafana (the former restricts to Admin only because responses can include datasource credentials/passwords; the latter allows Editor because notification-channel settings, while sensitive, are considered an editing concern rather than an admin-only secret in Grafana's default RBAC).

**Alternatives considered**:

- Trust the Grafana v7.5 HTTP API docs prose without live verification: Rejected — this is exactly what went wrong in 005; a documentation summary (even from an official source) can be imprecise or the small-model summarization of it can be wrong, and empirical verification against the actual target version is cheap (a few `curl` calls against a disposable Docker container) relative to the cost of shipping a wrong error message into every layer of the feature's documentation.

### 3. Type naming and shape

**Decision**: Two new types — `NotificationChannel` (list shape) and `NotificationChannelDetail` (get shape) — mirroring the existing `Alert` / `AlertDetail` split.

**Rationale**: The project already has this exact pattern for alerts: `Alert` (list-shape, lighter) vs `AlertDetail` (get-shape, richer, includes `conditions`). Notification channels have the same shape split (list omits `settings`/`sendReminder`/etc.), so reusing the established naming convention (`X` / `XDetail`) keeps the codebase's mental model consistent rather than introducing a third naming pattern (as 005 did with `DatasourceInfo`, which was necessary there only because `Datasource` was already taken by an unrelated reference type — no such collision exists here).

**Alternatives considered**:

- Single `NotificationChannel` type with all fields optional: Rejected — loses the type-level signal that `list` results won't have `settings` populated, which the `Alert`/`AlertDetail` split already established as this codebase's convention for exactly this situation.
