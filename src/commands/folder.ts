import { Command, Option } from "commander";

import { formatJson } from "../formatters/json.js";
import { formatTable } from "../formatters/table.js";
import { resolveConfig } from "../services/config-store.js";
import { listFolders } from "../services/grafana-client.js";

export function createFolderCommand(): Command {
  const folder = new Command("folder").description("Discover Grafana folders");

  // T005: folder list with table formatting
  folder
    .command("list")
    .description("List folders")
    .option("--config <name>", "Site configuration to use")
    .addOption(new Option("--server <name>").hideHelp())
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const config = resolveConfig(options.config ?? options.server);
      const folders = await listFolders(config);

      if (options.json) {
        console.log(formatJson(folders));
        return;
      }

      if (folders.length === 0) {
        console.log("No folders found.");
        return;
      }

      console.log(
        formatTable({
          columns: [
            { key: "id", header: "ID", width: 8 },
            { key: "uid", header: "UID" },
            { key: "title", header: "TITLE" },
          ],
          data: folders.map((f) => ({
            id: String(f.id),
            uid: f.uid || "-",
            title: f.title,
          })),
        }),
      );
    });

  return folder;
}
