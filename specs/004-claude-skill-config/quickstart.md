# Quickstart: Per-Command Site Selection

## Multi-Server Workflows

### Check a non-default site without switching default

```bash
# No need to run: grafana-cli config use staging
grafana-cli status --config staging
```

### Compare alerts across environments

```bash
grafana-cli alert list --json --config prod   | jq '.[].state'
grafana-cli alert list --json --config staging | jq '.[].state'
```

### Query a specific dashboard on prod

```bash
grafana-cli query execute \
  --dashboard <uid> \
  --panel <id> \
  --from "now-1h" --to "now" \
  --config prod
```

### List dashboards on staging

```bash
grafana-cli dashboard list --config staging
```

### Backward compatibility

The old `--server` option still works (hidden from `--help` but functional):

```bash
grafana-cli status --server prod  # same as --config prod
```

## Claude Skill Usage

Once the skill file is installed, Claude understands grafana-cli natively:

> "List all alerting alerts on prod"
→ `grafana-cli alert list --state alerting --config prod`

> "Check if staging is healthy"
→ `grafana-cli status --config staging`

> "Get dashboard ABC123 details from staging"
→ `grafana-cli dashboard get ABC123 --config staging`
