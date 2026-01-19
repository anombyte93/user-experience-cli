# Monetization System Usage Examples

## CLI Usage Examples

### Basic Audit (Free Tier)
```bash
# Run audit with free tier (5 audits/month limit)
user-experience /path/to/cli-tool

# Output:
# 🔐 License Tier: FREE
# 📊 Usage: 1/5 audits this month (4 remaining)
# 📋 Phase 1: First Impressions...
# ...
# ✅ Audit complete!
```

### Pro Tier Audit
```bash
# Run audit with pro tier (100 audits/month, includes validation)
user-experience /path/to/cli-tool --tier pro

# Output:
# 🔐 License Tier: PRO
# 📊 Usage: 42/100 audits this month (58 remaining)
# 📋 Phase 1: First Impressions...
# ...
# 🔍 Phase 6: Validation (doubt-agents)...
# ...
# ✅ Audit complete!
```

### Check Usage Statistics
```bash
user-experience usage

# Output:
# ============================================================
# 📊 USER EXPERIENCE AUDITOR - USAGE STATISTICS
# ============================================================
#
# 🔐 License Tier: PRO
# 📧 Email: user@example.com
# 🔑 Key: PRO-ABC-123-DEF
# ⏰ Expires: 1/20/2026
#
# 📈 This Month:
#    Audits run: 42
#    Tools audited: 5
#    Last audit: 1/20/2025, 10:30:00 AM
#
# 📊 All Time:
#    Total audits: 156
#
# 💳 Plan Limits:
#    Max audits/month: 100
#    Max tools: 50
#    Price: $10/mo ($100/yr)
#
# ✨ Enabled Features:
#    • dashboard
#    • validation
#    • pdfExport
#    • htmlExport
#    • jsonExport
#    • prioritySupport
#    • apiAccess
#    • advancedAnalytics
#
# ============================================================
```

### List Available Tiers
```bash
user-experience tiers

# Output:
# ======================================================================
# 💳 AVAILABLE TIERS
# ======================================================================
#
# FREE
# ----------------------------------------------------------------------
# Description: Perfect for trying out the user-experience auditor
# Price: Free ($0/yr)
#
# Limits:
#   • Audits/month: 5
#   • Max tools: 3
#   • Retention: 30 days
#
# Features:
#   ✓ htmlExport
#   ✓ jsonExport
#
#
# PRO ← CURRENT
# ----------------------------------------------------------------------
# Description: For developers and teams serious about UX quality
# Price: $10/mo ($100/yr)
#
# Limits:
#   • Audits/month: 100
#   • Max tools: 50
#   • Retention: 365 days
#
# Features:
#   ✓ dashboard
#   ✓ validation
#   ✓ pdfExport
#   ✓ htmlExport
#   ✓ jsonExport
#   ✓ prioritySupport
#   ✓ apiAccess
#   ✓ advancedAnalytics
#
#
# ENTERPRISE
# ----------------------------------------------------------------------
# Description: For organizations with advanced needs and high volume
# Price: Custom pricing
#
# Limits:
#   • Audits/month: Unlimited
#   • Max tools: Unlimited
#   • Retention: Forever
#
# Features:
#   ✓ dashboard
#   ✓ validation
#   ✓ pdfExport
#   ✓ htmlExport
#   ✓ jsonExport
#   ✓ prioritySupport
#   ✓ customBranding
#   ✓ apiAccess
#   ✓ teamCollaboration
#   ✓ advancedAnalytics
#   ✓ dedicatedManager
#   ✓ customIntegrations
#
# ======================================================================
# Upgrade: https://user-experience.dev/upgrade
```

### Upgrade Tier
```bash
user-experience upgrade pro

# Output:
# ⬆️  Upgrading to PRO tier...
# ✅ Successfully upgraded to PRO tier!
#
# 💡 Note: This is a local tier change for testing.
#    In production, you'll complete payment via Stripe.
```

## Programmatic Usage Examples

### Check Usage Limits
```typescript
import { checkUsageLimits, getCurrentLicense } from './monetization';

const license = await getCurrentLicense();
if (!license) {
  console.error('No active license');
  process.exit(1);
}

// Check if user can run more audits
const usage = await checkUsageLimits(license.tier, license.maxAuditsPerMonth);

if (!usage.allowed) {
  console.error(`❌ ${usage.reason}`);
  console.error(`💡 Upgrade to ${usage.suggestedUpgrade}: https://user-experience.dev/upgrade`);
  process.exit(1);
}

console.log(`✅ Can run ${usage.remaining} more audits this month`);
```

### Enforce Feature Availability
```typescript
import { enforceFeatureAvailability } from './monetization';
import { getCurrentLicense } from './monetization/license';

const license = await getCurrentLicense();
if (!license) {
  console.error('No active license');
  process.exit(1);
}

// Check if validation is available
try {
  enforceFeatureAvailability(license.tier, 'validation', 'AI-powered validation');
  console.log('✅ Validation enabled');
} catch (error) {
  console.warn(`⚠️  ${(error as Error).message}`);
  console.warn('   Skipping validation phase');
}
```

### Record Audit Usage
```typescript
import { recordAudit } from './monetization/limits';
import path from 'path';

// After successful audit, track usage
const toolPath = path.resolve('/path/to/audited/tool');
const usageData = await recordAudit(toolPath);

console.log(`Audit recorded. Total this month: ${usageData.auditsThisMonth}`);
```

### Compare Tiers
```typescript
import { compareTiers } from './monetization/tier';

const diff = compareTiers('free', 'pro');

console.log('Upgrading from Free to Pro gains:');
diff.gained.forEach(feature => {
  console.log(`  + ${feature}`);
});

console.log('\nNo features lost:');
diff.lost.forEach(feature => {
  console.log(`  - ${feature}`);
});
```

### Generate Upgrade Message
```typescript
import { generateUpgradeMessage } from './monetization/features';

const message = generateUpgradeMessage('free', 'validation');
console.log(message);

# Output:
# =============================================================
# ⬆️  UPGRADE REQUIRED: AI-POWERED VALIDATION
# =============================================================
#
# This feature is available in the Pro tier ($10/mo).
#
# By upgrading to pro, you'll also gain:
#
#   • Web dashboard for viewing audit history and trends
#   • Export reports as professional PDF documents
#   • Export raw audit data as JSON for automation
#   • Priority email and chat support
#   • REST API for programmatic audit execution
#   • Advanced analytics and insights
#
# To upgrade, visit: https://user-experience.dev/upgrade
# =============================================================
```

## Testing Examples

### Set Usage Count for Testing
```typescript
import { setUsageCount } from './monetization/limits';

// Simulate user has used 4 out of 5 free tier audits
await setUsageCount(4);

// Next audit will trigger limit warning
```

### Generate Test License Key
```typescript
import { generateLicenseKey, activateLicense } from './monetization/license';

// Generate a pro tier license for testing
const testKey = generateLicenseKey('pro');
console.log(`Test license key: ${testKey}`);
// Output: PRO-ABC-123-DEF

// Activate the license
await activateLicense(testKey, 'test@example.com');
```

### Clear Usage Data
```typescript
import { clearUsageData } from './monetization/limits';

// Reset all usage tracking (for testing)
await clearUsageData();
console.log('Usage data cleared');
```

### Manual Tier Update
```typescript
import { updateTier } from './monetization/limits';

// Force upgrade to pro tier (for testing)
await updateTier('pro');
console.log('Tier updated to pro');
```

## Error Handling Examples

### Handle Limit Reached
```typescript
import { checkUsageLimits } from './monetization/limits';
import { getCurrentLicense } from './monetization/license';

async function runAudit(toolPath: string) {
  const license = await getCurrentLicense();
  if (!license) {
    throw new Error('No active license. Please run: user-experience activate');
  }

  const usage = await checkUsageLimits(license.tier, license.maxAuditsPerMonth);

  if (!usage.allowed) {
    // User hit their limit
    console.error(`\n❌ ${usage.reason}`);
    console.error(`\nYou've used ${usage.used} audits this month.`);
    console.error(`Your ${license.tier} tier allows ${license.maxAuditsPerMonth} audits/month.`);

    if (usage.suggestedUpgrade) {
      console.error(`\n💡 Upgrade to ${usage.suggestedUpgrade.toUpperCase()} for more audits:`);
      console.error(`   https://user-experience.dev/upgrade?tier=${usage.suggestedUpgrade}`);
    }

    throw new Error('Audit limit reached');
  }

  // Proceed with audit...
}
```

### Handle Feature Not Available
```typescript
import { enforceFeatureAvailability, generateUpgradeMessage } from './monetization/features';

function runValidation(tier: string) {
  try {
    enforceFeatureAvailability(tier, 'validation', 'AI validation');
    // Run validation...
  } catch (error) {
    console.warn((error as Error).message);

    // Show full upgrade message
    const message = generateUpgradeMessage(tier, 'validation');
    console.log(message);

    // Skip validation for free tier
    return null;
  }
}
```

### Handle Expired License
```typescript
import { getCurrentLicense } from './monetization/license';

async function checkLicense() {
  const license = await getCurrentLicense();

  if (!license) {
    console.log('No license found. Using free tier.');
    return 'free';
  }

  if (license.expiresAt && license.expiresAt < new Date()) {
    console.error(`\n❌ License expired on ${license.expiresAt.toLocaleDateString()}`);
    console.error('Please renew your subscription at: https://user-experience.dev/renew');
    throw new Error('License expired');
  }

  console.log(`✅ Valid ${license.tier} license (${license.key})`);
  return license.tier;
}
```

## Integration Examples

### Express.js Webhook Handler
```typescript
import express from 'express';
import { webhookEndpointHandler } from './api/stripe-webhook';

const app = express();

app.post('/webhook/stripe', async (req, res) => {
  const result = await webhookEndpointHandler(
    req,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  );

  res.status(result.statusCode).send(result.body);
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

### Pre-Commit Hook for Usage Tracking
```typescript
// .git/hooks/pre-commit
import { checkUsageLimits } from './monetization/limits';
import { execSync } from 'child_process';

// Check if any TS files changed
const changedFiles = execSync('git diff --cached --name-only | grep "\.ts$"')
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

if (changedFiles.length > 0) {
  // This counts as an "audit" for usage tracking
  const license = await getCurrentLicense();
  const usage = await checkUsageLimits(license.tier, license.maxAuditsPerMonth);

  if (!usage.allowed) {
    console.error(`\n❌ Commit blocked: ${usage.reason}`);
    console.error('Please upgrade to continue committing.\n');
    process.exit(1);
  }

  await recordAudit('pre-commit');
}
```

## Advanced Usage

### Custom Tier Configuration
```typescript
import { TIERS } from './monetization/tier';

// Access tier configuration
const proTier = TIERS.pro;

console.log(`Pro tier limits:`);
console.log(`  - ${proTier.limits.maxAuditsPerMonth} audits/month`);
console.log(`  - ${proTier.limits.maxTools} tools`);
console.log(`  - ${proTier.limits.maxRetentionDays} day retention`);

// Check if specific feature is enabled
if (proTier.features.validation) {
  console.log('✅ Validation enabled in Pro tier');
}
```

### Batch Operations with Limit Checking
```typescript
import { checkUsageLimits, recordAudit } from './monetization/limits';
import { getCurrentLicense } from './monetization/license';

async function batchAudit(toolPaths: string[]) {
  const license = await getCurrentLicense();
  if (!license) throw new Error('No license');

  const usage = await checkUsageLimits(license.tier, license.maxAuditsPerMonth);
  const available = usage.remaining;

  if (toolPaths.length > available) {
    throw new Error(
      `Not enough audits remaining. Need ${toolPaths.length}, have ${available}`
    );
  }

  const results = [];
  for (const toolPath of toolPaths) {
    try {
      const result = await runSingleAudit(toolPath);
      await recordAudit(toolPath);
      results.push(result);
    } catch (error) {
      console.error(`Failed to audit ${toolPath}: ${error}`);
    }
  }

  return results;
}
```

### Usage Analytics
```typescript
import { getUsageStats } from './monetization/limits';
import { getCurrentLicense } from './monetization/license';

async function generateUsageReport() {
  const license = await getCurrentLicense();
  const stats = await getUsageStats();

  return {
    tier: stats.tier,
    utilizationRate: (stats.auditsThisMonth / (license?.maxAuditsPerMonth || 1)) * 100,
    averageAuditsPerDay: stats.auditsThisMonth / getDaysInMonth(),
    totalTools: stats.toolsAudited,
    lastAudit: stats.lastAudit,
    needsUpgrade: stats.auditsThisMonth >= (license?.maxAuditsPerMonth || 5) * 0.8
  };
}

function getDaysInMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}
```

## Summary

The monetization system provides:

1. **Tier Management**: Three tiers (Free, Pro, Enterprise) with clear feature differentiation
2. **Usage Tracking**: Automatic monthly audit counting with local storage
3. **Limit Enforcement**: Blocks audits when limits are hit
4. **Feature Gating**: Prevents use of premium features on lower tiers
5. **Upgrade Flow**: Clear upgrade messaging and Stripe integration
6. **CLI Commands**: Easy-to-use commands for usage and tier management
7. **Programmatic API**: Full TypeScript API for custom integrations

All usage data is stored locally in `~/.user-experience/usage.json` and license data in `~/.user-experience/license.json`.
