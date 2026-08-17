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
describe.skipIf(!GRAFANA_TEST_URL)(
  "Notification Channel Flow Integration (requires Grafana)",
  () => {
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

    it("notification list returns table with ID, NAME, TYPE, DEFAULT columns", () => {
      const output = cli(["notification", "list"], configPath);
      expect(output).toMatch(/ID/);
      expect(output).toMatch(/NAME/);
      expect(output).toMatch(/TYPE/);
      expect(output).toMatch(/DEFAULT/);
    });

    it("notification list --json returns valid JSON array", () => {
      const output = cli(["notification", "list", "--json"], configPath);
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      if (parsed.length > 0) {
        expect(parsed[0]).toHaveProperty("id");
        expect(parsed[0]).toHaveProperty("name");
        expect(parsed[0]).toHaveProperty("isDefault");
      }
    });

    it("notification get <id> returns detail with Name, Type, and Settings", () => {
      const listOutput = cli(["notification", "list", "--json"], configPath);
      const channels = JSON.parse(listOutput);
      expect(channels.length).toBeGreaterThan(0);

      const channelId = channels[0].id;
      const output = cli(["notification", "get", String(channelId)], configPath);
      expect(output).toMatch(/Name:/);
      expect(output).toMatch(/Type:/);
      expect(output).toMatch(/Settings:/);
    });

    it("notification get with invalid id exits with non-zero code", () => {
      const result = cliWithError(["notification", "get", "999999"], configPath);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/not found/i);
    });

    it("notification list --config <name> targets the named server", () => {
      const config = {
        configs: {
          other: {
            name: "other",
            url: GRAFANA_TEST_URL!,
            apiKey: GRAFANA_API_KEY,
            isDefault: true,
          },
        },
        activeConfig: "other",
      };
      fs.writeFileSync(configPath, JSON.stringify(config));
      const output = cli(["notification", "list", "--config", "other"], configPath);
      expect(output).toMatch(/NAME/);
    });

    it("notification list with no active config exits with non-zero code", () => {
      const emptyConfig = path.join(tmpDir, "empty.json");
      fs.writeFileSync(emptyConfig, JSON.stringify({ configs: {} }));
      const result = cliWithError(["notification", "list"], emptyConfig);
      expect(result.exitCode).not.toBe(0);
    });
  },
);
