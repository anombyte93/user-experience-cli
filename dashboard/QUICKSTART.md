# Quick Start Guide

Get the User Experience Dashboard running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- (Optional) Tailscale account for private access

## Installation

### 1. Install Dependencies

```bash
cd /home/anombyte/.claude/skills/user-experience/dashboard
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Open Dashboard

Visit `http://localhost:3000`

## Usage

### View Reports

The dashboard shows all UX audit reports with:
- Overall statistics
- Severity filtering
- Score badges
- Red flag summaries

Click any report to view details.

### Export Reports (Pro+)

On report detail pages, click "Export PDF" to download.

### Change Settings

Navigate to Settings to:
- Upgrade your tier
- Configure API keys
- Change theme (light/dark/system)
- Manage notifications

## CLI Integration

The CLI tool automatically sends reports to the dashboard:

```bash
# Run audit
ux-audit audit /path/to/cli-tool

# Specify custom dashboard URL
ux-audit audit /path/to/cli-tool --dashboard-url http://localhost:3000
```

## Deploy for Production

### Option 1: Tailscale Funnel (Recommended - Free)

```bash
# 1. Build dashboard
npm run build

# 2. Start server
npm start &

# 3. Enable Tailscale Funnel
tailscale funnel --https=443 localhost:3000

# 4. Access at
# https://your-node.tailnet-name.ts.net
```

### Option 2: Vercel (Public - Free Tier)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel
```

### Option 3: Docker

```bash
# Build and run
docker-compose up -d

# Access at http://localhost:3000
```

## Environment Variables

Create `.env.local` for local development:

```bash
# Dashboard URL
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3000

# Stripe (optional - for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

## Troubleshooting

### Port 3000 already in use

```bash
# Kill process on port 3000
lsof -ti :3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Dependencies won't install

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build errors

```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

## Next Steps

1. **Read the full README** - Complete feature documentation
2. **Check DEPLOYMENT.md** - Production deployment options
3. **Review IMPLEMENTATION_SUMMARY.md** - Technical details

## Support

- **Documentation**: `README.md`, `DEPLOYMENT.md`
- **Issues**: GitHub Issues
- **Email**: support@user-experience.cli

---

**Dashboard is now ready to use! 🚀**
