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
 * Resolve a datasource string name to its numeric id via /api/datasources/name/:name.
 * Returns undefined if the API call fails (e.g. insufficient permissions).
 */
async function resolveDatasourceId(
  client: AxiosInstance,
  name: string,
): Promise<number | undefined> {
  try {
    const resp = await client.get<any>(`/api/datasources/name/${encodeURIComponent(name)}`);
    return resp.data.id as number;
  } catch {
    return undefined;
  }
}

/**
 * Execute panel queries via Grafana v7.5 legacy endpoint (POST /api/tsdb/query).
 *
 * The newer /api/ds/query endpoint requires datasource UIDs which were introduced
 * in Grafana 8.x. For v7.5 compatibility we use /api/tsdb/query with datasourceId
 * (numeric). Response format: results[refId].series[].{ name, points: [value, ts][] }
 */
export async function executeQuery(
  config: ServerConfig,
  dashboardUid: string,
  panelId: number,
  timeRange: { from: number; to: number },
  variables: Record<string, string> = {},
  signal?: AbortSignal,
  datasourceOverride?: string,
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

  // Resolve datasource to numeric id
  let datasourceId: number | undefined;

  if (datasourceOverride) {
    if (/^\d+$/.test(datasourceOverride)) {
      datasourceId = parseInt(datasourceOverride, 10);
    } else {
      datasourceId = await resolveDatasourceId(client, datasourceOverride);
      if (!datasourceId) {
        console.error(`Error: Cannot resolve datasource "${datasourceOverride}".`);
        console.error("Your API key may not have permission to look up datasources.");
        console.error("Use the numeric datasource ID instead: --datasource <id>");
        process.exit(1);
      }
    }
  } else if (typeof panel.datasource === "string" && panel.datasource) {
    datasourceId = await resolveDatasourceId(client, panel.datasource);
  } else if (panel.datasource && typeof panel.datasource === "object" && (panel.datasource as any).id) {
    datasourceId = (panel.datasource as any).id;
  }

  if (!datasourceId) {
    console.error("Error: Cannot determine datasource ID for this panel.");
    console.error("The panel uses the default datasource, but it cannot be resolved automatically.");
    console.error("Specify it manually: --datasource <numeric-id>");
    console.error("Find the ID in Grafana → Configuration → Data Sources → select datasource → check the URL (id=N).");
    process.exit(1);
  }

  const applyVars = (s?: string) =>
    s?.replace(/\$(\w+)/g, (_, name: string) => variables[name] ?? `$${name}`);

  const queries = panel.targets.map((target) => ({
    refId: target.refId,
    datasourceId,
    expr: applyVars(target.expr),
    query: applyVars(target.query),
    queryType: target.queryType,
    intervalMs: 30000,
    maxDataPoints: 1000,
  }));

  let rawResults: Record<string, any>;
  try {
    const response = await client.post<{ results: Record<string, any> }>(
      "/api/tsdb/query",
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

  // Parse /api/tsdb/query response: results[refId].series[].{ name, points: [value, ts][] }
  return Object.entries(rawResults).map(([refId, result]) => {
    if (result.error) {
      console.error(`Warning: Query ${refId} failed: ${result.error}`);
      return { refId, series: [] };
    }

    const series: TimeSeries[] = (result.series || []).map((s: any) => {
      // Parse labels from series name: metric{k="v",...} → { k: v }
      const labelMatch = s.name?.match(/\{(.+)\}$/);
      const labels: Record<string, string> = {};
      if (labelMatch) {
        for (const pair of labelMatch[1].matchAll(/(\w+)="([^"]*)"/g)) {
          labels[pair[1]] = pair[2];
        }
      }
      const metricName = s.name?.replace(/\{.*\}$/, "") || refId;

      return {
        name: metricName,
        labels,
        // points format: [value, timestamp_ms]
        datapoints: (s.points || []).map(([value, timestamp]: [number | null, number]) => ({
          timestamp,
          value,
        })),
      };
    });

    return { refId, series };
  });
}
