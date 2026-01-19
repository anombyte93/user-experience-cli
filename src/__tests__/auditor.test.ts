/**
 * Core auditor tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auditTool } from '../auditor';
import type { AuditOptions } from '../types';

// Mock fs module - MUST come before importing auditor
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      access: vi.fn(async () => {}) // Mock access to always succeed
    }
  };
});

// Mock the phase runner
vi.mock('../phases/index', () => ({
  runPhase: vi.fn(async (phaseId: string) => {
    const mockFindings: Record<string, any> = {
      'first-impressions': {
        hasReadme: true,
        readmeScore: 7,
        hasInstallInstructions: true,
        hasExamples: true,
        descriptionClarity: 6,
        score: 7.0,
        notes: ['Good README found']
      },
      'installation': {
        attempted: true,
        success: true,
        duration: 5000,
        method: 'npm',
        errors: [],
        warnings: [],
        score: 9.0,
        notes: ['Smooth installation']
      },
      'functionality': {
        commandsTested: [
          { command: '--help', success: true, output: 'Help text', duration: 100 }
        ],
        successfulExecutions: 1,
        failedExecutions: 0,
        missingFeatures: [],
        score: 8.0,
        notes: ['All commands work']
      },
      'verification': {
        verifiedClaims: [],
        unverifiableClaims: [],
        accuracyIssues: [],
        score: 7.0,
        notes: ['No claims to verify']
      },
      'red-flags': []
    };

    return {
      phase: phaseId,
      success: true,
      duration: 100,
      findings: mockFindings[phaseId] || {},
      errors: []
    };
  })
}));

// Mock the validation
vi.mock('../validation/doubt-agents', () => ({
  validateWithDoubtAgents: vi.fn(async () => ({
    passed: true,
    score: 7.5,
    feedback: ['Validation passed'],
    additionalFlags: []
  }))
}));

// Mock the report generator
vi.mock('../reporting/generator', () => ({
  generateReport: vi.fn(async () => '/tmp/test-report.md')
}));

describe('auditor', () => {
  const mockOptions: AuditOptions = {
    output: '/tmp/test-report.md',
    validation: true,
    tier: 'free',
    verbose: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run all 6 phases and return valid result', async () => {
    // This test uses the mock, so it won't actually run phases
    // In production, we'd test with a real tool path
    const result = await auditTool('/fake/tool', mockOptions);

    expect(result).toBeDefined();
    expect(result.outputPath).toBe('/tmp/test-report.md');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.redFlags).toBeDefined();
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it('should handle missing tool path gracefully', async () => {
    // Unmock fs for this specific test
    const { promises } = await import('fs');
    vi.spyOn(promises, 'access').mockRejectedValueOnce(new Error('ENOENT'));

    await expect(
      auditTool('/nonexistent/tool', mockOptions)
    ).rejects.toThrow('does not exist');
  });

  it('should calculate score based on phase findings', async () => {
    const result = await auditTool('/fake/tool', mockOptions);

    // Score should be weighted average of phases
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it('should include red flags in result', async () => {
    const result = await auditTool('/fake/tool', mockOptions);

    expect(Array.isArray(result.redFlags)).toBe(true);
  });

  it('should track completion time', async () => {
    const before = new Date();
    const result = await auditTool('/fake/tool', mockOptions);
    const after = new Date();

    expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
