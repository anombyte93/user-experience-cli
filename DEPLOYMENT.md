# Tailscale Deployment Guide

## Quick Start

### 1. Install Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### 2. Deploy Dashboard with Tailscale Funnel

```bash
cd /home/anombyte/.claude/skills/user-experience/dashboard

# Build and start with Docker Compose
docker-compose up -d

# Enable Tailscale Funnel (exposes port 3000 publicly via your Tailscale IP)
tailscale funnel 3000
```

### 3. Access Dashboard

Your dashboard is now accessible at:
- **Local**: http://localhost:3000
- **Tailscale**: https://<your-tailscale-ip>.tls-hlb.ts.net:3000

## Manual Deployment (without Docker)

```bash
cd /home/anombyte/.claude/skills/user-experience/dashboard

# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start

# In another terminal, enable Tailscale Funnel
tailscale funnel 3000
```

## Environment Variables

Create `.env.local`:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://localhost:3000/api
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## CLI Integration

The CLI automatically posts audit results to the dashboard:

```bash
# Set dashboard URL
export UX_DASHBOARD_URL="http://localhost:3000"

# Run audit (results auto-posted)
user-experience audit ./my-tool

# View results on dashboard
open http://localhost:3000
```

## Production Considerations

1. **Database**: Replace JSON file storage with PostgreSQL/SQLite
2. **Authentication**: Add NextAuth.js for multi-user support
3. **Rate Limiting**: Add API rate limiting for public access
4. **HTTPS**: Tailscale Funnel provides automatic TLS
5. **Monitoring**: Add health check endpoint at `/api/health`

## Troubleshooting

**Dashboard not accessible via Tailscale?**
- Check Tailscale status: `tailscale status`
- Verify Funnel is running: `tailscale funnel status`
- Check firewall rules

**Reports not showing up?**
- Check `/tmp/user-experience-reports.json` exists
- Verify CLI can reach API: `curl http://localhost:3000/api/reports`
- Check dashboard logs: `docker-compose logs dashboard`
