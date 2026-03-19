import { Command } from "commander";

import { formatJson } from "../formatters/json.js";
import { formatTable } from "../formatters/table.js";
import {
  addConfig,
  getActiveConfig,
  loadConfigStore,
  removeConfig,
  setActiveConfig,
} from "../services/config-store.js";

export function createConfigCommand(): Command {
  const cmd = new Command("config");
  cmd.description("Manage Grafana server configurations");

  // config set
  cmd
    .command("set")
    .description("Add or update a server configuration")
    .requiredOption("--url <url>", "Grafana server URL")
    .requiredOption("--name <name>", "Configuration name")
    .option("--api-key <key>", "API key for authentication")
    .option("--username <username>", "Username for basic auth")
    .option("--password <password>", "Password for basic auth")
    .action((options) => {
      // Validate URL format
      try {
        const url = new URL(options.url);
        if (!url.protocol.match(/^https?:$/)) {
          console.error("Error: Only http:// or https:// protocols are supported for the URL.");
          process.exit(1);
        }
      } catch {
        console.error("Error: Invalid URL format");
        console.error("Example: https://grafana.example.com");
        process.exit(1);
      }

      // Validate auth: either apiKey OR (username + password) OR neither
      if (options.apiKey && (options.username || options.password)) {
        console.error("Error: Cannot specify both API key and username/password");
        process.exit(1);
      }

      if ((options.username && !options.password) || (!options.username && options.password)) {
        console.error("Error: Username and password must be specified together");
        process.exit(1);
      }

      addConfig(options.name, {
        url: options.url,
        apiKey: options.apiKey,
        username: options.username,
        password: options.password,
        isDefault: false,
      });

      console.log(`Configuration "${options.name}" saved successfully`);
      console.log(`Server: ${options.url}`);
    });

  // config list
  cmd
    .command("list")
    .description("List all server configurations")
    .option("--json", "Output as JSON")
    .action((options) => {
      const store = loadConfigStore();
      const configs = Object.values(store.configs);

      if (configs.length === 0) {
        console.log("No configurations found");
        console.log("Add a configuration with: grafana-cli config set --url <url> --name <name>");
        return;
      }

      if (options.json) {
        console.log(formatJson(configs));
      } else {
        // Mask credentials in output
        const displayConfigs = configs.map((config) => ({
          name: config.name,
          url: config.url,
          auth: config.apiKey ? "API Key" : config.username ? "Basic Auth" : "None",
          default: config.isDefault ? "✓" : "",
        }));

        console.log(
          formatTable({
            columns: [
              { header: "NAME", key: "name" },
              { header: "URL", key: "url" },
              { header: "AUTH", key: "auth" },
              { header: "DEFAULT", key: "default" },
            ],
            data: displayConfigs,
          }),
        );
      }
    });

  // config delete
  cmd
    .command("delete <name>")
    .description("Delete a server configuration")
    .action((name) => {
      removeConfig(name);
      console.log(`Configuration "${name}" deleted successfully`);
    });

  // config use
  cmd
    .command("use <name>")
    .description("Set active/default configuration")
    .action((name) => {
      setActiveConfig(name);
      console.log(`Configuration "${name}" set as default`);
    });

  // config show
  cmd
    .command("show")
    .description("Show active configuration")
    .option("--json", "Output as JSON")
    .action((options) => {
      const config = getActiveConfig();

      if (!config) {
        console.error("Error: No active configuration");
        console.error("Set a configuration with: grafana-cli config set --url <url> --name <name>");
        process.exit(1);
      }

      if (options.json) {
        // Mask credentials in JSON output
        const safeConfig = {
          ...config,
          apiKey: config.apiKey ? "***" : undefined,
          password: config.password ? "***" : undefined,
        };
        console.log(formatJson(safeConfig));
      } else {
        console.log(`Active Configuration: ${config.name}`);
        console.log(`URL: ${config.url}`);
        console.log(
          `Auth: ${config.apiKey ? "API Key (***)" : config.username ? `Basic Auth (${config.username})` : "None"}`,
        );
      }
    });

  return cmd;
}
