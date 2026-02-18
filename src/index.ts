#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("grafana-cli")
  .description("Grafana CLI - Query Grafana from terminal")
  .version("0.1.0");

// Commands will be registered here
// (config, status, dashboard, query, alert commands)

program.parse();
