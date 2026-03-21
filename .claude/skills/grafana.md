---
name: grafana
description: Interact with Grafana v7.5+ via the grafana-cli CLI tool. Use when the user wants to list/view dashboards, check alerts, query metrics, check server status, or manage Grafana site configurations from the terminal.
triggers:
  - grafana
  - grafana-cli
  - dashboard
  - alert
---

# grafana-cli

A Node.js CLI tool for accessing Grafana v7.5+ from the terminal.

## Installation

```bash
git clone https://github.com/jack482653/grafana-cli.git
cd grafana-cli && pnpm install && pnpm build && pnpm link --global
```

## Site Configuration

```bash
# Add a site
grafana-cli config set --name prod --url https://grafana.example.com --api-key <key>
grafana-cli config set --name staging --url https://grafana-staging.example.com --api-key <key>

# List all configured sites
grafana-cli config list

# Set default site
grafana-cli config use prod

# Show active site
grafana-cli config show

# Remove a site
grafana-cli config delete staging
```

## Per-Command Site Selection

Every operational command accepts `--config <name>` to target a specific site **without** changing the global default:

```bash
grafana-cli status --config staging
grafana-cli dashboard list --config prod
grafana-cli alert list --config staging
grafana-cli query execute --dashboard <uid> --panel <id> --config prod
```

## status — Check Server Health

```bash
grafana-cli status                    # active site
grafana-cli status --config prod      # specific site
grafana-cli status --json             # JSON output
```

## dashboard — Browse Dashboards

```bash
# List dashboards
grafana-cli dashboard list
grafana-cli dashboard list --config staging
grafana-cli dashboard list --folder "My Folder"
grafana-cli dashboard list --tag prometheus
grafana-cli dashboard list --query "latency"
grafana-cli dashboard list --json

# Get dashboard details and panel list
grafana-cli dashboard get <uid>
grafana-cli dashboard get <uid> --config prod
grafana-cli dashboard get <uid> --json
```

## query — Execute Panel Queries

```bash
# Execute a panel query (returns time-series data)
grafana-cli query execute --dashboard <uid> --panel <panel-id>
grafana-cli query execute --dashboard <uid> --panel <panel-id> --from now-1h --to now
grafana-cli query execute --dashboard <uid> --panel <panel-id> --config prod
grafana-cli query execute --dashboard <uid> --panel <panel-id> --json

# With template variable substitution
grafana-cli query execute --dashboard <uid> --panel <panel-id> --var job=prometheus --var env=prod

# Time formats: now, now-1h, now-24h, now-7d, ISO 8601 (2024-01-01T00:00:00Z), Unix seconds
```

## alert — Monitor Alerts

```bash
# List alerts
grafana-cli alert list
grafana-cli alert list --config staging
grafana-cli alert list --state alerting        # ok | alerting | pending | paused | no_data
grafana-cli alert list --folder "Ops"
grafana-cli alert list --query "cpu"
grafana-cli alert list --json

# Get alert details (conditions, frequency, last state change)
grafana-cli alert get <id>
grafana-cli alert get <id> --config prod
grafana-cli alert get <id> --json
```

## Common Options

| Option | Commands | Description |
|--------|----------|-------------|
| `--config <name>` | status, dashboard, query, alert | Use named site for this invocation only |
| `--json` | all | Output as JSON (pipeable) |
| `--state <state>` | alert list | Filter by alert state |
| `--folder <name>` | dashboard list, alert list | Filter by folder |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GRAFANA_CLI_CONFIG_PATH` | Override config file path (default: `~/.grafana-cli/config.json`) |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Authentication error (401/403) |
| 3 | Network error (connection refused / timeout) |

## Common Workflows

```bash
# Compare alert states across environments
grafana-cli alert list --json --config prod    | jq '.[].state'
grafana-cli alert list --json --config staging | jq '.[].state'

# Find a dashboard UID then query its panel
grafana-cli dashboard list --query "API Latency" --config prod
grafana-cli query execute --dashboard <uid> --panel 1 --from now-1h --config prod

# Check staging health without switching default
grafana-cli status --config staging
```
