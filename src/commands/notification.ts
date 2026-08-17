import { Command, Option } from "commander";

import { formatJson } from "../formatters/json.js";
import { formatTable } from "../formatters/table.js";
import { resolveConfig } from "../services/config-store.js";
import { getNotificationChannel, listNotificationChannels } from "../services/grafana-client.js";

export function createNotificationCommand(): Command {
  const notification = new Command("notification").description(
    "Discover Grafana alert notification channels",
  );

  // T005: notification list with table formatting
  notification
    .command("list")
    .description("List notification channels")
    .option("--config <name>", "Site configuration to use")
    .addOption(new Option("--server <name>").hideHelp())
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const config = resolveConfig(options.config ?? options.server);
      const channels = await listNotificationChannels(config);

      if (options.json) {
        console.log(formatJson(channels));
        return;
      }

      if (channels.length === 0) {
        console.log("No notification channels found.");
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
          data: channels.map((c) => ({
            id: String(c.id),
            name: c.name,
            type: c.type,
            isDefault: c.isDefault ? "yes" : "no",
          })),
        }),
      );
    });

  // T005: notification get with detail formatting
  notification
    .command("get <id>")
    .description("Get notification channel details")
    .option("--config <name>", "Site configuration to use")
    .addOption(new Option("--server <name>").hideHelp())
    .option("--json", "Output as JSON")
    .action(async (id: string, options) => {
      const config = resolveConfig(options.config ?? options.server);
      if (!/^\d+$/.test(id)) {
        console.error("Error: Channel ID must be a number.");
        process.exit(1);
      }
      const channelId = parseInt(id, 10);

      const detail = await getNotificationChannel(config, channelId);

      if (options.json) {
        console.log(formatJson(detail));
        return;
      }

      console.log(`Name:                    ${detail.name}`);
      console.log(`Type:                    ${detail.type}`);
      console.log(`Default:                 ${detail.isDefault ? "yes" : "no"}`);
      console.log(`Send Reminder:           ${detail.sendReminder ? "yes" : "no"}`);
      console.log(`Disable Resolve Message: ${detail.disableResolveMessage ? "yes" : "no"}`);
      if (detail.created) console.log(`Created:                 ${detail.created}`);
      if (detail.updated) console.log(`Updated:                 ${detail.updated}`);

      const settingsKeys = Object.keys(detail.settings);
      if (settingsKeys.length === 0) {
        console.log("\nSettings: (none)");
      } else {
        console.log("\nSettings:");
        for (const key of settingsKeys) {
          const value = detail.settings[key];
          const rendered =
            typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
          console.log(`  ${key}: ${rendered}`);
        }
      }
    });

  return notification;
}
