# Quickstart: Datasource & Folder Listing

## Discover folders before filtering

```bash
# See what folders exist before guessing a name
grafana-cli folder list

ID   UID              TITLE
42   prod-folder      Production
43   staging-folder   Staging

# Now use a real folder name
grafana-cli dashboard list --folder Production
grafana-cli alert list --folder Production
```

## Discover datasources before querying

```bash
# See what datasources are available (requires Editor/Admin role)
grafana-cli datasource list

ID   NAME             TYPE                              DEFAULT
1    Prometheus       prometheus                         yes
2    Azure Monitor     grafana-azure-monitor-datasource   no

# Now use a real datasource name/id to override auto-resolution
grafana-cli query execute --dashboard <uid> --panel <id> --datasource Prometheus
```

## Multi-server usage

```bash
# Target a specific site without changing your default
grafana-cli folder list --config staging
grafana-cli datasource list --config prod
```

## Scripting with --json

```bash
# List all folder titles
grafana-cli folder list --json | jq -r '.[].title'

# Find the default datasource's name
grafana-cli datasource list --json | jq -r '.[] | select(.isDefault) | .name'
```

## Permission errors

```bash
$ grafana-cli datasource list --config viewer-only-site
Error: Permission denied listing datasources.
Server: https://grafana.example.com
Listing datasources requires Editor or Admin role. Check your account role or API key permissions.
```
