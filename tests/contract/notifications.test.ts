import { describe, expect, it } from "vitest";

import { createClient } from "../../src/services/grafana-client.js";

const GRAFANA_TEST_URL = process.env["GRAFANA_TEST_URL"];
const GRAFANA_API_KEY = process.env["GRAFANA_API_KEY"];
// Optional: a Viewer-role API key, used only for the permission-denied tests.
// GET /api/alert-notifications and GET /api/alert-notifications/:id both
// require Editor or Admin — confirmed empirically against Grafana 7.5.0
// (see specs/006-notification-channels/research.md Decision 2).
const GRAFANA_VIEWER_API_KEY = process.env["GRAFANA_VIEWER_API_KEY"];

const hasTestServer = !!GRAFANA_TEST_URL;
const hasViewerKey = !!GRAFANA_VIEWER_API_KEY;

const testConfig = {
  name: "test",
  url: GRAFANA_TEST_URL!,
  apiKey: GRAFANA_API_KEY,
  isDefault: true,
};

// T001: GET /api/alert-notifications returns 200 with array of channel objects
describe.skipIf(!hasTestServer)("Notification Channel API Contract", () => {
  it("GET /api/alert-notifications returns 200 with an array of channels", async () => {
    const client = createClient(testConfig);
    const response = await client.get("/api/alert-notifications");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it("channel entries have id, name, type, and isDefault fields", async () => {
    const client = createClient(testConfig);
    const response = await client.get("/api/alert-notifications");

    if (response.data.length > 0) {
      const first = response.data[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("type");
      expect(first).toHaveProperty("isDefault");
      // uid is optional (not asserted as always present, matching Folder/DatasourceInfo precedent)
      if (first.uid !== undefined) {
        expect(typeof first.uid).toBe("string");
      }
    }
  });

  it.skipIf(!hasViewerKey)("returns 403 for Viewer-role credentials (list)", async () => {
    const viewerConfig = { ...testConfig, apiKey: GRAFANA_VIEWER_API_KEY };
    const client = createClient(viewerConfig);
    try {
      await client.get("/api/alert-notifications");
      expect.fail("Expected 403 error");
    } catch (err: any) {
      expect(err.response?.status).toBe(403);
    }
  });

  it("GET /api/alert-notifications/:id returns 200 with full detail including settings", async () => {
    const client = createClient(testConfig);
    const listResp = await client.get("/api/alert-notifications");
    if (listResp.data.length === 0) return; // skip if no channels configured

    const channelId = listResp.data[0].id;
    const response = await client.get(`/api/alert-notifications/${channelId}`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("id", channelId);
    expect(response.data).toHaveProperty("name");
    expect(response.data).toHaveProperty("sendReminder");
    expect(response.data).toHaveProperty("disableResolveMessage");
    expect(response.data).toHaveProperty("settings");
  });

  it.skipIf(!hasViewerKey)("returns 403 for Viewer-role credentials (get)", async () => {
    const client = createClient(testConfig);
    const listResp = await client.get("/api/alert-notifications");
    if (listResp.data.length === 0) return;
    const channelId = listResp.data[0].id;

    const viewerConfig = { ...testConfig, apiKey: GRAFANA_VIEWER_API_KEY };
    const viewerClient = createClient(viewerConfig);
    try {
      await viewerClient.get(`/api/alert-notifications/${channelId}`);
      expect.fail("Expected 403 error");
    } catch (err: any) {
      expect(err.response?.status).toBe(403);
    }
  });

  it("returns 404 for a non-existent channel id", async () => {
    const client = createClient(testConfig);
    try {
      await client.get("/api/alert-notifications/999999");
      expect.fail("Expected 404 error");
    } catch (err: any) {
      expect(err.response?.status).toBe(404);
    }
  });
});

describe.skipIf(hasTestServer)("Notification Channel API Contract (no server)", () => {
  it("skipped - set GRAFANA_TEST_URL env var to run contract tests", () => {
    console.log("Set GRAFANA_TEST_URL=http://localhost:3000 to run contract tests");
  });
});
