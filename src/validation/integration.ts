/**
 * Doubt-agent skill integration
 * Bridges the user-experience skill with doubt-agent validation agents
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ValidationResult, PhaseFindings, RedFlag } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run doubt-agent validation by invoking the /doubt skill
 * This integrates with the existing doubt-agent infrastructure
 */
export async function validateWithDoubtAgents(input: {
  findings: PhaseFindings;
  redFlags: RedFlag[];
  toolPath: string;
}): Promise<ValidationResult> {
  // For actual integration, we would:
  // 1. Call the /doubt skill via Skill tool
  // 2. Pass the audit findings as context
  // 3. Run 3 validation cycles
  // 4. Return consolidated results

  // Since we're building the infrastructure, this is the integration point
  const feedback: string[] = [];
  const additionalFlags: RedFlag[] = [];

  // Prepare audit summary for doubt-agent
  const auditSummary = prepareAuditSummary(input);

  // In production, we'd call:
  // await Skill({ skill: 'doubt', args: JSON.stringify(auditSummary) });

  // For now, implement placeholder logic that will be replaced
  // with actual doubt-agent skill calls

  // Cycle 1: doubt-critic
  const criticResult = await runDoubtCritic(auditSummary);
  feedback.push(...criticResult.feedback);
  additionalFlags.push(...criticResult.redFlags);

  // Cycle 2: doubt-meta-critic (checks the critic for bias)
  const metaCriticResult = await runDoubtMetaCritic({
    auditSummary,
    criticResult
  });
  feedback.push(...metaCriticResult.feedback);
  additionalFlags.push(...metaCriticResult.redFlags);

  // Cycle 3: Karen validator (evidence scoring)
  const karenResult = await runKarenValidation({
    findings: input.findings,
    allRedFlags: [...input.redFlags, ...additionalFlags],
    toolPath: input.toolPath
  });
  feedback.push(...karenResult.feedback);

  // Calculate final score
  const score = calculateValidationScore({
    originalRedFlags: input.redFlags.length,
    criticFlags: criticResult.redFlags.length,
    metaCriticFlags: metaCriticResult.redFlags.length,
    karenScore: karenResult.score
  });

  const passed = score >= 6.0;

  return {
    passed,
    score: Math.round(score * 10) / 10,
    feedback,
    additionalFlags
  };
}

/**
 * Prepare audit summary for doubt-agent consumption
 */
function prepareAuditSummary(input: {
  findings: PhaseFindings;
  redFlags: RedFlag[];
  toolPath: string;
}): string {
  const lines = [
    `# User Experience Audit Summary`,
    `**Tool**: ${input.toolPath}`,
    `**Red Flags Found**: ${input.redFlags.length}`,
    ``,
    `## Phase Results`,
    ``,
    `### First Impressions`,
    input.findings.firstImpressions
      ? `- Score: ${input.findings.firstImpressions.score}/10`
      : `- Not completed`,
    ``,
    `### Installation`,
    input.findings.installation
      ? `- Score: ${input.findings.installation.score}/10`
      : `- Not completed`,
    ``,
    `### Functionality`,
    input.findings.functionality
      ? `- Score: ${input.findings.functionality.score}/10`
      : `- Not completed`,
    ``,
    `### Red Flags`,
    ...input.redFlags.map(flag =>
      `- **${flag.severity}**: ${flag.title} (${flag.category})`
    )
  ];

  return lines.join('\n');
}

/**
 * Cycle 1: doubt-critic
 * In production, calls /doubt skill with critic agent
 */
async function runDoubtCritic(auditSummary: string): Promise<{
  score: number;
  feedback: string[];
  redFlags: RedFlag[];
}> {
  // TODO: Replace with actual /doubt skill call
  // Structure: Skill({ skill: 'doubt-critic', args: auditSummary })

  // Mock implementation
  return {
    score: 7.0,
    feedback: [
      '[MOCK: doubt-critic integration pending]',
      'Audit structure is sound',
      'Recommend checking for missing documentation'
    ],
    redFlags: []
  };
}

/**
 * Cycle 2: doubt-meta-critic
 * In production, calls /doubt skill with meta-critic agent
 */
async function runDoubtMetaCritic(input: {
  auditSummary: string;
  criticResult: any;
}): Promise<{
  score: number;
  feedback: string[];
  redFlags: RedFlag[];
}> {
  // TODO: Replace with actual /doubt skill call
  // Structure: Skill({ skill: 'doubt-meta-critic', args: input })

  // Mock implementation
  return {
    score: 7.0,
    feedback: [
      '[MOCK: doubt-meta-critic integration pending]',
      'Critic review appears unbiased'
    ],
    redFlags: []
  };
}

/**
 * Cycle 3: Karen validator
 * In production, calls /karen skill for evidence scoring
 */
async function runKarenValidation(input: {
  findings: PhaseFindings;
  allRedFlags: RedFlag[];
  toolPath: string;
}): Promise<{
  score: number;
  feedback: string[];
}> {
  // TODO: Replace with actual /karen skill call
  // Structure: Skill({ skill: 'karen', args: input })

  // Mock implementation
  return {
    score: 7.5,
    feedback: [
      '[MOCK: Karen integration pending]',
      'Evidence quality: moderate',
      'Red flags are well-documented'
    ]
  };
}

/**
 * Calculate final validation score
 */
function calculateValidationScore(data: {
  originalRedFlags: number;
  criticFlags: number;
  metaCriticFlags: number;
  karenScore: number;
}): number {
  // Weight the scores:
  // - Karen's evidence score is most important (50%)
  // - Original red flags reduce score (30%)
  // - Critic findings reduce score (20%)

  const redFlagPenalty = Math.min(
    (data.originalRedFlags + data.criticFlags + data.metaCriticFlags) * 0.3,
    3.0
  );

  const finalScore = data.karenScore - redFlagPenalty;

  return Math.max(0, Math.min(10, finalScore));
}

/**
 * Helper to invoke doubt-agent skill from command line
 * This is for integration when running as a CLI tool
 */
export async function invokeDoubtAgentFromCLI(args: string[]): Promise<void> {
  // In production, this would use the Skill tool to call /doubt
  // For now, this is a placeholder showing where integration happens

  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const claude = spawn('claude', [
      'skill',
      'doubt',
      ...args
    ]);

    claude.stdout.on('data', (data: Buffer) => {
      console.log(data.toString());
    });

    claude.stderr.on('data', (data: Buffer) => {
      console.error(data.toString());
    });

    claude.on('close', (code: number) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`doubt-agent exited with code ${code}`));
      }
    });
  });
}
