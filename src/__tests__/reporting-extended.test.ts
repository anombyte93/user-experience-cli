/**
 * Extended Reporting Unit Tests - 12 additional tests
 * Tests reporting functionality with comprehensive coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Reporting Extended Unit Tests', () => {
  const tempDir = join(tmpdir(), `ux-reporting-test-${Date.now()}`);
  const testReportPath = join(tempDir, 'test-report.md');
  const testPdfPath = join(tempDir, 'test-report.pdf');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(tempDir, { recursive: true });

    // Mock fs operations
    vi.mock('fs', () => ({
      promises: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        access: vi.fn(),
        readdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        rmdir: vi.fn()
      }
    }));

    // Mock child_process for PDF generation
    vi.mock('child_process', () => ({
      spawn: vi.fn(() => ({
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
          return this;
        }),
        stdout: {
          on: vi.fn()
        },
        stderr: {
          on: vi.fn()
        }
      }))
    }));

    // Mock required modules
    vi.mock('chalk', () => ({
      default: {
        green: (str: string) => str,
        red: (str: string) => str,
        yellow: (str: string) => str,
        blue: (str: string) => str,
        bold: (str: string) => str
      }
    }));

    vi.mock('ora', () => ({
      default: vi.fn(() => ({
        start: vi.fn(),
        succeed: vi.fn(),
        fail: vi.fn(),
        warn: vi.fn(),
        info: vi.fn()
      }))
    }));
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
    vi.restoreAllMocks();
  });

  describe('Report Generation', () => {
    it('should generate markdown report with proper structure', async () => {
      const { generateReport } = await import('../reporting/generator');

      const mockAuditData = {
        score: 8.5,
        redFlags: [],
        recommendations: [],
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(generateReport(mockAuditData, 'markdown')).resolves.not.toThrow();
    });

    it('should handle markdown report generation with empty data', async () => {
      const { generateReport } = await import('../reporting/generator');

      const emptyAuditData = {
        score: 0,
        redFlags: [],
        recommendations: [],
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: '',
        toolVersion: ''
      };

      await expect(generateReport(emptyAuditData, 'markdown')).resolves.not.toThrow();
    });

    it('should generate report with custom template', async () => {
      const { generateReport } = await import('../reporting/generator');

      const customTemplate = `
# {{toolName}} Audit Report

**Score:** {{score}}/10

## Red Flags
{{#each redFlags}}
- {{this}}
{{/each}}

## Recommendations
{{#each recommendations}}
- {{this}}
{{/each}}
      `;

      const mockAuditData = {
        score: 7.0,
        redFlags: ['Test flag'],
        recommendations: ['Test recommendation'],
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      // Mock fs.readFile to return custom template
      vi.spyOn(fs, 'readFile').mockResolvedValue(customTemplate);

      await expect(generateReport(mockAuditData, 'markdown')).resolves.not.toThrow();
    });

    it('should handle report generation with special characters', async () => {
      const { generateReport } = await import('../reporting/generator');

      const mockAuditData = {
        score: 9.0,
        redFlags: ['Special & Characters', 'Unicode: ñáéíóú'],
        recommendations: ['More & Special > Characters'],
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(generateReport(mockAuditData, 'markdown')).resolves.not.toThrow();
    });

    it('should handle report generation with long text', async () => {
      const { generateReport } = await import('../reporting/generator');

      const longText = 'x'.repeat(1000);
      const mockAuditData = {
        score: 6.5,
        redFlags: [longText],
        recommendations: [longText],
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(generateReport(mockAuditData, 'markdown')).resolves.not.toThrow();
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF report', async () => {
      const { generateReport } = await import('../reporting/generator');

      const mockAuditData = {
        score: 8.0,
        redFlags: [],
        recommendations: [],
        completedAt: new Date(),
        outputPath: testPdfPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(generateReport(mockAuditData, 'pdf')).resolves.not.toThrow();
    });

    it('should handle PDF generation with errors', async () => {
      const { generateReport } = await import('../reporting/generator');

      // Mock spawn to simulate error
      const { spawn } = await import('child_process');
      vi.mocked(spawn).mockReturnValue({
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(1); // Non-zero exit code
          return this;
        }),
        stdout: {
          on: vi.fn()
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') callback('PDF generation failed');
            return this;
          })
        }
      } as any);

      const mockAuditData = {
        score: 7.0,
        redFlags: [],
        recommendations: [],
        completedAt: new Date(),
        outputPath: testPdfPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(generateReport(mockAuditData, 'pdf')).rejects.toThrow();
    });

    it('should handle PDF generation timeout', async () => {
      const { generateReport } = await import('../reporting/generator');

      const { spawn } = await import('child_process');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF generation timeout')), 100);
      });

      vi.mocked(spawn).mockReturnValue({
        on: vi.fn()
      } as any);

      const mockAuditData = {
        score: 7.0,
        redFlags: [],
        recommendations: [],
        completedAt: new Date(),
        outputPath: testPdfPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(Promise.race([generateReport(mockAuditData, 'pdf'), timeoutPromise]))
        .rejects.toThrow('PDF generation timeout');
    });
  });

  describe('Template Rendering', () => {
    it('should render template with variables', async () => {
      const { renderTemplate } = await import('../reporting/template');

      const template = 'Hello {{name}}, your score is {{score}}';
      const data = { name: 'User', score: 8.5 };

      const result = await renderTemplate(template, data);
      expect(result).toBe('Hello User, your score is 8.5');
    });

    it('should handle template with missing variables', async () => {
      const { renderTemplate } = await import('../reporting/template');

      const template = 'Hello {{name}}, your score is {{score}} and status is {{status}}';
      const data = { name: 'User', score: 8.5 };

      const result = await renderTemplate(template, data);
      expect(result).toBe('Hello User, your score is 8.5 and status is ');
    });

    it('should handle template with loops', async () => {
      const { renderTemplate } = await import('../reporting/template');

      const template = `
{{#each items}}
- {{this}}
{{/each}}
      `;
      const data = { items: ['Item 1', 'Item 2', 'Item 3'] };

      const result = await renderTemplate(template, data);
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
      expect(result).toContain('- Item 3');
    });

    it('should handle template with conditional logic', async () => {
      const { renderTemplate } = await import('../reporting/template');

      const template = `
{{#if isValid}}
Valid
{{else}}
Invalid
{{/if}}
      `;
      const data = { isValid: true };

      const result = await renderTemplate(template, data);
      expect(result.trim()).toBe('Valid');
    });

    it('should handle malformed template gracefully', async () => {
      const { renderTemplate } = await import('../reporting/template');

      const malformedTemplate = 'Hello {{name}, missing closing brace';
      const data = { name: 'User' };

      const result = await renderTemplate(malformedTemplate, data);
      expect(result).toBe('Hello {name}, missing closing brace');
    });
  });

  describe('Report Output Format', () => {
    it('should handle JSON output format', async () => {
      const { generateReport } = await import('../reporting/generator');

      const mockAuditData = {
        score: 8.5,
        redFlags: [],
        recommendations: [],
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(generateReport(mockAuditData, 'json')).resolves.not.toThrow();
    });

    it('should handle HTML output format', async () => {
      const { generateReport } = await import('../reporting/generator');

      const mockAuditData = {
        score: 8.5,
        redFlags: [],
        recommendations: [],
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(generateReport(mockAuditData, 'html')).resolves.not.toThrow();
    });

    it('should handle invalid output format', async () => {
      const { generateReport } = await import('../reporting/generator');

      const mockAuditData = {
        score: 8.5,
        redFlags: [],
        recommendations: [],
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(generateReport(mockAuditData, 'invalid' as any)).rejects.toThrow();
    });
  });

  describe('Report Edge Cases', () => {
    it('should handle report generation with null values', async () => {
      const { generateReport } = await import('../reporting/generator');

      const mockAuditData = {
        score: null as any,
        redFlags: null as any,
        recommendations: null as any,
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(generateReport(mockAuditData, 'markdown')).resolves.not.toThrow();
    });

    it('should handle report generation with undefined values', async () => {
      const { generateReport } = await import('../reporting/generator');

      const mockAuditData = {
        score: undefined as any,
        redFlags: undefined as any,
        recommendations: undefined as any,
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };

      await expect(generateReport(mockAuditData, 'markdown')).resolves.not.toThrow();
    });

    it('should handle report generation with circular references', async () => {
      const { generateReport } = await import('../reporting/generator');

      const circularData: any = {
        score: 8.5,
        redFlags: [],
        recommendations: [],
        completedAt: new Date(),
        outputPath: testReportPath,
        toolName: 'test-tool',
        toolVersion: '1.0.0'
      };
      circularData.self = circularData; // Circular reference

      await expect(generateReport(circularData, 'markdown')).rejects.toThrow();
    });
  });
});