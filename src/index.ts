#!/usr/bin/env node
import { Command } from "commander";

import { createConfigCommand } from "./commands/config.js";
import { createDashboardCommand } from "./commands/dashboard.js";
import { createQueryCommand } from "./commands/query.js";
import { createStatusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("grafana-cli")
  .description("Grafana CLI - Query Grafana from terminal")
  .version("0.1.0");

// Register commands
program.addCommand(createConfigCommand());
program.addCommand(createStatusCommand());
program.addCommand(createDashboardCommand());
program.addCommand(createQueryCommand());

program.parse();
