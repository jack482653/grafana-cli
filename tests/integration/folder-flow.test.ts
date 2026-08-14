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

// T002
describe.skipIf(!GRAFANA_TEST_URL)("Folder List Flow Integration (requires Grafana)", () => {
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

  it("folder list returns table with ID, UID, TITLE columns", () => {
    const output = cli(["folder", "list"], configPath);
    expect(output).toMatch(/ID/);
    expect(output).toMatch(/UID/);
    expect(output).toMatch(/TITLE/);
  });

  it("folder list --json returns valid JSON array", () => {
    const output = cli(["folder", "list", "--json"], configPath);
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    if (parsed.length > 0) {
      expect(parsed[0]).toHaveProperty("id");
      expect(parsed[0]).toHaveProperty("title");
    }
  });

  it("folder list --config <name> targets the named server", () => {
    const config = {
      configs: {
        other: { name: "other", url: GRAFANA_TEST_URL!, apiKey: GRAFANA_API_KEY, isDefault: true },
      },
      activeConfig: "other",
    };
    fs.writeFileSync(configPath, JSON.stringify(config));
    const output = cli(["folder", "list", "--config", "other"], configPath);
    expect(output).toMatch(/TITLE/);
  });

  it("folder list with no active config exits with non-zero code", () => {
    const emptyConfig = path.join(tmpDir, "empty.json");
    fs.writeFileSync(emptyConfig, JSON.stringify({ configs: {} }));
    const result = cliWithError(["folder", "list"], emptyConfig);
    expect(result.exitCode).not.toBe(0);
  });
});
