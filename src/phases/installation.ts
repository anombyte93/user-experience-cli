/**
 * Phase 2: Installation Test
 * Actually runs installation commands and tracks success/failure/timing
 */

import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import type { InstallationFindings } from '../types';

/**
 * Test installation of the CLI tool
 * Attempts actual installation and tracks results
 */
export async function auditInstallation(
  toolPath: string,
  verbose: boolean = false
): Promise<InstallationFindings> {
  const notes: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const startTime = Date.now();

  // Detect package type and installation method
  const packageType = await detectPackageType(toolPath);
  if (verbose) {
    console.log(`  Detected package type: ${packageType.type}`);
  }

  if (!packageType.canInstall) {
    return {
      attempted: false,
      success: false,
      duration: Date.now() - startTime,
      errors: [`Unsupported package type: ${packageType.type}`],
      warnings,
      score: 0,
      notes: [
        `Package type '${packageType.type}' cannot be auto-tested`,
        'Manual installation testing required'
      ]
    };
  }

  // Determine installation command
  const installCommand = getInstallCommand(packageType.type, toolPath);
  if (!installCommand) {
    return {
      attempted: false,
      success: false,
      duration: Date.now() - startTime,
      errors: ['Could not determine installation command'],
      warnings,
      score: 0,
      notes
    };
  }

  notes.push(`Installation method: ${installCommand.method}`);

  // Check prerequisites
  const prereqCheck = await checkPrerequisites(packageType.type);
  if (!prereqCheck.hasPrerequisites) {
    errors.push(...prereqCheck.missing);
    return {
      attempted: false,
      success: false,
      duration: Date.now() - startTime,
      errors,
      warnings,
      score: 0,
      notes: [
        'Missing prerequisites for installation',
        ...prereqCheck.missing
      ]
    };
  }

  // Attempt installation
  if (verbose) {
    console.log(`  Running installation: ${installCommand.cmd} ${installCommand.args.join(' ')}`);
  }

  const installResult = await executeCommand(
    installCommand.cmd,
    installCommand.args,
    toolPath,
    verbose
  );

  const duration = Date.now() - startTime;

  if (installResult.success) {
    notes.push('✅ Installation completed successfully');

    if (installResult.duration < 5000) {
      notes.push(`Fast installation (${installResult.duration}ms)`);
    } else if (installResult.duration > 30000) {
      warnings.push(`Slow installation (${(installResult.duration / 1000).toFixed(1)}s)`);
    }

    // Check if binary is available
    const binaryCheck = await checkBinaryAvailability(packageType.type, toolPath);
    if (binaryCheck.available) {
      notes.push(`✅ Binary installed: ${binaryCheck.binaryName}`);
    } else {
      warnings.push(`Binary not found in PATH after installation`);
    }
  } else {
    errors.push(`Installation failed: ${installResult.error || 'Unknown error'}`);
    if (installResult.stderr) {
      errors.push(`Error output: ${installResult.stderr.substring(0, 200)}`);
    }
  }

  // Calculate score
  const score = calculateInstallationScore({
    attempted: true,
    success: installResult.success,
    duration,
    hasWarnings: warnings.length > 0
  });

  return {
    attempted: true,
    success: installResult.success,
    duration,
    method: installCommand.method,
    errors,
    warnings,
    score,
    notes
  };
}

/**
 * Detect the type of package (Node.js, Rust, Go, Python, etc.)
 */
async function detectPackageType(
  toolPath: string
): Promise<{ type: string; canInstall: boolean }> {
  const checks = [
    { file: 'package.json', type: 'nodejs', canInstall: true },
    { file: 'Cargo.toml', type: 'rust', canInstall: true },
    { file: 'go.mod', type: 'go', canInstall: true },
    { file: 'setup.py', type: 'python', canInstall: true },
    { file: 'pyproject.toml', type: 'python', canInstall: true },
    { file: 'requirements.txt', type: 'python', canInstall: true },
    { file: 'Gemfile', type: 'ruby', canInstall: true },
    { file: 'Makefile', type: 'make', canInstall: false },
    { file: 'CMakeLists.txt', type: 'cmake', canInstall: false },
    { file: 'Dockerfile', type: 'docker', canInstall: true }
  ];

  for (const check of checks) {
    try {
      await fs.access(path.join(toolPath, check.file));
      return { type: check.type, canInstall: check.canInstall };
    } catch {
      continue;
    }
  }

  return { type: 'unknown', canInstall: false };
}

/**
 * Get installation command for package type
 */
function getInstallCommand(
  packageType: string,
  toolPath: string
): { cmd: string; args: string[]; method: string } | null {
  const commands: Record<string, { cmd: string; args: string[]; method: string }> = {
    nodejs: {
      cmd: 'npm',
      args: ['install', '--quiet'],
      method: 'npm install'
    },
    rust: {
      cmd: 'cargo',
      args: ['build', '--quiet'],
      method: 'cargo build'
    },
    go: {
      cmd: 'go',
      args: ['build', '-o', '/tmp/test-build'],
      method: 'go build'
    },
    python: {
      cmd: 'pip',
      args: ['install', '-e', '.', '--quiet'],
      method: 'pip install'
    },
    ruby: {
      cmd: 'bundle',
      args: ['install'],
      method: 'bundle install'
    },
    docker: {
      cmd: 'docker',
      args: ['build', '-t', 'test-build', '.'],
      method: 'docker build'
    }
  };

  return commands[packageType] || null;
}

/**
 * Check if prerequisites are installed
 */
async function checkPrerequisites(
  packageType: string
): Promise<{ hasPrerequisites: boolean; missing: string[] }> {
  const missing: string[] = [];

  const requirements: Record<string, { cmd: string; checkArgs: string[]; name: string }> = {
    nodejs: { cmd: 'npm', checkArgs: ['--version'], name: 'npm' },
    rust: { cmd: 'cargo', checkArgs: ['--version'], name: 'cargo' },
    go: { cmd: 'go', checkArgs: ['version'], name: 'go' },
    python: { cmd: 'pip', checkArgs: ['--version'], name: 'pip' },
    ruby: { cmd: 'bundle', checkArgs: ['--version'], name: 'bundler' },
    docker: { cmd: 'docker', checkArgs: ['--version'], name: 'docker' }
  };

  const req = requirements[packageType];
  if (!req) {
    return { hasPrerequisites: true, missing: [] };
  }

  const result = await executeCommand(req.cmd, req.checkArgs, process.cwd(), false);
  if (!result.success) {
    missing.push(`${req.name} is not installed or not in PATH`);
  }

  return { hasPrerequisites: missing.length === 0, missing };
}

/**
 * Execute a shell command and capture output
 */
async function executeCommand(
  cmd: string,
  args: string[],
  cwd: string,
  verbose: boolean
): Promise<{
  success: boolean;
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
      timeout: 120000 // 2 minute timeout
    });

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      if (verbose) {
        process.stdout.write(data);
      }
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      if (verbose) {
        process.stderr.write(data);
      }
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        error: code !== 0 ? `Command exited with code ${code}` : undefined,
        duration: Date.now() - startTime
      });
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        stdout,
        stderr,
        error: err.message,
        duration: Date.now() - startTime
      });
    });
  });
}

/**
 * Check if binary is available after installation
 */
async function checkBinaryAvailability(
  packageType: string,
  toolPath: string
): Promise<{ available: boolean; binaryName?: string }> {
  let binaryName: string | undefined;

  // Try to read package.json for bin name
  if (packageType === 'nodejs') {
    try {
      const pkgPath = path.join(toolPath, 'package.json');
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
      if (typeof pkg.bin === 'string') {
        binaryName = pkg.bin;
      } else if (typeof pkg.bin === 'object') {
        binaryName = Object.keys(pkg.bin)[0];
      } else if (pkg.name) {
        binaryName = pkg.name.replace(/^@[^/]+\//, '');
      }
    } catch {
      // Ignore
    }
  }

  // For Rust, check Cargo.toml
  if (packageType === 'rust') {
    try {
      const cargoPath = path.join(toolPath, 'Cargo.toml');
      const content = await fs.readFile(cargoPath, 'utf-8');
      const match = content.match(/name\s*=\s*"([^"]+)"/);
      if (match) {
        binaryName = match[1];
      }
    } catch {
      // Ignore
    }
  }

  // For Go, use directory name
  if (packageType === 'go') {
    binaryName = path.basename(toolPath);
  }

  if (!binaryName) {
    return { available: false };
  }

  // Check if binary is in PATH
  const result = await executeCommand('which', [binaryName], process.cwd(), false);
  return {
    available: result.success,
    binaryName
  };
}

/**
 * Calculate installation score
 */
function calculateInstallationScore(data: {
  attempted: boolean;
  success: boolean;
  duration: number;
  hasWarnings: boolean
}): number {
  let score = 0;

  if (!data.attempted) {
    return 0;
  }

  if (data.success) {
    score = 7; // Base score for success

    // Bonus for fast installation
    if (data.duration < 10000) {
      score += 2;
    } else if (data.duration < 30000) {
      score += 1;
    }

    // Deduct for slow installation
    if (data.duration > 60000) {
      score -= 1;
    }

    // Deduct for warnings
    if (data.hasWarnings) {
      score -= 0.5;
    }
  } else {
    score = 0; // Failed installation = 0
  }

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}
