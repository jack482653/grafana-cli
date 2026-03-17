import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI = path.resolve("dist/index.js");

const GRAFANA_TEST_URL = process.env["GRAFANA_TEST_URL"];

function cli(args: string[], configPath: string): string {
  return execFileSync("node", [CLI, ...args], {
    env: { ...process.env, GRAFANA_CLI_CONFIG_PATH: configPath },
    encoding: "utf-8",
  });
}

describe("Config Flow Integration", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grafana-cli-test-"));
    configPath = path.join(tmpDir, "config.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("config set saves configuration and config list shows it", () => {
    // Set a config
    const setOutput = cli(
      ["config", "set", "--url", "https://grafana.example.com", "--name", "test-server"],
      configPath,
    );
    expect(setOutput).toContain("test-server");
    expect(setOutput).toContain("saved");

    // Verify config file was created with correct permissions
    const stat = fs.statSync(configPath);
    expect(stat.mode & 0o777).toBe(0o600);

    // List configs
    const listOutput = cli(["config", "list"], configPath);
    expect(listOutput).toContain("test-server");
    expect(listOutput).toContain("https://grafana.example.com");
    expect(listOutput).not.toContain("apiKey");
  });

  it("first config is set as default automatically", () => {
    cli(
      ["config", "set", "--url", "https://grafana.example.com", "--name", "prod"],
      configPath,
    );

    const store = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(store.activeConfig).toBe("prod");
    expect(store.configs["prod"].isDefault).toBe(true);
  });

  it("config set with API key stores it securely", () => {
    cli(
      [
        "config", "set",
        "--url", "https://grafana.example.com",
        "--name", "prod",
        "--api-key", "secret-key-123",
      ],
      configPath,
    );

    // API key should be in config file (but not displayed in list)
    const store = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(store.configs["prod"].apiKey).toBe("secret-key-123");

    // Should not show raw key in list output
    const listOutput = cli(["config", "list"], configPath);
    expect(listOutput).not.toContain("secret-key-123");
    expect(listOutput).toContain("API Key");
  });

  it("config delete removes a configuration", () => {
    cli(["config", "set", "--url", "https://grafana.example.com", "--name", "to-delete"], configPath);
    cli(["config", "delete", "to-delete"], configPath);

    const listOutput = cli(["config", "list"], configPath);
    expect(listOutput).toContain("No configurations found");
  });

  it("config set rejects invalid URL", () => {
    expect(() =>
      cli(["config", "set", "--url", "not-a-url", "--name", "bad"], configPath),
    ).toThrow();
  });

  it("config set rejects mixing API key and basic auth", () => {
    expect(() =>
      cli(
        [
          "config", "set",
          "--url", "https://grafana.example.com",
          "--name", "bad",
          "--api-key", "key",
          "--username", "admin",
          "--password", "pass",
        ],
        configPath,
      ),
    ).toThrow();
  });
});

describe.skipIf(!GRAFANA_TEST_URL)("Status Flow Integration (requires Grafana)", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grafana-cli-test-"));
    configPath = path.join(tmpDir, "config.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("config set → status verifies connectivity and shows version", () => {
    const args = [
      "config", "set",
      "--url", GRAFANA_TEST_URL!,
      "--name", "test",
    ];
    if (process.env["GRAFANA_API_KEY"]) {
      args.push("--api-key", process.env["GRAFANA_API_KEY"]);
    }
    cli(args, configPath);

    const statusOutput = cli(["status"], configPath);
    expect(statusOutput).toContain("VERSION");
    expect(statusOutput).toContain("DATABASE");
    expect(statusOutput).toMatch(/\d+\.\d+\.\d+/); // semver pattern
  });
});
