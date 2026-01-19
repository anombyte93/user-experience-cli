/**
 * Phase 3: Functionality Check
 * Tests CLI commands and verifies claimed features work
 */

import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import type { FunctionalityFindings, CommandTest } from '../types';

/**
 * Audit functionality by testing CLI commands
 */
export async function auditFunctionality(
  toolPath: string,
  verbose: boolean = false
): Promise<FunctionalityFindings> {
  const commandsTested: CommandTest[] = [];
  const missingFeatures: string[] = [];
  const notes: string[] = [];

  // Discover the CLI binary
  const binaryInfo = await discoverBinary(toolPath);
  if (!binaryInfo.binary) {
    return {
      commandsTested: [],
      successfulExecutions: 0,
      failedExecutions: 0,
      missingFeatures: ['Could not discover CLI binary'],
      score: 0,
      notes: ['❌ CRITICAL: Could not find executable binary to test']
    };
  }

  if (verbose) {
    console.log(`  Found binary: ${binaryInfo.binary}`);
  }

  // Get package info to understand available commands
  const packageInfo = await getPackageInfo(toolPath);
  const commandsToTest = determineCommandsToTest(binaryInfo.binary, packageInfo);

  if (verbose) {
    console.log(`  Testing ${commandsToTest.length} commands`);
  }

  // Test each command
  for (const cmd of commandsToTest) {
    const result = await testCommand(binaryInfo.binary, cmd.args, toolPath, verbose);
    commandsTested.push(result);

    if (verbose) {
      console.log(`    ${cmd.args.join(' ')}: ${result.success ? '✅' : '❌'}`);
    }
  }

  // Check for documented but unimplemented features
  const documentedFeatures = await extractDocumentedFeatures(toolPath);
  const implementedFeatures = new Set(
    commandsTested.filter(c => c.success).map(c => c.command)
  );

  for (const feature of documentedFeatures) {
    if (!implementedFeatures.has(feature)) {
      missingFeatures.push(feature);
    }
  }

  // Calculate statistics
  const successfulExecutions = commandsTested.filter(c => c.success).length;
  const failedExecutions = commandsTested.filter(c => !c.success).length;

  // Add notes
  if (commandsTested.length === 0) {
    notes.push('⚠️  No commands were tested - check binary discovery');
  } else {
    const successRate = (successfulExecutions / commandsTested.length) * 100;
    notes.push(`Success rate: ${successRate.toFixed(0)}% (${successfulExecutions}/${commandsTested.length})`);

    if (successRate >= 90) {
      notes.push('Excellent success rate - tool is reliable');
    } else if (successRate >= 70) {
      notes.push('Good success rate - some commands may need attention');
    } else if (successRate >= 50) {
      notes.push('⚠️  Poor success rate - many commands failing');
    } else {
      notes.push('❌ CRITICAL: Most commands failing - tool is unreliable');
    }
  }

  if (missingFeatures.length > 0) {
    notes.push(`⚠️  ${missingFeatures.length} documented features appear to be missing or broken`);
  }

  // Calculate score
  const score = calculateFunctionalityScore({
    totalCommands: commandsTested.length,
    successfulCommands: successfulExecutions,
    missingFeatures: missingFeatures.length
  });

  return {
    commandsTested,
    successfulExecutions,
    failedExecutions,
    missingFeatures,
    score,
    notes
  };
}

/**
 * Discover the CLI binary path
 */
async function discoverBinary(
  toolPath: string
): Promise<{ binary?: string; type?: string }> {
  // Check package.json for Node.js projects
  try {
    const pkgPath = path.join(toolPath, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));

    if (pkg.bin) {
      if (typeof pkg.bin === 'string') {
        return { binary: path.join(toolPath, pkg.bin), type: 'nodejs' };
      } else if (typeof pkg.bin === 'object') {
        const binName = Object.keys(pkg.bin)[0];
        return { binary: path.join(toolPath, pkg.bin[binName]), type: 'nodejs' };
      }
    }

    // Check if there's a dist or build directory
    const commonPaths = [
      'dist/cli.js',
      'dist/index.js',
      'build/cli.js',
      'lib/cli.js',
      'bin/cli.js'
    ];

    for (const relPath of commonPaths) {
      try {
        await fs.access(path.join(toolPath, relPath));
        return { binary: path.join(toolPath, relPath), type: 'nodejs' };
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
      // Check if it's already built
      try {
        await fs.access(path.join(toolPath, 'target/release', binaryName));
        return { binary: path.join(toolPath, 'target/release', binaryName), type: 'rust' };
      } catch {
        // Not built yet, check debug
        try {
          await fs.access(path.join(toolPath, 'target/debug', binaryName));
          return { binary: path.join(toolPath, 'target/debug', binaryName), type: 'rust' };
        } catch {
          // Not built
        }
      }
    }
  } catch {
    // Not a Rust project
  }

  // Check for Go binaries
  try {
    await fs.access(path.join(toolPath, 'go.mod'));
    const binaryName = path.basename(toolPath);
    try {
      await fs.access(path.join(toolPath, binaryName));
      return { binary: path.join(toolPath, binaryName), type: 'go' };
    } catch {
      // Not built yet
    }
  } catch {
    // Not a Go project
  }

  return {};
}

/**
 * Get package information for better command discovery
 */
async function getPackageInfo(
  toolPath: string
): Promise<{ name?: string; version?: string; description?: string; commands?: string[] }> {
  try {
    const pkgPath = path.join(toolPath, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));

    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      commands: Object.keys(pkg.bin || {})
    };
  } catch {
    return {};
  }
}

/**
 * Determine which commands to test based on binary type
 */
function determineCommandsToTest(
  binary: string,
  packageInfo: { commands?: string[] }
): Array<{ args: string[]; description: string }> {
  const commands: Array<{ args: string[]; description: string }> = [];

  // Always test --help
  commands.push({
    args: ['--help'],
    description: 'Help output'
  });

  // Test --version
  commands.push({
    args: ['--version'],
    description: 'Version check'
  });

  // Test with no arguments
  commands.push({
    args: [],
    description: 'No arguments (default behavior)'
  });

  // Add common CLI commands based on package type
  const commonCommands = [
    ['init', 'Initialize'],
    ['build', 'Build'],
    ['test', 'Test'],
    ['run', 'Run'],
    ['status', 'Status'],
    ['list', 'List'],
    ['info', 'Info']
  ];

  for (const [cmd, desc] of commonCommands) {
    commands.push({
      args: [cmd],
      description: desc
    });
  }

  // Test some common flags
  commands.push({
    args: ['--verbose'],
    description: 'Verbose flag'
  });

  commands.push({
    args: ['--dry-run'],
    description: 'Dry run flag'
  });

  return commands;
}

/**
 * Test a single command
 */
async function testCommand(
  binary: string,
  args: string[],
  cwd: string,
  verbose: boolean
): Promise<CommandTest> {
  const startTime = Date.now();

  try {
    const result = await executeCommand(binary, args, cwd, verbose);

    return {
      command: args.length > 0 ? args.join(' ') : '(no args)',
      success: result.success && result.exitCode === 0,
      output: result.stdout ? result.stdout.substring(0, 500) : undefined,
      error: !result.success ? (result.stderr || result.error) : undefined,
      duration: result.duration
    };
  } catch (error) {
    return {
      command: args.join(' '),
      success: false,
      error: (error as Error).message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Execute a command and capture output
 */
async function executeCommand(
  cmd: string,
  args: string[],
  cwd: string,
  verbose: boolean
): Promise<{
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: string;
  duration: number
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000 // 30 second timeout
    });

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0 || code === null, // null = no error
        exitCode: code || 0,
        stdout,
        stderr,
        duration: Date.now() - startTime
      });
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        exitCode: -1,
        stdout,
        stderr,
        error: err.message,
        duration: Date.now() - startTime
      });
    });
  });
}

/**
 * Extract documented features from README and docs
 */
async function extractDocumentedFeatures(
  toolPath: string
): Promise<string[]> {
  const features: string[] = [];

  // Check README
  const readmePaths = [
    'README.md',
    'readme.md',
    'README.markdown'
  ];

  for (const readmePath of readmePaths) {
    try {
      const content = await fs.readFile(path.join(toolPath, readmePath), 'utf-8');

      // Look for feature lists
      const featureSectionMatch = content.match(/##?\s*Features\s*\n([\s\S]+?)(?=\n##?\s|\n*$)/i);
      if (featureSectionMatch) {
        const featureLines = featureSectionMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'));

        for (const line of featureLines) {
          const feature = line.replace(/^[-*]\s*/, '').trim();
          if (feature) {
            features.push(feature);
          }
        }
      }

      break;
    } catch {
      continue;
    }
  }

  return features;
}

/**
 * Calculate functionality score
 */
function calculateFunctionalityScore(data: {
  totalCommands: number;
  successfulCommands: number;
  missingFeatures: number
}): number {
  if (data.totalCommands === 0) {
    return 0;
  }

  // Base score from success rate
  const successRate = data.successfulCommands / data.totalCommands;
  let score = successRate * 7; // Max 7 points from success rate

  // Bonus for high success rate
  if (successRate >= 0.9) {
    score += 2;
  } else if (successRate >= 0.7) {
    score += 1;
  }

  // Deduct for missing features
  score -= data.missingFeatures * 0.5;

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}
