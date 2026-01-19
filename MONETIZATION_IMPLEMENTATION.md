# Monetization System Implementation

## Overview

The user-experience CLI tool now has a complete monetization system with three tiers (Free, Pro, Enterprise) that enforce usage limits and feature gating.

## Architecture

### Core Components

#### 1. Type Definitions (`src/monetization/types.ts`)
- `TierType`: 'free' | 'pro' | 'enterprise'
- `FeatureFlags`: Feature availability configuration
- `UsageLimits`: Usage caps per tier
- `UsageData`: Local usage tracking structure
- `TierConfig`: Complete tier configuration

#### 2. Tier Management (`src/monetization/tier.ts`)
- Defines all three tiers with features and limits
- Provides tier lookup and comparison utilities
- Price formatting and savings calculation

#### 3. Usage Tracking (`src/monetization/limits.ts`)
- Stores usage data in `~/.user-experience/usage.json`
- Tracks audits per month with automatic reset
- Enforces limits before running audits
- Provides usage statistics

#### 4. Feature Gating (`src/monetization/features.ts`)
- Checks feature availability by tier
- Generates upgrade messages
- Compares tiers and feature sets

#### 5. License System (`src/monetization/license.ts`)
- Manages license keys and validation
- Integrates with Stripe webhooks
- Handles tier activation

#### 6. Stripe Integration (`src/api/stripe-webhook.ts`)
- Handles webhook events from Stripe
- Processes checkout completions
- Manages subscription updates/cancellations

### Tier Structure

```
┌─────────────────────────────────────────────────────────────┐
│ FREE TIER                                                    │
├─────────────────────────────────────────────────────────────┤
│ Price: $0                                                    │
│ Limits:                                                      │
│   - 5 audits/month                                          │
│   - 3 tools max                                             │
│   - 30 day retention                                        │
│ Features:                                                    │
│   - HTML/JSON export only                                   │
│   - No dashboard                                            │
│   - No validation (Phase 6)                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PRO TIER                                                     │
├─────────────────────────────────────────────────────────────┤
│ Price: $10/mo or $100/yr (save 17%)                         │
│ Limits:                                                      │
│   - 100 audits/month                                        │
│   - 50 tools max                                            │
│   - 365 day retention                                       │
│ Features:                                                    │
│   - All export formats (PDF, HTML, JSON)                    │
│   - Web dashboard                                           │
│   - AI validation (doubt-agents)                            │
│   - Priority support                                        │
│   - API access (1000 calls/mo)                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ENTERPRISE TIER                                              │
├─────────────────────────────────────────────────────────────┤
│ Price: Custom pricing                                       │
│ Limits:                                                      │
│   - Unlimited audits                                        │
│   - Unlimited tools                                         │
│   - Forever retention                                       │
│ Features:                                                    │
│   - All Pro features +                                      │
│   - Custom branding                                         │
│   - Team collaboration                                      │
│   - Dedicated account manager                               │
│   - Custom integrations                                     │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### CLI Commands

```bash
# Run an audit (respects tier limits)
user-experience /path/to/tool --tier pro

# Check usage statistics
user-experience usage

# List all tiers and features
user-experience tiers

# Upgrade tier (development mode)
user-experience upgrade pro
```

### Programmatic Usage

```typescript
import {
  checkUsageLimits,
  recordAudit,
  enforceFeatureAvailability,
  getCurrentLicense
} from './monetization';

// Check if user can run audit
const license = await getCurrentLicense();
const usage = await checkUsageLimits(license.tier, license.maxAuditsPerMonth);

if (!usage.allowed) {
  console.error(usage.reason);
  process.exit(1);
}

// Enforce feature availability
try {
  enforceFeatureAvailability(license.tier, 'validation');
} catch (error) {
  console.warn('Validation not available in current tier');
}

// Record audit after completion
await recordAudit(toolPath);
```

## Data Storage

### Usage Data (`~/.user-experience/usage.json`)

```json
{
  "tier": "pro",
  "currentMonth": "2025-01",
  "auditsThisMonth": 42,
  "totalAudits": 156,
  "toolsAudited": {
    "/path/to/tool1": 50,
    "/path/to/tool2": 106
  },
  "lastAudit": "2025-01-20T10:30:00.000Z",
  "createdAt": "2024-12-01T00:00:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z"
}
```

### License Data (`~/.user-experience/license.json`)

```json
{
  "key": "PRO-ABC-123-DEF",
  "tier": "pro",
  "email": "user@example.com",
  "expiresAt": "2026-01-20T00:00:00.000Z",
  "maxAuditsPerMonth": 100,
  "dashboardEnabled": true,
  "validationEnabled": true,
  "stripeSubscriptionId": "sub_1234567890"
}
```

## Stripe Integration

### Webhook Events Handled

1. **checkout.session.completed**: New subscription created
2. **customer.subscription.updated**: Tier changed
3. **customer.subscription.deleted**: Subscription canceled

### Webhook Endpoint

```typescript
import { webhookEndpointHandler } from './api/stripe-webhook';

// Express.js example
app.post('/webhook/stripe', async (req, res) => {
  const result = await webhookEndpointHandler(req, process.env.STRIPE_WEBHOOK_SECRET);
  res.status(result.statusCode).send(result.body);
});
```

### Price ID Configuration

Update `src/api/stripe-webhook.ts` with your Stripe price IDs:

```typescript
const PRICE_TO_TIER: Record<string, 'pro' | 'enterprise'> = {
  'price_pro_monthly': 'pro',
  'price_pro_yearly': 'pro',
  'price_ent_monthly': 'enterprise',
  'price_ent_yearly': 'enterprise'
};
```

## Enforcement Points

### 1. Pre-Audit Checks (`src/auditor.ts`)

```typescript
// Check usage limits
const hasRemaining = await hasRemainingAudits();
if (!hasRemaining) {
  throw new Error('Monthly audit limit reached');
}

// Enforce feature availability
if (options.validation) {
  enforceFeatureAvailability(tier, 'validation');
}

// Track usage
await trackAuditUsage();
await recordAudit(toolPath);
```

### 2. CLI Validation (`src/cli.ts`)

```typescript
// Validate tier option
if (!['free', 'pro', 'enterprise'].includes(options.tier)) {
  console.error('Invalid tier');
  process.exit(1);
}
```

## Edge Cases Handled

1. **Month Reset**: Usage counters automatically reset at month start
2. **Manual Tier Changes**: `updateTier()` function for admin overrides
3. **Subscription Cancellation**: Downgrade to free tier
4. **License Expiration**: Check expiration date before each audit
5. **Missing Usage Files**: Auto-create on first run

## Testing

```bash
# Set usage count for testing
node -e "
  import { setUsageCount } from './dist/monetization/limits.js';
  await setUsageCount(4);
"

# Clear all usage data
node -e "
  import { clearUsageData } from './dist/monetization/limits.js';
  await clearUsageData();
"

# Generate test license key
node -e "
  import { generateLicenseKey } from './dist/monetization/license.js';
  console.log(generateLicenseKey('pro'));
"
```

## Build Instructions

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test CLI
./dist/cli.js usage
./dist/cli.js tiers
```

## Future Enhancements

1. **Server-Side Validation**: Verify license keys against backend API
2. **Team Management**: Multi-user license pools for Enterprise
3. **Usage Analytics**: Dashboard with historical usage charts
4. **Grace Periods**: Temporary limit overages for paid tiers
5. **Promo Codes**: Discount codes for Stripe checkout
6. **Annual Billing**: Automatic yearly invoices with reminders

## Security Considerations

1. **License Key Format**: `TIER-XXX-YYY-ZZZ` (deterministic from Stripe subscription ID)
2. **Webhook Signature**: Stripe signature verification required in production
3. **Local Storage**: Usage data stored in user home directory (not shared)
4. **No Telemetry**: No phone-home or analytics collection

## Support

For issues or questions:
- GitHub: https://github.com/user-experience/cli
- Email: support@user-experience.dev
- Docs: https://user-experience.dev/docs
