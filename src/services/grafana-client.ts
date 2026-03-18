import axios, { type AxiosError, type AxiosInstance } from "axios";

import type { Dashboard, QueryResult, ServerConfig, ServerStatus, TimeSeries } from "../types/index.js";

/**
 * Create axios HTTP client for Grafana API
 */
export function createClient(config: ServerConfig): AxiosInstance {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add authentication headers
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  } else if (config.username && config.password) {
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  return axios.create({
    baseURL: config.url,
    timeout: config.timeout || 30000,
    headers,
  });
}

/**
 * Handle HTTP errors with meaningful messages
 */
export function handleError(error: unknown, serverUrl: string): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // Authentication errors
    if (axiosError.response?.status === 401) {
      console.error("Error: Authentication failed.");
      console.error(`Server: ${serverUrl}`);
      console.error("Check your API key or credentials with: grafana-cli config list");
      process.exit(2); // Exit code 2 = auth error
    }

    if (axiosError.response?.status === 403) {
      console.error("Error: Permission denied.");
      console.error(`Server: ${serverUrl}`);
      console.error("Your credentials do not have sufficient permissions.");
      process.exit(2); // Exit code 2 = auth error
    }

    // Network errors
    if (axiosError.code === "ECONNREFUSED") {
      console.error("Error: Cannot connect to Grafana server.");
      console.error(`URL: ${serverUrl}`);
      console.error("Check if Grafana is running and the URL is correct.");
      process.exit(3); // Exit code 3 = network error
    }

    if (axiosError.code === "ETIMEDOUT") {
      console.error("Error: Connection timeout.");
      console.error(`Server: ${serverUrl}`);
      console.error("Grafana server did not respond in time.");
      process.exit(3); // Exit code 3 = network error
    }

    // Other HTTP errors
    if (axiosError.response) {
      console.error(`Error: HTTP ${axiosError.response.status}`);
      console.error(`Server: ${serverUrl}`);
      if (axiosError.response.data) {
        console.error(`Message: ${JSON.stringify(axiosError.response.data)}`);
      }
      process.exit(1); // Exit code 1 = general error
    }
  }

  // Unknown errors
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

/**
 * Get server status from Grafana health API
 */
export async function getServerStatus(config: ServerConfig): Promise<ServerStatus> {
  const client = createClient(config);

  try {
    const response = await client.get<ServerStatus>("/api/health");
    return response.data;
  } catch (error) {
    handleError(error, config.url);
  }
}

/**
 * List dashboards from Grafana search API
 */
export async function listDashboards(
  config: ServerConfig,
  filters: { folder?: string; tag?: string; query?: string } = {},
): Promise<Dashboard[]> {
  const client = createClient(config);

  const params: Record<string, string> = { type: "dash-db" };
  if (filters.query) params["query"] = filters.query;
  if (filters.tag) params["tag"] = filters.tag;

  try {
    const response = await client.get<any[]>("/api/search", { params });
    let results = response.data;

    // Filter by folder name client-side (API only supports folderIds)
    if (filters.folder) {
      const folderLower = filters.folder.toLowerCase();
      results = results.filter(
        (d) => d.folderTitle?.toLowerCase().includes(folderLower),
      );
    }

    return results.map((d) => ({
      uid: d.uid,
      title: d.title,
      tags: d.tags || [],
      folderTitle: d.folderTitle,
      url: d.url,
    }));
  } catch (error) {
    handleError(error, config.url);
  }
}

/**
 * Get a full dashboard definition by UID
 */
export async function getDashboard(config: ServerConfig, uid: string): Promise<Dashboard> {
  const client = createClient(config);

  try {
    const response = await client.get<{ dashboard: any; meta: any }>(
      `/api/dashboards/uid/${uid}`,
    );
    const { dashboard, meta } = response.data;

    return {
      uid: dashboard.uid,
      title: dashboard.title,
      tags: dashboard.tags || [],
      folderTitle: meta.folderTitle,
      url: meta.url,
      panels: (dashboard.panels || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        datasource: p.datasource,
        targets: (p.targets || []).map((t: any) => ({
          refId: t.refId,
          datasource: t.datasource,
          expr: t.expr,
          query: t.query,
          queryType: t.queryType,
        })),
      })),
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.error(`Error: Dashboard not found: ${uid}`);
      console.error("List available dashboards with: grafana-cli dashboard list");
      process.exit(1);
    }
    handleError(error, config.url);
  }
}

/**
 * Resolve a datasource reference to an object with { type, uid }.
 *
 * Grafana v7.5 panels store datasource as a plain string name (e.g. "Prometheus")
 * or null (= default), but POST /api/ds/query requires { type, uid }.
 */
async function resolveDatasource(
  client: AxiosInstance,
  datasource: string | { type?: string; uid?: string } | null | undefined,
): Promise<{ type?: string; uid: string } | undefined> {
  // Already has uid — use as-is
  if (datasource && typeof datasource === "object" && datasource.uid) {
    return datasource as { type?: string; uid: string };
  }

  // String name — look up by name
  if (typeof datasource === "string" && datasource) {
    try {
      const resp = await client.get<any>(
        `/api/datasources/name/${encodeURIComponent(datasource)}`,
      );
      return { type: resp.data.type, uid: resp.data.uid };
    } catch {
      return undefined;
    }
  }

  // null / undefined — find default datasource
  try {
    const resp = await client.get<any[]>("/api/datasources");
    const ds = resp.data.find((d: any) => d.isDefault) ?? resp.data[0];
    if (ds) return { type: ds.type, uid: ds.uid };
  } catch {
    // ignore
  }

  return undefined;
}

/**
 * Execute panel queries via Grafana datasource proxy (POST /api/ds/query)
 */
export async function executeQuery(
  config: ServerConfig,
  dashboardUid: string,
  panelId: number,
  timeRange: { from: number; to: number },
  variables: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<QueryResult[]> {
  const dashboard = await getDashboard(config, dashboardUid);
  const panel = (dashboard.panels || []).find((p) => p.id === panelId);

  if (!panel) {
    console.error(`Error: Panel ${panelId} not found in dashboard "${dashboard.title}"`);
    console.error("List panels with: grafana-cli dashboard get " + dashboardUid);
    process.exit(1);
  }

  if (!panel.targets || panel.targets.length === 0) {
    console.error(`Error: Panel ${panelId} has no queries.`);
    process.exit(1);
  }

  const client = createClient(config);

  // Resolve panel-level datasource once (fallback for targets without their own)
  const panelDs = await resolveDatasource(client, panel.datasource);

  const applyVars = (s?: string) =>
    s?.replace(/\$(\w+)/g, (_, name: string) => variables[name] ?? `$${name}`);

  // Resolve each target's datasource, falling back to panel's
  const queries = await Promise.all(
    panel.targets.map(async (target) => {
      const ds = (await resolveDatasource(client, target.datasource)) ?? panelDs;
      return {
        refId: target.refId,
        datasource: ds,
        expr: applyVars(target.expr),
        query: applyVars(target.query),
        queryType: target.queryType,
        instant: false,
        range: true,
        intervalMs: 30000,
        maxDataPoints: 1000,
      };
    }),
  );

  let rawResults: Record<string, any>;
  try {
    const response = await client.post<{ results: Record<string, any> }>(
      "/api/ds/query",
      {
        queries,
        from: String(timeRange.from),
        to: String(timeRange.to),
      },
      { signal },
    );
    rawResults = response.data.results;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      console.error("Error: Query syntax error.");
      if (error.response.data?.message) {
        console.error(`Message: ${error.response.data.message}`);
      }
      process.exit(1);
    }
    handleError(error, config.url);
  }

  // Parse frames into QueryResult[]
  return Object.entries(rawResults).map(([refId, result]) => {
    if (result.error) {
      console.error(`Warning: Query ${refId} failed: ${result.error}`);
      return { refId, series: [] };
    }

    const series: TimeSeries[] = [];
    for (const frame of result.frames || []) {
      const fields: any[] = frame.schema?.fields || [];
      const values: any[][] = frame.data?.values || [];
      const timestamps: number[] = values[0] || [];

      // Each field after the first Time field is a value series
      for (let i = 1; i < fields.length; i++) {
        const field = fields[i];
        series.push({
          name: field.name || frame.schema?.name || refId,
          labels: field.labels || {},
          datapoints: timestamps.map((ts, idx) => ({
            timestamp: ts,
            value: values[i]?.[idx] ?? null,
          })),
        });
      }
    }

    return { refId, series };
  });
}
