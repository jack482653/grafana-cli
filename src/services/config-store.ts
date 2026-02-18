import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { ConfigStore, ServerConfig } from "../types/index.js";

const CONFIG_DIR = path.join(os.homedir(), ".grafana-cli");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

/**
 * Load config store from disk
 */
export function loadConfigStore(): ConfigStore {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { configs: {}, activeConfig: undefined };
    }

    const data = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(data) as ConfigStore;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Error: Config file is corrupted: ${CONFIG_FILE}`);
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
  try {
    // Ensure directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Atomic write: temp file + rename
    const tempFile = `${CONFIG_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), "utf-8");

    // Set file permissions to 0600 (owner read/write only)
    fs.chmodSync(tempFile, 0o600);

    // Rename temp file to actual config file (atomic on POSIX systems)
    fs.renameSync(tempFile, CONFIG_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EACCES") {
      console.error(`Error: Permission denied writing to: ${CONFIG_FILE}`);
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
