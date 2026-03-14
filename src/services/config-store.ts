import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { ConfigStore, ServerConfig } from "../types/index.js";

function getConfigPath(): string {
  return process.env["GRAFANA_CLI_CONFIG_PATH"] || path.join(os.homedir(), ".grafana-cli", "config.json");
}

function getConfigDir(): string {
  return path.dirname(getConfigPath());
}

/**
 * Load config store from disk
 */
export function loadConfigStore(): ConfigStore {
  const configFile = getConfigPath();
  try {
    if (!fs.existsSync(configFile)) {
      return { configs: {}, activeConfig: undefined };
    }

    const data = fs.readFileSync(configFile, "utf-8");
    return JSON.parse(data) as ConfigStore;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Error: Config file is corrupted: ${configFile}`);
      console.error("Please fix or delete the file and try again.");
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Save config store to disk with atomic write pattern
 */
export function saveConfigStore(store: ConfigStore): void {
  const configFile = getConfigPath();
  const configDir = getConfigDir();
  try {
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Atomic write: temp file + rename
    const tempFile = `${configFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), "utf-8");

    // Set file permissions to 0600 (owner read/write only)
    fs.chmodSync(tempFile, 0o600);

    // Rename temp file to actual config file (atomic on POSIX systems)
    fs.renameSync(tempFile, configFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EACCES") {
      console.error(`Error: Permission denied writing to: ${configFile}`);
      console.error("Check file and directory permissions.");
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Add or update a server configuration
 */
export function addConfig(name: string, config: Omit<ServerConfig, "name">): void {
  const store = loadConfigStore();

  // Create new config
  const newConfig: ServerConfig = {
    name,
    ...config,
  };

  // If this is the first config, make it default
  if (Object.keys(store.configs).length === 0) {
    newConfig.isDefault = true;
    store.activeConfig = name;
  }

  store.configs[name] = newConfig;
  saveConfigStore(store);
}

/**
 * Remove a server configuration
 */
export function removeConfig(name: string): void {
  const store = loadConfigStore();

  if (!store.configs[name]) {
    console.error(`Error: Config "${name}" not found`);
    process.exit(1);
  }

  delete store.configs[name];

  // If active config was deleted, clear it
  if (store.activeConfig === name) {
    store.activeConfig = undefined;
  }

  saveConfigStore(store);
}

/**
 * Set active configuration
 */
export function setActiveConfig(name: string): void {
  const store = loadConfigStore();

  if (!store.configs[name]) {
    console.error(`Error: Config "${name}" not found`);
    process.exit(1);
  }

  // Update isDefault flags
  Object.values(store.configs).forEach((config) => {
    config.isDefault = config.name === name;
  });

  store.activeConfig = name;
  saveConfigStore(store);
}

/**
 * Get active configuration
 */
export function getActiveConfig(): ServerConfig | null {
  const store = loadConfigStore();

  if (!store.activeConfig) {
    return null;
  }

  return store.configs[store.activeConfig] || null;
}
