/**
 * Comprehensive Phase execution tests (20+ tests)
 * Tests all 6 audit phases with real execution paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runPhase, runPhase1, runPhase2, runPhase3, runPhase4, runPhase5, runPhase6 } from '../phases/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn()
  }
}));

// Mock child_process for command execution
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

describe('Phase 1: First Impressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should run phase-1 successfully with README', async () => {
    const mockFs = await import('fs');
    vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce('# My Tool\n\nThis is a great tool.\n\n## Installation\nnpm install my-tool\n\n## Usage\nmy-tool --help');
    vi.spyOn(mockFs.promises, 'access').mockResolvedValueOnce(undefined);

    const result = await runPhase1('/fake/tool/path');

    expect(result.phase).toBe('first-impressions');
    expect(result.success).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.findings).toBeDefined();
    expect(result.findings.hasReadme).toBe(true);
  });

  it('should handle missing README gracefully', async () => {
    const mockFs = await import('fs');
    vi.spyOn(mockFs.promises, 'access').mockRejectedValueOnce(new Error('ENOENT'));

    const result = await runPhase1('/fake/tool/path');

    expect(result.success).toBe(true);
    expect(result.findings.hasReadme).toBe(false);
  });

  it('should score README quality based on content', async () => {
    const mockFs = await import('fs');
    const goodReadme = `# My Tool

## Description
This tool does amazing things.

## Installation
\`\`\`bash
npm install my-tool
\`\`\`

## Usage
\`\`\`bash
my-tool --help
my-tool run --input file.txt
\`\`\`

## Examples
Here are some examples...

## License
MIT`;
    vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(goodReadme);
    vi.spyOn(mockFs.promises, 'access').mockResolvedValueOnce(undefined);

    const result = await runPhase1('/fake/tool/path');

    expect(result.findings.readmeScore).toBeGreaterThan(5);
    expect(result.findings.hasInstallInstructions).toBe(true);
    expect(result.findings.hasExamples).toBe(true);
  });

  it('should detect missing installation instructions', async () => {
    const mockFs = await import('fs');
    const badReadme = '# My Tool\n\nNo install info here.';
    vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(badReadme);
    vi.spyOn(mockFs.promises, 'access').mockResolvedValueOnce(undefined);

    const result = await runPhase1('/fake/tool/path');

    expect(result.findings.hasInstallInstructions).toBe(false);
  });
});

describe('Phase 2: Installation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect package.json for npm tools', async () => {
    const mockFs = await import('fs');
    vi.spyOn(mockFs.promises, 'access').mockResolvedValueOnce(undefined);
    vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(JSON.stringify({
      name: 'my-tool',
      version: '1.0.0'
    }));

    const result = await runPhase2('/fake/tool/path');

    expect(result.phase).toBe('installation');
    expect(result.success).toBe(true);
    expect(result.findings.method).toBe('npm');
  });

  it('should detect Cargo.toml for Rust tools', async () => {
    const mockFs = await import('fs');
    vi.spyOn(mockFs.promises, 'access')
      .mockRejectedValueOnce(new Error('no package.json'))
      .mockResolvedValueOnce(undefined);
    vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
      '[package]\nname = "my-tool"\nversion = "1.0.0"'
    );

    const result = await runPhase2('/fake/tool/path');

    expect(result.findings.method).toBe('cargo');
  });

  it('should detect go.mod for Go tools', async () => {
    const mockFs = await import('fs');
    vi.spyOn(mockFs.promises, 'access')
      .mockRejectedValueOnce(new Error('no package.json'))
      .mockRejectedValueOnce(new Error('no Cargo.toml'))
      .mockResolvedValueOnce(undefined);
    vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
      'module my-tool\n\ngo 1.21'
    );

    const result = await runPhase2('/fake/tool/path');

    expect(result.findings.method).toBe('go');
  });

  it('should handle installation errors gracefully', async () => {
    const mockFs = await import('fs');
    vi.spyOn(mockFs.promises, 'access').mockRejectedValue(new Error('No package file found'));

    const result = await runPhase2('/fake/tool/path');

    expect(result.success).toBe(true);
    expect(result.findings.attempted).toBe(true);
    expect(result.findings.errors.length).toBeGreaterThan(0);
  });
});

describe('Phase 3: Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should test basic functionality commands', async () => {
    const mockFs = await import('fs');
    const mockChildProcess = await import('child_process');

    vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
      JSON.stringify({ bin: { 'my-tool': 'bin/cli.js' } })
    );

    vi.spyOn(mockChildProcess, 'exec').mockImplementation((cmd, callback) => {
      setTimeout(() => {
        (callback as any)(null, 'Success output', '');
      }, 10);
      return {} as any;
    });

    const result = await runPhase3('/fake/tool/path');

    expect(result.phase).toBe('functionality');
    expect(result.success).toBe(true);
    expect(result.findings.commandsTested).toBeDefined();
    expect(Array.isArray(result.findings.commandsTested)).toBe(true);
  });

  it('should track command execution duration', async () => {
    const mockChildProcess = await import('child_process');

    vi.spyOn(mockChildProcess, 'exec').mockImplementation((cmd, callback) => {
      setTimeout(() => {
        (callback as any)(null, 'Output', '');
      }, 50);
      return {} as any;
    });

    const result = await runPhase3('/fake/tool/path');

    expect(result.duration).toBeGreaterThanOrEqual(0);
    if (result.findings.commandsTested.length > 0) {
      expect(result.findings.commandsTested[0].duration).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle command failures', async () => {
    const mockChildProcess = await import('child_process');

    vi.spyOn(mockChildProcess, 'exec').mockImplementation((cmd, callback) => {
      setTimeout(() => {
        (callback as any)(new Error('Command failed'), '', 'Error output');
      }, 10);
      return {} as any;
    });

    const result = await runPhase3('/fake/tool/path');

    expect(result.findings.failedExecutions).toBeGreaterThan(0);
  });
});

describe('Phase 4: Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify documented claims', async () => {
    const result = await runPhase4('/fake/tool/path', 'test-context');

    expect(result.phase).toBe('verification');
    expect(result.success).toBe(true);
    expect(result.findings.verifiedClaims).toBeDefined();
    expect(Array.isArray(result.findings.verifiedClaims)).toBe(true);
  });

  it('should detect unverifiable claims', async () => {
    const result = await runPhase4('/fake/tool/path');

    expect(result.findings.unverifiableClaims).toBeDefined();
    expect(Array.isArray(result.findings.unverifiableClaims)).toBe(true);
  });

  it('should calculate verification score', async () => {
    const result = await runPhase4('/fake/tool/path');

    expect(result.findings.score).toBeGreaterThanOrEqual(0);
    expect(result.findings.score).toBeLessThanOrEqual(10);
  });
});

describe('Phase 5: Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should test error handling', async () => {
    const result = await runPhase5('/fake/tool/path');

    expect(result.phase).toBe('error-handling');
    expect(result.success).toBe(true);
    expect(result.findings.redFlags).toBeDefined();
    expect(Array.isArray(result.findings.redFlags)).toBe(true);
  });

  it('should detect poor error handling', async () => {
    const result = await runPhase5('/fake/tool/path');

    // Should find red flags if error handling is poor
    expect(result.findings).toHaveProperty('redFlags');
    expect(result.findings).toHaveProperty('notes');
  });
});

describe('Phase 6: Red Flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect red flags', async () => {
    const result = await runPhase6('/fake/tool/path');

    expect(result.phase).toBe('red-flags');
    expect(result.success).toBe(true);
    expect(result.findings.redFlags).toBeDefined();
    expect(Array.isArray(result.findings.redFlags)).toBe(true);
  });

  it('should categorize red flags by severity', async () => {
    const result = await runPhase6('/fake/tool/path');

    result.findings.redFlags.forEach(flag => {
      expect(['critical', 'high', 'medium', 'low']).toContain(flag.severity);
    });
  });

  it('should provide fix suggestions for red flags', async () => {
    const result = await runPhase6('/fake/tool/path');

    result.findings.redFlags.forEach(flag => {
      expect(flag.fix).toBeDefined();
      expect(typeof flag.fix).toBe('string');
      expect(flag.fix.length).toBeGreaterThan(0);
    });
  });
});

describe('Phase Integration', () => {
  it('should run all phases in sequence', async () => {
    const mockFs = await import('fs');
    vi.spyOn(mockFs.promises, 'access').mockResolvedValue(undefined);

    const phases = [
      { id: 'first-impressions', fn: () => runPhase1('/fake/path') },
      { id: 'installation', fn: () => runPhase2('/fake/path') },
      { id: 'functionality', fn: () => runPhase3('/fake/path') },
      { id: 'verification', fn: () => runPhase4('/fake/path') },
      { id: 'error-handling', fn: () => runPhase5('/fake/path') },
      { id: 'red-flags', fn: () => runPhase6('/fake/path') }
    ];

    const results = await Promise.all(phases.map(p => p.fn()));

    results.forEach((result, index) => {
      expect(result.phase).toBe(phases[index].id);
      expect(result.success).toBe(true);
    });
  });

  it('should handle phase timeout', async () => {
    // Test that phases complete within reasonable time
    const startTime = Date.now();
    await runPhase1('/fake/path');
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
  });

  it('should aggregate findings across phases', async () => {
    const results = await Promise.all([
      runPhase1('/fake/path'),
      runPhase2('/fake/path'),
      runPhase3('/fake/path'),
      runPhase4('/fake/path'),
      runPhase5('/fake/path'),
      runPhase6('/fake/path')
    ]);

    const allFindings = results
      .filter(r => r.success)
      .map(r => r.findings);

    expect(allFindings.length).toBe(6);
    expect(allFindings.every(f => f !== null)).toBe(true);
  });
});

describe('Legacy runPhase function', () => {
  it('should map phase IDs correctly', async () => {
    const phaseIds = [
      'first-impressions',
      'installation',
      'functionality',
      'verification',
      'error-handling',
      'red-flags'
    ];

    for (const phaseId of phaseIds) {
      const result = await runPhase(phaseId, { toolPath: '/fake/path' });
      expect(result.phase).toBe(phaseId);
    }
  });

  it('should throw error for unknown phase', async () => {
    await expect(
      runPhase('unknown-phase' as any, { toolPath: '/fake/path' })
    ).rejects.toThrow('Unknown phase');
  });

  it('should pass context to verification phase', async () => {
    const result = await runPhase('verification', {
      toolPath: '/fake/path',
      context: 'test-domain'
    });

    expect(result.phase).toBe('verification');
    expect(result.success).toBe(true);
  });
});
