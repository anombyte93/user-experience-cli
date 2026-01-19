/**
 * Phase 1: First Impressions Audit
 * Analyzes README quality, installation clarity, code examples, and overall project presentation
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { FirstImpressionsFindings } from '../types';

/**
 * Analyze first impressions of a CLI tool
 * Examines README, installation docs, examples, and overall clarity
 */
export async function auditFirstImpressions(
  toolPath: string,
  verbose: boolean = false
): Promise<FirstImpressionsFindings> {
  const notes: string[] = [];
  let readmeScore = 0;
  let descriptionClarity = 0;

  // Check for README
  const readmeResult = await checkForReadme(toolPath);
  if (verbose) {
    console.log(`  README found: ${readmeResult.found ? 'Yes' : 'No'}`);
  }

  if (readmeResult.found && readmeResult.content) {
    // Analyze README quality
    readmeScore = await analyzeReadmeQuality(readmeResult.content);
    notes.push(...readmeResult.observations);

    if (readmeScore < 5) {
      notes.push('README quality is below average - needs improvement');
    }
  } else {
    notes.push('❌ CRITICAL: No README file found - users have no starting point');
  }

  // Check for installation instructions
  const installResult = await checkInstallationInstructions(toolPath, readmeResult.content);
  if (verbose) {
    console.log(`  Installation instructions: ${installResult.hasInstructions ? 'Yes' : 'No'}`);
  }
  notes.push(...installResult.notes);

  // Check for code examples
  const examplesResult = await checkForExamples(toolPath, readmeResult.content);
  if (verbose) {
    console.log(`  Code examples: ${examplesResult.count} found`);
  }
  notes.push(...examplesResult.notes);

  // Evaluate description clarity
  if (readmeResult.content) {
    descriptionClarity = evaluateDescriptionClarity(readmeResult.content);
    if (descriptionClarity < 5) {
      notes.push('Project description is unclear or incomplete');
    }
  }

  // Calculate overall score
  const score = calculateFirstImpressionScore({
    hasReadme: readmeResult.found,
    readmeScore,
    hasInstallInstructions: installResult.hasInstructions,
    hasExamples: examplesResult.hasExamples,
    descriptionClarity
  });

  return {
    hasReadme: readmeResult.found,
    readmeScore,
    hasInstallInstructions: installResult.hasInstructions,
    hasExamples: examplesResult.hasExamples,
    descriptionClarity,
    score,
    notes
  };
}

/**
 * Check for README file in various formats
 */
async function checkForReadme(
  toolPath: string
): Promise<{ found: boolean; content?: string; observations: string[] }> {
  const readmeNames = [
    'README.md',
    'README.markdown',
    'README.rst',
    'README.txt',
    'readme.md',
    'Readme.md'
  ];

  const observations: string[] = [];

  for (const name of readmeNames) {
    const readmePath = path.join(toolPath, name);
    try {
      const content = await fs.readFile(readmePath, 'utf-8');

      // Check if README is too short
      const lines = content.split('\n').length;
      if (lines < 20) {
        observations.push(`README is too short (${lines} lines) - lacks detail`);
      }

      // Check for basic sections
      const hasBadges = content.includes('[') && content.includes('img.shields.io');
      const hasTitle = content.split('\n')[0].startsWith('#');
      const hasLinks = content.includes('http') || content.includes('github');

      if (hasBadges) observations.push('README has project badges (good for credibility)');
      if (!hasTitle) observations.push('README lacks a clear title/heading');
      if (!hasLinks) observations.push('README lacks links to repository/issues');

      return { found: true, content, observations };
    } catch {
      continue;
    }
  }

  observations.push('No README file found in any common format');
  return { found: false, observations };
}

/**
 * Analyze README quality based on content
 */
async function analyzeReadmeQuality(content: string): Promise<number> {
  let score = 0;
  const maxScore = 10;

  // Length check (20%)
  const lines = content.split('\n').length;
  if (lines >= 50) score += 2;
  else if (lines >= 30) score += 1;
  else if (lines >= 20) score += 0.5;

  // Section headers (30%)
  const sections = ['installation', 'usage', 'features', 'contributing', 'license'];
  const foundSections = sections.filter(s =>
    content.toLowerCase().includes(s)
  );
  score += (foundSections.length / sections.length) * 3;

  // Code examples (20%)
  const hasCodeBlocks = content.includes('```');
  if (hasCodeBlocks) score += 2;

  // Links and resources (15%)
  const hasLinks = content.includes('http') || content.includes('github');
  const hasImages = content.includes('![') || content.includes('<img');
  if (hasLinks) score += 1;
  if (hasImages) score += 0.5;

  // Clear structure (15%)
  const hasHeadings = content.match(/^#+\s/gm);
  if (hasHeadings && hasHeadings.length >= 5) score += 1.5;

  return Math.min(Math.round(score * 10) / 10, maxScore);
}

/**
 * Check for installation instructions
 */
async function checkInstallationInstructions(
  toolPath: string,
  readmeContent?: string
): Promise<{ hasInstructions: boolean; notes: string[] }> {
  const notes: string[] = [];
  let hasInstructions = false;

  // Check README first
  if (readmeContent) {
    const installKeywords = [
      'install',
      'npm install',
      'cargo install',
      'go install',
      'pip install',
      'brew install',
      'setup',
      'getting started'
    ];

    const contentLower = readmeContent.toLowerCase();
    const hasInstallSection = installKeywords.some(kw => contentLower.includes(kw));

    if (hasInstallSection) {
      hasInstructions = true;
      notes.push('Installation instructions found in README');
    }
  }

  // Check for separate install docs
  const installDocNames = [
    'INSTALL.md',
    'INSTALLATION.md',
    'INSTALL.txt',
    'install.md',
    'docs/install.md',
    'docs/installation.md'
  ];

  for (const docName of installDocNames) {
    try {
      await fs.access(path.join(toolPath, docName));
      hasInstructions = true;
      notes.push(`Found separate installation document: ${docName}`);
      break;
    } catch {
      continue;
    }
  }

  // Check for package.json (Node.js)
  try {
    await fs.access(path.join(toolPath, 'package.json'));
    hasInstructions = true;
    notes.push('package.json found - standard npm install available');
  } catch {}

  // Check for Cargo.toml (Rust)
  try {
    await fs.access(path.join(toolPath, 'Cargo.toml'));
    hasInstructions = true;
    notes.push('Cargo.toml found - standard cargo install available');
  } catch {}

  // Check for go.mod (Go)
  try {
    await fs.access(path.join(toolPath, 'go.mod'));
    hasInstructions = true;
    notes.push('go.mod found - standard go install available');
  } catch {}

  if (!hasInstructions) {
    notes.push('❌ CRITICAL: No installation instructions found');
  }

  return { hasInstructions, notes };
}

/**
 * Check for code examples
 */
async function checkForExamples(
  toolPath: string,
  readmeContent?: string
): Promise<{ hasExamples: boolean; count: number; notes: string[] }> {
  const notes: string[] = [];
  let count = 0;

  // Check README for code blocks
  if (readmeContent) {
    const codeBlocks = readmeContent.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
      count = codeBlocks.length;
      notes.push(`Found ${count} code blocks in README`);
    }
  }

  // Check for examples directory
  const exampleDirs = ['examples/', 'example/', 'examples', 'samples/', 'demo/'];
  for (const dir of exampleDirs) {
    try {
      const examplesPath = path.join(toolPath, dir);
      const files = await fs.readdir(examplesPath);
      const codeFiles = files.filter(f =>
        /\.(js|ts|py|rs|go|sh|bash|zsh)$/.test(f)
      );
      if (codeFiles.length > 0) {
        count += codeFiles.length;
        notes.push(`Found ${codeFiles.length} example files in ${dir}`);
      }
    } catch {
      continue;
    }
  }

  // Check for usage examples in docs
  const usageDocs = ['USAGE.md', 'usage.md', 'docs/usage.md', 'examples.md'];
  for (const doc of usageDocs) {
    try {
      await fs.access(path.join(toolPath, doc));
      count += 1;
      notes.push(`Found usage documentation: ${doc}`);
    } catch {
      continue;
    }
  }

  return {
    hasExamples: count > 0,
    count,
    notes: count === 0 ? ['❌ No code examples found - hard for users to get started'] : notes
  };
}

/**
 * Evaluate description clarity
 */
function evaluateDescriptionClarity(content: string): number {
  let score = 0;
  const maxScore = 10;

  // Check for clear project title (10%)
  const firstLine = content.split('\n')[0];
  if (firstLine.startsWith('#')) {
    score += 1;
  }

  // Check for project description (30%)
  const descriptionIndicators = [
    'is a',
    'allows you to',
    'helps you',
    'enables',
    'provides',
    'tool for',
    'cli tool',
    'command line'
  ];

  const hasDescription = descriptionIndicators.some(indicator =>
    content.toLowerCase().includes(indicator)
  );
  if (hasDescription) score += 3;

  // Check for use cases/benefits (20%)
  const benefitIndicators = [
    'why',
    'benefit',
    'advantage',
    'use case',
    'when to use',
    'features'
  ];

  const hasBenefits = benefitIndicators.some(indicator =>
    content.toLowerCase().includes(indicator)
  );
  if (hasBenefits) score += 2;

  // Check for quick start (20%)
  const quickStartIndicators = [
    'quick start',
    'quickstart',
    'getting started',
    'in 5 minutes',
    'try it now'
  ];

  const hasQuickStart = quickStartIndicators.some(indicator =>
    content.toLowerCase().includes(indicator)
  );
  if (hasQuickStart) score += 2;

  // Check for badges/metadata (10%)
  if (content.includes('[') && content.includes('img.shields.io')) {
    score += 1;
  }

  // Check for project status (10%)
  if (content.toLowerCase().includes('beta') ||
      content.toLowerCase().includes('stable') ||
      content.toLowerCase().includes('version')) {
    score += 1;
  }

  return Math.min(Math.round(score * 10) / 10, maxScore);
}

/**
 * Calculate overall first impression score
 */
function calculateFirstImpressionScore(data: {
  hasReadme: boolean;
  readmeScore: number;
  hasInstallInstructions: boolean;
  hasExamples: boolean;
  descriptionClarity: number;
}): number {
  const weights = {
    readmeExists: 1.5,
    readmeQuality: 0.35,
    installInstructions: 2.0,
    examples: 2.0,
    descriptionClarity: 0.35
  };

  let totalScore = 0;

  if (data.hasReadme) {
    totalScore += weights.readmeExists;
    totalScore += data.readmeScore * weights.readmeQuality;
  }

  if (data.hasInstallInstructions) {
    totalScore += weights.installInstructions;
  }

  if (data.hasExamples) {
    totalScore += weights.examples;
  }

  totalScore += data.descriptionClarity * weights.descriptionClarity;

  return Math.min(Math.round(totalScore * 10) / 10, 10);
}
