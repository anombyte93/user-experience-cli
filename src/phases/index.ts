/**
 * Phase execution orchestration
 * Loads and executes individual audit phases with real implementations
 */

import type { PhaseResult } from '../types';
import { auditFirstImpressions } from './first-impressions';
import { auditInstallation } from './installation';
import { auditFunctionality } from './functionality';
import { auditVerification } from './verification';
import { detectRedFlags } from './red-flags';
import { auditErrorHandling } from './error-handling';

/**
 * Run Phase 1: First Impressions
 */
export async function runPhase1(
  toolPath: string,
  verbose: boolean = false
): Promise<PhaseResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const findings = await auditFirstImpressions(toolPath, verbose);

    return {
      phase: 'first-impressions',
      success: true,
      duration: Date.now() - startTime,
      findings,
      errors
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    errors.push(errorMessage);

    return {
      phase: 'first-impressions',
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}

/**
 * Run Phase 2: Installation Test
 */
export async function runPhase2(
  toolPath: string,
  verbose: boolean = false
): Promise<PhaseResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const findings = await auditInstallation(toolPath, verbose);

    return {
      phase: 'installation',
      success: true,
      duration: Date.now() - startTime,
      findings,
      errors
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    errors.push(errorMessage);

    return {
      phase: 'installation',
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}

/**
 * Run Phase 3: Functionality Check
 */
export async function runPhase3(
  toolPath: string,
  verbose: boolean = false
): Promise<PhaseResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const findings = await auditFunctionality(toolPath, verbose);

    return {
      phase: 'functionality',
      success: true,
      duration: Date.now() - startTime,
      findings,
      errors
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    errors.push(errorMessage);

    return {
      phase: 'functionality',
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}

/**
 * Run Phase 4: Data Verification
 */
export async function runPhase4(
  toolPath: string,
  context?: string,
  verbose: boolean = false
): Promise<PhaseResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const findings = await auditVerification(toolPath, verbose);

    return {
      phase: 'verification',
      success: true,
      duration: Date.now() - startTime,
      findings,
      errors
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    errors.push(errorMessage);

    return {
      phase: 'verification',
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}

/**
 * Run Phase 5: Error Handling
 */
export async function runPhase5(
  toolPath: string,
  verbose: boolean = false
): Promise<PhaseResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const { redFlags, notes } = await auditErrorHandling(toolPath, verbose);

    return {
      phase: 'error-handling',
      success: true,
      duration: Date.now() - startTime,
      findings: { redFlags, notes },
      errors
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    errors.push(errorMessage);

    return {
      phase: 'error-handling',
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}

/**
 * Run Phase 6: Red Flag Detection
 */
export async function runPhase6(
  toolPath: string,
  verbose: boolean = false
): Promise<PhaseResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const { redFlags, notes } = await detectRedFlags(toolPath, verbose);

    return {
      phase: 'red-flags',
      success: true,
      duration: Date.now() - startTime,
      findings: { redFlags, notes },
      errors
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    errors.push(errorMessage);

    return {
      phase: 'red-flags',
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}

/**
 * Legacy runPhase function for backward compatibility
 * Maps phase IDs to their implementations
 */
export async function runPhase(
  phaseId: string,
  context: { toolPath: string; context?: string; verbose?: boolean }
): Promise<PhaseResult> {
  const { toolPath, verbose = false } = context;

  switch (phaseId) {
    case 'first-impressions':
      return runPhase1(toolPath, verbose);
    case 'installation':
      return runPhase2(toolPath, verbose);
    case 'functionality':
      return runPhase3(toolPath, verbose);
    case 'verification':
      return runPhase4(toolPath, context.context, verbose);
    case 'error-handling':
      return runPhase5(toolPath, verbose);
    case 'red-flags':
      return runPhase6(toolPath, verbose);
    default:
      throw new Error(`Unknown phase: ${phaseId}`);
  }
}

// Re-export types
export type * from '../types';
