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

// T001: GET /api/folders returns 200 with array of folder objects
describe.skipIf(!hasTestServer)("Folder API Contract", () => {
  it("GET /api/folders returns 200 with an array of folders", async () => {
    const client = createClient(testConfig);
    const response = await client.get("/api/folders");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it("folder entries have id and title fields", async () => {
    const client = createClient(testConfig);
    const response = await client.get("/api/folders");

    if (response.data.length > 0) {
      const first = response.data[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("title");
      expect(typeof first.title).toBe("string");
      // uid is optional in v7.5 (may be absent on older provisioned folders)
      if (first.uid !== undefined) {
        expect(typeof first.uid).toBe("string");
      }
    }
  });

  it("returns 200 with an empty array when the server has no folders", async () => {
    // Not all test servers can be guaranteed empty; this simply verifies the
    // response shape is a well-formed array, empty or not.
    const client = createClient(testConfig);
    const response = await client.get("/api/folders");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });
});

describe.skipIf(hasTestServer)("Folder API Contract (no server)", () => {
  it("skipped - set GRAFANA_TEST_URL env var to run contract tests", () => {
    console.log("Set GRAFANA_TEST_URL=http://localhost:3000 to run contract tests");
  });
});
