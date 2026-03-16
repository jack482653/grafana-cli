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

function cliWithError(args: string[], configPath: string): { stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      env: { ...process.env, GRAFANA_CLI_CONFIG_PATH: configPath },
      encoding: "utf-8",
    });
    return { stdout, stderr: "" };
  } catch (error: any) {
    return { stdout: error.stdout || "", stderr: error.stderr || "" };
  }
}

describe.skipIf(!GRAFANA_TEST_URL)("Dashboard Flow Integration (requires Grafana)", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grafana-cli-dash-test-"));
    configPath = path.join(tmpDir, "config.json");

    // Set up config pointing to test server
    const args = ["config", "set", "--url", GRAFANA_TEST_URL!, "--name", "test"];
    if (GRAFANA_API_KEY) args.push("--api-key", GRAFANA_API_KEY);
    cli(args, configPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // T030: dashboard list returns table output
  it("dashboard list returns a table with UID, Title, Folder, Tags columns", () => {
    const output = cli(["dashboard", "list"], configPath);

    expect(output).toContain("UID");
    expect(output).toContain("Title");
    expect(output).toContain("Folder");
    expect(output).toContain("Tags");
  });

  it("dashboard list --json returns valid JSON array", () => {
    const output = cli(["dashboard", "list", "--json"], configPath);

    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("dashboard list --query filters results", () => {
    // Get all dashboards first to find a title to search for
    const allOutput = cli(["dashboard", "list", "--json"], configPath);
    const all = JSON.parse(allOutput);

    if (all.length === 0) return; // skip if no dashboards

    const firstTitle = all[0].title as string;
    const queryTerm = firstTitle.substring(0, 4);

    const filteredOutput = cli(["dashboard", "list", "--query", queryTerm, "--json"], configPath);
    const filtered = JSON.parse(filteredOutput);

    expect(Array.isArray(filtered)).toBe(true);
    expect(filtered.length).toBeLessThanOrEqual(all.length);
  });

  it("dashboard get <uid> shows dashboard details", () => {
    // First list dashboards to get a valid UID
    const listOutput = cli(["dashboard", "list", "--json"], configPath);
    const dashboards = JSON.parse(listOutput);

    if (dashboards.length === 0) return; // skip if no dashboards

    const uid = dashboards[0].uid as string;
    const output = cli(["dashboard", "get", uid], configPath);

    expect(output).toContain("Title:");
    expect(output).toContain("UID:");
    expect(output).toContain(uid);
  });

  it("dashboard get <uid> --json returns valid JSON", () => {
    const listOutput = cli(["dashboard", "list", "--json"], configPath);
    const dashboards = JSON.parse(listOutput);

    if (dashboards.length === 0) return; // skip if no dashboards

    const uid = dashboards[0].uid as string;
    const output = cli(["dashboard", "get", uid, "--json"], configPath);

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("uid", uid);
    expect(parsed).toHaveProperty("title");
  });

  it("dashboard get <invalid-uid> exits with error", () => {
    const { stderr } = cliWithError(
      ["dashboard", "get", "non-existent-uid-xyz"],
      configPath,
    );
    expect(stderr).toContain("not found");
  });
});

describe.skipIf(!!GRAFANA_TEST_URL)("Dashboard Flow Integration (no server)", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grafana-cli-dash-test-"));
    configPath = path.join(tmpDir, "config.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("dashboard list shows error when no active config", () => {
    const { stderr } = cliWithError(["dashboard", "list"], configPath);
    expect(stderr).toContain("No active server configuration");
  });
});
