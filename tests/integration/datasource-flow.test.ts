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

// T008
describe.skipIf(!GRAFANA_TEST_URL)("Datasource List Flow Integration (requires Grafana)", () => {
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

  it("datasource list returns table with ID, NAME, TYPE, DEFAULT columns", () => {
    const output = cli(["datasource", "list"], configPath);
    expect(output).toMatch(/ID/);
    expect(output).toMatch(/NAME/);
    expect(output).toMatch(/TYPE/);
    expect(output).toMatch(/DEFAULT/);
  });

  it("datasource list --json returns valid JSON array", () => {
    const output = cli(["datasource", "list", "--json"], configPath);
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    if (parsed.length > 0) {
      expect(parsed[0]).toHaveProperty("id");
      expect(parsed[0]).toHaveProperty("name");
      expect(parsed[0]).toHaveProperty("isDefault");
    }
  });

  it("datasource list --config <name> targets the named server", () => {
    const config = {
      configs: {
        other: { name: "other", url: GRAFANA_TEST_URL!, apiKey: GRAFANA_API_KEY, isDefault: true },
      },
      activeConfig: "other",
    };
    fs.writeFileSync(configPath, JSON.stringify(config));
    const output = cli(["datasource", "list", "--config", "other"], configPath);
    expect(output).toMatch(/NAME/);
  });

  it("datasource list with no active config exits with non-zero code", () => {
    const emptyConfig = path.join(tmpDir, "empty.json");
    fs.writeFileSync(emptyConfig, JSON.stringify({ configs: {} }));
    const result = cliWithError(["datasource", "list"], emptyConfig);
    expect(result.exitCode).not.toBe(0);
  });
});
