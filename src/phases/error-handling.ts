/**
 * Phase 5: Error Handling Test
 * Tests edge cases, invalid inputs, and error message quality
 */

import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import type { RedFlag } from '../types';

/**
 * Audit error handling by testing edge cases
 */
export async function auditErrorHandling(
  toolPath: string,
  verbose: boolean = false
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  // Discover binary
  const binary = await discoverBinary(toolPath);
  if (!binary) {
    redFlags.push({
      severity: 'high',
      category: 'error-handling',
      title: 'Cannot test error handling',
      description: 'Could not discover CLI binary to test error handling',
      evidence: ['Binary discovery failed'],
      fix: 'Ensure CLI tool is properly built and executable'
    });
    return { redFlags, notes: ['Cannot test error handling without binary'] };
  }

  if (verbose) {
    console.log(`  Testing error handling with: ${binary}`);
  }

  // Test 1: Invalid command
  const invalidCmdResult = await testCommand(binary, ['invalid-command-xyz'], toolPath, verbose);
  if (invalidCmdResult.exitCode === 0 || invalidCmdResult.stderr === '') {
    redFlags.push({
      severity: 'medium',
      category: 'error-handling',
      title: 'Poor error handling for invalid commands',
      description: 'Tool does not provide clear error message for invalid commands',
      evidence: [
        `Command: ${binary} invalid-command-xyz`,
        `Exit code: ${invalidCmdResult.exitCode}`,
        `Stderr: ${invalidCmdResult.stderr || '(empty)'}`
      ],
      fix: 'Add error handling for unknown commands with helpful error message'
    });
  } else {
    notes.push('✅ Invalid commands are handled properly');
  }

  // Test 2: Invalid flag
  const invalidFlagResult = await testCommand(binary, ['--invalid-flag-xyz'], toolPath, verbose);
  if (invalidFlagResult.exitCode === 0 || invalidFlagResult.stderr === '') {
    redFlags.push({
      severity: 'medium',
      category: 'error-handling',
      title: 'Poor error handling for invalid flags',
      description: 'Tool does not warn about invalid flags',
      evidence: [
        `Command: ${binary} --invalid-flag-xyz`,
        `Exit code: ${invalidFlagResult.exitCode}`,
        `Stderr: ${invalidFlagResult.stderr || '(empty)'}`
      ],
      fix: 'Add flag validation and error messages for unrecognized flags'
    });
  } else {
    notes.push('✅ Invalid flags are handled properly');
  }

  // Test 3: Missing required arguments
  const missingArgsResult = await testCommand(binary, ['--required-arg'], toolPath, verbose);
  // If the tool doesn't crash or hang, it's handling it OK
  if (missingArgsResult.exitCode === null) {
    redFlags.push({
      severity: 'high',
      category: 'error-handling',
      title: 'Tool crashes on missing arguments',
      description: 'Tool crashes or hangs when required arguments are missing',
      evidence: [
        `Command: ${binary} --required-arg`,
        'Process terminated abnormally'
      ],
      fix: 'Add validation for required arguments with clear error messages'
    });
  } else {
    notes.push('✅ Missing arguments are handled without crashes');
  }

  // Test 4: Invalid input file
  const invalidFileResult = await testCommand(
    binary,
    ['--file', '/tmp/nonexistent-file-xyz-12345.txt'],
    toolPath,
    verbose
  );

  if (invalidFileResult.exitCode === 0) {
    redFlags.push({
      severity: 'medium',
      category: 'error-handling',
      title: 'No error for missing input files',
      description: 'Tool does not report error when input file does not exist',
      evidence: [
        `Command: ${binary} --file /tmp/nonexistent-file-xyz-12345.txt`,
        'Exit code: 0 (should be non-zero)'
      ],
      fix: 'Check if input files exist before processing'
    });
  } else if (invalidFileResult.stderr.includes('ENOENT') ||
             invalidFileResult.stderr.includes('no such file')) {
    notes.push('✅ Missing files are properly detected');
  }

  // Test 5: Permission denied
  const permissionResult = await testCommand(
    binary,
    ['--output', '/root/test-output-xyz'],
    toolPath,
    verbose
  );

  if (permissionResult.exitCode === 0) {
    // Might be running as root, so skip this check
    notes.push('⚠️  Skipped permission test (might be running as root)');
  } else if (permissionResult.stderr.includes('permission') ||
             permissionResult.stderr.includes('EACCES')) {
    notes.push('✅ Permission errors are properly reported');
  }

  // Test 6: Help text quality
  const helpResult = await testCommand(binary, ['--help'], toolPath, verbose);
  if (helpResult.exitCode === 0 && helpResult.stdout) {
    const helpText = helpResult.stdout;

    // Check for essential help sections
    const hasUsage = helpText.toLowerCase().includes('usage');
    const hasOptions = helpText.toLowerCase().includes('options') ||
                      helpText.toLowerCase().includes('flags');
    const hasExamples = helpText.toLowerCase().includes('example');

    if (!hasUsage) {
      redFlags.push({
        severity: 'low',
        category: 'documentation',
        title: 'Help text missing usage section',
        description: '--help output does not include usage information',
        evidence: ['Help text analyzed'],
        fix: 'Add usage section to help text'
      });
    }

    if (!hasOptions) {
      redFlags.push({
        severity: 'low',
        category: 'documentation',
        title: 'Help text missing options section',
        description: '--help output does not list available options/flags',
        evidence: ['Help text analyzed'],
        fix: 'Add options section to help text'
      });
    }

    if (!hasExamples) {
      redFlags.push({
        severity: 'low',
        category: 'documentation',
        title: 'Help text missing examples',
        description: '--help output does not include usage examples',
        evidence: ['Help text analyzed'],
        fix: 'Add examples to help text'
      });
    }

    if (hasUsage && hasOptions && hasExamples) {
      notes.push('✅ Help text is comprehensive');
    }
  } else {
    redFlags.push({
      severity: 'critical',
      category: 'error-handling',
      title: 'No --help support',
      description: 'Tool does not provide --help flag or help text is broken',
      evidence: [
        `Command: ${binary} --help`,
        `Exit code: ${helpResult.exitCode}`,
        `Output: ${helpResult.stdout || '(empty)'}`
      ],
      fix: 'Implement --help flag with comprehensive usage information'
    });
  }

  // Test 7: Version flag
  const versionResult = await testCommand(binary, ['--version'], toolPath, verbose);
  if (versionResult.exitCode !== 0 && versionResult.exitCode !== null) {
    redFlags.push({
      severity: 'medium',
      category: 'error-handling',
      title: 'No --version support',
      description: 'Tool does not provide --version flag',
      evidence: [
        `Command: ${binary} --version`,
        `Exit code: ${versionResult.exitCode}`
      ],
      fix: 'Add --version flag to display version information'
    });
  } else if (versionResult.stdout && versionResult.stdout.trim()) {
    notes.push(`✅ Version: ${versionResult.stdout.trim()}`);
  }

  // Test 8: Error message quality
  if (invalidCmdResult.stderr) {
    const errorMessage = invalidCmdResult.stderr.toLowerCase();

    // Check if error message is helpful
    const hasSuggestion = errorMessage.includes('did you mean') ||
                         errorMessage.includes('try') ||
                         errorMessage.includes('available');

    if (!hasSuggestion && errorMessage.length < 20) {
      redFlags.push({
        severity: 'low',
        category: 'error-handling',
        title: 'Unhelpful error messages',
        description: 'Error messages are too brief and don\'t guide users',
        evidence: [
          `Error message: ${invalidCmdResult.stderr}`
        ],
        fix: 'Provide helpful error messages with suggestions'
      });
    }
  }

  // Test 9: Graceful handling of SIGINT (Ctrl+C)
  notes.push('⚠️  SIGINT handling test skipped (requires manual testing)');

  // Summary
  if (redFlags.length === 0) {
    notes.push('✅ Excellent error handling - all tests passed');
  } else {
    notes.push(`Found ${redFlags.length} error handling issues`);
  }

  return { redFlags, notes };
}

/**
 * Discover the CLI binary path
 */
async function discoverBinary(toolPath: string): Promise<string | null> {
  // Check package.json for Node.js projects
  try {
    const pkgPath = path.join(toolPath, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));

    if (pkg.bin) {
      if (typeof pkg.bin === 'string') {
        return path.join(toolPath, pkg.bin);
      } else if (typeof pkg.bin === 'object') {
        const binName = Object.keys(pkg.bin)[0];
        return path.join(toolPath, pkg.bin[binName]);
      }
    }

    // Check common paths
    const commonPaths = ['dist/cli.js', 'dist/index.js', 'build/cli.js'];
    for (const relPath of commonPaths) {
      try {
        await fs.access(path.join(toolPath, relPath));
        return path.join(toolPath, relPath);
      } catch {
        continue;
      }
    }
  } catch {
    // Not a Node.js project
  }

  // Check for Rust binaries
  try {
    const cargoPath = path.join(toolPath, 'Cargo.toml');
    await fs.access(cargoPath);
    const content = await fs.readFile(cargoPath, 'utf-8');
    const match = content.match(/name\s*=\s*"([^"]+)"/);
    if (match) {
      const binaryName = match[1];
      try {
        await fs.access(path.join(toolPath, 'target/release', binaryName));
        return path.join(toolPath, 'target/release', binaryName);
      } catch {
        try {
          await fs.access(path.join(toolPath, 'target/debug', binaryName));
          return path.join(toolPath, 'target/debug', binaryName);
        } catch {
          // Not built
        }
      }
    }
  } catch {
    // Not a Rust project
  }

  return null;
}

/**
 * Test a single command
 */
async function testCommand(
  binary: string,
  args: string[],
  cwd: string,
  verbose: boolean
): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    const child = spawn(binary, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000 // 10 second timeout
    });

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr,
        duration: Date.now() - startTime
      });
    });

    child.on('error', () => {
      resolve({
        exitCode: null,
        stdout,
        stderr,
        duration: Date.now() - startTime
      });
    });
  });
}
