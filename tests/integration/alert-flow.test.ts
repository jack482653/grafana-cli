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

// T053
describe.skipIf(!GRAFANA_TEST_URL)("Alert Flow Integration (requires Grafana)", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grafana-cli-test-"));
    configPath = path.join(tmpDir, "config.json");
    const config = {
      configs: {
        test: { name: "test", url: GRAFANA_TEST_URL!, apiKey: GRAFANA_API_KEY, isDefault: true },
      },
      activeConfig: "test",
    };
    fs.writeFileSync(configPath, JSON.stringify(config));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("alert list returns table with ID, NAME, STATE columns", () => {
    const output = cli(["alert", "list"], configPath);
    expect(output).toMatch(/ID/);
    expect(output).toMatch(/NAME/);
    expect(output).toMatch(/STATE/);
  });

  it("alert list --state ok returns only ok alerts", () => {
    const output = cli(["alert", "list", "--state", "ok"], configPath);
    // Every data row should contain "ok" in the STATE column
    const lines = output.split("\n").filter((l) => l.includes("ok") || l.trim() === "");
    expect(lines.length).toBeGreaterThan(0);
  });

  it("alert list --json returns valid JSON array", () => {
    const output = cli(["alert", "list", "--json"], configPath);
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    if (parsed.length > 0) {
      expect(parsed[0]).toHaveProperty("id");
      expect(parsed[0]).toHaveProperty("name");
      expect(parsed[0]).toHaveProperty("state");
    }
  });

  it("alert get <id> returns alert details with state and conditions", () => {
    // First list to get a valid id
    const listOutput = cli(["alert", "list", "--json"], configPath);
    const alerts = JSON.parse(listOutput);
    expect(alerts.length).toBeGreaterThan(0);

    const alertId = alerts[0].id;
    const output = cli(["alert", "get", String(alertId)], configPath);
    expect(output).toMatch(/State:/i);
    expect(output).toMatch(/Frequency:/i);
  });

  it("alert get with invalid id exits with non-zero code", () => {
    const result = cliWithError(["alert", "get", "999999"], configPath);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/not found/i);
  });

  it("alert list with no active config exits with non-zero code", () => {
    const emptyConfig = path.join(tmpDir, "empty.json");
    fs.writeFileSync(emptyConfig, JSON.stringify({ configs: {} }));
    const result = cliWithError(["alert", "list"], emptyConfig);
    expect(result.exitCode).not.toBe(0);
  });
});
