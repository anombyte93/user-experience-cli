/**
 * Extended CLI Unit Tests - 15 additional tests
 * Tests CLI functionality with comprehensive coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CLI Extended Unit Tests', () => {
  const tempDir = join(tmpdir(), `ux-cli-extended-test-${Date.now()}`);
  const testToolPath = join(tempDir, 'test-tool');
  const reportPath = join(tempDir, 'report.md');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testToolPath, { recursive: true });

    // Create a minimal package.json
    await fs.writeFile(
      join(testToolPath, 'package.json'),
      JSON.stringify({
        name: 'test-tool',
        version: '1.0.0',
        description: 'A test CLI tool',
        bin: { 'test-tool': './cli.js' }
      })
    );

    // Create a README
    await fs.writeFile(
      join(testToolPath, 'README.md'),
      `# Test Tool

A test CLI tool for UX auditing.

## Installation

\`\`\`bash
npm install -g test-tool
\`\`\`

## Usage

\`\`\`bash
test-tool --help
test-tool hello
\`\`\`
`
    );

    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
    vi.restoreAllMocks();
  });

  describe('CLI Command Validation', () => {
    it('should validate audit command arguments', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'audit', '--help']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('audit');
          resolve(true);
        });
      });
    });

    it('should validate report command arguments', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'report', '--help']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('report');
          resolve(true);
        });
      });
    });

    it('should validate dashboard command arguments', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'dashboard', '--help']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('dashboard');
          resolve(true);
        });
      });
    });

    it('should validate usage command arguments', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'usage', '--help']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('usage');
          resolve(true);
        });
      });
    });

    it('should validate tiers command arguments', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'tiers', '--help']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('tiers');
          resolve(true);
        });
      });
    });
  });

  describe('CLI Error Handling', () => {
    it('should handle missing tool path gracefully', async () => {
      const { auditTool } = await import('../auditor');

      await expect(
        auditTool('/nonexistent/path', {
          output: reportPath,
          validation: false,
          tier: 'free',
          verbose: false
        })
      ).rejects.toThrow();
    });

    it('should handle invalid output path', async () => {
      const { auditTool } = await import('../auditor');

      await expect(
        auditTool(testToolPath, {
          output: '/invalid/path/report.md',
          validation: false,
          tier: 'free',
          verbose: false
        })
      ).rejects.toThrow();
    });

    it('should handle invalid tier option', async () => {
      const { auditTool } = await import('../auditor');

      await expect(
        auditTool(testToolPath, {
          output: reportPath,
          validation: false,
          tier: 'invalid' as any,
          verbose: false
        })
      ).rejects.toThrow();
    });
  });

  describe('CLI Help Output', () => {
    it('should display help for audit command', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'audit', '--help']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('Audit a CLI tool');
          expect(output).toContain('--output');
          expect(output).toContain('--tier');
          resolve(true);
        });
      });
    });

    it('should display help for report command', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'report', '--help']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('Generate a report');
          expect(output).toContain('--format');
          resolve(true);
        });
      });
    });

    it('should display help for dashboard command', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'dashboard', '--help']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('Launch dashboard');
          expect(output).toContain('--port');
          resolve(true);
        });
      });
    });
  });

  describe('CLI Verbose Mode', () => {
    it('should respect verbose flag in audit', async () => {
      const { auditTool } = await import('../auditor');
      const consoleSpy = vi.spyOn(console, 'log');

      const result = await auditTool(testToolPath, {
        output: reportPath,
        validation: false,
        tier: 'free',
        verbose: true
      });

      expect(result).toBeDefined();
      // In verbose mode, more console logs should occur
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle verbose mode with errors', async () => {
      const { auditTool } = await import('../auditor');
      const consoleSpy = vi.spyOn(console, 'error');

      await expect(
        auditTool('/nonexistent/path', {
          output: reportPath,
          validation: false,
          tier: 'free',
          verbose: true
        })
      ).rejects.toThrow();

      // Should log error in verbose mode
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should suppress verbose output when disabled', async () => {
      const { auditTool } = await import('../auditor');
      const consoleSpy = vi.spyOn(console, 'log');

      const result = await auditTool(testToolPath, {
        output: reportPath,
        validation: false,
        tier: 'free',
        verbose: false
      });

      expect(result).toBeDefined();
      // Should have fewer console logs in non-verbose mode
      expect(consoleSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('CLI Test Command', () => {
    it('should validate test command exists', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'test', '--help']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('test');
          resolve(true);
        });
      });
    });

    it('should handle test command with invalid arguments', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'test', '--invalid-flag']);
        `], { stdio: 'pipe' });

        child.on('close', (code) => {
          expect(code).toBeGreaterThan(0);
          resolve(true);
        });
      });
    });

    it('should display version information', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', '--version']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toMatch(/\d+\.\d+\.\d+/);
          resolve(true);
        });
      });
    });
  });

  describe('CLI Upgrade Command', () => {
    it('should validate upgrade command exists', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'upgrade', '--help']);
        `], { stdio: 'pipe' });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          expect(code).toBe(0);
          expect(output).toContain('upgrade');
          resolve(true);
        });
      });
    });

    it('should handle upgrade command gracefully', async () => {
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const child = spawn('node', ['-e', `
          import { program } from '../cli.js';
          program.parse(['node', 'cli', 'upgrade', '--dry-run']);
        `], { stdio: 'pipe' });

        child.on('close', (code) => {
          expect(code).toBe(0);
          resolve(true);
        });
      });
    });
  });
});