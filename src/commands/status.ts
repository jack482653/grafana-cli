import { Command, Option } from "commander";

import { formatJson } from "../formatters/json.js";
import { formatTable } from "../formatters/table.js";
import { resolveConfig } from "../services/config-store.js";
import { getServerStatus } from "../services/grafana-client.js";

export function createStatusCommand(): Command {
  const cmd = new Command("status");
  cmd.description("Check Grafana server health and connectivity");
  cmd.option("--config <name>", "Site configuration to use");
  cmd.addOption(new Option("--server <name>").hideHelp());
  cmd.option("--json", "Output as JSON");

  cmd.action(async (options) => {
    const config = resolveConfig(options.config ?? options.server);
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
