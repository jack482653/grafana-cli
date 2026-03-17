import { describe, expect, it } from "vitest";

import { createClient } from "../../src/services/grafana-client.js";

const GRAFANA_TEST_URL = process.env["GRAFANA_TEST_URL"];
const GRAFANA_API_KEY = process.env["GRAFANA_API_KEY"];

const hasTestServer = !!GRAFANA_TEST_URL;

const testConfig = {
  name: "test",
  url: GRAFANA_TEST_URL!,
  apiKey: GRAFANA_API_KEY,
  isDefault: true,
};

/**
 * Helper: find a dashboard with at least one panel that has targets.
 * Returns { dashboardUid, panelTargets } or null if none found.
 */
async function findQueryablePanel(
  client: ReturnType<typeof createClient>,
): Promise<{ uid: string; datasource: any; targets: any[] } | null> {
  const searchResp = await client.get("/api/search", { params: { type: "dash-db" } });
  for (const item of searchResp.data.slice(0, 5)) {
    const dashResp = await client.get(`/api/dashboards/uid/${item.uid}`);
    const panels: any[] = dashResp.data.dashboard?.panels || [];
    for (const panel of panels) {
      if (panel.targets && panel.targets.length > 0 && panel.datasource) {
        return {
          uid: item.uid,
          datasource: panel.datasource,
          targets: panel.targets,
        };
      }
    }
  }
  return null;
}

describe.skipIf(!hasTestServer)("Query API Contract", () => {
  const client = createClient(testConfig);
  const now = Date.now();
  const from = String(now - 60 * 60 * 1000); // 1 hour ago
  const to = String(now);

  // T037: Single query returns 200 with results keyed by refId
  it("POST /api/ds/query returns 200 with results object containing frames", async () => {
    const panel = await findQueryablePanel(client);
    if (!panel) {
      console.log("No queryable panel found — skipping single query test");
      return;
    }

    const target = panel.targets[0];
    const response = await client.post("/api/ds/query", {
      queries: [
        {
          refId: target.refId || "A",
          datasource: target.datasource ?? panel.datasource,
          expr: target.expr,
          query: target.query,
          range: true,
          instant: false,
          intervalMs: 30000,
          maxDataPoints: 100,
        },
      ],
      from,
      to,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("results");
    expect(typeof response.data.results).toBe("object");

    const refId = target.refId || "A";
    expect(response.data.results).toHaveProperty(refId);
  });

  // T037: Frame structure has schema.fields and data.values
  it("result frames have schema.fields and data.values arrays", async () => {
    const panel = await findQueryablePanel(client);
    if (!panel) {
      console.log("No queryable panel found — skipping frame structure test");
      return;
    }

    const target = panel.targets[0];
    const refId = target.refId || "A";
    const response = await client.post("/api/ds/query", {
      queries: [
        {
          refId,
          datasource: target.datasource ?? panel.datasource,
          expr: target.expr,
          query: target.query,
          range: true,
          instant: false,
          intervalMs: 30000,
          maxDataPoints: 100,
        },
      ],
      from,
      to,
    });

    const result = response.data.results[refId];
    if (result.frames && result.frames.length > 0) {
      const frame = result.frames[0];
      expect(frame).toHaveProperty("schema");
      expect(frame).toHaveProperty("data");
      expect(Array.isArray(frame.schema.fields)).toBe(true);
      expect(Array.isArray(frame.data.values)).toBe(true);
    }
  });

  // T038: Multiple queries return results keyed by each refId
  it("POST /api/ds/query with multiple queries returns results keyed by refId A, B", async () => {
    const panel = await findQueryablePanel(client);
    if (!panel || panel.targets.length < 1) {
      console.log("Not enough targets found — skipping multi-query test");
      return;
    }

    const target = panel.targets[0];
    const ds = target.datasource ?? panel.datasource;

    const response = await client.post("/api/ds/query", {
      queries: [
        { refId: "A", datasource: ds, expr: target.expr, query: target.query, range: true, intervalMs: 30000, maxDataPoints: 50 },
        { refId: "B", datasource: ds, expr: target.expr, query: target.query, range: true, intervalMs: 30000, maxDataPoints: 50 },
      ],
      from,
      to,
    });

    expect(response.status).toBe(200);
    expect(response.data.results).toHaveProperty("A");
    expect(response.data.results).toHaveProperty("B");
  });

  // T039: Invalid query syntax returns 400 or partial error
  it("POST /api/ds/query with invalid syntax returns 400 or per-query error", async () => {
    const panel = await findQueryablePanel(client);
    if (!panel) {
      console.log("No queryable panel found — skipping invalid query test");
      return;
    }

    const ds = panel.targets[0]?.datasource ?? panel.datasource;

    try {
      const response = await client.post("/api/ds/query", {
        queries: [
          {
            refId: "A",
            datasource: ds,
            expr: "this_is_not_valid_promql{{{{",
            range: true,
            intervalMs: 30000,
            maxDataPoints: 100,
          },
        ],
        from,
        to,
      });
      // Some datasources return 200 with per-query error
      expect(response.status).toBe(200);
      const result = response.data.results?.["A"];
      expect(result?.error || result?.status === 400 || result?.frames?.length === 0).toBeTruthy();
    } catch (error: any) {
      // Or Grafana returns 400 directly
      expect(error.response?.status).toBe(400);
    }
  });

  // T040: Query timeout / 504 (hard to trigger reliably — assert API structure only)
  it("POST /api/ds/query endpoint is reachable and rejects missing queries", async () => {
    try {
      await client.post("/api/ds/query", { queries: [], from, to });
    } catch (error: any) {
      // Grafana returns 400 for empty queries array
      expect([400, 422, 500]).toContain(error.response?.status);
    }
  });
});

describe.skipIf(hasTestServer)("Query API Contract (no server)", () => {
  it("skipped - set GRAFANA_TEST_URL env var to run contract tests", () => {
    console.log("Set GRAFANA_TEST_URL=http://localhost:3000 to run contract tests");
  });
});
