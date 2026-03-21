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

// T066–T069
describe("--config flag (per-command site selection)", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grafana-cli-test-"));
    configPath = path.join(tmpDir, "config.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // T066: --config <valid> routes to correct site, global active unchanged
  it.skipIf(!GRAFANA_TEST_URL)(
    "T066 --config <valid> uses named site and leaves active config unchanged",
    () => {
      const config = {
        configs: {
          prod: {
            name: "prod",
            url: GRAFANA_TEST_URL!,
            apiKey: GRAFANA_API_KEY,
            isDefault: false,
          },
          other: {
            name: "other",
            url: "http://localhost:19999",
            isDefault: true,
          },
        },
        activeConfig: "other",
      };
      fs.writeFileSync(configPath, JSON.stringify(config));

      // --config prod should succeed against the real server
      const output = cli(["status", "--config", "prod"], configPath);
      expect(output).toMatch(/VERSION/i);

      // Active config on disk must still be "other"
      const stored = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(stored.activeConfig).toBe("other");
    },
  );

  // T067: --config <invalid> exits non-zero with error message
  it("T067 --config <unknown> exits non-zero with error referencing the name", () => {
    const config = {
      configs: {
        prod: {
          name: "prod",
          url: "http://localhost:3000",
          isDefault: true,
        },
      },
      activeConfig: "prod",
    };
    fs.writeFileSync(configPath, JSON.stringify(config));

    const result = cliWithError(["status", "--config", "nonexistent"], configPath);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/nonexistent/i);
  });

  // T068: omitting --config falls back to active config as before
  it.skipIf(!GRAFANA_TEST_URL)(
    "T068 omitting --config uses active config (existing behavior preserved)",
    () => {
      const config = {
        configs: {
          test: {
            name: "test",
            url: GRAFANA_TEST_URL!,
            apiKey: GRAFANA_API_KEY,
            isDefault: true,
          },
        },
        activeConfig: "test",
      };
      fs.writeFileSync(configPath, JSON.stringify(config));

      const output = cli(["status"], configPath);
      expect(output).toMatch(/VERSION/i);
    },
  );

  // T069: --server hidden alias still works for backward compat
  it.skipIf(!GRAFANA_TEST_URL)(
    "T069 --server (hidden alias) still selects the named site",
    () => {
      const config = {
        configs: {
          prod: {
            name: "prod",
            url: GRAFANA_TEST_URL!,
            apiKey: GRAFANA_API_KEY,
            isDefault: true,
          },
        },
        activeConfig: "prod",
      };
      fs.writeFileSync(configPath, JSON.stringify(config));

      const output = cli(["status", "--server", "prod"], configPath);
      expect(output).toMatch(/VERSION/i);
    },
  );
});
