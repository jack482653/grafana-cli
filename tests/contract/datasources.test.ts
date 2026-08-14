import { describe, expect, it } from "vitest";

import { createClient } from "../../src/services/grafana-client.js";

const GRAFANA_TEST_URL = process.env["GRAFANA_TEST_URL"];
const GRAFANA_API_KEY = process.env["GRAFANA_API_KEY"];
// Optional: non-Admin API keys, used only for the permission-denied tests.
// GET /api/datasources requires Admin — Viewer AND Editor are both denied,
// since the response can include datasource credentials.
const GRAFANA_VIEWER_API_KEY = process.env["GRAFANA_VIEWER_API_KEY"];
const GRAFANA_EDITOR_API_KEY = process.env["GRAFANA_EDITOR_API_KEY"];

const hasTestServer = !!GRAFANA_TEST_URL;
const hasViewerKey = !!GRAFANA_VIEWER_API_KEY;
const hasEditorKey = !!GRAFANA_EDITOR_API_KEY;

const testConfig = {
  name: "test",
  url: GRAFANA_TEST_URL!,
  apiKey: GRAFANA_API_KEY,
  isDefault: true,
};

// T007: GET /api/datasources returns 200 with array of datasource objects
describe.skipIf(!hasTestServer)("Datasource API Contract", () => {
  it("GET /api/datasources returns 200 with an array of datasources", async () => {
    const client = createClient(testConfig);
    const response = await client.get("/api/datasources");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it("datasource entries have id, name, type, and isDefault fields", async () => {
    const client = createClient(testConfig);
    const response = await client.get("/api/datasources");

    if (response.data.length > 0) {
      const first = response.data[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("type");
      expect(first).toHaveProperty("isDefault");
      // uid is optional in v7.5 (may be absent on older provisioned datasources)
      if (first.uid !== undefined) {
        expect(typeof first.uid).toBe("string");
      }
    }
  });

  it.skipIf(!hasViewerKey)("returns 403 for Viewer-role credentials", async () => {
    const viewerConfig = { ...testConfig, apiKey: GRAFANA_VIEWER_API_KEY };
    const client = createClient(viewerConfig);
    try {
      await client.get("/api/datasources");
      expect.fail("Expected 403 error");
    } catch (err: any) {
      expect(err.response?.status).toBe(403);
    }
  });

  // Editor is denied too — only Admin can list datasources (the response can
  // include datasource credentials). Verified against a live Grafana 7.5
  // instance; see specs/005-datasource-folder-list/research.md Decision 1.
  it.skipIf(!hasEditorKey)("returns 403 for Editor-role credentials", async () => {
    const editorConfig = { ...testConfig, apiKey: GRAFANA_EDITOR_API_KEY };
    const client = createClient(editorConfig);
    try {
      await client.get("/api/datasources");
      expect.fail("Expected 403 error");
    } catch (err: any) {
      expect(err.response?.status).toBe(403);
    }
  });
});

describe.skipIf(hasTestServer)("Datasource API Contract (no server)", () => {
  it("skipped - set GRAFANA_TEST_URL env var to run contract tests", () => {
    console.log("Set GRAFANA_TEST_URL=http://localhost:3000 to run contract tests");
  });
});
