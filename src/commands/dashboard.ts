import { Command } from "commander";

import { formatJson } from "../formatters/json.js";
import { formatTable } from "../formatters/table.js";
import { resolveConfig } from "../services/config-store.js";
import { getDashboard, listDashboards } from "../services/grafana-client.js";

export function createDashboardCommand(): Command {
  const dashboard = new Command("dashboard").description("Manage and view Grafana dashboards");

  dashboard
    .command("list")
    .description("List dashboards")
    .option("--server <name>", "Use specific server configuration")
    .option("--folder <name>", "Filter by folder name")
    .option("--tag <tag>", "Filter by tag")
    .option("--query <text>", "Search by title")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const config = resolveConfig(options.server);

      const dashboards = await listDashboards(config, {
        folder: options.folder,
        tag: options.tag,
        query: options.query,
      });

      if (options.json) {
        console.log(formatJson(dashboards));
        return;
      }

      if (dashboards.length === 0) {
        console.log("No dashboards found.");
        return;
      }

      console.log(
        formatTable({
          columns: [
            { key: "uid", header: "UID", width: 20 },
            { key: "title", header: "Title", width: 40 },
            { key: "folder", header: "Folder", width: 20 },
            { key: "tags", header: "Tags", width: 20 },
          ],
          data: dashboards.map((d) => ({
            uid: d.uid,
            title: d.title,
            folder: d.folderTitle || "",
            tags: (d.tags ?? []).join(", "),
          })),
        }),
      );
    });

  dashboard
    .command("get <uid>")
    .description("Get dashboard details by UID")
    .option("--server <name>", "Use specific server configuration")
    .option("--json", "Output as JSON")
    .action(async (uid: string, options) => {
      const config = resolveConfig(options.server);

      const d = await getDashboard(config, uid);

      if (options.json) {
        console.log(formatJson(d));
        return;
      }

      console.log(`Title:  ${d.title}`);
      console.log(`UID:    ${d.uid}`);
      if (d.folderTitle) console.log(`Folder: ${d.folderTitle}`);
      if (d.tags && d.tags.length > 0) console.log(`Tags:   ${d.tags.join(", ")}`);
      if (d.url) console.log(`URL:    ${d.url}`);

      if (d.panels && d.panels.length > 0) {
        console.log("\nPanels:");
        console.log(
          formatTable({
            columns: [
              { key: "id", header: "ID", width: 6 },
              { key: "title", header: "Title", width: 40 },
              { key: "type", header: "Type", width: 20 },
            ],
            data: d.panels.map((p) => ({
              id: String(p.id),
              title: p.title,
              type: p.type,
            })),
          }),
        );
      }
    });

  return dashboard;
}
