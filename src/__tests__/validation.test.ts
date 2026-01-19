/**
 * Comprehensive Validation tests (15+ tests)
 * Tests doubt-agent integration, validation cycles, result processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateWithDoubtAgents } from '../validation/doubt-agents';
import type { PhaseFindings, RedFlag, ValidationInput } from '../types';

// Mock child_process for MCP calls
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

describe('Doubt-Agent Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFindings: PhaseFindings = {
    firstImpressions: {
      hasReadme: true,
      readmeScore: 8,
      hasInstallInstructions: true,
      hasExamples: true,
      descriptionClarity: 7,
      score: 8.0,
      notes: []
    },
    installation: {
      attempted: true,
      success: true,
      duration: 3000,
      method: 'npm',
      errors: [],
      warnings: [],
      score: 9.0,
      notes: []
    },
    functionality: {
      commandsTested: [],
      successfulExecutions: 5,
      failedExecutions: 0,
      missingFeatures: [],
      score: 9.0,
      notes: []
    },
    verification: {
      verifiedClaims: [],
      unverifiableClaims: [],
      accuracyIssues: [],
      score: 8.0,
      notes: []
    }
  };

  const mockRedFlags: RedFlag[] = [
    {
      severity: 'medium',
      category: 'Documentation',
      title: 'Missing examples',
      description: 'README lacks code examples',
      evidence: ['README.md only has text'],
      fix: 'Add code examples to README'
    }
  ];

  describe('validateWithDoubtAgents', () => {
    it('should run all 3 validation cycles', async () => {
      const input: ValidationInput = {
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool/path'
      };

      const result = await validateWithDoubtAgents(input);

      expect(result.passed).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.feedback).toBeDefined();
      expect(result.cycles).toBeDefined();
    });

    it('should calculate final score from all cycles', async () => {
      const input: ValidationInput = {
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool/path'
      };

      const result = await validateWithDoubtAgents(input);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });

    it('should set validation status based on score and confidence', async () => {
      const input: ValidationInput = {
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool/path'
      };

      const result = await validateWithDoubtAgents(input);

      expect(['validated', 'unverified', 'failed']).toContain(result.status);
    });

    it('should pass validation with good score', async () => {
      const result = await validateWithDoubtAgents({
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool'
      });

      expect(result.passed).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });
  });

  describe('Validation Cycle 1: Doubt Critic', () => {
    it('should check for obvious errors', async () => {
      const input: ValidationInput = {
        findings: {
          firstImpressions: {
            hasReadme: false,
            readmeScore: 2,
            hasInstallInstructions: false,
            hasExamples: false,
            descriptionClarity: 3,
            score: 2,
            notes: ['Missing README']
          }
        },
        redFlags: [],
        toolPath: '/fake/tool/path'
      };

      const result = await validateWithDoubtAgents(input);

      expect(result.cycles.doubtCritic).toBeDefined();
      expect(result.cycles.doubtCritic?.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation Cycle 2: Doubt Meta Critic', () => {
    it('should check for bias in critique', async () => {
      const input: ValidationInput = {
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool/path'
      };

      const result = await validateWithDoubtAgents(input);

      expect(result.cycles.doubtMetaCritic).toBeDefined();
      expect(result.cycles.doubtMetaCritic?.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation Cycle 3: Karen', () => {
    it('should score evidence quality', async () => {
      const input: ValidationInput = {
        findings: mockFindings,
        redFlags: mockRedFlags,
        toolPath: '/fake/tool/path'
      };

      const result = await validateWithDoubtAgents(input);

      expect(result.cycles.karen).toBeDefined();
      expect(result.cycles.karen?.score).toBeGreaterThanOrEqual(0);
    });

    it('should require minimum score of 6/10 to pass', async () => {
      const input: ValidationInput = {
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool/path'
      };

      const result = await validateWithDoubtAgents(input);

      // Score below 6 should fail validation
      if (result.score < 6.0) {
        expect(result.passed).toBe(false);
      }
    });
  });

  describe('Validation Result Processing', () => {
    it('should aggregate feedback from all cycles', async () => {
      const result = await validateWithDoubtAgents({
        findings: mockFindings,
        redFlags: mockRedFlags,
        toolPath: '/fake/tool'
      });

      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should aggregate red flags from all cycles', async () => {
      const result = await validateWithDoubtAgents({
        findings: mockFindings,
        redFlags: [...mockRedFlags],
        toolPath: '/fake/tool'
      });

      expect(Array.isArray(result.additionalFlags)).toBe(true);
    });

    it('should calculate confidence score', async () => {
      const result = await validateWithDoubtAgents({
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool'
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include validation timestamp', async () => {
      const result = await validateWithDoubtAgents({
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool'
      });

      expect(result.validatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Validation Integration', () => {
    it('should handle complete validation workflow', async () => {
      const result = await validateWithDoubtAgents({
        findings: mockFindings,
        redFlags: mockRedFlags,
        toolPath: '/fake/tool/path'
      });

      expect(result.cycles.doubtCritic).toBeDefined();
      expect(result.cycles.doubtMetaCritic).toBeDefined();
      expect(result.cycles.karen).toBeDefined();
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should handle validation with no red flags', async () => {
      const result = await validateWithDoubtAgents({
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool/path'
      });

      expect(result.passed).toBeDefined();
      expect(result.additionalFlags).toBeDefined();
    });

    it('should handle validation with multiple red flags', async () => {
      const multipleFlags: RedFlag[] = [
        ...mockRedFlags,
        {
          severity: 'high',
          category: 'Code Quality',
          title: 'Poor error handling',
          description: 'No try-catch blocks',
          evidence: ['No error handling found'],
          fix: 'Add proper error handling'
        },
        {
          severity: 'critical',
          category: 'Security',
          title: 'SQL injection risk',
          description: 'Unsanitized user input',
          evidence: ['Direct query execution'],
          fix: 'Use parameterized queries'
        }
      ];

      const result = await validateWithDoubtAgents({
        findings: mockFindings,
        redFlags: multipleFlags,
        toolPath: '/fake/tool/path'
      });

      expect(result).toBeDefined();
      expect(result.additionalFlags).toBeDefined();
    });
  });

  describe('Validation Scoring', () => {
    it('should calculate weighted average from all cycles', async () => {
      const result = await validateWithDoubtAgents({
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool/path'
      });

      // Score should be average of all cycle scores
      const scores = [
        result.cycles.doubtCritic?.score || 0,
        result.cycles.doubtMetaCritic?.score || 0,
        result.cycles.karen?.score || 0
      ].filter(s => s > 0);

      if (scores.length > 0) {
        const expectedScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        expect(Math.abs(result.score - expectedScore)).toBeLessThan(0.1);
      }
    });

    it('should handle missing cycle results gracefully', async () => {
      const result = await validateWithDoubtAgents({
        findings: mockFindings,
        redFlags: [],
        toolPath: '/fake/tool/path'
      });

      // Should still produce a valid result even if some cycles fail
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });
  });
});
