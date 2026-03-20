import { Command } from "commander";

import { formatJson } from "../formatters/json.js";
import { formatTable } from "../formatters/table.js";
import { resolveConfig } from "../services/config-store.js";
import { getAlert, listAlerts } from "../services/grafana-client.js";
import type { AlertState } from "../types/index.js";

export function createAlertCommand(): Command {
  const alert = new Command("alert").description("Manage Grafana alerts");

  // T058: alert list with table formatting
  alert
    .command("list")
    .description("List alerts")
    .option("--state <state>", "Filter by state (ok, alerting, pending, paused, no_data)")
    .option("--folder <name>", "Filter by folder name")
    .option("--query <text>", "Filter by alert name")
    .option("--server <name>", "Use specific server configuration")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const config = resolveConfig(options.server);
      const alerts = await listAlerts(config, {
        state: options.state as AlertState | undefined,
        folder: options.folder,
        query: options.query,
      });

      if (options.json) {
        console.log(formatJson(alerts));
        return;
      }

      if (alerts.length === 0) {
        console.log("No alerts found.");
        return;
      }

      console.log(
        formatTable({
          columns: [
            { key: "id", header: "ID", width: 8 },
            { key: "name", header: "NAME", width: 40 },
            { key: "state", header: "STATE", width: 12 },
            { key: "dashboard", header: "DASHBOARD", width: 12 },
            { key: "folder", header: "FOLDER", width: 20 },
          ],
          data: alerts.map((a) => ({
            id: String(a.id),
            name: a.name,
            state: a.state,
            dashboard: a.dashboardId ? String(a.dashboardId) : "-",
            folder: a.folderTitle || "-",
          })),
        }),
      );
    });

  // T059: alert get with detail formatting
  alert
    .command("get <id>")
    .description("Get alert details")
    .option("--server <name>", "Use specific server configuration")
    .option("--json", "Output as JSON")
    .action(async (id, options) => {
      const config = resolveConfig(options.server);
      const alertId = parseInt(id, 10);
      if (isNaN(alertId)) {
        console.error("Error: Alert ID must be a number.");
        process.exit(1);
      }

      const detail = await getAlert(config, alertId);

      if (options.json) {
        console.log(formatJson(detail));
        return;
      }

      console.log(`Name:        ${detail.name}`);
      console.log(`State:       ${detail.state}`);
      console.log(`Message:     ${detail.message || "-"}`);
      console.log(`Frequency:   ${detail.frequency}s`);
      console.log(`For:         ${Math.round(detail.forDuration / 1e9)}s`);
      console.log(`Last Change: ${detail.newStateDate}`);

      if (detail.executionError) {
        console.log(`Error:       ${detail.executionError}`);
      }

      if (detail.conditions.length > 0) {
        console.log(`\nConditions (${detail.conditions.length}):`);
        for (const cond of detail.conditions) {
          const params = cond.query.params?.join(", ") ?? "";
          const evalStr = `${cond.evaluator.type}(${cond.evaluator.params?.join(", ") ?? ""})`;
          console.log(`  [${cond.reducer.type}] ${evalStr}  query(${params})`);
        }
      }
    });

  return alert;
}
