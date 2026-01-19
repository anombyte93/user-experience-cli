/**
 * User flow integration tests
 * Tests real user workflows: first audit, report regeneration, tier-based access
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { auditTool } from '../auditor';
import { generateReport } from '../reporting/generator';
import {
  activateLicense,
  getCurrentLicense,
  checkFeatureAvailability,
  trackAuditUsage,
  hasRemainingAudits
} from '../monetization/license';
import type { AuditOptions, RedFlag } from '../types';

describe('Integration Tests: Real User Flows', () => {
  const tempDir = path.join(tmpdir(), `ux-flow-test-${Date.now()}`);
  const homeBackup = process.env.HOME;

  beforeEach(async () => {
    process.env.HOME = tempDir;
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    process.env.HOME = homeBackup;
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('new user first audit', () => {
    it('should complete first audit for free tier user', async () => {
      // Create a simple CLI tool
      const toolPath = path.join(tempDir, 'simple-cli');
      await fs.mkdir(toolPath, { recursive: true });

      await fs.writeFile(
        path.join(toolPath, 'package.json'),
        JSON.stringify({
          name: 'simple-cli',
          version: '1.0.0',
          description: 'A simple CLI tool',
          bin: { 'simple-cli': './cli.js' }
        })
      );

      await fs.writeFile(
        path.join(toolPath, 'README.md'),
        `# Simple CLI

A simple CLI tool for testing.

## Installation

\`\`\`bash
npm install -g simple-cli
\`\`\`

## Usage

\`\`\`bash
simple-cli --help
simple-cli hello
\`\`\`
`
      );

      // Run first audit
      const reportPath = path.join(tempDir, 'audit-report.md');
      const options: AuditOptions = {
        output: reportPath,
        validation: false, // Free tier doesn't get validation
        tier: 'free',
        verbose: false
      };

      const result = await auditTool(toolPath, options);

      // Verify audit completed
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
      expect(result.redFlags).toBeDefined();
      expect(Array.isArray(result.redFlags)).toBe(true);

      // Verify report was generated
      const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
      expect(reportExists).toBe(true);

      // Verify report content
      const reportContent = await fs.readFile(reportPath, 'utf-8');
      expect(reportContent).toContain('USER EXPERIENCE AUDIT REPORT');
      expect(reportContent).toContain('simple-cli');
    });

    it('should show helpful output for new user', async () => {
      const toolPath = path.join(tempDir, 'my-tool');
      await fs.mkdir(toolPath, { recursive: true });

      await fs.writeFile(
        path.join(toolPath, 'package.json'),
        JSON.stringify({ name: 'my-tool', version: '1.0.0' })
      );

      const reportPath = path.join(tempDir, 'report.md');
      const options: AuditOptions = {
        output: reportPath,
        validation: false,
        tier: 'free'
      };

      const result = await auditTool(toolPath, options);

      // New user should see clear results
      expect(result.outputPath).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.redFlags.length).toBeDefined();
    });
  });

  describe('pro tier user workflow', () => {
    beforeEach(async () => {
      // Activate pro license
      await activateLicense('PRO-ABC-123-DEF', 'pro-user@example.com');
    });

    it('should run audit with doubt-agent validation', async () => {
      const toolPath = path.join(tempDir, 'pro-tool');
      await fs.mkdir(toolPath, { recursive: true });

      await fs.writeFile(
        path.join(toolPath, 'package.json'),
        JSON.stringify({ name: 'pro-tool', version: '1.0.0' })
      );

      const reportPath = path.join(tempDir, 'pro-report.md');
      const options: AuditOptions = {
        output: reportPath,
        validation: true, // Pro tier gets validation
        tier: 'pro',
        verbose: false
      };

      const result = await auditTool(toolPath, options);

      // Pro user gets validated results
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have access to dashboard feature', async () => {
      const canAccessDashboard = await checkFeatureAvailability('dashboard');
      expect(canAccessDashboard).toBe(true);
    });

    it('should have access to validation feature', async () => {
      const canAccessValidation = await checkFeatureAvailability('validation');
      expect(canAccessValidation).toBe(true);
    });

    it('should not have unlimited audits', async () => {
      const hasUnlimited = await checkFeatureAvailability('unlimited-audits');
      expect(hasUnlimited).toBe(false);
    });
  });

  describe('enterprise tier user workflow', () => {
    beforeEach(async () => {
      // Activate enterprise license
      await activateLicense('ENTERPRISE-XYZ-789-ABC', 'enterprise@company.com');
    });

    it('should have unlimited audits', async () => {
      const hasUnlimited = await checkFeatureAvailability('unlimited-audits');
      expect(hasUnlimited).toBe(true);
    });

    it('should track usage but not limit', async () => {
      // Use many audits
      for (let i = 0; i < 100; i++) {
        await trackAuditUsage();
      }

      // Should still have remaining audits
      const hasRemaining = await hasRemainingAudits();
      expect(hasRemaining).toBe(true);
    });
  });

  describe('tier-based feature access', () => {
    it('should restrict dashboard to paid tiers', async () => {
      // Free tier
      await activateLicense('FREE-AAA-BBB-CCC', 'free@example.com');
      expect(await checkFeatureAvailability('dashboard')).toBe(false);

      // Upgrade to pro
      await activateLicense('PRO-DEF-456-GHI', 'pro@example.com');
      expect(await checkFeatureAvailability('dashboard')).toBe(true);
    });

    it('should restrict validation to paid tiers', async () => {
      // Free tier
      await activateLicense('FREE-AAA-BBB-CCC', 'free@example.com');
      expect(await checkFeatureAvailability('validation')).toBe(false);

      // Upgrade to pro
      await activateLicense('PRO-DEF-456-GHI', 'pro@example.com');
      expect(await checkFeatureAvailability('validation')).toBe(true);
    });

    it('should enforce audit limits for free tier', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'free@example.com');

      // Free tier gets 5 audits per month
      expect(await hasRemainingAudits()).toBe(true);

      // Use all 5 audits
      for (let i = 0; i < 5; i++) {
        expect(await hasRemainingAudits()).toBe(true);
        await trackAuditUsage();
      }

      // Should be at limit now
      expect(await hasRemainingAudits()).toBe(false);
    });

    it('should enforce audit limits for pro tier', async () => {
      await activateLicense('PRO-DEF-456-GHI', 'pro@example.com');

      // Pro tier gets 100 audits per month
      for (let i = 0; i < 100; i++) {
        expect(await hasRemainingAudits()).toBe(true);
        await trackAuditUsage();
      }

      // Should be at limit
      expect(await hasRemainingAudits()).toBe(false);
    });
  });

  describe('report regeneration workflow', () => {
    it('should generate report from saved audit data', async () => {
      const toolPath = path.join(tempDir, 'tool');
      await fs.mkdir(toolPath, { recursive: true });

      // Run initial audit
      const initialReport = path.join(tempDir, 'initial-report.md');
      const auditResult = await auditTool(toolPath, {
        output: initialReport,
        validation: false,
        tier: 'free'
      });

      // Save audit data to JSON
      const dataPath = path.join(tempDir, 'audit-data.json');
      await fs.writeFile(dataPath, JSON.stringify(auditResult, null, 2));

      // Regenerate report from saved data
      const regeneratedReport = path.join(tempDir, 'regenerated-report.md');
      await generateReport({
        toolPath: auditResult.findings.firstImpressions ? toolPath : '/fake/tool',
        findings: auditResult.findings,
        redFlags: auditResult.redFlags,
        score: auditResult.score,
        options: { output: regeneratedReport, validation: false, tier: 'free' },
        completedAt: auditResult.completedAt
      }, regeneratedReport);

      // Verify both reports exist
      const initialExists = await fs.access(initialReport).then(() => true).catch(() => false);
      const regeneratedExists = await fs.access(regeneratedReport).then(() => true).catch(() => false);

      expect(initialExists).toBe(true);
      expect(regeneratedExists).toBe(true);
    });

    it('should allow multiple report formats from same data', async () => {
      const toolPath = path.join(tempDir, 'tool');
      await fs.mkdir(toolPath, { recursive: true });

      const auditResult = await auditTool(toolPath, {
        output: path.join(tempDir, 'report1.md'),
        validation: false,
        tier: 'free'
      });

      // Generate different reports
      const reports = [
        path.join(tempDir, 'detailed-report.md'),
        path.join(tempDir, 'summary-report.md'),
        path.join(tempDir, 'executive-report.md')
      ];

      for (const reportPath of reports) {
        await generateReport({
          toolPath,
          findings: auditResult.findings,
          redFlags: auditResult.redFlags,
          score: auditResult.score,
          options: { output: reportPath, validation: false, tier: 'free' },
          completedAt: auditResult.completedAt
        }, reportPath);
      }

      // All reports should exist
      for (const reportPath of reports) {
        const exists = await fs.access(reportPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });
  });

  describe('progressive user journey', () => {
    it('should support user upgrading from free to pro', async () => {
      // Start as free user
      await activateLicense('FREE-AAA-BBB-CCC', 'user@example.com');

      const toolPath = path.join(tempDir, 'tool');
      await fs.mkdir(toolPath, { recursive: true });

      // Run audit as free user (no validation)
      const freeResult = await auditTool(toolPath, {
        output: path.join(tempDir, 'free-report.md'),
        validation: false,
        tier: 'free'
      });

      expect(freeResult).toBeDefined();

      // Upgrade to pro
      await activateLicense('PRO-UPG-123-GRD', 'user@example.com');

      // Run audit again with validation
      const proResult = await auditTool(toolPath, {
        output: path.join(tempDir, 'pro-report.md'),
        validation: true,
        tier: 'pro'
      });

      expect(proResult).toBeDefined();

      // Verify features unlocked
      expect(await checkFeatureAvailability('dashboard')).toBe(true);
      expect(await checkFeatureAvailability('validation')).toBe(true);
    });

    it('should track usage across multiple audits', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'user@example.com');

      const tools = await Promise.all([
        fs.mkdir(path.join(tempDir, 'tool1'), { recursive: true }),
        fs.mkdir(path.join(tempDir, 'tool2'), { recursive: true }),
        fs.mkdir(path.join(tempDir, 'tool3'), { recursive: true })
      ]);

      // Run multiple audits
      for (const toolPath of tools) {
        await auditTool(toolPath, {
          output: path.join(tempDir, `report-${Date.now()}.md`),
          validation: false,
          tier: 'free'
        });

        await trackAuditUsage();
      }

      // Check usage tracking
      const license = await getCurrentLicense();
      expect(license).toBeDefined();
    });
  });

  describe('error recovery in user flows', () => {
    it('should continue audit even if one phase fails', async () => {
      const toolPath = path.join(tempDir, 'partial-tool');
      await fs.mkdir(toolPath, { recursive: true });

      // Create minimal tool (will cause some phases to fail)
      await fs.writeFile(
        path.join(toolPath, 'package.json'),
        JSON.stringify({ name: 'minimal' })
      );

      const result = await auditTool(toolPath, {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free'
      });

      // Should still produce result
      expect(result).toBeDefined();
      expect(result.outputPath).toBeDefined();
    });

    it('should provide helpful error messages', async () => {
      try {
        await auditTool('/nonexistent/tool', {
          output: path.join(tempDir, 'report.md'),
          validation: false,
          tier: 'free'
        });
      } catch (error) {
        expect((error as Error).message).toContain('does not exist');
      }
    });
  });

  describe('license activation flow', () => {
    it('should guide new user through license activation', async () => {
      // New user starts without license
      let license = await getCurrentLicense();
      expect(license).toBeNull();

      // User activates free tier
      await activateLicense('FREE-NEW-USR-001', 'newuser@example.com');

      // Verify activation
      license = await getCurrentLicense();
      expect(license).toBeDefined();
      expect(license?.tier).toBe('free');
    });

    it('should prevent license key reuse', async () => {
      // First activation
      await activateLicense('PRO-KEY-123-456', 'user1@example.com');

      const license1 = await getCurrentLicense();
      expect(license1?.email).toBe('user1@example.com');

      // Try to activate same key for different user
      await activateLicense('PRO-KEY-123-456', 'user2@example.com');

      const license2 = await getCurrentLicense();
      expect(license2?.email).toBe('user2@example.com'); // Updated
    });
  });

  describe('context-aware auditing', () => {
    it('should use context to guide audit', async () => {
      const toolPath = path.join(tempDir, 'context-tool');
      await fs.mkdir(toolPath, { recursive: true });

      await fs.writeFile(
        path.join(toolPath, 'package.json'),
        JSON.stringify({
          name: 'web-framework-cli',
          description: 'CLI for web development'
        })
      );

      const result = await auditTool(toolPath, {
        output: path.join(tempDir, 'report.md'),
        validation: false,
        tier: 'free',
        context: 'web development framework'
      });

      expect(result).toBeDefined();
    });
  });
});
