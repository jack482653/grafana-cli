import { Command } from "commander";

import { formatJson } from "../formatters/json.js";
import { formatTable } from "../formatters/table.js";
import { getActiveConfig, loadConfigStore } from "../services/config-store.js";
import { getServerStatus } from "../services/grafana-client.js";

export function createStatusCommand(): Command {
  const cmd = new Command("status");
  cmd.description("Check Grafana server health and connectivity");
  cmd.option("--server <name>", "Server configuration to use");
  cmd.option("--json", "Output as JSON");

  cmd.action(async (options) => {
    // Get config
    let config;
    if (options.server) {
      const store = loadConfigStore();
      config = store.configs[options.server];
      if (!config) {
        console.error(`Error: Configuration "${options.server}" not found`);
        console.error("List available configurations with: grafana-cli config list");
        process.exit(1);
      }
    } else {
      config = getActiveConfig();
      if (!config) {
        console.error("Error: No active configuration");
        console.error("Set a configuration with: grafana-cli config set --url <url> --name <name>");
        process.exit(1);
      }
    }

    // Fetch server status
    const status = await getServerStatus(config);

    if (options.json) {
      console.log(formatJson(status));
    } else {
      console.log(`Server Status: ${config.url}\n`);
      console.log(
        formatTable({
          columns: [
            { header: "VERSION", key: "version" },
            { header: "DATABASE", key: "database" },
            { header: "COMMIT", key: "commit" },
          ],
          data: [
            {
              version: status.version,
              database: status.database,
              commit: status.commit || "N/A",
            },
          ],
        }),
      );
    }
  });

  return cmd;
}
