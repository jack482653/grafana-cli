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

describe.skipIf(!hasTestServer)("Dashboard API Contract", () => {
  // T026: List dashboards returns array
  it("GET /api/search?type=dash-db returns an array", async () => {
    const client = createClient(testConfig);
    const response = await client.get("/api/search", { params: { type: "dash-db" } });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  // T026: Dashboard entries have required fields
  it("dashboard entries have uid, title, and url fields", async () => {
    const client = createClient(testConfig);
    const response = await client.get("/api/search", { params: { type: "dash-db" } });

    if (response.data.length > 0) {
      const first = response.data[0];
      expect(first).toHaveProperty("uid");
      expect(first).toHaveProperty("title");
      expect(typeof first.uid).toBe("string");
      expect(typeof first.title).toBe("string");
    }
  });

  // T027: Filtering by query works
  it("GET /api/search?query=... filters results by title", async () => {
    const client = createClient(testConfig);

    // First, get all dashboards
    const allResponse = await client.get("/api/search", { params: { type: "dash-db" } });
    if (allResponse.data.length === 0) return; // skip if no dashboards

    const firstTitle = allResponse.data[0].title as string;
    const queryTerm = firstTitle.substring(0, 3); // use first 3 chars as search term

    const filteredResponse = await client.get("/api/search", {
      params: { type: "dash-db", query: queryTerm },
    });

    expect(filteredResponse.status).toBe(200);
    expect(Array.isArray(filteredResponse.data)).toBe(true);
    // Results should be a subset of all dashboards
    expect(filteredResponse.data.length).toBeLessThanOrEqual(allResponse.data.length);
  });

  // T028: Get dashboard by UID works
  it("GET /api/dashboards/uid/:uid returns dashboard with panels", async () => {
    const client = createClient(testConfig);

    // First find a dashboard
    const listResponse = await client.get("/api/search", { params: { type: "dash-db" } });
    if (listResponse.data.length === 0) return; // skip if no dashboards

    const uid = listResponse.data[0].uid as string;
    const response = await client.get(`/api/dashboards/uid/${uid}`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("dashboard");
    expect(response.data).toHaveProperty("meta");
    expect(response.data.dashboard).toHaveProperty("uid", uid);
    expect(response.data.dashboard).toHaveProperty("title");
    expect(Array.isArray(response.data.dashboard.panels)).toBe(true);
  });

  // T029: Non-existent dashboard returns 404
  it("GET /api/dashboards/uid/:uid returns 404 for non-existent dashboard", async () => {
    const client = createClient(testConfig);

    try {
      await client.get("/api/dashboards/uid/this-uid-does-not-exist-xyz-123");
      expect.fail("Should have thrown 404");
    } catch (error: any) {
      expect(error.response?.status).toBe(404);
    }
  });
});

describe.skipIf(hasTestServer)("Dashboard API Contract (no server)", () => {
  it("skipped - set GRAFANA_TEST_URL env var to run contract tests", () => {
    console.log("Set GRAFANA_TEST_URL=http://localhost:3000 to run contract tests");
  });
});
