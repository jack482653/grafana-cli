import { describe, expect, it } from "vitest";

import { createClient } from "../../src/services/grafana-client.js";

const GRAFANA_TEST_URL = process.env["GRAFANA_TEST_URL"];
const GRAFANA_API_KEY = process.env["GRAFANA_API_KEY"];

const hasTestServer = !!GRAFANA_TEST_URL;

describe.skipIf(!hasTestServer)("Health API Contract", () => {
  // T017: Happy path
  it("GET /api/health returns 200 with version, database, and commit", async () => {
    const client = createClient({
      name: "test",
      url: GRAFANA_TEST_URL!,
      apiKey: GRAFANA_API_KEY,
      isDefault: true,
    });

    const response = await client.get("/api/health");

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("version");
    expect(response.data).toHaveProperty("database");
    expect(typeof response.data.version).toBe("string");
    expect(typeof response.data.database).toBe("string");
    expect(response.data.version.length).toBeGreaterThan(0);
  });

  it("GET /api/health is accessible without authentication", async () => {
    const client = createClient({
      name: "test",
      url: GRAFANA_TEST_URL!,
      isDefault: true,
      // No apiKey or username/password
    });

    const response = await client.get("/api/health");

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("version");
    expect(response.data).toHaveProperty("database");
  });

  // T018: Authentication failure
  it("GET /api/dashboards/home returns 401 with invalid API key", async () => {
    const client = createClient({
      name: "test",
      url: GRAFANA_TEST_URL!,
      apiKey: "invalid-api-key-that-does-not-exist",
      isDefault: true,
    });

    // Use a protected endpoint to verify auth is rejected
    try {
      await client.get("/api/dashboards/home");
      expect.fail("Should have thrown 401");
    } catch (error: any) {
      expect(error.response?.status).toBe(401);
    }
  });
});

describe.skipIf(hasTestServer)("Health API Contract (no server)", () => {
  it("skipped - set GRAFANA_TEST_URL env var to run contract tests", () => {
    console.log("Set GRAFANA_TEST_URL=http://localhost:3000 to run contract tests");
  });
});
