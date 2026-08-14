# Quickstart: Alert Notification Channel Discovery

## Discover notification channels

```bash
grafana-cli notification list

ID   NAME       TYPE    DEFAULT
1    Ops Email  email   yes
2    Ops Slack  slack   no
```

## See where an alert actually notifies

```bash
# 1. Look at the alert itself
grafana-cli alert get 5

# 2. Cross-reference its notification channel by name/id from the listing
grafana-cli notification get 1

Name:                    Ops Email
Type:                    email
Default:                 yes
Send Reminder:           no
Disable Resolve Message: no
Created:                 2026-08-14T10:19:43Z
Updated:                 2026-08-14T10:19:43Z

Settings:
  addresses: ops@example.com
```

## Multi-server usage

```bash
grafana-cli notification list --config staging
grafana-cli notification get 1 --config prod
```

## Scripting with --json

```bash
# List all channel names
grafana-cli notification list --json | jq -r '.[].name'

# Get the default channel's settings
grafana-cli notification list --json | jq -r '.[] | select(.isDefault) | .id' \
  | xargs -I{} grafana-cli notification get {} --json | jq '.settings'
```

## Permission errors

```bash
$ grafana-cli notification list --config viewer-only-site
Error: Permission denied listing notification channels.
Server: https://grafana.example.com
Listing notification channels requires Editor or Admin role. Check your account role or API key permissions.
```

## Not found

```bash
$ grafana-cli notification get 9999
Error: Notification channel 9999 not found.
List available channels with: grafana-cli notification list
```
