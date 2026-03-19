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

// T049: GET /api/alerts returns 200 with array of alerts
describe("GET /api/alerts", () => {
  it.skipIf(!hasTestServer)("returns 200 with array of alerts", async () => {
    const client = createClient(testConfig);
    const resp = await client.get("/api/alerts");
    expect(resp.status).toBe(200);
    expect(Array.isArray(resp.data)).toBe(true);

    if (resp.data.length > 0) {
      const alert = resp.data[0];
      expect(alert).toHaveProperty("id");
      expect(alert).toHaveProperty("name");
      expect(alert).toHaveProperty("state");
      expect(alert).toHaveProperty("dashboardId");
      expect(alert).toHaveProperty("panelId");
    }
  });
});

// T050: GET /api/alerts with state filter
describe("GET /api/alerts with state filter", () => {
  it.skipIf(!hasTestServer)("?state=ok returns only ok alerts", async () => {
    const client = createClient(testConfig);
    const resp = await client.get("/api/alerts", { params: { state: "ok" } });
    expect(resp.status).toBe(200);
    expect(Array.isArray(resp.data)).toBe(true);
    for (const alert of resp.data) {
      expect(alert.state).toBe("ok");
    }
  });

  it.skipIf(!hasTestServer)("?state=alerting returns only alerting alerts", async () => {
    const client = createClient(testConfig);
    const resp = await client.get("/api/alerts", { params: { state: "alerting" } });
    expect(resp.status).toBe(200);
    expect(Array.isArray(resp.data)).toBe(true);
    for (const alert of resp.data) {
      expect(alert.state).toBe("alerting");
    }
  });
});

// T051: GET /api/alerts/:id returns alert with conditions
describe("GET /api/alerts/:id", () => {
  it.skipIf(!hasTestServer)("returns 200 with alert detail including conditions", async () => {
    const client = createClient(testConfig);
    const listResp = await client.get("/api/alerts", { params: { limit: 1 } });
    expect(listResp.data.length).toBeGreaterThan(0);

    const alertId = listResp.data[0].id;
    const resp = await client.get(`/api/alerts/${alertId}`);
    expect(resp.status).toBe(200);

    const alert = resp.data;
    // Note: detail endpoint uses PascalCase keys
    expect(alert).toHaveProperty("Id");
    expect(alert).toHaveProperty("Name");
    expect(alert).toHaveProperty("State");
    expect(alert).toHaveProperty("Settings");
    expect(alert.Settings).toHaveProperty("conditions");
    expect(Array.isArray(alert.Settings.conditions)).toBe(true);
  });
});

// T052: GET /api/alerts/:id for non-existent alert returns 404
describe("GET /api/alerts/:id not found", () => {
  it.skipIf(!hasTestServer)("returns 404 for non-existent alert", async () => {
    const client = createClient(testConfig);
    try {
      await client.get("/api/alerts/999999");
      expect.fail("Expected 404 error");
    } catch (err: any) {
      expect(err.response?.status).toBe(404);
    }
  });
});
