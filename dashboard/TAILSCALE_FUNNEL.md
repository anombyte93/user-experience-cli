# Tailscale Funnel Configuration

## Current Setup
Funnel is serving: https://archie.tail276dcf.ts.net:443 -> localhost:1456

## To Enable Dashboard on Funnel

### Option 1: Replace existing funnel
```bash
# Stop current funnel (if needed)
# Point funnel to dashboard
tailscale funnel --https=443 localhost:3002
```

### Option 2: Use Docker port mapping to re-use port 1456
```bash
# Stop current dashboard
docker-compose stop dashboard

# Update port in docker-compose.yml
# Change '3002:3000' to '1456:3000'

# Restart
docker-compose up -d dashboard
```

## Access
After configuration: https://archie.tail276dcf.ts.net

## Status
Dashboard container running on port 3002 (healthy)
Ready for funnel when needed.
