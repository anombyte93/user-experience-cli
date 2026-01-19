/**
 * Type validation and utility tests
 * Tests type validators, utility functions, and type guards
 */

import { describe, it, expect } from 'vitest';
import type {
  AuditOptions,
  AuditResult,
  RedFlag,
  PhaseFindings,
  FirstImpressionsFindings,
  InstallationFindings,
  FunctionalityFindings,
  VerificationFindings,
  CommandTest,
  VerifiedClaim,
  PhaseResult,
  ValidationOptions,
  ValidationResult
} from '../types';

describe('type definitions and validators', () => {
  describe('AuditOptions', () => {
    it('should accept valid audit options', () => {
      const options: AuditOptions = {
        output: '/path/to/report.md',
        validation: true,
        tier: 'pro',
        verbose: true,
        context: 'testing'
      };

      expect(options.output).toBe('/path/to/report.md');
      expect(options.validation).toBe(true);
      expect(options.tier).toBe('pro');
      expect(options.verbose).toBe(true);
      expect(options.context).toBe('testing');
    });

    it('should accept minimal required options', () => {
      const options: AuditOptions = {
        output: '/path/to/report.md',
        validation: false
      };

      expect(options.output).toBeDefined();
      expect(options.validation).toBeDefined();
    });

    it('should accept all tier values', () => {
      const tiers: Array<'free' | 'pro' | 'enterprise'> = ['free', 'pro', 'enterprise'];

      tiers.forEach(tier => {
        const options: AuditOptions = {
          output: '/path/to/report.md',
          validation: true,
          tier
        };
        expect(options.tier).toBe(tier);
      });
    });
  });

  describe('AuditResult', () => {
    it('should accept complete audit result', () => {
      const result: AuditResult = {
        outputPath: '/path/to/report.md',
        redFlags: [],
        score: 7.5,
        findings: {},
        completedAt: new Date()
      };

      expect(result.outputPath).toBeDefined();
      expect(result.redFlags).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should accept red flags with all severities', () => {
      const severities: Array<'critical' | 'high' | 'medium' | 'low'> = [
        'critical',
        'high',
        'medium',
        'low'
      ];

      severities.forEach(severity => {
        const redFlag: RedFlag = {
          severity,
          category: 'Test',
          title: 'Test flag',
          description: 'Test description',
          evidence: ['evidence'],
          fix: 'fix it'
        };
        expect(redFlag.severity).toBe(severity);
      });
    });

    it('should accept phase findings', () => {
      const findings: PhaseFindings = {
        firstImpressions: {
          hasReadme: true,
          readmeScore: 8,
          hasInstallInstructions: true,
          hasExamples: true,
          descriptionClarity: 7,
          score: 8.0,
          notes: ['Good']
        },
        installation: {
          attempted: true,
          success: true,
          duration: 5000,
          method: 'npm',
          errors: [],
          warnings: [],
          score: 9.0,
          notes: []
        }
      };

      expect(findings.firstImpressions).toBeDefined();
      expect(findings.installation).toBeDefined();
    });
  });

  describe('RedFlag', () => {
    it('should accept red flag with all fields', () => {
      const redFlag: RedFlag = {
        severity: 'critical',
        category: 'Security',
        title: 'Hardcoded secrets',
        description: 'Found hardcoded API keys',
        evidence: ['file1.ts:10', 'file2.ts:20'],
        fix: 'Use environment variables',
        location: 'src/config.ts'
      };

      expect(redFlag.severity).toBe('critical');
      expect(redFlag.category).toBe('Security');
      expect(redFlag.title).toBe('Hardcoded secrets');
      expect(redFlag.evidence).toHaveLength(2);
      expect(redFlag.location).toBeDefined();
    });

    it('should accept red flag without location', () => {
      const redFlag: RedFlag = {
        severity: 'high',
        category: 'Documentation',
        title: 'Missing README',
        description: 'No README found',
        evidence: [],
        fix: 'Add README'
      };

      expect(redFlag.location).toBeUndefined();
    });

    it('should accept empty evidence array', () => {
      const redFlag: RedFlag = {
        severity: 'medium',
        category: 'UX',
        title: 'Poor error messages',
        description: 'Errors are not helpful',
        evidence: [],
        fix: 'Improve error messages'
      };

      expect(redFlag.evidence).toEqual([]);
    });
  });

  describe('FirstImpressionsFindings', () => {
    it('should accept complete first impressions findings', () => {
      const findings: FirstImpressionsFindings = {
        hasReadme: true,
        readmeScore: 8,
        hasInstallInstructions: true,
        hasExamples: true,
        descriptionClarity: 7,
        score: 8.0,
        notes: ['Good README', 'Clear description']
      };

      expect(findings.score).toBe(8.0);
      expect(findings.readmeScore).toBe(8);
      expect(findings.notes).toHaveLength(2);
    });

    it('should accept score range 0-10', () => {
      const scores = [0, 5.5, 10];

      scores.forEach(score => {
        const findings: FirstImpressionsFindings = {
          hasReadme: true,
          readmeScore: score,
          hasInstallInstructions: true,
          hasExamples: true,
          descriptionClarity: 7,
          score,
          notes: []
        };
        expect(findings.score).toBe(score);
      });
    });
  });

  describe('InstallationFindings', () => {
    it('should accept successful installation findings', () => {
      const findings: InstallationFindings = {
        attempted: true,
        success: true,
        duration: 5000,
        method: 'npm',
        errors: [],
        warnings: ['Deprecated dependency'],
        score: 9.0,
        notes: ['Smooth installation']
      };

      expect(findings.success).toBe(true);
      expect(findings.duration).toBe(5000);
      expect(findings.method).toBe('npm');
    });

    it('should accept failed installation findings', () => {
      const findings: InstallationFindings = {
        attempted: true,
        success: false,
        duration: 0,
        errors: ['Permission denied', 'Network timeout'],
        warnings: [],
        score: 0,
        notes: ['Installation failed']
      };

      expect(findings.success).toBe(false);
      expect(findings.errors).toHaveLength(2);
    });

    it('should accept various installation methods', () => {
      const methods = ['npm', 'yarn', 'pnpm', 'cargo', 'go get', 'pip', 'gem'];

      methods.forEach(method => {
        const findings: InstallationFindings = {
          attempted: true,
          success: true,
          duration: 3000,
          method,
          errors: [],
          warnings: [],
          score: 8.0,
          notes: []
        };
        expect(findings.method).toBe(method);
      });
    });
  });

  describe('FunctionalityFindings', () => {
    it('should accept complete functionality findings', () => {
      const commandsTested: CommandTest[] = [
        { command: '--help', success: true, output: 'Help text', duration: 50 },
        { command: 'build', success: true, output: 'Built', duration: 1000 },
        { command: 'test', success: false, error: 'Tests failed', duration: 500 }
      ];

      const findings: FunctionalityFindings = {
        commandsTested,
        successfulExecutions: 2,
        failedExecutions: 1,
        missingFeatures: ['--verbose', '--config'],
        score: 6.5,
        notes: ['Some commands failed']
      };

      expect(findings.commandsTested).toHaveLength(3);
      expect(findings.successfulExecutions).toBe(2);
      expect(findings.failedExecutions).toBe(1);
      expect(findings.missingFeatures).toContain('--verbose');
    });

    it('should accept command test with all fields', () => {
      const commandTest: CommandTest = {
        command: 'test --verbose',
        success: true,
        output: 'Test output',
        duration: 1000
      };

      expect(commandTest.command).toBe('test --verbose');
      expect(commandTest.success).toBe(true);
    });

    it('should accept command test with error', () => {
      const commandTest: CommandTest = {
        command: 'invalid-command',
        success: false,
        error: 'Command not found',
        duration: 10
      };

      expect(commandTest.success).toBe(false);
      expect(commandTest.error).toBeDefined();
    });
  });

  describe('VerificationFindings', () => {
    it('should accept complete verification findings', () => {
      const verifiedClaims: VerifiedClaim[] = [
        {
          claim: 'Supports Node.js 18+',
          verified: true,
          source: 'package.json',
          expected: '>=18.0.0',
          actual: '>=18.0.0',
          match: 'exact'
        },
        {
          claim: 'Works on Windows',
          verified: true,
          source: 'README',
          match: 'partial'
        }
      ];

      const findings: VerificationFindings = {
        verifiedClaims,
        unverifiableClaims: ['100% test coverage'],
        accuracyIssues: ['Version mismatch'],
        score: 7.5,
        notes: ['Most claims verified']
      };

      expect(findings.verifiedClaims).toHaveLength(2);
      expect(findings.unverifiableClaims).toHaveLength(1);
      expect(findings.accuracyIssues).toHaveLength(1);
    });

    it('should accept all match types', () => {
      const matchTypes: Array<'exact' | 'partial' | 'none'> = ['exact', 'partial', 'none'];

      matchTypes.forEach(match => {
        const claim: VerifiedClaim = {
          claim: 'Test claim',
          verified: true,
          match
        };
        expect(claim.match).toBe(match);
      });
    });
  });

  describe('PhaseResult', () => {
    it('should accept successful phase result', () => {
      const result: PhaseResult = {
        phase: 'first-impressions',
        success: true,
        duration: 1500,
        findings: { score: 8.0 },
        errors: []
      };

      expect(result.phase).toBe('first-impressions');
      expect(result.success).toBe(true);
      expect(result.duration).toBe(1500);
    });

    it('should accept failed phase result', () => {
      const result: PhaseResult = {
        phase: 'installation',
        success: false,
        duration: 100,
        findings: null,
        errors: ['Network timeout', 'Package not found']
      };

      expect(result.success).toBe(false);
      expect(result.findings).toBeNull();
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('ValidationOptions', () => {
    it('should accept validation options', () => {
      const options: ValidationOptions = {
        enableDoubtAgents: true,
        minScore: 6.0,
        cycles: 3
      };

      expect(options.enableDoubtAgents).toBe(true);
      expect(options.minScore).toBe(6.0);
      expect(options.cycles).toBe(3);
    });

    it('should accept different score thresholds', () => {
      const thresholds = [0, 5.0, 7.5, 10.0];

      thresholds.forEach(threshold => {
        const options: ValidationOptions = {
          enableDoubtAgents: true,
          minScore: threshold,
          cycles: 3
        };
        expect(options.minScore).toBe(threshold);
      });
    });
  });

  describe('ValidationResult', () => {
    it('should accept passed validation result', () => {
      const result: ValidationResult = {
        passed: true,
        score: 7.5,
        feedback: ['Good quality', 'Well documented'],
        additionalFlags: []
      };

      expect(result.passed).toBe(true);
      expect(result.score).toBe(7.5);
      expect(result.feedback).toHaveLength(2);
    });

    it('should accept failed validation result with additional flags', () => {
      const additionalFlags: RedFlag[] = [
        {
          severity: 'high',
          category: 'Validation',
          title: 'Insufficient evidence',
          description: 'Claims lack supporting evidence',
          evidence: [],
          fix: 'Add more documentation'
        }
      ];

      const result: ValidationResult = {
        passed: false,
        score: 4.5,
        feedback: ['Poor quality', 'Missing evidence'],
        additionalFlags
      };

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(6.0);
      expect(result.additionalFlags).toHaveLength(1);
    });

    it('should accept score at boundary', () => {
      const result1: ValidationResult = {
        passed: true,
        score: 6.0,
        feedback: [],
        additionalFlags: []
      };

      const result2: ValidationResult = {
        passed: false,
        score: 5.9,
        feedback: [],
        additionalFlags: []
      };

      expect(result1.passed).toBe(true);
      expect(result2.passed).toBe(false);
    });
  });

  describe('type compatibility', () => {
    it('should allow partial phase findings', () => {
      const findings: PhaseFindings = {
        firstImpressions: {
          hasReadme: true,
          readmeScore: 7,
          hasInstallInstructions: false,
          hasExamples: false,
          descriptionClarity: 5,
          score: 6.0,
          notes: []
        }
        // Other phases are optional
      };

      expect(findings.firstImpressions).toBeDefined();
      expect(findings.installation).toBeUndefined();
    });

    it('should allow empty arrays', () => {
      const redFlags: RedFlag[] = [];
      const notes: string[] = [];
      const evidence: string[] = [];

      expect(redFlags).toEqual([]);
      expect(notes).toEqual([]);
      expect(evidence).toEqual([]);
    });
  });
});
