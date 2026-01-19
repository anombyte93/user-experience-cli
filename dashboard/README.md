# User Experience Dashboard

Web interface for the UX Audit CLI tool. View reports, manage audits, and access premium features.

## Features

- 📊 **Dashboard**: View all audit reports with filtering and stats
- 📄 **Report Detail**: Full report view with red flags, scores, and recommendations
- 💰 **Pricing**: Tier management (Free/Pro/Enterprise)
- ⚙️ **Settings**: User preferences, API keys, and configuration
- 🌙 **Dark Mode**: Full dark mode support with system preference detection
- 📱 **Responsive**: Mobile, tablet, and desktop layouts
- 📤 **Export**: PDF/Markdown export for Pro+ tiers
- 🔒 **Tailscale**: Secure private access via Tailscale tunnel

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **SWR** - Data fetching and caching
- **jsPDF** - PDF generation
- **next-themes** - Dark mode support
- **Lucide React** - Icons

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The dashboard will be available at `http://localhost:3000`

### Environment Variables

Create a `.env.local` file:

```bash
# Stripe (for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Tailscale (optional - for private tunnel)
TAILSCALE_AUTH_KEY=tskey-auth-...
TAILSCALE_TAILNET=example.com
```

## Tailscale Tunnel Setup

For secure private access without exposing the dashboard to the public internet:

### 1. Install Tailscale

```bash
# Linux
curl -fsSL https://tailscale.com/install.sh | sh

# macOS
brew install tailscale

# Start Tailscale
sudo tailscale up
```

### 2. Enable Funnel (for HTTPS tunnel)

```bash
# Enable funnel
tailscale funnel --https=443 localhost:3000

# Or use a specific hostname
tailscale funnel --https=443 --cert=my-dashboard.example.com localhost:3000
```

### 3. Access Your Dashboard

After setting up the tunnel, access your dashboard at:

- `https://my-dashboard.tailnet-name.ts.net`

### 4. Configure ACLs (Optional)

Restrict access to specific users in your Tailscale admin console:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["user:you@example.com"],
      "dst": ["tag:dashboard:443"]
    }
  ],
  "tagOwners": {
    "tag:dashboard": ["you@example.com"]
  }
}
```

### Alternative: Using Docker

```bash
# Run dashboard with Tailscale sidecar
docker-compose up -d
```

See `docker-compose.yml` for configuration.

## API Routes

### `GET /api/reports`
List all audit reports

**Query params:**
- `severity`: Filter by severity (critical, high, medium, low)
- `minScore`: Minimum score filter

**Response:**
```json
{
  "reports": [...],
  "total": 10,
  "timestamp": "2025-01-20T..."
}
```

### `POST /api/reports`
Store a new audit report (called by CLI)

**Body:**
```json
{
  "toolName": "my-cli-tool",
  "toolPath": "/usr/local/bin/my-tool",
  "score": 8.5,
  "redFlags": [...]
}
```

### `GET /api/reports/[id]`
Fetch a specific report by ID

### `GET /api/stats`
Get usage statistics by tier

**Query params:**
- `tier`: User's tier (free, pro, enterprise)

**Response:**
```json
{
  "stats": {
    "tier": "free",
    "auditsThisMonth": 3,
    "auditsTotal": 15,
    "quotaLimit": 5,
    "quotaRemaining": 2,
    "avgScore": 7.8,
    "criticalIssues": 2,
    "highIssues": 8
  }
}
```

### `POST /api/checkout`
Initiate Stripe checkout for tier upgrade

## Data Storage

Reports are stored in `/tmp/user-experience-reports.json` by default.

**For production**, configure a database:

1. Create `src/lib/db.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
export default prisma
```

2. Update API routes to use database instead of file storage.

## CLI Integration

The CLI tool automatically pushes reports to the dashboard:

```bash
# Run audit (sends to dashboard automatically)
ux-audit audit /path/to/cli-tool

# Specify dashboard URL
ux-audit audit /path/to/cli-tool --dashboard-url https://my-dashboard.tailnet.ts.net
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build image
docker build -t ux-dashboard .

# Run container
docker run -p 3000:3000 ux-dashboard
```

### Self-Hosted

```bash
# Build
npm run build

# Start
npm start -- --port 3000
```

## Tier Limits

| Tier  | Audits/Month | Dashboard | PDF Export | Features |
|-------|--------------|-----------|------------|----------|
| Free  | 5            | Basic     | ❌         | Basic scoring, markdown |
| Pro   | 100          | Full      | ✅         | Advanced scoring, priority support |
| Enterprise | ∞     | Full      | ✅         | Custom rules, SSO, API access |

## Development

### Project Structure

```
dashboard/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── pricing/        # Pricing page
│   │   ├── reports/[id]/   # Report detail page
│   │   └── settings/       # Settings page
│   ├── components/         # React components
│   │   ├── header.tsx
│   │   ├── report-card.tsx
│   │   ├── score-badge.tsx
│   │   ├── red-flag-list.tsx
│   │   ├── export-button.tsx
│   │   ├── tier-selector.tsx
│   │   └── theme-toggle.tsx
│   └── lib/               # Utility functions
├── public/                # Static assets
└── package.json
```

### Adding New Features

1. Create component in `src/components/`
2. Add page in `src/app/`
3. Create API route in `src/app/api/`
4. Update types as needed

## Security

- API keys stored locally (never sent to server)
- Tailscale provides encryption and authentication
- No external dependencies for data storage
- Reports stored in JSON (migrate to DB for production)

## Support

- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Documentation: [Full Docs](https://docs.example.com)
- Email: support@user-experience.cli

## License

MIT
