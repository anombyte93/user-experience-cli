#!/usr/bin/env node
import { Command } from 'commander';
import { auditTool } from './auditor';
import { generateReport } from './reporting/generator';
import { getUsageStats, updateTier } from './monetization/limits.js';
import { getAllTiers, formatPrice } from './monetization/tier.js';
import { getCurrentLicense } from './monetization/license.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('user-experience')
  .description('Ruthlessly audit CLI tools from a fresh user perspective')
  .version('1.0.0')
  .argument('<tool-path>', 'Path to the tool/directory to audit')
  .option('-c, --context <context>', 'Domain/use case context for the tool')
  .option('-o, --output <path>', 'Output report path', './ux-audit-report.md')
  .option('--no-validation', 'Skip doubt-agent validation (faster, less rigorous)')
  .option('--tier <tier>', 'License tier (free, pro, enterprise)', 'free')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (toolPath: string, options) => {
    try {
      // Validate tier option
      const validTiers = ['free', 'pro', 'enterprise'];
      if (!validTiers.includes(options.tier)) {
        console.error(`\n❌ Invalid tier: ${options.tier}`);
        console.error(`   Valid tiers: ${validTiers.join(', ')}\n`);
        process.exit(1);
      }

      console.log(`\n🔍 Starting UX Audit for: ${toolPath}`);
      if (options.context) {
        console.log(`📋 Context: ${options.context}`);
      }
      console.log(`📝 Output: ${options.output}\n`);

      const result = await auditTool(toolPath, {
        context: options.context,
        output: options.output,
        validation: options.validation !== false,
        tier: options.tier,
        verbose: options.verbose || false
      });

      console.log(`\n✅ Audit complete!`);
      console.log(`📄 Report saved to: ${result.outputPath}`);
      console.log(`🚩 Red flags found: ${result.redFlags.length}`);
      console.log(`📊 Overall score: ${result.score}/10\n`);

      // Exit with error code if score is poor
      if (result.score < 5) {
        process.exit(1);
      }
    } catch (error) {
      console.error(`\n❌ Audit failed: ${(error as Error).message}`);
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Add report subcommand
program
  .command('report')
  .description('Generate report from previous audit data')
  .argument('<data-file>', 'Path to audit data JSON file')
  .option('-o, --output <path>', 'Output report path', './ux-audit-report.md')
  .action(async (dataFile: string, options) => {
    try {
      console.log(`\n📄 Generating report from: ${dataFile}`);
      const reportPath = await generateReportFromFile(dataFile, options.output);
      console.log(`✅ Report saved to: ${reportPath}\n`);
    } catch (error) {
      console.error(`\n❌ Report generation failed: ${(error as Error).message}\n`);
      process.exit(1);
    }
  });

// Add dashboard subcommand
program
  .command('dashboard')
  .description('Launch web dashboard for viewing audit reports')
  .option('-p, --port <port>', 'Dashboard port', '3000')
  .option('--tailscale', 'Enable Tailscale tunnel for remote access')
  .action(async (options) => {
    try {
      console.log(`\n🚀 Starting dashboard on port ${options.port}...`);
      if (options.tailscale) {
        console.log(`🔗 Tailscale tunnel enabled\n`);
      }
      await startDashboard(options.port, options.tailscale);
    } catch (error) {
      console.error(`\n❌ Dashboard failed to start: ${(error as Error).message}\n`);
      process.exit(1);
    }
  });

// Add usage subcommand
program
  .command('usage')
  .description('Show usage statistics and current tier')
  .action(async () => {
    try {
      const license = await getCurrentLicense();
      const stats = await getUsageStats();

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 USER EXPERIENCE AUDITOR - USAGE STATISTICS`);
      console.log(`${'='.repeat(60)}\n`);

      console.log(`🔐 License Tier: ${stats.tier.toUpperCase()}`);
      if (license) {
        console.log(`📧 Email: ${license.email}`);
        console.log(`🔑 Key: ${license.key}`);
        if (license.expiresAt) {
          console.log(`⏰ Expires: ${license.expiresAt.toLocaleDateString()}`);
        }
      }

      console.log(`\n📈 This Month:`);
      console.log(`   Audits run: ${stats.auditsThisMonth}`);
      console.log(`   Tools audited: ${stats.toolsAudited}`);
      if (stats.lastAudit) {
        console.log(`   Last audit: ${new Date(stats.lastAudit).toLocaleString()}`);
      }

      console.log(`\n📊 All Time:`);
      console.log(`   Total audits: ${stats.totalAudits}`);

      // Get tier limits
      const tier = getAllTiers().find(t => t.id === stats.tier);
      if (tier) {
        console.log(`\n💳 Plan Limits:`);
        console.log(`   Max audits/month: ${tier.limits.maxAuditsPerMonth === Infinity ? 'Unlimited' : tier.limits.maxAuditsPerMonth}`);
        console.log(`   Max tools: ${tier.limits.maxTools === Infinity ? 'Unlimited' : tier.limits.maxTools}`);
        console.log(`   Price: ${formatPrice(stats.tier, 'monthly')}`);

        // Show features
        const enabledFeatures = Object.entries(tier.features)
          .filter(([_, enabled]) => enabled)
          .map(([feature]) => feature);

        if (enabledFeatures.length > 0) {
          console.log(`\n✨ Enabled Features:`);
          enabledFeatures.forEach(feature => {
            console.log(`   • ${feature}`);
          });
        }
      }

      console.log(`\n${'='.repeat(60)}\n`);
    } catch (error) {
      console.error(`\n❌ Failed to fetch usage: ${(error as Error).message}\n`);
      process.exit(1);
    }
  });

// Add upgrade subcommand
program
  .command('upgrade')
  .description('Upgrade to a higher tier')
  .argument('<tier>', 'Target tier (pro, enterprise)')
  .action(async (tier: string) => {
    try {
      const validTiers = ['pro', 'enterprise'];
      if (!validTiers.includes(tier)) {
        console.error(`\n❌ Invalid tier: ${tier}`);
        console.error(`   Valid upgrade tiers: ${validTiers.join(', ')}\n`);
        process.exit(1);
      }

      console.log(`\n⬆️  Upgrading to ${tier.toUpperCase()} tier...`);

      // For now, this just updates the local tier
      // In production, this would redirect to Stripe checkout
      await updateTier(tier as any);

      console.log(`✅ Successfully upgraded to ${tier.toUpperCase()} tier!`);
      console.log(`\n💡 Note: This is a local tier change for testing.`);
      console.log(`   In production, you'll complete payment via Stripe.\n`);
    } catch (error) {
      console.error(`\n❌ Upgrade failed: ${(error as Error).message}\n`);
      process.exit(1);
    }
  });

// Add tiers subcommand
program
  .command('tiers')
  .description('List available tiers and features')
  .action(async () => {
    try {
      const tiers = getAllTiers();
      const license = await getCurrentLicense();
      const currentTier = license?.tier || 'free';

      console.log(`\n${'='.repeat(70)}`);
      console.log(`💳 AVAILABLE TIERS`);
      console.log(`${'='.repeat(70)}\n`);

      tiers.forEach(tier => {
        const isCurrent = tier.id === currentTier;
        const marker = isCurrent ? ' ← CURRENT' : '';

        console.log(`${tier.id.toUpperCase()}${marker}`);
        console.log(`${'─'.repeat(70)}`);
        console.log(`Description: ${tier.description}`);
        console.log(`Price: ${formatPrice(tier.id, 'monthly')} (${formatPrice(tier.id, 'yearly')})`);

        // Show limits
        console.log(`\nLimits:`);
        console.log(`  • Audits/month: ${tier.limits.maxAuditsPerMonth === Infinity ? 'Unlimited' : tier.limits.maxAuditsPerMonth}`);
        console.log(`  • Max tools: ${tier.limits.maxTools === Infinity ? 'Unlimited' : tier.limits.maxTools}`);
        console.log(`  • Retention: ${tier.limits.maxRetentionDays === Infinity ? 'Forever' : `${tier.limits.maxRetentionDays} days`}`);

        // Show features
        const enabledFeatures = Object.entries(tier.features)
          .filter(([_, enabled]) => enabled)
          .map(([feature]) => feature);

        if (enabledFeatures.length > 0) {
          console.log(`\nFeatures:`);
          enabledFeatures.forEach(feature => {
            console.log(`  ✓ ${feature}`);
          });
        }

        console.log(`\n`);
      });

      console.log(`${'='.repeat(70)}`);
      console.log(`Upgrade: https://user-experience.dev/upgrade\n`);
    } catch (error) {
      console.error(`\n❌ Failed to list tiers: ${(error as Error).message}\n`);
      process.exit(1);
    }
  });

program.parse();

// Helper functions (to be implemented)
async function generateReportFromFile(dataFile: string, outputPath: string): Promise<string> {
  // TODO: Load audit data and generate report
  return outputPath;
}

async function startDashboard(port: string, enableTailscale: boolean): Promise<void> {
  // TODO: Start Next.js dashboard server
  console.log(`Dashboard running at http://localhost:${port}`);
}
