/**
 * Core auditor orchestrating all 6 phases of UX audit
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runPhase } from './phases/index';
import { validateWithDoubtAgents } from './validation/doubt-agents';
import { generateReport } from './reporting/generator';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Main audit orchestration function
 * Runs all 6 phases and generates final report
 */
export async function auditTool(toolPath, options) {
    const startTime = Date.now();
    const findings = {};
    const allErrors = [];
    const allRedFlags = [];
    // Normalize tool path
    const normalizedPath = path.resolve(toolPath);
    // Verify tool exists
    try {
        await fs.access(normalizedPath);
    }
    catch {
        throw new Error(`Tool path does not exist: ${normalizedPath}`);
    }
    console.log(`\n📋 Phase 1: First Impressions...`);
    const phase1 = await runPhase('first-impressions', { toolPath: normalizedPath });
    findings.firstImpressions = phase1.findings;
    allErrors.push(...phase1.errors);
    console.log(`📦 Phase 2: Installation Test...`);
    const phase2 = await runPhase('installation', { toolPath: normalizedPath });
    findings.installation = phase2.findings;
    allErrors.push(...phase2.errors);
    console.log(`⚙️  Phase 3: Functionality Check...`);
    const phase3 = await runPhase('functionality', { toolPath: normalizedPath });
    findings.functionality = phase3.findings;
    allErrors.push(...phase3.errors);
    console.log(`✅ Phase 4: Data Verification...`);
    const phase4 = await runPhase('verification', {
        toolPath: normalizedPath,
        context: options.context
    });
    findings.verification = phase4.findings;
    allErrors.push(...phase4.errors);
    console.log(`🚩 Phase 5: Red Flag Documentation...`);
    const phase5 = await runPhase('red-flags', {
        findings,
        toolPath: normalizedPath
    });
    if (Array.isArray(phase5.findings)) {
        allRedFlags.push(...phase5.findings);
    }
    allErrors.push(...phase5.errors);
    // Validation with doubt-agents (if enabled)
    let validatedFindings = findings;
    let validatedRedFlags = allRedFlags;
    if (options.validation) {
        console.log(`🔍 Phase 6: Validation (doubt-agents)...`);
        const validation = await validateWithDoubtAgents({
            findings,
            redFlags: allRedFlags,
            toolPath: normalizedPath
        });
        validatedRedFlags = [...allRedFlags, ...validation.additionalFlags];
        allErrors.push(...validation.feedback.filter(f => f.includes('ERROR')));
        if (!validation.passed) {
            console.warn(`⚠️  Validation did not meet threshold (score: ${validation.score}/10)`);
        }
    }
    else {
        console.log(`⏭️  Skipping validation (--no-validation flag)`);
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
        completedAt: new Date()
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
function calculateOverallScore(data) {
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
//# sourceMappingURL=auditor.js.map