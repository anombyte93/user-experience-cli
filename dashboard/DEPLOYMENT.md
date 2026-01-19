# Deployment Guide

This guide covers deploying the User Experience Dashboard in various environments.

## Quick Start (Local Development)

```bash
cd /home/anombyte/.claude/skills/user-experience/dashboard
npm install
npm run dev
```

Visit `http://localhost:3000`

## Production Deployment Options

### 0. Docker (Recommended - Current Setup)

**Best for:** Isolated deployment, easy management, consistent environment

#### Current Deployment Status
- **Container**: `user-experience-dashboard`
- **Port**: 3002 (mapped to container port 3000)
- **Status**: ✅ Running and healthy

#### Access
```bash
# Local access
curl http://localhost:3002

# Or in browser
http://localhost:3002
```

#### Management
```bash
# Check status
docker ps | grep user-experience-dashboard

# View logs
docker logs user-experience-dashboard

# Restart
docker-compose restart dashboard

# Stop
docker-compose stop dashboard

# Start
docker-compose up -d dashboard
```

#### Tailscale Funnel with Docker
```bash
# After Docker container is running on port 3002
tailscale funnel --https=443 localhost:3002

# Access via your Tailscale hostname
https://archie.tail276dcf.ts.net
```

### 1. Tailscale Funnel (Standalone - Recommended for Private Access)

**Best for:** Personal use, team internal access, secure private dashboard

#### Prerequisites
- Tailscale account
- Tailscale installed on your machine

#### Setup

1. **Build the dashboard**
```bash
cd /home/anombyte/.claude/skills/user-experience/dashboard
npm run build
```

2. **Start the production server**
```bash
npm start &
# Or specify port
PORT=3000 npm start &
```

3. **Enable Tailscale Funnel**
```bash
# Enable funnel (first time)
tailscale funnel --https=443 localhost:3000

# Or with custom hostname
tailscale funnel --https=443 --cert=my-dashboard tailnet-name.ts.net localhost:3000
```

4. **Access your dashboard**
```
https://your-node.tailnet-name.ts.net
```

#### Benefits
- ✅ HTTPS encryption
- ✅ No public exposure
- ✅ Built-in authentication (Tailscale)
- ✅ No infrastructure cost
- ✅ Works behind NAT/firewall

#### Persistent Setup (Systemd)

Create `/etc/systemd/system/ux-dashboard.service`:

```ini
[Unit]
Description=UX Dashboard
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/anombyte/.claude/skills/user-experience/dashboard
ExecStart=/usr/bin/npm start
Restart=always
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ux-dashboard
sudo systemctl start ux-dashboard
```

### 2. Vercel (Public Access)

**Best for:** SaaS product, public dashboard, multi-tenant

#### Setup

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
cd /home/anombyte/.claude/skills/user-experience/dashboard
vercel
```

3. **Configure environment variables in Vercel dashboard**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
```

4. **Custom domain** (optional)
```bash
vercel domains add dashboard.yourdomain.com
```

#### Benefits
- ✅ Zero config deployment
- ✅ Automatic HTTPS
- ✅ CDN included
- ✅ Preview deployments
- ✅ Easy scaling

#### Pricing
- Hobby: Free
- Pro: $20/month
- Enterprise: Custom

### 3. Docker Deployment

**Best for:** Self-hosted, on-premise, air-gapped environments

#### Build

```bash
cd /home/anombyte/.claude/skills/user-experience/dashboard
docker build -t ux-dashboard .
```

#### Run

```bash
# Basic
docker run -p 3000:3000 ux-dashboard

# With environment variables
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_... \
  -e STRIPE_SECRET_KEY=sk_... \
  ux-dashboard

# With Tailscale sidecar
docker-compose up -d
```

#### Docker Compose

See `docker-compose.yml`:

```yaml
version: '3.8'
services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
    restart: unless-stopped

  tailscale:
    image: tailscale/tailscale:latest
    hostname: ux-dashboard
    privileged: true
    network_mode: host
    volumes:
      - /var/lib/tailscale:/var/lib/tailscale
    environment:
      - TS_AUTHKEY=${TS_AUTHKEY}
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_SERVE_CONFIG=/config/serve.json
    restart: unless-stopped
```

### 4. Traditional VPS/Server

**Best for:** Full control, custom infrastructure

#### Setup (Ubuntu/Debian)

1. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Clone and setup**
```bash
cd /var/www
git clone <your-repo> ux-dashboard
cd ux-dashboard/dashboard
npm install
npm run build
```

3. **Configure PM2** (process manager)
```bash
sudo npm install -g pm2

# Start app
pm2 start npm --name "ux-dashboard" -- start

# Configure auto-start on reboot
pm2 startup
pm2 save
```

4. **Setup Nginx reverse proxy**
```nginx
server {
    listen 80;
    server_name dashboard.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **Enable SSL with Certbot**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d dashboard.yourdomain.com
```

## Environment Variables

Create `.env.local` for local development or configure in your hosting platform:

```bash
# Stripe (optional - for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Database (optional - for production)
DATABASE_URL=postgresql://user:pass@localhost:5432/ux_dashboard

# Tailscale (optional - for tunnel)
TS_AUTHKEY=tskey-auth-...
TS_TAILNET=example.com

# Dashboard URL (for CLI integration)
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.example.com
```

## Security Checklist

- [ ] Enable HTTPS (TLS certificate)
- [ ] Set up authentication (Tailscale, OAuth, or custom)
- [ ] Configure CORS for API routes
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting on API routes
- [ ] Set up database backups (if using DB)
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Regular security updates

## Monitoring

### Health Check Endpoint

Add to `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
}
```

### Logging

Use a logging service like:
- Sentry (error tracking)
- Datadog (APM)
- LogRocket (session replay)
- Vercel Analytics (if on Vercel)

## Performance Optimization

1. **Enable compression** (Next.js does this by default)
2. **Use Image optimization** (next/image)
3. **Configure CDN** (Vercel does this automatically)
4. **Enable caching** (SWR handles this)
5. **Minimize bundle size** (tree-shaking, code splitting)

## Backup Strategy

### For File-Based Storage

```bash
# Backup reports
cp /tmp/user-experience-reports.json /backup/reports-$(date +%Y%m%d).json

# Automated backup (cron)
0 2 * * * cp /tmp/user-experience-reports.json /backup/reports-$(date +\%Y\%m\%d).json
```

### For Database

```bash
# PostgreSQL backup
pg_dump ux_dashboard > backup-$(date +%Y%m%d).sql

# Automated
0 2 * * * pg_dump ux_dashboard > /backup/ux-dashboard-$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Tailscale Funnel Issues

```bash
# Check Tailscale status
tailscale status

# Restart Tailscale
sudo systemctl restart tailscaled

# Check logs
sudo journalctl -u tailscaled -f
```

## Scaling

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Use larger VPS instance
- Optimize database queries

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy)
- Deploy multiple instances
- Use shared database/storage
- Configure sticky sessions if needed

### Database Migration

When migrating from file-based to database storage:

1. Create migration script
2. Export existing reports from JSON
3. Import into database
4. Update API routes
5. Test thoroughly
6. Deploy to production

## Support

- Documentation: `/README.md`
- Issues: GitHub Issues
- Email: support@user-experience.cli

## Checklist

- [ ] Choose deployment method
- [ ] Set up environment variables
- [ ] Configure database (if needed)
- [ ] Enable HTTPS
- [ ] Set up authentication
- [ ] Configure monitoring
- [ ] Set up backups
- [ ] Test deployment
- [ ] Configure custom domain (optional)
- [ ] Set up CI/CD (optional)
