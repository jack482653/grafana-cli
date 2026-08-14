# Research: Datasource & Folder Listing

**Branch**: `005-datasource-folder-list` | **Date**: 2026-08-14

## Decision Log

### 1. Datasource listing endpoint: `/api/datasources` vs `/api/frontend/settings`

**Decision**: Use `GET /api/datasources` for the new `datasource list` command.

**Rationale**: The project already calls `GET /api/frontend/settings` internally (`fetchDatasourceMap()` in `grafana-client.ts`) to resolve a datasource name to its numeric ID for query execution — it's Viewer-accessible and already proven reliable. However, it is an internal/undocumented endpoint (not listed in the official v7.5 HTTP API reference) and its shape (`Record<name, {id, type, isDefault}>`) omits fields a user browsing datasources would want (e.g. explicit default flag reads from a dict scan, no room to add more fields later without reshaping the internal map). `GET /api/datasources` is the documented, first-class API for this purpose and returns a complete, self-describing array. Building a user-facing discovery command on the internal endpoint would mean the command's behavior is an accident of another feature's implementation, not a supported contract.

**Trade-off accepted**: `GET /api/datasources` requires Editor/Admin role (per Grafana v7.5 docs), so Viewer-only credentials will see a permission error. This is called out explicitly in the spec (FR-005, Edge Cases) rather than silently avoided.

**Alternatives considered**:

- Reuse `/api/frontend/settings` (Viewer-accessible): Rejected — undocumented endpoint, thinner data, and permission errors would just move to whatever the user's _next_ Editor-gated action is instead of being surfaced clearly at the point of listing.
- Query both endpoints and merge: Rejected as premature — no requirement calls for Viewer-level datasource listing; adds complexity (constitution Principle I: MVP-First) without a demonstrated need.

### 2. Folder listing: new endpoint vs. exposing existing internal call

**Decision**: Add a new exported `listFolders()` in `grafana-client.ts` calling the same `GET /api/folders` endpoint already used internally by `resolveFolderId()` (used by `alert list --folder`).

**Rationale**: No new endpoint needed — `GET /api/folders` already returns everything the spec asks for (title, id; v7.5 also includes uid). The existing internal helper (`resolveFolderId`) is narrowly scoped (name → id lookup, swallows the response into a single number) and shouldn't be repurposed for a full-listing command; a small independent function keeps both call sites simple or aligned with Single Responsibility Principle (constitution Principle III).

**Alternatives considered**:

- Refactor `resolveFolderId()` to build on a shared `listFolders()`: Reasonable but out of scope for this feature (constitution Principle I: don't add refactors "for future use" unless it removes real duplication). Left as a natural follow-up noted in Assumptions rather than done speculatively here — the two call sites currently have different needs (one wants a single id by name; one wants the full array) and forcing them through one function today would only save a few lines.

### 3. Type naming: avoiding collision with existing `Datasource` interface

**Decision**: Name the new full-listing type `DatasourceInfo`, not `Datasource`.

**Rationale**: `src/types/index.ts` already exports `Datasource` as a lightweight reference type embedded in `Panel`/`Query` (`{type?, uid?, id?}`), used when describing which datasource a dashboard panel points to. The new command's data is a different, richer shape (`{id, uid, name, type, isDefault}`) representing a datasource _as a top-level resource_, not a reference. Reusing the name would either force an incompatible shape change onto existing panel-parsing code or require an awkward union type. A distinct name keeps both concerns clean (Interface Segregation — constitution Principle III).

**Alternatives considered**:

- Extend existing `Datasource` with optional fields: Rejected — panel/query code destructures `Datasource` expecting an optional reference; adding required-in-context fields like `name`/`isDefault` blurs two different concepts under one type.

### 4. Folder entity `uid` field availability in v7.5

**Decision**: Include `uid` in the `Folder` type and table output.

**Rationale**: Grafana v7.5's `GET /api/folders` response includes `uid` alongside `id` and `title` (folder UIDs were introduced ahead of full folder-permission features and are present in v7.5). Surfacing it costs nothing and gives users a stable identifier that survives folder renames, consistent with how `Dashboard.uid` is already the preferred identifier elsewhere in the CLI.

**Alternatives considered**:

- Omit `uid`, show only `id`/`title`: Rejected — inconsistent with the rest of the CLI's uid-first convention (dashboards already use uid as the primary identifier).
