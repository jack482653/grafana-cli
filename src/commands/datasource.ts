import { Command, Option } from "commander";

import { formatJson } from "../formatters/json.js";
import { formatTable } from "../formatters/table.js";
import { resolveConfig } from "../services/config-store.js";
import { listDatasources } from "../services/grafana-client.js";

export function createDatasourceCommand(): Command {
  const datasource = new Command("datasource").description("Discover Grafana datasources");

  // T011: datasource list with table formatting
  datasource
    .command("list")
    .description("List datasources")
    .option("--config <name>", "Site configuration to use")
    .addOption(new Option("--server <name>").hideHelp())
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const config = resolveConfig(options.config ?? options.server);
      const datasources = await listDatasources(config);

      if (options.json) {
        console.log(formatJson(datasources));
        return;
      }

      if (datasources.length === 0) {
        console.log("No datasources found.");
        return;
      }

      console.log(
        formatTable({
          columns: [
            { key: "id", header: "ID", width: 8 },
            { key: "name", header: "NAME" },
            { key: "type", header: "TYPE" },
            { key: "isDefault", header: "DEFAULT", width: 8 },
          ],
          data: datasources.map((d) => ({
            id: String(d.id),
            name: d.name,
            type: d.type,
            isDefault: d.isDefault ? "yes" : "no",
          })),
        }),
      );
    });

  return datasource;
}
