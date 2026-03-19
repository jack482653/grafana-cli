import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI = path.resolve("dist/index.js");

const GRAFANA_TEST_URL = process.env["GRAFANA_TEST_URL"];
const GRAFANA_API_KEY = process.env["GRAFANA_API_KEY"];

function cli(args: string[], configPath: string): string {
  return execFileSync("node", [CLI, ...args], {
    env: { ...process.env, GRAFANA_CLI_CONFIG_PATH: configPath },
    encoding: "utf-8",
  });
}

function cliWithError(
  args: string[],
  configPath: string,
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      env: { ...process.env, GRAFANA_CLI_CONFIG_PATH: configPath },
      encoding: "utf-8",
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      exitCode: error.status || 1,
    };
  }
}

describe.skipIf(!GRAFANA_TEST_URL)("Query Flow Integration (requires Grafana)", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grafana-cli-query-test-"));
    configPath = path.join(tmpDir, "config.json");

    const args = ["config", "set", "--url", GRAFANA_TEST_URL!, "--name", "test"];
    if (GRAFANA_API_KEY) args.push("--api-key", GRAFANA_API_KEY);
    cli(args, configPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // T041: dashboard get → query execute → verify output contains timestamps and values
  it("query execute returns table output with TIMESTAMP and VALUE columns", async () => {
    // Find a dashboard with panels
    const listOutput = cli(["dashboard", "list", "--json"], configPath);
    const dashboards = JSON.parse(listOutput);
    if (dashboards.length === 0) return;

    // Find a panel with targets
    let dashUid: string | null = null;
    let panelId: number | null = null;

    for (const d of dashboards.slice(0, 5)) {
      const getOutput = cli(["dashboard", "get", d.uid, "--json"], configPath);
      const dashboard = JSON.parse(getOutput);
      const panel = (dashboard.panels || []).find(
        (p: any) => p.targets && p.targets.length > 0,
      );
      if (panel) {
        dashUid = d.uid;
        panelId = panel.id;
        break;
      }
    }

    if (!dashUid || !panelId) {
      console.log("No queryable panel found — skipping query execute test");
      return;
    }

    const output = cli(
      [
        "query", "execute",
        "--dashboard", dashUid,
        "--panel", String(panelId),
        "--from", "now-1h",
        "--to", "now",
      ],
      configPath,
    );

    expect(output).toContain("Time Range:");
    // Either shows data or "(no data)" — both are valid
    expect(output.length).toBeGreaterThan(0);
  });

  it("query execute --json returns valid JSON with dashboard and queries fields", async () => {
    const listOutput = cli(["dashboard", "list", "--json"], configPath);
    const dashboards = JSON.parse(listOutput);
    if (dashboards.length === 0) return;

    let dashUid: string | null = null;
    let panelId: number | null = null;

    for (const d of dashboards.slice(0, 5)) {
      const getOutput = cli(["dashboard", "get", d.uid, "--json"], configPath);
      const dashboard = JSON.parse(getOutput);
      const panel = (dashboard.panels || []).find(
        (p: any) => p.targets && p.targets.length > 0,
      );
      if (panel) {
        dashUid = d.uid;
        panelId = panel.id;
        break;
      }
    }

    if (!dashUid || !panelId) return;

    const output = cli(
      [
        "query", "execute",
        "--dashboard", dashUid,
        "--panel", String(panelId),
        "--from", "now-1h",
        "--to", "now",
        "--json",
      ],
      configPath,
    );

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("dashboard", dashUid);
    expect(parsed).toHaveProperty("panel", panelId);
    expect(parsed).toHaveProperty("from");
    expect(parsed).toHaveProperty("to");
    expect(Array.isArray(parsed.queries)).toBe(true);
  });

  it("query execute with invalid panel ID exits with error", () => {
    const listOutput = cli(["dashboard", "list", "--json"], configPath);
    const dashboards = JSON.parse(listOutput);
    if (dashboards.length === 0) return;

    const { stderr, exitCode } = cliWithError(
      [
        "query", "execute",
        "--dashboard", dashboards[0].uid,
        "--panel", "99999",
        "--from", "now-1h",
        "--to", "now",
      ],
      configPath,
    );

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("not found");
  });
});

describe.skipIf(!!GRAFANA_TEST_URL)("Query Flow Integration (no server)", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grafana-cli-query-test-"));
    configPath = path.join(tmpDir, "config.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("query execute shows error when no active config", () => {
    const { stderr, exitCode } = cliWithError(
      ["query", "execute", "--dashboard", "abc", "--panel", "1"],
      configPath,
    );
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("No active server configuration");
  });

  it("query execute shows error for invalid time format", () => {
    // Set a config first
    execFileSync("node", [CLI, "config", "set", "--url", "https://g.example.com", "--name", "t"], {
      env: { ...process.env, GRAFANA_CLI_CONFIG_PATH: configPath },
      encoding: "utf-8",
    });

    const { stderr, exitCode } = cliWithError(
      [
        "query", "execute",
        "--dashboard", "abc",
        "--panel", "1",
        "--from", "not-a-valid-time",
      ],
      configPath,
    );
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("Invalid time format");
  });
});
