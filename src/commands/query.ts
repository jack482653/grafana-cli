import { Command } from "commander";

import { formatJson } from "../formatters/json.js";
import { formatTable } from "../formatters/table.js";
import { resolveConfig } from "../services/config-store.js";
import { executeQuery } from "../services/grafana-client.js";
import { parseTime } from "../services/time-parser.js";

function collectVar(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function createQueryCommand(): Command {
  const query = new Command("query").description("Execute Grafana panel queries");

  query
    .command("execute")
    .description("Execute a panel query and display results")
    .requiredOption("--dashboard <uid>", "Dashboard UID")
    .requiredOption("--panel <id>", "Panel ID", parseInt)
    .option("--from <time>", "Start time (now-1h, now-24h, ISO 8601, Unix seconds)", "now-1h")
    .option("--to <time>", "End time", "now")
    .option("--var <key=value>", "Template variable substitution (repeatable)", collectVar, [])
    .option(
      "--datasource <uid>",
      "Datasource UID override (required when API key lacks datasource list permission)",
    )
    .option("--server <name>", "Use specific server configuration")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const config = resolveConfig(options.server);

      // Parse time range
      let fromMs: number, toMs: number;
      try {
        fromMs = parseTime(options.from);
        toMs = parseTime(options.to);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }

      // Parse --var flags into key=value map
      const variables: Record<string, string> = {};
      for (const kv of options.var as string[]) {
        const eqIdx = kv.indexOf("=");
        if (eqIdx === -1) {
          console.error(`Error: Invalid --var format "${kv}". Expected key=value`);
          process.exit(1);
        }
        variables[kv.slice(0, eqIdx)] = kv.slice(eqIdx + 1);
      }

      // Progress indicator + cancellation support
      process.stderr.write("Executing query...\n");
      const controller = new AbortController();
      const sigintHandler = () => {
        controller.abort();
        console.error("\nCancelled.");
        process.exit(130);
      };
      process.on("SIGINT", sigintHandler);

      let results;
      try {
        results = await executeQuery(
          config,
          options.dashboard,
          options.panel,
          { from: fromMs, to: toMs },
          variables,
          controller.signal,
          options.datasource,
        );
      } catch (err: any) {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
          console.error("\nCancelled.");
          process.exit(130);
        }
        throw err;
      } finally {
        process.off("SIGINT", sigintHandler);
      }

      if (options.json) {
        console.log(
          formatJson({
            dashboard: options.dashboard,
            panel: options.panel,
            from: new Date(fromMs).toISOString(),
            to: new Date(toMs).toISOString(),
            queries: results.map((r) => ({
              refId: r.refId,
              datapoints: r.series.flatMap((s) =>
                s.datapoints.map((dp) => ({
                  timestamp: dp.timestamp,
                  value: dp.value,
                  labels: s.labels,
                })),
              ),
            })),
          }),
        );
        return;
      }

      // Human-readable output
      const fromStr = new Date(fromMs).toISOString().replace("T", " ").slice(0, 19);
      const toStr = new Date(toMs).toISOString().replace("T", " ").slice(0, 19);
      console.log(`Time Range: ${fromStr} to ${toStr}\n`);

      if (results.length === 0) {
        console.log("No results.");
        return;
      }

      for (const result of results) {
        if (result.series.length === 0) {
          console.log(`Query ${result.refId}: (no data)\n`);
          continue;
        }

        for (const series of result.series) {
          const labelStr = Object.entries(series.labels)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ");
          console.log(`Query ${result.refId}: ${series.name}${labelStr ? ` {${labelStr}}` : ""}`);

          if (series.datapoints.length === 0) {
            console.log("  (no datapoints)\n");
            continue;
          }

          console.log(
            formatTable({
              columns: [
                { key: "timestamp", header: "TIMESTAMP", width: 22 },
                { key: "value", header: "VALUE", width: 16 },
              ],
              data: series.datapoints.map((dp) => ({
                timestamp: new Date(dp.timestamp).toISOString().replace("T", " ").slice(0, 19),
                value: dp.value !== null ? String(dp.value) : "null",
              })),
            }),
          );
          console.log();
        }
      }
    });

  return query;
}
