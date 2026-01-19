/**
 * Phase 6: Red Flag Detection
 * Identifies critical issues, security problems, and missing features
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { RedFlag } from '../types';

/**
 * Detect red flags in the CLI tool
 */
export async function detectRedFlags(
  toolPath: string,
  verbose: boolean = false
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  // Run all red flag detection checks
  const checks = [
    checkForHardcodedSecrets,
    checkForInsecureDependencies,
    checkForMissingFiles,
    checkForPoorProjectStructure,
    checkForBrokenTests,
    checkForOutdatedDependencies,
    checkForSecurityIssues,
    checkForLicensingIssues,
    checkForAccessibilityIssues
  ];

  for (const check of checks) {
    try {
      const result = await check(toolPath, verbose);
      redFlags.push(...result.redFlags);
      notes.push(...result.notes);
    } catch (error) {
      if (verbose) {
        console.log(`  Check failed: ${(error as Error).message}`);
      }
    }
  }

  // Deduplicate red flags
  const uniqueFlags = deduplicateRedFlags(redFlags);

  // Summary
  if (uniqueFlags.length === 0) {
    notes.push('✅ No critical red flags detected');
  } else {
    const criticalCount = uniqueFlags.filter(f => f.severity === 'critical').length;
    const highCount = uniqueFlags.filter(f => f.severity === 'high').length;
    const mediumCount = uniqueFlags.filter(f => f.severity === 'medium').length;

    notes.push(`Found ${uniqueFlags.length} red flags:`);
    notes.push(`  - Critical: ${criticalCount}`);
    notes.push(`  - High: ${highCount}`);
    notes.push(`  - Medium: ${mediumCount}`);
  }

  return { redFlags: uniqueFlags, notes };
}

/**
 * Check for hardcoded secrets/API keys
 */
async function checkForHardcodedSecrets(
  toolPath: string,
  verbose: boolean
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  const secretPatterns = [
    { pattern: /AIza[0-9A-Za-z\\-_]{35}/, name: 'Google API key' },
    { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS access key' },
    { pattern: /sk-[a-zA-Z0-9]{48}/, name: 'OpenAI API key' },
    { pattern: /xox[bap]-[0-9]{12}-[0-9]{12}-[0-9A-Za-z]{24}/, name: 'Slack token' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub personal access token' },
    { pattern: /password\s*=\s*["\'][^"\']+["\']/, name: 'Hardcoded password' }
  ];

  // Check source files
  const sourceFiles = await findSourceFiles(toolPath);
  let checked = 0;

  for (const file of sourceFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');

      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(content)) {
          redFlags.push({
            severity: 'critical',
            category: 'security',
            title: `Hardcoded ${name} detected`,
            description: `Found ${name} in source code which is a critical security vulnerability`,
            evidence: [`File: ${path.relative(toolPath, file)}`],
            fix: `Remove ${name} from source code and use environment variables`,
            location: file
          });
        }
      }
      checked++;
    } catch {
      continue;
    }
  }

  if (verbose) {
    console.log(`  Checked ${checked} files for secrets`);
  }

  if (redFlags.length === 0) {
    notes.push('✅ No hardcoded secrets found');
  }

  return { redFlags, notes };
}

/**
 * Check for insecure dependencies
 */
async function checkForInsecureDependencies(
  toolPath: string,
  verbose: boolean
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  try {
    const pkgPath = path.join(toolPath, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));

    // Check for known vulnerable packages
    const vulnerablePackages = [
      'lodash<4.17.21',
      'axios<0.21.1',
      ' minimist<1.2.6'
    ];

    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const vuln of vulnerablePackages) {
      const [name, version] = vuln.split(/([<>=]+)/);
      if (allDeps[name]) {
        redFlags.push({
          severity: 'high',
          category: 'security',
          title: 'Known vulnerable dependency',
          description: `Package ${name} has known security vulnerabilities`,
          evidence: [`Dependency: ${name}@${allDeps[name]}`],
          fix: `Update ${name} to latest version`
        });
      }
    }

    if (redFlags.length === 0) {
      notes.push('✅ No known vulnerable dependencies found');
    }
  } catch {
    // Not a Node.js project or no package.json
  }

  return { redFlags, notes };
}

/**
 * Check for missing essential files
 */
async function checkForMissingFiles(
  toolPath: string,
  verbose: boolean
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  const essentialFiles = [
    { file: 'README.md', severity: 'critical' as const, name: 'README' },
    { file: 'LICENSE', severity: 'high' as const, name: 'license file' },
    { file: '.gitignore', severity: 'medium' as const, name: '.gitignore' }
  ];

  for (const { file, severity, name } of essentialFiles) {
    try {
      await fs.access(path.join(toolPath, file));
    } catch {
      redFlags.push({
        severity,
        category: 'project-structure',
        title: `Missing ${name}`,
        description: `Project is missing ${name}`,
        evidence: [`${file} not found`],
        fix: `Add ${name} to the project`
      });
    }
  }

  // Check for .env.example
  try {
    await fs.access(path.join(toolPath, '.env'));
    // If .env exists, .env.example should also exist
    try {
      await fs.access(path.join(toolPath, '.env.example'));
    } catch {
      redFlags.push({
        severity: 'medium',
        category: 'security',
        title: 'Missing .env.example',
        description: 'Project uses .env but doesn\'t provide .env.example template',
        evidence: ['.env found but .env.example missing'],
        fix: 'Create .env.example with placeholder values'
      });
    }
  } catch {
    // No .env file, that's fine
  }

  if (redFlags.length === 0) {
    notes.push('✅ All essential files present');
  }

  return { redFlags, notes };
}

/**
 * Check for poor project structure
 */
async function checkForPoorProjectStructure(
  toolPath: string,
  verbose: boolean
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  try {
    const files = await fs.readdir(toolPath);

    // Check for files at root level that should be in directories
    const jsFiles = files.filter(f => f.endsWith('.js') && f !== 'index.js');
    const tsFiles = files.filter(f => f.endsWith('.ts') && f !== 'index.ts');

    if (jsFiles.length > 5 || tsFiles.length > 5) {
      redFlags.push({
        severity: 'low',
        category: 'project-structure',
        title: 'Poor project organization',
        description: 'Many source files at root level - should be organized in directories',
        evidence: [`Found ${jsFiles.length + tsFiles.length} source files at root`],
        fix: 'Organize source files into src/, lib/, or similar directories'
      });
    }

    // Check for tests
    const hasTestDir = files.includes('test') || files.includes('tests') || files.includes('__tests__');
    const hasTestFiles = files.some(f => f.includes('.test.') || f.includes('.spec.'));

    if (!hasTestDir && !hasTestFiles) {
      redFlags.push({
        severity: 'medium',
        category: 'testing',
        title: 'No tests found',
        description: 'Project lacks test files or test directory',
        evidence: ['No test/ or tests/ directory found', 'No .test. or .spec. files found'],
        fix: 'Add tests to ensure code quality and prevent regressions'
      });
    } else {
      notes.push('✅ Test directory or files present');
    }

    // Check for documentation directory
    if (!files.includes('docs') && !files.includes('documentation')) {
      notes.push('⚠️  No docs/ directory found');
    }
  } catch {
    // Cannot read directory
  }

  return { redFlags, notes };
}

/**
 * Check for broken tests
 */
async function checkForBrokenTests(
  toolPath: string,
  verbose: boolean
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  // This is a basic check - actual test execution would be better
  const testFiles = await findFiles(toolPath, ['.test.ts', '.test.js', '.spec.ts', '.spec.js']);

  if (testFiles.length > 0) {
    let emptyTests = 0;

    for (const file of testFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
        if (lines.length < 10) {
          emptyTests++;
        }
      } catch {
        continue;
      }
    }

    if (emptyTests > testFiles.length * 0.5) {
      redFlags.push({
        severity: 'low',
        category: 'testing',
        title: 'Many tests appear to be empty or minimal',
        description: `${emptyTests} of ${testFiles.length} test files have very little content`,
        evidence: [`Found ${emptyTests} minimal test files`],
        fix: 'Add proper test cases to ensure code quality'
      });
    }
  }

  return { redFlags, notes };
}

/**
 * Check for outdated dependencies
 */
async function checkForOutdatedDependencies(
  toolPath: string,
  verbose: boolean
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  try {
    const pkgPath = path.join(toolPath, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));

    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const outdatedPackages: string[] = [];

    // Check for very old package versions (basic heuristic)
    for (const [name, version] of Object.entries(allDeps)) {
      const ver = version as string;
      if (ver.startsWith('^0.') || ver.startsWith('~0.')) {
        outdatedPackages.push(`${name}@${ver}`);
      }
    }

    if (outdatedPackages.length > 3) {
      redFlags.push({
        severity: 'low',
        category: 'maintenance',
        title: 'Many outdated dependencies',
        description: 'Project has many dependencies using version 0.x',
        evidence: outdatedPackages.slice(0, 5),
        fix: 'Update dependencies to latest stable versions'
      });
    }
  } catch {
    // Not a Node.js project
  }

  return { redFlags, notes };
}

/**
 * Check for security issues
 */
async function checkForSecurityIssues(
  toolPath: string,
  verbose: boolean
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  // Check for eval() usage (code injection risk)
  const sourceFiles = await findSourceFiles(toolPath);

  for (const file of sourceFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');

      if (/\beval\s*\(/.test(content)) {
        redFlags.push({
          severity: 'high',
          category: 'security',
          title: 'Use of eval() detected',
          description: 'eval() can lead to code injection vulnerabilities',
          evidence: [`File: ${path.relative(toolPath, file)}`],
          fix: 'Remove eval() and use safer alternatives',
          location: file
        });
      }

      // Check for exec() or spawn() with user input
      if (/\bexec\s*\(/.test(content) || /\bspawn\s*\(/.test(content)) {
        // Check if there's input sanitization
        if (!content.includes('sanitize') && !content.includes('escape') && !content.includes('validate')) {
          redFlags.push({
            severity: 'medium',
            category: 'security',
            title: 'Potential command injection',
            description: 'exec() or spawn() found without input sanitization',
            evidence: [`File: ${path.relative(toolPath, file)}`],
            fix: 'Add input sanitization before shell command execution',
            location: file
          });
        }
      }
    } catch {
      continue;
    }
  }

  if (redFlags.length === 0) {
    notes.push('✅ No obvious security issues detected');
  }

  return { redFlags, notes };
}

/**
 * Check for licensing issues
 */
async function checkForLicensingIssues(
  toolPath: string,
  verbose: boolean
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  try {
    const pkgPath = path.join(toolPath, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));

    if (!pkg.license) {
      redFlags.push({
        severity: 'medium',
        category: 'legal',
        title: 'No license specified',
        description: 'package.json does not specify a license',
        evidence: ['package.json missing "license" field'],
        fix: 'Add license field to package.json (e.g., "MIT", "Apache-2.0")'
      });
    } else {
      notes.push(`✅ License: ${pkg.license}`);
    }
  } catch {
    // Not a Node.js project
  }

  // Check LICENSE file exists
  try {
    await fs.access(path.join(toolPath, 'LICENSE'));
    notes.push('✅ LICENSE file present');
  } catch {
    redFlags.push({
      severity: 'medium',
      category: 'legal',
      title: 'Missing LICENSE file',
      description: 'Project does not have a LICENSE file',
      evidence: ['LICENSE file not found'],
      fix: 'Add LICENSE file with full license text'
    });
  }

  return { redFlags, notes };
}

/**
 * Check for accessibility issues
 */
async function checkForAccessibilityIssues(
  toolPath: string,
  verbose: boolean
): Promise<{ redFlags: RedFlag[]; notes: string[] }> {
  const redFlags: RedFlag[] = [];
  const notes: string[] = [];

  try {
    const readmePath = path.join(toolPath, 'README.md');
    const content = await fs.readFile(readmePath, 'utf-8');

    // Check for accessibility considerations
    const hasAccessibilityMention = content.toLowerCase().includes('accessibility') ||
                                   content.toLowerCase().includes('a11y') ||
                                   content.toLowerCase().includes('screen reader');

    if (!hasAccessibilityMention) {
      notes.push('⚠️  Accessibility not mentioned in documentation');
    } else {
      notes.push('✅ Accessibility considerations documented');
    }

    // Check for color-only indicators (if documentation mentions UI)
    if (content.toLowerCase().includes('red') || content.toLowerCase().includes('green')) {
      // This is a very rough heuristic
      notes.push('⚠️  May use color-only indicators (consider accessibility)');
    }
  } catch {
    // No README to check
  }

  return { redFlags, notes };
}

/**
 * Find all source files in the project
 */
async function findSourceFiles(toolPath: string): Promise<string[]> {
  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs'];
  const files: string[] = [];

  async function scanDirectory(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and other common directories
          if (!['node_modules', '.git', 'dist', 'build', 'target'].includes(entry.name)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Cannot read directory
    }
  }

  await scanDirectory(toolPath);
  return files;
}

/**
 * Find files with specific extensions
 */
async function findFiles(toolPath: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];

  async function scanDirectory(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build', 'target'].includes(entry.name)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          if (extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Cannot read directory
    }
  }

  await scanDirectory(toolPath);
  return files;
}

/**
 * Deduplicate red flags by title and category
 */
function deduplicateRedFlags(flags: RedFlag[]): RedFlag[] {
  const seen = new Set<string>();
  const unique: RedFlag[] = [];

  for (const flag of flags) {
    const key = `${flag.category}:${flag.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(flag);
    } else {
      // Merge evidence if duplicate
      const existing = unique.find(f => `${f.category}:${f.title}` === key);
      if (existing) {
        existing.evidence = [...new Set([...existing.evidence, ...flag.evidence])];
      }
    }
  }

  return unique;
}
