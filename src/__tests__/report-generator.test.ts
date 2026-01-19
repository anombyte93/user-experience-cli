/**
 * Report generation tests
 * Tests report generation from audit findings with various scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { generateReport } from '../reporting/generator';
import type { ReportData } from '../reporting/generator';
import type { AuditOptions, RedFlag } from '../types';

describe('report generation', () => {
  const tempDir = path.join(tmpdir(), `ux-report-test-${Date.now()}`);
  const outputPath = path.join(tempDir, 'report.md');

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('generateReport', () => {
    const mockOptions: AuditOptions = {
      output: outputPath,
      validation: true,
      tier: 'free',
      verbose: false
    };

    const mockRedFlags: RedFlag[] = [
      {
        severity: 'critical',
        category: 'Security',
        title: 'Hardcoded API keys',
        description: 'Found hardcoded API keys in source code',
        evidence: ['src/config.ts:12', 'src/api.ts:45'],
        fix: 'Use environment variables for API keys',
        location: 'src/config.ts'
      },
      {
        severity: 'high',
        category: 'Documentation',
        title: 'Missing installation instructions',
        description: 'README lacks clear installation steps',
        evidence: ['README.md has no Installation section'],
        fix: 'Add detailed installation instructions'
      },
      {
        severity: 'medium',
        category: 'UX',
        title: 'Poor error messages',
        description: 'Error messages are not user-friendly',
        evidence: ['Error: EACCES', 'Error: ENOENT'],
        fix: 'Improve error messaging with actionable guidance'
      }
    ];

    it('should generate report with all findings', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {
          firstImpressions: {
            hasReadme: true,
            readmeScore: 7,
            hasInstallInstructions: true,
            hasExamples: true,
            descriptionClarity: 6,
            score: 7.0,
            notes: ['Good README']
          },
          installation: {
            attempted: true,
            success: true,
            duration: 5000,
            method: 'npm',
            errors: [],
            warnings: [],
            score: 9.0,
            notes: ['Smooth installation']
          },
          functionality: {
            commandsTested: [
              { command: '--help', success: true, output: 'Help text', duration: 100 }
            ],
            successfulExecutions: 1,
            failedExecutions: 0,
            missingFeatures: [],
            score: 8.0,
            notes: ['All commands work']
          },
          verification: {
            verifiedClaims: [],
            unverifiableClaims: [],
            accuracyIssues: [],
            score: 7.0,
            notes: ['No issues']
          }
        },
        redFlags: mockRedFlags,
        score: 7.5,
        options: mockOptions,
        completedAt: new Date('2025-01-20T12:00:00Z')
      };

      const resultPath = await generateReport(data, outputPath);

      expect(resultPath).toBe(outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('USER EXPERIENCE AUDIT REPORT');
      expect(reportContent).toContain('7.5/10');
      expect(reportContent).toContain('First Impressions');
      expect(reportContent).toContain('Installation Test');
      expect(reportContent).toContain('Functionality Check');
      expect(reportContent).toContain('Data Verification');
    });

    it('should include red flags in report', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {},
        redFlags: mockRedFlags,
        score: 5.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('Red Flags');
      expect(reportContent).toContain('critical');
      expect(reportContent).toContain('Hardcoded API keys');
      expect(reportContent).toContain('Security');
      expect(reportContent).toContain('high');
      expect(reportContent).toContain('Missing installation instructions');
      expect(reportContent).toContain('medium');
      expect(reportContent).toContain('Poor error messages');
    });

    it('should handle empty findings gracefully', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {},
        redFlags: [],
        score: 8.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('USER EXPERIENCE AUDIT REPORT');
      expect(reportContent).toContain('8.0/10');
    });

    it('should handle no red flags', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {
          firstImpressions: {
            hasReadme: true,
            readmeScore: 9,
            hasInstallInstructions: true,
            hasExamples: true,
            descriptionClarity: 9,
            score: 9.0,
            notes: []
          }
        },
        redFlags: [],
        score: 9.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('No red flags found!');
    });

    it('should include evidence for red flags', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {},
        redFlags: [mockRedFlags[0]],
        score: 5.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('src/config.ts:12');
      expect(reportContent).toContain('src/api.ts:45');
    });

    it('should include fix suggestions for red flags', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {},
        redFlags: [mockRedFlags[0]],
        score: 5.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('Use environment variables for API keys');
    });

    it('should include location when available', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {},
        redFlags: [mockRedFlags[0]],
        score: 5.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('src/config.ts');
    });

    it('should create output directory if not exists', async () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', 'report.md');

      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {},
        redFlags: [],
        score: 8.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, nestedPath);

      const exists = await fs.access(nestedPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should format timestamp correctly', async () => {
      const testDate = new Date('2025-01-20T12:30:45Z');

      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {},
        redFlags: [],
        score: 8.0,
        options: mockOptions,
        completedAt: testDate
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('2025-01-20T12:30:45.000Z');
    });

    it('should include tool name in report', async () => {
      const data: ReportData = {
        toolPath: '/path/to/my-tool',
        findings: {},
        redFlags: [],
        score: 8.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('my-tool');
    });

    it('should calculate correct letter grade', async () => {
      const testCases = [
        { score: 9.5, expectedGrade: 'A+' },
        { score: 8.5, expectedGrade: 'A' },
        { score: 7.5, expectedGrade: 'B' },
        { score: 6.5, expectedGrade: 'C' },
        { score: 5.0, expectedGrade: 'D' },
        { score: 3.0, expectedGrade: 'F' }
      ];

      for (const testCase of testCases) {
        const data: ReportData = {
          toolPath: '/fake/tool',
          findings: {},
          redFlags: [],
          score: testCase.score,
          options: mockOptions,
          completedAt: new Date()
        };

        await generateReport(data, outputPath);

        const reportContent = await fs.readFile(outputPath, 'utf-8');
        expect(reportContent).toContain(testCase.expectedGrade);
      }
    });

    it('should include phase-specific findings', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {
          functionality: {
            commandsTested: [
              { command: 'build', success: true, output: 'Built successfully', duration: 1000 },
              { command: 'test', success: false, error: 'Tests failed', duration: 500 }
            ],
            successfulExecutions: 1,
            failedExecutions: 1,
            missingFeatures: ['--verbose flag'],
            score: 6.0,
            notes: ['Some commands failed']
          }
        },
        redFlags: [],
        score: 6.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('Commands Tested: 2');
      expect(reportContent).toContain('Successful: 1');
      expect(reportContent).toContain('Failed: 1');
      expect(reportContent).toContain('--verbose flag');
    });

    it('should use fallback template if file template not found', async () => {
      // Mock fs.readFile to fail for template
      const originalReadFile = fs.readFile;
      vi.spyOn(fs, 'readFile').mockImplementation(async (filePath, ...args) => {
        if (filePath.toString().includes('report.md.hbs')) {
          throw new Error('Template not found');
        }
        return originalReadFile(filePath as string, ...args);
      });

      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {},
        redFlags: [],
        score: 8.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('USER EXPERIENCE AUDIT REPORT');

      vi.restoreAllMocks();
    });

    it('should handle verification findings', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {
          verification: {
            verifiedClaims: [
              {
                claim: 'Supports Node.js 18+',
                verified: true,
                source: 'package.json',
                expected: '>=18.0.0',
                actual: '>=18.0.0',
                match: 'exact'
              }
            ],
            unverifiableClaims: ['Works on all platforms'],
            accuracyIssues: ['Version mismatch in README'],
            score: 7.0,
            notes: ['Some claims verified']
          }
        },
        redFlags: [],
        score: 7.0,
        options: mockOptions,
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('Claims Verified: 1');
      expect(reportContent).toContain('Accuracy Issues: 1');
    });
  });

  describe('report edge cases', () => {
    it('should handle special characters in tool path', async () => {
      const data: ReportData = {
        toolPath: '/path/to/tool-with-special-chars_123',
        findings: {},
        redFlags: [],
        score: 8.0,
        options: { output: outputPath, validation: false, tier: 'free' },
        completedAt: new Date()
      };

      const resultPath = await generateReport(data, outputPath);
      expect(resultPath).toBe(outputPath);
    });

    it('should handle very long red flag descriptions', async () => {
      const longDescription = 'A'.repeat(1000);
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {},
        redFlags: [{
          severity: 'high',
          category: 'Test',
          title: 'Long description',
          description: longDescription,
          evidence: [],
          fix: 'Fix it'
        }],
        score: 5.0,
        options: { output: outputPath, validation: false, tier: 'free' },
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent.length).toBeGreaterThan(1000);
    });

    it('should handle unicode characters in findings', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {},
        redFlags: [{
          severity: 'medium',
          category: '国际化',
          title: 'Unicode test 测试',
          description: 'Test with emoji 🚩 and unicode',
          evidence: ['证据'],
          fix: '修复'
        }],
        score: 7.0,
        options: { output: outputPath, validation: false, tier: 'free' },
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('🚩');
      expect(reportContent).toContain('测试');
    });

    it('should handle missing optional phase findings', async () => {
      const data: ReportData = {
        toolPath: '/fake/tool',
        findings: {
          firstImpressions: undefined,
          installation: undefined,
          functionality: undefined,
          verification: undefined
        },
        redFlags: [],
        score: 5.0,
        options: { output: outputPath, validation: false, tier: 'free' },
        completedAt: new Date()
      };

      await generateReport(data, outputPath);

      const reportContent = await fs.readFile(outputPath, 'utf-8');
      expect(reportContent).toContain('Phase not completed');
    });
  });
});
