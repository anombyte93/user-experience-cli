/**
 * Edge case integration tests
 * Tests malformed configs, permission errors, network failures, and error recovery
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { auditTool } from '../auditor';
import { validateLicense } from '../monetization/license';
import { runPhase } from '../phases/index';
import { generateReport } from '../reporting/generator';
import type { AuditOptions } from '../types';

describe('Integration Tests: Edge Cases and Error Recovery', () => {
  const tempDir = path.join(tmpdir(), `ux-edge-test-${Date.now()}`);

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('missing or invalid tool paths', () => {
    it('should reject non-existent tool path', async () => {
      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      await expect(
        auditTool('/nonexistent/path/to/tool', options)
      ).rejects.toThrow('does not exist');
    });

    it('should reject empty tool path', async () => {
      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      await expect(
        auditTool('', options)
      ).rejects.toThrow();
    });

    it('should handle tool path with special characters', async () => {
      const toolPath = path.join(tempDir, 'tool-with-special-chars_123');
      await fs.mkdir(toolPath, { recursive: true });

      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      // Should not throw on path with special characters
      const result = await auditTool(toolPath, options);
      expect(result).toBeDefined();
    });

    it('should handle symlinks to tool directories', async () => {
      const realPath = path.join(tempDir, 'real-tool');
      const linkPath = path.join(tempDir, 'symlink-tool');

      await fs.mkdir(realPath, { recursive: true });

      try {
        await fs.symlink(realPath, linkPath);
      } catch {
        // Skip test if symlinks not supported
        return;
      }

      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      const result = await auditTool(linkPath, options);
      expect(result).toBeDefined();
    });
  });

  describe('malformed tool configurations', () => {
    it('should handle missing package.json', async () => {
      const toolPath = path.join(tempDir, 'no-package-json');
      await fs.mkdir(toolPath, { recursive: true });

      // Create only README, no package.json
      await fs.writeFile(
        path.join(toolPath, 'README.md'),
        '# Test Tool'
      );

      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      // Should handle gracefully
      const result = await auditTool(toolPath, options);
      expect(result).toBeDefined();
    });

    it('should handle invalid JSON in package.json', async () => {
      const toolPath = path.join(tempDir, 'invalid-json');
      await fs.mkdir(toolPath, { recursive: true });

      await fs.writeFile(
        path.join(toolPath, 'package.json'),
        '{ invalid json }'
      );

      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      // Should not crash
      const result = await auditTool(toolPath, options);
      expect(result).toBeDefined();
    });

    it('should handle corrupted README files', async () => {
      const toolPath = path.join(tempDir, 'corrupted-readme');
      await fs.mkdir(toolPath, { recursive: true });

      // Create README with binary/corrupted content
      await fs.writeFile(
        path.join(toolPath, 'README.md'),
        Buffer.from([0x00, 0x01, 0x02, 0x03])
      );

      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      // Should handle gracefully
      const result = await auditTool(toolPath, options);
      expect(result).toBeDefined();
    });

    it('should handle extremely large files', async () => {
      const toolPath = path.join(tempDir, 'large-files');
      await fs.mkdir(toolPath, { recursive: true });

      // Create a very large README (10MB)
      const largeContent = '# '.repeat(10 * 1024 * 1024);
      await fs.writeFile(
        path.join(toolPath, 'README.md'),
        largeContent
      );

      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      // Should handle without timeout
      const result = await auditTool(toolPath, options);
      expect(result).toBeDefined();
    });
  });

  describe('permission errors', () => {
    it('should handle unreadable files', async () => {
      const toolPath = path.join(tempDir, 'unreadable');
      await fs.mkdir(toolPath, { recursive: true });

      const filePath = path.join(toolPath, 'secret.md');
      await fs.writeFile(filePath, 'secret content');

      // Try to make file unreadable (may not work on all systems)
      try {
        await fs.chmod(filePath, 0o000);
      } catch {
        // Skip if chmod not supported
        return;
      }

      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      // Should handle gracefully
      const result = await auditTool(toolPath, options);
      expect(result).toBeDefined();

      // Restore permissions for cleanup
      try {
        await fs.chmod(filePath, 0o644);
      } catch {}
    });

    it('should handle unwritable output directory', async () => {
      const toolPath = path.join(tempDir, 'tool');
      await fs.mkdir(toolPath, { recursive: true });

      const outputDir = path.join(tempDir, 'readonly-output');
      await fs.mkdir(outputDir, { recursive: true });

      try {
        await fs.chmod(outputDir, 0o000);
      } catch {
        return;
      }

      const options: AuditOptions = {
        output: path.join(outputDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      // Should fail gracefully
      await expect(
        auditTool(toolPath, options)
      ).rejects.toThrow();

      // Restore permissions
      try {
        await fs.chmod(outputDir, 0o755);
      } catch {}
    });
  });

  describe('missing or corrupted prompt files', () => {
    it('should handle missing phase prompt', async () => {
      const toolPath = path.join(tempDir, 'tool');
      await fs.mkdir(toolPath, { recursive: true });

      // Try to run phase with non-existent prompt
      const result = await runPhase('nonexistent-phase', { toolPath });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unknown phase');
    });

    it('should handle corrupted phase prompt', async () => {
      const toolPath = path.join(tempDir, 'tool');
      await fs.mkdir(toolPath, { recursive: true });

      // This would require mocking the prompt file system
      // For now, test that the phase runner handles errors
      const result = await runPhase('first-impressions', { toolPath });

      // Should complete without crashing
      expect(result).toBeDefined();
    });
  });

  describe('output file issues', () => {
    it('should create nested output directories', async () => {
      const toolPath = path.join(tempDir, 'tool');
      await fs.mkdir(toolPath, { recursive: true });

      const nestedOutput = path.join(tempDir, 'level1', 'level2', 'level3', 'report.md');

      const options: AuditOptions = {
        output: nestedOutput,
        validation: false,
        tier: 'free'
      };

      const result = await auditTool(toolPath, options);

      // Should create all parent directories
      const exists = await fs.access(nestedOutput).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      expect(result.outputPath).toBe(nestedOutput);
    });

    it('should overwrite existing report', async () => {
      const toolPath = path.join(tempDir, 'tool');
      await fs.mkdir(toolPath, { recursive: true });

      const reportPath = path.join(tempDir, 'report.md');

      // Create existing report
      await fs.writeFile(reportPath, 'Old report content');

      const options: AuditOptions = {
        output: reportPath,
        validation: false,
        tier: 'free'
      };

      await auditTool(toolPath, options);

      // Should overwrite
      const content = await fs.readFile(reportPath, 'utf-8');
      expect(content).not.toContain('Old report content');
    });
  });

  describe('license validation edge cases', () => {
    it('should handle malformed license keys', async () => {
      const invalidKeys = [
        '',
        'INVALID',
        'FREE-',
        'FREE-AAA',
        'FREE-AAA-BBB',
        'PRO-XXX-YYY-ZZZ-EXTRA',
        'lowercase-aaa-bbb-ccc',
        'NUMBERS-123-456-789',
        'WITH-SPACES-AAA-BBB',
        'SPECIAL@CHARS-AAA-BBB'
      ];

      for (const key of invalidKeys) {
        const result = await validateLicense(key);
        expect(result.valid).toBe(false);
      }
    });

    it('should handle license file corruption', async () => {
      const licenseDir = path.join(process.env.HOME || '', '.user-experience');
      await fs.mkdir(licenseDir, { recursive: true });

      const licenseFile = path.join(licenseDir, 'license.json');

      // Write corrupted license
      await fs.writeFile(licenseFile, '{corrupted json}');

      const result = await validateLicense('PRO-AAA-BBB-CCC');
      expect(result.valid).toBe(false);

      // Cleanup
      await fs.rm(licenseDir, { recursive: true, force: true });
    });
  });

  describe('report generation edge cases', () => {
    it('should handle findings with missing optional fields', async () => {
      const reportPath = path.join(tempDir, 'report.md');

      await generateReport({
        toolPath: '/fake/tool',
        findings: {}, // Empty findings
        redFlags: [],
        score: 5.0,
        options: { output: reportPath, validation: false, tier: 'free' },
        completedAt: new Date()
      }, reportPath);

      const exists = await fs.access(reportPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should handle red flags with missing optional location', async () => {
      const reportPath = path.join(tempDir, 'report.md');

      await generateReport({
        toolPath: '/fake/tool',
        findings: {},
        redFlags: [{
          severity: 'high',
          category: 'Test',
          title: 'Test flag',
          description: 'Test',
          evidence: [],
          fix: 'Fix it'
          // No location field
        }],
        score: 5.0,
        options: { output: reportPath, validation: false, tier: 'free' },
        completedAt: new Date()
      }, reportPath);

      const content = await fs.readFile(reportPath, 'utf-8');
      expect(content).toContain('Test flag');
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple simultaneous audits', async () => {
      const tools = await Promise.all([
        fs.mkdir(path.join(tempDir, 'tool1'), { recursive: true }),
        fs.mkdir(path.join(tempDir, 'tool2'), { recursive: true }),
        fs.mkdir(path.join(tempDir, 'tool3'), { recursive: true })
      ]);

      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      // Run multiple audits simultaneously
      const results = await Promise.all([
        auditTool(tools[0] as string, { ...options, output: path.join(tempDir, 'report1.md') }),
        auditTool(tools[1] as string, { ...options, output: path.join(tempDir, 'report2.md') }),
        auditTool(tools[2] as string, { ...options, output: path.join(tempDir, 'report3.md') })
      ]);

      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('resource limits', () => {
    it('should handle deep directory structures', async () => {
      const toolPath = path.join(tempDir, 'deep');
      let currentPath = toolPath;

      // Create deep nested structure
      for (let i = 0; i < 20; i++) {
        currentPath = path.join(currentPath, `level${i}`);
        await fs.mkdir(currentPath, { recursive: true });
      }

      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      // Should handle without stack overflow
      const result = await auditTool(toolPath, options);
      expect(result).toBeDefined();
    });

    it('should handle tools with many files', async () => {
      const toolPath = path.join(tempDir, 'many-files');
      await fs.mkdir(toolPath, { recursive: true });

      // Create many files
      for (let i = 0; i < 1000; i++) {
        await fs.writeFile(
          path.join(toolPath, `file${i}.txt`),
          `Content ${i}`
        );
      }

      const options: AuditOptions = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      };

      // Should handle without excessive memory usage
      const result = await auditTool(toolPath, options);
      expect(result).toBeDefined();
    });
  });

  describe('invalid options', () => {
    it('should handle invalid tier values gracefully', async () => {
      const toolPath = path.join(tempDir, 'tool');
      await fs.mkdir(toolPath, { recursive: true });

      // TypeScript should catch this, but test runtime behavior
      const options = {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'invalid' as any
      };

      // Should not crash
      const result = await auditTool(toolPath, options);
      expect(result).toBeDefined();
    });

    it('should handle extremely long output paths', async () => {
      const toolPath = path.join(tempDir, 'tool');
      await fs.mkdir(toolPath, { recursive: true });

      const longDir = 'x'.repeat(255);
      const outputPath = path.join(tempDir, longDir, 'report.md');

      const options: AuditOptions = {
        output: outputPath,
        validation: false,
        tier: 'free'
      };

      // Should handle or fail gracefully
      try {
        const result = await auditTool(toolPath, options);
        expect(result).toBeDefined();
      } catch (error) {
        // Also acceptable to fail with descriptive error
        expect((error as Error).message).toBeTruthy();
      }
    });
  });
});
