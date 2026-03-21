# grafana-cli

A Node.js CLI tool for accessing Grafana from your terminal.

Supports Grafana v7.5+.

## Installation

```bash
git clone https://github.com/jack482653/grafana-cli.git
cd grafana-cli
pnpm install
pnpm build
pnpm link --global
```

## Quick Start

### 1. Add a server configuration

```bash
grafana-cli config set --name prod --url https://grafana.example.com --api-key <your-api-key>
```

### 2. Check server status

```bash
grafana-cli status
```

### 3. List dashboards

```bash
grafana-cli dashboard list
```

### 4. Query a panel

```bash
grafana-cli query execute --dashboard <uid> --panel <id> --from now-1h --to now
```

### 5. Check alerts

```bash
grafana-cli alert list
grafana-cli alert list --state alerting
```

## Command Reference

### config

```bash
# Add or update a server configuration
grafana-cli config set --name <name> --url <url> [--api-key <key>]
grafana-cli config set --name <name> --url <url> --username <user> --password <pass>

# List all configurations
grafana-cli config list

# Switch active server
grafana-cli config use <name>

# Remove a configuration
grafana-cli config delete <name>
```

### status

```bash
# Check active server health
grafana-cli status

# Check specific site
grafana-cli status --config <name>
```

### dashboard

```bash
# List all dashboards
grafana-cli dashboard list
grafana-cli dashboard list --folder <folder>
grafana-cli dashboard list --json

# Get dashboard details and panels
grafana-cli dashboard get <uid>
grafana-cli dashboard get <uid> --json
```

### query

```bash
# Execute a panel query
grafana-cli query execute --dashboard <uid> --panel <id>
grafana-cli query execute --dashboard <uid> --panel <id> --from now-24h --to now
grafana-cli query execute --dashboard <uid> --panel <id> --json

# With template variables
grafana-cli query execute --dashboard <uid> --panel <id> --var job=prometheus --var env=prod

# Time formats: now, now-1h, now-24h, now-7d, ISO 8601, Unix seconds
```

### alert

```bash
# List all alerts
grafana-cli alert list
grafana-cli alert list --state alerting
grafana-cli alert list --state ok
grafana-cli alert list --json

# Get alert details
grafana-cli alert get <id>
grafana-cli alert get <id> --json
```

## Multiple Servers

```bash
# Add multiple servers
grafana-cli config set --name staging --url https://grafana-staging.example.com --api-key <key>
grafana-cli config set --name prod --url https://grafana.example.com --api-key <key>

# Use --config <name> on any command to target a specific site
# without changing the global active config
grafana-cli status --config staging
grafana-cli dashboard list --config prod
grafana-cli alert list --config staging
grafana-cli query execute --dashboard <uid> --panel <id> --config prod

# Or switch the default site permanently
grafana-cli config use prod
```

## Environment Variables

| Variable                  | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| `GRAFANA_CLI_CONFIG_PATH` | Override default config file path (`~/.grafana-cli/config.json`) |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm test:coverage
```
