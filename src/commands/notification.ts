import { Command } from "commander";

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
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const config = resolveConfig(options.config);
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
    .option("--json", "Output as JSON")
    .action(async (id: string, options) => {
      const config = resolveConfig(options.config);
      const channelId = parseInt(id, 10);
      if (isNaN(channelId)) {
        console.error("Error: Channel ID must be a number.");
        process.exit(1);
      }

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
      console.log("\nSettings:");
      if (settingsKeys.length === 0) {
        console.log("  (none)");
      } else {
        for (const key of settingsKeys) {
          console.log(`  ${key}: ${detail.settings[key]}`);
        }
      }
    });

  return notification;
}
