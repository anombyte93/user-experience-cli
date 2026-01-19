/**
 * Phase 4: Data Verification
 * Spot-checks documentation claims against actual behavior
 */

import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import type { VerificationFindings, VerifiedClaim } from '../types';

/**
 * Verify documentation claims match actual behavior
 */
export async function auditVerification(
  toolPath: string,
  verbose: boolean = false
): Promise<VerificationFindings> {
  const verifiedClaims: VerifiedClaim[] = [];
  const unverifiableClaims: string[] = [];
  const accuracyIssues: string[] = [];
  const notes: string[] = [];

  // Extract claims from documentation
  const claims = await extractClaims(toolPath);
  if (verbose) {
    console.log(`  Found ${claims.length} claims to verify`);
  }

  // Verify each claim
  for (const claim of claims) {
    const result = await verifyClaim(claim, toolPath, verbose);
    verifiedClaims.push(result);

    if (!result.verified) {
      if (result.actual !== undefined) {
        accuracyIssues.push(
          `Claim "${claim.text}" does not match: expected "${claim.expected}", got "${result.actual}"`
        );
      } else {
        unverifiableClaims.push(claim.text);
      }
    }
  }

  // Add notes
  const verifiedCount = verifiedClaims.filter(c => c.verified).length;
  const totalClaims = verifiedClaims.length;

  if (totalClaims > 0) {
    const verificationRate = (verifiedCount / totalClaims) * 100;
    notes.push(`Verified ${verifiedCount}/${totalClaims} claims (${verificationRate.toFixed(0)}%)`);

    if (verificationRate >= 90) {
      notes.push('✅ Excellent documentation accuracy');
    } else if (verificationRate >= 70) {
      notes.push('Good documentation accuracy with some inconsistencies');
    } else if (verificationRate >= 50) {
      notes.push('⚠️  Poor documentation accuracy - many claims don\'t match behavior');
    } else {
      notes.push('❌ CRITICAL: Documentation does not match actual tool behavior');
    }
  } else {
    notes.push('No verifiable claims found in documentation');
  }

  if (accuracyIssues.length > 0) {
    notes.push(`⚠️  Found ${accuracyIssues.length} documentation inaccuracies`);
  }

  if (unverifiableClaims.length > 0) {
    notes.push(`${unverifiableClaims.length} claims could not be automatically verified`);
  }

  // Calculate score
  const score = calculateVerificationScore({
    totalClaims,
    verifiedCount,
    accuracyIssues: accuracyIssues.length
  });

  return {
    verifiedClaims,
    unverifiableClaims,
    accuracyIssues,
    score,
    notes
  };
}

/**
 * Extract verifiable claims from documentation
 */
async function extractClaims(
  toolPath: string
): Promise<Array<{ text: string; type: string; expected?: string; command?: string[] }>> {
  const claims: Array<{ text: string; type: string; expected?: string; command?: string[] }> = [];

  // Read README
  const readmePaths = ['README.md', 'readme.md', 'README.markdown'];
  let readmeContent = '';

  for (const readmePath of readmePaths) {
    try {
      readmeContent = await fs.readFile(path.join(toolPath, readmePath), 'utf-8');
      break;
    } catch {
      continue;
    }
  }

  if (!readmeContent) {
    return claims;
  }

  // Extract version claims
  const versionMatch = readmeContent.match(/version\s*:?\s*([\d.]+)/i);
  if (versionMatch) {
    claims.push({
      text: `Tool version is ${versionMatch[1]}`,
      type: 'version',
      expected: versionMatch[1],
      command: ['--version']
    });
  }

  // Extract feature claims (e.g., "supports X", "can do Y")
  const featurePatterns = [
    /supports?\s+([a-z0-9_-]+)/gi,
    /can\s+([a-z]+)/gi,
    /enables?\s+([a-z]+)/gi
  ];

  for (const pattern of featurePatterns) {
    let match;
    while ((match = pattern.exec(readmeContent)) !== null) {
      const feature = match[1];
      claims.push({
        text: `Supports ${feature}`,
        type: 'feature',
        expected: 'supported'
      });
    }
  }

  // Extract command usage examples
  const codeBlocks = readmeContent.match(/```(?:bash|shell|sh)?\s*\n([\s\S]*?)```/g) || [];
  for (const block of codeBlocks) {
    const commands = block
      .replace(/```[^\\n]*\n?/g, '')
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('#'))
      .slice(0, 3); // Limit to first 3 commands per block

    for (const cmd of commands) {
      const parts = cmd.trim().split(/\s+/);
      if (parts.length > 0) {
        claims.push({
          text: `Command example: ${cmd.trim()}`,
          type: 'command',
          command: parts
        });
      }
    }
  }

  // Extract configuration claims
  const configPatterns = [
    /config(?:uration)?\s+file\s*:?\s*([^\s\n]+)/gi,
    /uses?\s+([^\s\n]+)\s+config/gi
  ];

  for (const pattern of configPatterns) {
    let match;
    while ((match = pattern.exec(readmeContent)) !== null) {
      const configFile = match[1];
      claims.push({
        text: `Uses config file: ${configFile}`,
        type: 'config',
        expected: configFile
      });
    }
  }

  return claims;
}

/**
 * Verify a single claim
 */
async function verifyClaim(
  claim: { text: string; type: string; expected?: string; command?: string[] },
  toolPath: string,
  verbose: boolean
): Promise<VerifiedClaim> {
  try {
    switch (claim.type) {
      case 'version':
        if (claim.command) {
          const result = await executeCommand(claim.command[0], claim.command.slice(1), toolPath, verbose);
          const actual = result.stdout.trim() || result.stderr.trim();

          return {
            claim: claim.text,
            verified: actual.includes(claim.expected || ''),
            source: claim.command.join(' '),
            expected: claim.expected,
            actual,
            match: actual.includes(claim.expected || '') ? 'exact' : 'none'
          };
        }
        break;

      case 'command':
        if (claim.command) {
          const result = await executeCommand(claim.command[0], claim.command.slice(1), toolPath, verbose);

          return {
            claim: claim.text,
            verified: result.exitCode === 0 || result.exitCode === null,
            source: claim.command.join(' '),
            expected: 'exit code 0',
            actual: `exit code ${result.exitCode}`,
            match: result.exitCode === 0 ? 'exact' : 'none'
          };
        }
        break;

      case 'config':
        if (claim.expected) {
          try {
            await fs.access(path.join(toolPath, claim.expected));
            return {
              claim: claim.text,
              verified: true,
              source: claim.expected,
              expected: claim.expected,
              actual: 'file exists',
              match: 'exact'
            };
          } catch {
            return {
              claim: claim.text,
              verified: false,
              source: claim.expected,
              expected: claim.expected,
              actual: 'file not found',
              match: 'none'
            };
          }
        }
        break;

      case 'feature':
        // Feature claims are hard to verify automatically
        return {
          claim: claim.text,
          verified: false, // Default to unverified for features
          source: 'documentation'
        };
    }

    // Default: unverifiable
    return {
      claim: claim.text,
      verified: false,
      source: 'documentation'
    };
  } catch (error) {
    return {
      claim: claim.text,
      verified: false,
      source: 'error',
      actual: (error as Error).message
    };
  }
}

/**
 * Execute a command and capture output
 */
async function executeCommand(
  cmd: string,
  args: string[],
  cwd: string,
  verbose: boolean
): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000 // 10 second timeout
    });

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr,
        duration: Date.now() - startTime
      });
    });

    child.on('error', () => {
      resolve({
        exitCode: -1,
        stdout,
        stderr,
        duration: Date.now() - startTime
      });
    });
  });
}

/**
 * Calculate verification score
 */
function calculateVerificationScore(data: {
  totalClaims: number;
  verifiedCount: number;
  accuracyIssues: number
}): number {
  if (data.totalClaims === 0) {
    return 5; // Neutral score if no claims to verify
  }

  // Base score from verification rate
  const verificationRate = data.verifiedCount / data.totalClaims;
  let score = verificationRate * 8; // Max 8 points from verification

  // Bonus for perfect verification
  if (verificationRate >= 1.0) {
    score += 2;
  } else if (verificationRate >= 0.9) {
    score += 1;
  }

  // Deduct for accuracy issues
  score -= data.accuracyIssues * 1.5;

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}
