/**
 * Core auditor orchestrating all 6 phases of UX audit
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  AuditOptions,
  AuditResult,
  PhaseFindings,
  RedFlag,
  FirstImpressionsFindings,
  InstallationFindings,
  FunctionalityFindings,
  VerificationFindings
} from './types';
import {
  runPhase1,
  runPhase2,
  runPhase3,
  runPhase4,
  runPhase5,
  runPhase6
} from './phases/index';
import { validateWithDoubtAgents } from './validation/doubt-agents';
import { generateReport } from './reporting/generator';
import { hasRemainingAudits, trackAuditUsage, getCurrentLicense } from './monetization/license';
import { checkUsageLimits, recordAudit } from './monetization/limits';
import { enforceFeatureAvailability, generateUpgradeMessage } from './monetization/features';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main audit orchestration function
 * Runs all 6 phases and generates final report
 */
export async function auditTool(
  toolPath: string,
  options: AuditOptions
): Promise<AuditResult> {
  const startTime = Date.now();
  const findings: PhaseFindings = {};
  const allErrors: string[] = [];
  const allRedFlags: RedFlag[] = [];

  // Normalize tool path
  const normalizedPath = path.resolve(toolPath);

  // Verify tool exists
  try {
    await fs.access(normalizedPath);
  } catch {
    throw new Error(`Tool path does not exist: ${normalizedPath}`);
  }

  // ========== MONETIZATION: Check usage limits ==========
  const license = await getCurrentLicense();
  const tier = license?.tier || options.tier || 'free';

  console.log(`\n🔐 License Tier: ${tier.toUpperCase()}`);

  // Check if user has remaining audits
  const hasRemaining = await hasRemainingAudits();
  if (!hasRemaining) {
    const usageStats = await checkUsageLimits(tier, license?.maxAuditsPerMonth || 5);

    console.error(`\n❌ ${usageStats.reason}`);
    if (usageStats.suggestedUpgrade) {
      console.error(`\n💡 Upgrade to ${usageStats.suggestedUpgrade} tier to continue: https://user-experience.dev/upgrade`);
    }
    throw new Error(`Monthly audit limit reached for ${tier} tier. Please upgrade to continue.`);
  }

  // Enforce feature availability for validation
  if (options.validation) {
    try {
      enforceFeatureAvailability(tier, 'validation', 'AI-powered validation');
    } catch (error) {
      console.warn(`\n⚠️  ${(error as Error).message}`);
      console.warn(`⏭️  Skipping validation (--no-validation flag)`);
      options.validation = false;
    }
  }

  // Track usage before running audit
  await trackAuditUsage();
  await recordAudit(normalizedPath);

  // Display usage info
  const usageCheck = await checkUsageLimits(tier, license?.maxAuditsPerMonth || 5);
  console.log(`📊 Usage: ${usageCheck.used}/${license?.maxAuditsPerMonth || 5} audits this month (${usageCheck.remaining} remaining)`);

  // Validation warning for free tier
  if (tier === 'free' && options.validation) {
    console.warn(`\n⚠️  Warning: AI validation is a Pro tier feature.`);
    console.warn(`   Your results may not be as accurate without validation.`);
    console.warn(`   Upgrade at: https://user-experience.dev/upgrade\n`);
  }

  console.log(`\n📋 Phase 1: First Impressions...`);
  const phase1 = await runPhase1(normalizedPath, options.verbose);
  findings.firstImpressions = phase1.findings as FirstImpressionsFindings;
  allErrors.push(...phase1.errors);

  console.log(`📦 Phase 2: Installation Test...`);
  const phase2 = await runPhase2(normalizedPath, options.verbose);
  findings.installation = phase2.findings as InstallationFindings;
  allErrors.push(...phase2.errors);

  console.log(`⚙️  Phase 3: Functionality Check...`);
  const phase3 = await runPhase3(normalizedPath, options.verbose);
  findings.functionality = phase3.findings as FunctionalityFindings;
  allErrors.push(...phase3.errors);

  console.log(`✅ Phase 4: Data Verification...`);
  const phase4 = await runPhase4(normalizedPath, options.context, options.verbose);
  findings.verification = phase4.findings as VerificationFindings;
  allErrors.push(...phase4.errors);

  console.log(`🚨 Phase 5: Error Handling Test...`);
  const phase5 = await runPhase5(normalizedPath, options.verbose);
  if (phase5.findings && typeof phase5.findings === 'object' && 'redFlags' in phase5.findings) {
    allRedFlags.push(...(phase5.findings as { redFlags: RedFlag[] }).redFlags);
  }
  allErrors.push(...phase5.errors);

  console.log(`🚩 Phase 6: Red Flag Detection...`);
  const phase6 = await runPhase6(normalizedPath, options.verbose);
  if (phase6.findings && typeof phase6.findings === 'object' && 'redFlags' in phase6.findings) {
    allRedFlags.push(...(phase6.findings as { redFlags: RedFlag[] }).redFlags);
  }
  allErrors.push(...phase6.errors);

  // Validation with doubt-agents (if enabled)
  let validatedFindings = findings;
  let validatedRedFlags = allRedFlags;
  let validation: any = null;

  if (options.validation) {
    console.log(`🔍 Phase 6: Validation (doubt-agents)...`);
    validation = await validateWithDoubtAgents({
      findings,
      redFlags: allRedFlags,
      toolPath: normalizedPath
    });

    validatedRedFlags = [...allRedFlags, ...validation.additionalFlags];
    allErrors.push(...validation.feedback.filter(f => f.includes('ERROR')));

    // Save validation results for reproducibility
    try {
      const validationPath = await (await import('./validation/doubt-agents')).saveValidationResults(
        normalizedPath,
        validation
      );
      console.log(`  📁 Validation saved: ${validationPath}`);
    } catch (error) {
      console.warn(`  ⚠️  Could not save validation results: ${error}`);
    }

    // Display validation results
    console.log(`  Status: ${validation.status.toUpperCase()}`);
    console.log(`  Score: ${validation.score}/10`);
    console.log(`  Confidence: ${(validation.confidence * 100).toFixed(0)}%`);

    if (validation.cycles.doubtCritic) {
      console.log(`  doubt-critic: ${validation.cycles.doubtCritic.score}/10`);
    }
    if (validation.cycles.doubtMetaCritic) {
      console.log(`  doubt-meta-critic: ${validation.cycles.doubtMetaCritic.score}/10`);
    }
    if (validation.cycles.karen) {
      console.log(`  Karen: ${validation.cycles.karen.score}/10`);
    }

    if (!validation.passed) {
      console.warn(`⚠️  Validation did not meet threshold (score: ${validation.score}/10)`);
    }
  } else {
    console.log(`⏭️  Skipping validation (--no-validation flag)`);
    validation = {
      skipped: true,
      status: 'skipped' as const,
      score: 0,
      confidence: 0,
      validatedAt: new Date(),
      cycles: {},
      feedback: [],
      additionalFlags: [],
      passed: true
    };
  }

  // Calculate overall score
  const score = calculateOverallScore({
    firstImpressions: findings.firstImpressions,
    installation: findings.installation,
    functionality: findings.functionality,
    verification: findings.verification,
    redFlagCount: validatedRedFlags.length
  });

  // Generate report
  console.log(`\n📝 Generating report...`);
  const reportPath = await generateReport({
    toolPath: normalizedPath,
    findings: validatedFindings,
    redFlags: validatedRedFlags,
    score,
    options,
    completedAt: new Date(),
    validation
  }, options.output);

  const duration = Date.now() - startTime;
  console.log(`✨ Audit completed in ${(duration / 1000).toFixed(1)}s\n`);

  return {
    outputPath: reportPath,
    redFlags: validatedRedFlags,
    score,
    findings: validatedFindings,
    completedAt: new Date()
  };
}

/**
 * Calculate overall score from all phases
 * Uses weighted average with red flag penalty
 */
function calculateOverallScore(data: {
  firstImpressions?: FirstImpressionsFindings;
  installation?: InstallationFindings;
  functionality?: FunctionalityFindings;
  verification?: VerificationFindings;
  redFlagCount: number;
}): number {
  const weights = {
    firstImpressions: 0.15,
    installation: 0.25,
    functionality: 0.35,
    verification: 0.15,
    redFlagPenalty: 0.10
  };

  let totalScore = 0;
  let weightUsed = 0;

  if (data.firstImpressions) {
    totalScore += data.firstImpressions.score * weights.firstImpressions;
    weightUsed += weights.firstImpressions;
  }

  if (data.installation) {
    totalScore += data.installation.score * weights.installation;
    weightUsed += weights.installation;
  }

  if (data.functionality) {
    totalScore += data.functionality.score * weights.functionality;
    weightUsed += weights.functionality;
  }

  if (data.verification) {
    totalScore += data.verification.score * weights.verification;
    weightUsed += weights.verification;
  }

  // Normalize to used weights
  if (weightUsed > 0) {
    totalScore = totalScore / weightUsed;
  }

  // Apply red flag penalty (each critical flag = -0.5, high = -0.3, medium = -0.1)
  // We'll calculate this properly when we have actual red flags
  const penalty = Math.min(data.redFlagCount * 0.1, 2.0);
  totalScore = Math.max(0, totalScore - penalty);

  return Math.round(totalScore * 10) / 10; // Round to 1 decimal
}

// Re-export types for convenience
export type * from './types';
