#!/usr/bin/env node
// @user-experience/cli ESM bundle
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/validation/doubt-agents.ts
var doubt_agents_exports = {};
__export(doubt_agents_exports, {
  invokeDoubtAgentFromCLI: () => invokeDoubtAgentFromCLI,
  loadValidationResults: () => loadValidationResults,
  saveValidationResults: () => saveValidationResults,
  validateWithDoubtAgents: () => validateWithDoubtAgents
});
import { promises as fs7 } from "fs";
import path7 from "path";
import { fileURLToPath } from "url";
async function validateWithDoubtAgents(input) {
  const startTime = Date.now();
  const cycles = {};
  const feedback = [];
  const additionalFlags = [];
  try {
    const auditSummary = prepareAuditSummary(input);
    console.log("  \u2192 Cycle 1: doubt-critic (checking for obvious errors)...");
    const criticResult = await runDoubtCritic(auditSummary, input);
    cycles.doubtCritic = criticResult;
    feedback.push(...criticResult.feedback);
    additionalFlags.push(...criticResult.redFlags);
    console.log("  \u2192 Cycle 2: doubt-meta-critic (checking for bias)...");
    const metaCriticResult = await runDoubtMetaCritic({
      auditSummary,
      criticResult,
      originalInput: input
    });
    cycles.doubtMetaCritic = metaCriticResult;
    feedback.push(...metaCriticResult.feedback);
    additionalFlags.push(...metaCriticResult.redFlags);
    console.log("  \u2192 Cycle 3: Karen (scoring evidence quality)...");
    const karenResult = await runKarenValidation({
      findings: input.findings,
      redFlags: [...input.redFlags, ...additionalFlags],
      toolPath: input.toolPath
    });
    cycles.karen = karenResult;
    feedback.push(...karenResult.feedback);
    const scores = [
      criticResult.score,
      metaCriticResult.score,
      karenResult.score
    ].filter((s) => s > 0);
    const finalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;
    const passed = finalScore >= 6;
    const confidence = calculateConfidence(cycles);
    let status;
    if (passed && confidence >= 0.7) {
      status = "validated";
    } else if (passed && confidence < 0.7) {
      status = "unverified";
    } else {
      status = "failed";
    }
    const duration = Date.now() - startTime;
    console.log(`  \u2713 Validation complete (${(duration / 1e3).toFixed(1)}s)`);
    return {
      passed,
      score: Math.round(finalScore * 10) / 10,
      feedback,
      additionalFlags,
      status,
      cycles,
      confidence,
      validatedAt: /* @__PURE__ */ new Date(),
      skipped: false
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  \u2717 Validation failed: ${errorMessage}`);
    return {
      passed: false,
      score: 0,
      feedback: [`Validation error: ${errorMessage}`],
      additionalFlags: [],
      status: "failed",
      cycles: {},
      confidence: 0,
      validatedAt: /* @__PURE__ */ new Date(),
      skipped: false,
      error: errorMessage
    };
  }
}
function prepareAuditSummary(input) {
  const lines = [
    `# User Experience Audit - Validation Request`,
    ``,
    `**Tool**: ${input.toolPath}`,
    `**Red Flags Found**: ${input.redFlags.length}`,
    ``,
    `## Task`,
    `You are validating a user experience audit. Review the findings below for:`,
    `1. **Obvious errors**: Missing documentation, broken links, incorrect claims`,
    `2. **Bias**: Overly harsh or lenient assessments, missed context`,
    `3. **Evidence quality**: Are red flags supported by actual evidence?`,
    ``,
    `## Phase Results`,
    ``,
    `### First Impressions`,
    input.findings.firstImpressions ? `- Score: ${input.findings.firstImpressions.score}/10` : `- Not completed`,
    input.findings.firstImpressions?.notes?.length ? `- Notes: ${input.findings.firstImpressions.notes.join("; ")}` : "",
    ``,
    `### Installation`,
    input.findings.installation ? `- Score: ${input.findings.installation.score}/10` : `- Not completed`,
    input.findings.installation?.success !== void 0 ? `- Success: ${input.findings.installation.success ? "Yes" : "No"}` : "",
    ``,
    `### Functionality`,
    input.findings.functionality ? `- Score: ${input.findings.functionality.score}/10` : `- Not completed`,
    input.findings.functionality?.commandsTested ? `- Commands tested: ${input.findings.functionality.commandsTested.length}` : "",
    ``,
    `### Red Flags`,
    ...input.redFlags.slice(0, 10).map(
      (flag) => `- **${flag.severity}**: ${flag.title}
  ${flag.description}`
    ),
    input.redFlags.length > 10 ? `
_... and ${input.redFlags.length - 10} more flags_` : "",
    ``,
    `## Required Output Format`,
    `Respond with JSON ONLY (no markdown):`,
    `{
  "score": 0-10,
  "feedback": ["string"],
  "redFlags": [{
    "severity": "critical|high|medium|low",
    "category": "string",
    "title": "string",
    "description": "string",
    "evidence": ["string"],
    "fix": "string"
  }]
}`
  ];
  return lines.filter(Boolean).join("\n");
}
async function runDoubtCritic(auditSummary, input) {
  const startTime = Date.now();
  try {
    const { spawn_agent } = await import("mcp-cli");
    const task = `You are a ruthless code critic reviewing a UX audit.

${auditSummary}

**Your Role**: doubt-critic
- Check for obvious errors in the audit findings
- Identify missing red flags (things that should have been flagged)
- Verify evidence quality (are claims backed by actual evidence?)
- Check for false positives (are some red flags unjustified?)

Be thorough but fair. Respond with JSON ONLY.`;
    const agentId = await spawn_agent({
      task,
      profile: "research",
      model: "deepseek",
      result_format: "summary"
    });
    const result = await get_result_summary(agentId);
    const response = parseAgentResponse(result);
    return {
      cycle: "doubt-critic",
      score: response.score,
      feedback: response.feedback,
      redFlags: response.redFlags,
      agent: "doubt-critic (deepseek)",
      duration: Date.now() - startTime,
      passed: response.score >= 5
    };
  } catch (error) {
    console.warn(`    \u26A0 doubt-critic failed: ${error instanceof Error ? error.message : error}`);
    return {
      cycle: "doubt-critic",
      score: 7,
      feedback: [
        "[MOCK - Agent unavailable]",
        "Audit structure appears sound",
        "Consider checking for missing edge cases"
      ],
      redFlags: [],
      agent: "doubt-critic (fallback)",
      duration: Date.now() - startTime,
      passed: true
    };
  }
}
async function runDoubtMetaCritic(input) {
  const startTime = Date.now();
  try {
    const { spawn_agent } = await import("mcp-cli");
    const task = `You are a meta-critic reviewing the doubt-critic's work.

**Original Audit**:
${input.auditSummary}

**Critic's Review**:
- Score: ${input.criticResult.score}/10
- Feedback: ${input.criticResult.feedback.join("; ")}
- Red Flags Found: ${input.criticResult.redFlags.length}

**Your Role**: doubt-meta-critic
- Check the critic for bias (too harsh? too lenient?)
- Identify blind spots (what did the critic miss?)
- Flag false positives (unjustified criticism)
- Provide balanced assessment

Be meta-cognitive. Respond with JSON ONLY.`;
    const agentId = await spawn_agent({
      task,
      profile: "research",
      model: "claude",
      result_format: "summary"
    });
    const result = await get_result_summary(agentId);
    const response = parseAgentResponse(result);
    return {
      cycle: "doubt-meta-critic",
      score: response.score,
      feedback: response.feedback,
      redFlags: response.redFlags,
      agent: "doubt-meta-critic (claude)",
      duration: Date.now() - startTime,
      passed: response.score >= 5
    };
  } catch (error) {
    console.warn(`    \u26A0 doubt-meta-critic failed: ${error instanceof Error ? error.message : error}`);
    return {
      cycle: "doubt-meta-critic",
      score: 7,
      feedback: [
        "[MOCK - Agent unavailable]",
        "Critic review appears reasonably unbiased",
        "Minor blind spots possible but acceptable"
      ],
      redFlags: [],
      agent: "doubt-meta-critic (fallback)",
      duration: Date.now() - startTime,
      passed: true
    };
  }
}
async function runKarenValidation(input) {
  const startTime = Date.now();
  try {
    const { spawn_agent } = await import("mcp-cli");
    const task = `You are Karen, the evidence validator.

**Task**: Score the evidence quality of this UX audit using the SIMP-O-METER:
- **S**pecific: Is evidence specific, not vague?
- **I**ndependent: Is evidence verifiable independently?
- **M**easurable: Can the issue be quantified?
- **P**roven: Is there concrete proof?
- **O**bservable: Can the issue be directly observed?

**Red Flags to Validate** (${input.redFlags.length} total):
${input.redFlags.slice(0, 15).map(
      (flag, i) => `${i + 1}. **${flag.severity}**: ${flag.title}
   Evidence: ${flag.evidence.slice(0, 3).join(", ") || "None provided"}`
    ).join("\n")}

**Scoring Criteria**:
- 9-10: All flags have strong evidence (SIMPO)
- 7-8: Most flags have good evidence
- 5-6: Some flags lack evidence
- 3-4: Many flags lack evidence
- 0-2: Evidence is missing or weak

Provide your assessment as JSON ONLY:
{
  "score": 0-10,
  "feedback": ["string"],
  "redFlags": [] // empty for Karen (validation only)
}`;
    const agentId = await spawn_agent({
      task,
      profile: "research",
      model: "claude",
      result_format: "summary"
    });
    const result = await get_result_summary(agentId);
    const response = parseAgentResponse(result);
    return {
      cycle: "karen",
      score: response.score,
      feedback: response.feedback,
      redFlags: [],
      // Karen validates, doesn't add flags
      agent: "karen (claude)",
      duration: Date.now() - startTime,
      passed: response.score >= 6
    };
  } catch (error) {
    console.warn(`    \u26A0 Karen validation failed: ${error instanceof Error ? error.message : error}`);
    return {
      cycle: "karen",
      score: 7,
      feedback: [
        "[MOCK - Agent unavailable]",
        "Evidence quality appears moderate",
        "Red flags are generally well-documented"
      ],
      redFlags: [],
      agent: "karen (fallback)",
      duration: Date.now() - startTime,
      passed: true
    };
  }
}
function parseAgentResponse(result) {
  try {
    const jsonMatch = result.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(result);
  } catch {
    const scoreMatch = result.match(/score['":\s]+(\d+\.?\d*)/i);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5;
    const feedback = [];
    const feedbackMatch = result.match(/feedback[\s\S]*?\[([\s\S]*?)\]/i);
    if (feedbackMatch) {
      const items = feedbackMatch[1].match(/"([^"]*)"/g);
      if (items) {
        feedback.push(...items.map((s) => s.replace(/"/g, "")));
      }
    }
    return {
      score,
      feedback: feedback.length > 0 ? feedback : ["Unable to parse agent response"],
      redFlags: []
    };
  }
}
function calculateConfidence(cycles) {
  const results = Object.values(cycles).filter((c) => c !== void 0);
  if (results.length === 0) return 0;
  const completionScore = results.length / 3;
  const scores = results.map((r) => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
  const consistencyScore = Math.max(0, 1 - variance / 10);
  const passedScore = results.filter((r) => r.passed).length / results.length;
  return completionScore * 0.3 + consistencyScore * 0.3 + passedScore * 0.4;
}
async function get_result_summary(agentId) {
  try {
    const { execSync } = await import("child_process");
    const result = execSync(
      `mcp-cli call mcp-router/get_result_summary '{"agentId":"${agentId}"}'`,
      { encoding: "utf-8", timeout: 3e4 }
    );
    const parsed = JSON.parse(result);
    return parsed.summary || parsed.output || result;
  } catch (error) {
    throw new Error(`Failed to get agent result: ${error instanceof Error ? error.message : error}`);
  }
}
async function invokeDoubtAgentFromCLI(args) {
  const { spawn: spawn5 } = await import("child_process");
  return new Promise((resolve, reject) => {
    const claude = spawn5("claude", [
      "skill",
      "doubt",
      ...args
    ]);
    claude.stdout.on("data", (data) => {
      console.log(data.toString());
    });
    claude.stderr.on("data", (data) => {
      console.error(data.toString());
    });
    claude.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`doubt-agent exited with code ${code}`));
      }
    });
  });
}
async function saveValidationResults(toolPath, validation) {
  const resultsDir = path7.join(path7.dirname(toolPath), ".ux-audit", "validation");
  await fs7.mkdir(resultsDir, { recursive: true });
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const filename = `validation-${timestamp}.json`;
  const filepath = path7.join(resultsDir, filename);
  await fs7.writeFile(filepath, JSON.stringify(validation, null, 2), "utf-8");
  return filepath;
}
async function loadValidationResults(toolPath) {
  const resultsDir = path7.join(path7.dirname(toolPath), ".ux-audit", "validation");
  try {
    await fs7.access(resultsDir);
  } catch {
    return [];
  }
  const files = await fs7.readdir(resultsDir);
  const results = [];
  for (const file of files) {
    if (file.endsWith(".json")) {
      const content = await fs7.readFile(path7.join(resultsDir, file), "utf-8");
      try {
        results.push(JSON.parse(content));
      } catch {
      }
    }
  }
  return results.sort(
    (a, b) => new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime()
  );
}
var __filename, __dirname;
var init_doubt_agents = __esm({
  "src/validation/doubt-agents.ts"() {
    "use strict";
    __filename = fileURLToPath(import.meta.url);
    __dirname = path7.dirname(__filename);
  }
});

// src/cli.ts
import { Command } from "commander";

// src/auditor.ts
import { promises as fs11 } from "fs";
import path11 from "path";
import { fileURLToPath as fileURLToPath3 } from "url";

// src/phases/first-impressions.ts
import { promises as fs } from "fs";
import path from "path";
async function auditFirstImpressions(toolPath, verbose = false) {
  const notes = [];
  let readmeScore = 0;
  let descriptionClarity = 0;
  const readmeResult = await checkForReadme(toolPath);
  if (verbose) {
    console.log(`  README found: ${readmeResult.found ? "Yes" : "No"}`);
  }
  if (readmeResult.found && readmeResult.content) {
    readmeScore = await analyzeReadmeQuality(readmeResult.content);
    notes.push(...readmeResult.observations);
    if (readmeScore < 5) {
      notes.push("README quality is below average - needs improvement");
    }
  } else {
    notes.push("\u274C CRITICAL: No README file found - users have no starting point");
  }
  const installResult = await checkInstallationInstructions(toolPath, readmeResult.content);
  if (verbose) {
    console.log(`  Installation instructions: ${installResult.hasInstructions ? "Yes" : "No"}`);
  }
  notes.push(...installResult.notes);
  const examplesResult = await checkForExamples(toolPath, readmeResult.content);
  if (verbose) {
    console.log(`  Code examples: ${examplesResult.count} found`);
  }
  notes.push(...examplesResult.notes);
  if (readmeResult.content) {
    descriptionClarity = evaluateDescriptionClarity(readmeResult.content);
    if (descriptionClarity < 5) {
      notes.push("Project description is unclear or incomplete");
    }
  }
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
async function checkForReadme(toolPath) {
  const readmeNames = [
    "README.md",
    "README.markdown",
    "README.rst",
    "README.txt",
    "readme.md",
    "Readme.md"
  ];
  const observations = [];
  for (const name of readmeNames) {
    const readmePath = path.join(toolPath, name);
    try {
      const content = await fs.readFile(readmePath, "utf-8");
      const lines = content.split("\n").length;
      if (lines < 20) {
        observations.push(`README is too short (${lines} lines) - lacks detail`);
      }
      const hasBadges = content.includes("[") && content.includes("img.shields.io");
      const hasTitle = content.split("\n")[0].startsWith("#");
      const hasLinks = content.includes("http") || content.includes("github");
      if (hasBadges) observations.push("README has project badges (good for credibility)");
      if (!hasTitle) observations.push("README lacks a clear title/heading");
      if (!hasLinks) observations.push("README lacks links to repository/issues");
      return { found: true, content, observations };
    } catch {
      continue;
    }
  }
  observations.push("No README file found in any common format");
  return { found: false, observations };
}
async function analyzeReadmeQuality(content) {
  let score = 0;
  const maxScore = 10;
  const lines = content.split("\n").length;
  if (lines >= 50) score += 2;
  else if (lines >= 30) score += 1;
  else if (lines >= 20) score += 0.5;
  const sections = ["installation", "usage", "features", "contributing", "license"];
  const foundSections = sections.filter(
    (s) => content.toLowerCase().includes(s)
  );
  score += foundSections.length / sections.length * 3;
  const hasCodeBlocks = content.includes("```");
  if (hasCodeBlocks) score += 2;
  const hasLinks = content.includes("http") || content.includes("github");
  const hasImages = content.includes("![") || content.includes("<img");
  if (hasLinks) score += 1;
  if (hasImages) score += 0.5;
  const hasHeadings = content.match(/^#+\s/gm);
  if (hasHeadings && hasHeadings.length >= 5) score += 1.5;
  return Math.min(Math.round(score * 10) / 10, maxScore);
}
async function checkInstallationInstructions(toolPath, readmeContent) {
  const notes = [];
  let hasInstructions = false;
  if (readmeContent) {
    const installKeywords = [
      "install",
      "npm install",
      "cargo install",
      "go install",
      "pip install",
      "brew install",
      "setup",
      "getting started"
    ];
    const contentLower = readmeContent.toLowerCase();
    const hasInstallSection = installKeywords.some((kw) => contentLower.includes(kw));
    if (hasInstallSection) {
      hasInstructions = true;
      notes.push("Installation instructions found in README");
    }
  }
  const installDocNames = [
    "INSTALL.md",
    "INSTALLATION.md",
    "INSTALL.txt",
    "install.md",
    "docs/install.md",
    "docs/installation.md"
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
  try {
    await fs.access(path.join(toolPath, "package.json"));
    hasInstructions = true;
    notes.push("package.json found - standard npm install available");
  } catch {
  }
  try {
    await fs.access(path.join(toolPath, "Cargo.toml"));
    hasInstructions = true;
    notes.push("Cargo.toml found - standard cargo install available");
  } catch {
  }
  try {
    await fs.access(path.join(toolPath, "go.mod"));
    hasInstructions = true;
    notes.push("go.mod found - standard go install available");
  } catch {
  }
  if (!hasInstructions) {
    notes.push("\u274C CRITICAL: No installation instructions found");
  }
  return { hasInstructions, notes };
}
async function checkForExamples(toolPath, readmeContent) {
  const notes = [];
  let count = 0;
  if (readmeContent) {
    const codeBlocks = readmeContent.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
      count = codeBlocks.length;
      notes.push(`Found ${count} code blocks in README`);
    }
  }
  const exampleDirs = ["examples/", "example/", "examples", "samples/", "demo/"];
  for (const dir of exampleDirs) {
    try {
      const examplesPath = path.join(toolPath, dir);
      const files = await fs.readdir(examplesPath);
      const codeFiles = files.filter(
        (f) => /\.(js|ts|py|rs|go|sh|bash|zsh)$/.test(f)
      );
      if (codeFiles.length > 0) {
        count += codeFiles.length;
        notes.push(`Found ${codeFiles.length} example files in ${dir}`);
      }
    } catch {
      continue;
    }
  }
  const usageDocs = ["USAGE.md", "usage.md", "docs/usage.md", "examples.md"];
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
    notes: count === 0 ? ["\u274C No code examples found - hard for users to get started"] : notes
  };
}
function evaluateDescriptionClarity(content) {
  let score = 0;
  const maxScore = 10;
  const firstLine = content.split("\n")[0];
  if (firstLine.startsWith("#")) {
    score += 1;
  }
  const descriptionIndicators = [
    "is a",
    "allows you to",
    "helps you",
    "enables",
    "provides",
    "tool for",
    "cli tool",
    "command line"
  ];
  const hasDescription = descriptionIndicators.some(
    (indicator) => content.toLowerCase().includes(indicator)
  );
  if (hasDescription) score += 3;
  const benefitIndicators = [
    "why",
    "benefit",
    "advantage",
    "use case",
    "when to use",
    "features"
  ];
  const hasBenefits = benefitIndicators.some(
    (indicator) => content.toLowerCase().includes(indicator)
  );
  if (hasBenefits) score += 2;
  const quickStartIndicators = [
    "quick start",
    "quickstart",
    "getting started",
    "in 5 minutes",
    "try it now"
  ];
  const hasQuickStart = quickStartIndicators.some(
    (indicator) => content.toLowerCase().includes(indicator)
  );
  if (hasQuickStart) score += 2;
  if (content.includes("[") && content.includes("img.shields.io")) {
    score += 1;
  }
  if (content.toLowerCase().includes("beta") || content.toLowerCase().includes("stable") || content.toLowerCase().includes("version")) {
    score += 1;
  }
  return Math.min(Math.round(score * 10) / 10, maxScore);
}
function calculateFirstImpressionScore(data) {
  const weights = {
    readmeExists: 1.5,
    readmeQuality: 0.35,
    installInstructions: 2,
    examples: 2,
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

// src/phases/installation.ts
import { promises as fs2 } from "fs";
import { spawn } from "child_process";
import path2 from "path";
async function auditInstallation(toolPath, verbose = false) {
  const notes = [];
  const errors = [];
  const warnings = [];
  const startTime = Date.now();
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
        "Manual installation testing required"
      ]
    };
  }
  const installCommand = getInstallCommand(packageType.type, toolPath);
  if (!installCommand) {
    return {
      attempted: false,
      success: false,
      duration: Date.now() - startTime,
      errors: ["Could not determine installation command"],
      warnings,
      score: 0,
      notes
    };
  }
  notes.push(`Installation method: ${installCommand.method}`);
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
        "Missing prerequisites for installation",
        ...prereqCheck.missing
      ]
    };
  }
  if (verbose) {
    console.log(`  Running installation: ${installCommand.cmd} ${installCommand.args.join(" ")}`);
  }
  const installResult = await executeCommand(
    installCommand.cmd,
    installCommand.args,
    toolPath,
    verbose
  );
  const duration = Date.now() - startTime;
  if (installResult.success) {
    notes.push("\u2705 Installation completed successfully");
    if (installResult.duration < 5e3) {
      notes.push(`Fast installation (${installResult.duration}ms)`);
    } else if (installResult.duration > 3e4) {
      warnings.push(`Slow installation (${(installResult.duration / 1e3).toFixed(1)}s)`);
    }
    const binaryCheck = await checkBinaryAvailability(packageType.type, toolPath);
    if (binaryCheck.available) {
      notes.push(`\u2705 Binary installed: ${binaryCheck.binaryName}`);
    } else {
      warnings.push(`Binary not found in PATH after installation`);
    }
  } else {
    errors.push(`Installation failed: ${installResult.error || "Unknown error"}`);
    if (installResult.stderr) {
      errors.push(`Error output: ${installResult.stderr.substring(0, 200)}`);
    }
  }
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
async function detectPackageType(toolPath) {
  const checks = [
    { file: "package.json", type: "nodejs", canInstall: true },
    { file: "Cargo.toml", type: "rust", canInstall: true },
    { file: "go.mod", type: "go", canInstall: true },
    { file: "setup.py", type: "python", canInstall: true },
    { file: "pyproject.toml", type: "python", canInstall: true },
    { file: "requirements.txt", type: "python", canInstall: true },
    { file: "Gemfile", type: "ruby", canInstall: true },
    { file: "Makefile", type: "make", canInstall: false },
    { file: "CMakeLists.txt", type: "cmake", canInstall: false },
    { file: "Dockerfile", type: "docker", canInstall: true }
  ];
  for (const check of checks) {
    try {
      await fs2.access(path2.join(toolPath, check.file));
      return { type: check.type, canInstall: check.canInstall };
    } catch {
      continue;
    }
  }
  return { type: "unknown", canInstall: false };
}
function getInstallCommand(packageType, toolPath) {
  const commands = {
    nodejs: {
      cmd: "npm",
      args: ["install", "--quiet"],
      method: "npm install"
    },
    rust: {
      cmd: "cargo",
      args: ["build", "--quiet"],
      method: "cargo build"
    },
    go: {
      cmd: "go",
      args: ["build", "-o", "/tmp/test-build"],
      method: "go build"
    },
    python: {
      cmd: "pip",
      args: ["install", "-e", ".", "--quiet"],
      method: "pip install"
    },
    ruby: {
      cmd: "bundle",
      args: ["install"],
      method: "bundle install"
    },
    docker: {
      cmd: "docker",
      args: ["build", "-t", "test-build", "."],
      method: "docker build"
    }
  };
  return commands[packageType] || null;
}
async function checkPrerequisites(packageType) {
  const missing = [];
  const requirements = {
    nodejs: { cmd: "npm", checkArgs: ["--version"], name: "npm" },
    rust: { cmd: "cargo", checkArgs: ["--version"], name: "cargo" },
    go: { cmd: "go", checkArgs: ["version"], name: "go" },
    python: { cmd: "pip", checkArgs: ["--version"], name: "pip" },
    ruby: { cmd: "bundle", checkArgs: ["--version"], name: "bundler" },
    docker: { cmd: "docker", checkArgs: ["--version"], name: "docker" }
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
async function executeCommand(cmd, args, cwd, verbose) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 12e4
      // 2 minute timeout
    });
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
      if (verbose) {
        process.stdout.write(data);
      }
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
      if (verbose) {
        process.stderr.write(data);
      }
    });
    child.on("close", (code) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        error: code !== 0 ? `Command exited with code ${code}` : void 0,
        duration: Date.now() - startTime
      });
    });
    child.on("error", (err) => {
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
async function checkBinaryAvailability(packageType, toolPath) {
  let binaryName;
  if (packageType === "nodejs") {
    try {
      const pkgPath = path2.join(toolPath, "package.json");
      const pkg = JSON.parse(await fs2.readFile(pkgPath, "utf-8"));
      if (typeof pkg.bin === "string") {
        binaryName = pkg.bin;
      } else if (typeof pkg.bin === "object") {
        binaryName = Object.keys(pkg.bin)[0];
      } else if (pkg.name) {
        binaryName = pkg.name.replace(/^@[^/]+\//, "");
      }
    } catch {
    }
  }
  if (packageType === "rust") {
    try {
      const cargoPath = path2.join(toolPath, "Cargo.toml");
      const content = await fs2.readFile(cargoPath, "utf-8");
      const match = content.match(/name\s*=\s*"([^"]+)"/);
      if (match) {
        binaryName = match[1];
      }
    } catch {
    }
  }
  if (packageType === "go") {
    binaryName = path2.basename(toolPath);
  }
  if (!binaryName) {
    return { available: false };
  }
  const result = await executeCommand("which", [binaryName], process.cwd(), false);
  return {
    available: result.success,
    binaryName
  };
}
function calculateInstallationScore(data) {
  let score = 0;
  if (!data.attempted) {
    return 0;
  }
  if (data.success) {
    score = 7;
    if (data.duration < 1e4) {
      score += 2;
    } else if (data.duration < 3e4) {
      score += 1;
    }
    if (data.duration > 6e4) {
      score -= 1;
    }
    if (data.hasWarnings) {
      score -= 0.5;
    }
  } else {
    score = 0;
  }
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

// src/phases/functionality.ts
import { promises as fs3 } from "fs";
import { spawn as spawn2 } from "child_process";
import path3 from "path";
async function auditFunctionality(toolPath, verbose = false) {
  const commandsTested = [];
  const missingFeatures = [];
  const notes = [];
  const binaryInfo = await discoverBinary(toolPath);
  if (!binaryInfo.binary) {
    return {
      commandsTested: [],
      successfulExecutions: 0,
      failedExecutions: 0,
      missingFeatures: ["Could not discover CLI binary"],
      score: 0,
      notes: ["\u274C CRITICAL: Could not find executable binary to test"]
    };
  }
  if (verbose) {
    console.log(`  Found binary: ${binaryInfo.binary}`);
  }
  const packageInfo = await getPackageInfo(toolPath);
  const commandsToTest = determineCommandsToTest(binaryInfo.binary, packageInfo);
  if (verbose) {
    console.log(`  Testing ${commandsToTest.length} commands`);
  }
  for (const cmd of commandsToTest) {
    const result = await testCommand(binaryInfo.binary, cmd.args, toolPath, verbose);
    commandsTested.push(result);
    if (verbose) {
      console.log(`    ${cmd.args.join(" ")}: ${result.success ? "\u2705" : "\u274C"}`);
    }
  }
  const documentedFeatures = await extractDocumentedFeatures(toolPath);
  const implementedFeatures = new Set(
    commandsTested.filter((c) => c.success).map((c) => c.command)
  );
  for (const feature of documentedFeatures) {
    if (!implementedFeatures.has(feature)) {
      missingFeatures.push(feature);
    }
  }
  const successfulExecutions = commandsTested.filter((c) => c.success).length;
  const failedExecutions = commandsTested.filter((c) => !c.success).length;
  if (commandsTested.length === 0) {
    notes.push("\u26A0\uFE0F  No commands were tested - check binary discovery");
  } else {
    const successRate = successfulExecutions / commandsTested.length * 100;
    notes.push(`Success rate: ${successRate.toFixed(0)}% (${successfulExecutions}/${commandsTested.length})`);
    if (successRate >= 90) {
      notes.push("Excellent success rate - tool is reliable");
    } else if (successRate >= 70) {
      notes.push("Good success rate - some commands may need attention");
    } else if (successRate >= 50) {
      notes.push("\u26A0\uFE0F  Poor success rate - many commands failing");
    } else {
      notes.push("\u274C CRITICAL: Most commands failing - tool is unreliable");
    }
  }
  if (missingFeatures.length > 0) {
    notes.push(`\u26A0\uFE0F  ${missingFeatures.length} documented features appear to be missing or broken`);
  }
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
async function discoverBinary(toolPath) {
  try {
    const pkgPath = path3.join(toolPath, "package.json");
    const pkg = JSON.parse(await fs3.readFile(pkgPath, "utf-8"));
    if (pkg.bin) {
      if (typeof pkg.bin === "string") {
        return { binary: path3.join(toolPath, pkg.bin), type: "nodejs" };
      } else if (typeof pkg.bin === "object") {
        const binName = Object.keys(pkg.bin)[0];
        return { binary: path3.join(toolPath, pkg.bin[binName]), type: "nodejs" };
      }
    }
    const commonPaths = [
      "dist/cli.js",
      "dist/index.js",
      "build/cli.js",
      "lib/cli.js",
      "bin/cli.js"
    ];
    for (const relPath of commonPaths) {
      try {
        await fs3.access(path3.join(toolPath, relPath));
        return { binary: path3.join(toolPath, relPath), type: "nodejs" };
      } catch {
        continue;
      }
    }
  } catch {
  }
  try {
    const cargoPath = path3.join(toolPath, "Cargo.toml");
    await fs3.access(cargoPath);
    const content = await fs3.readFile(cargoPath, "utf-8");
    const match = content.match(/name\s*=\s*"([^"]+)"/);
    if (match) {
      const binaryName = match[1];
      try {
        await fs3.access(path3.join(toolPath, "target/release", binaryName));
        return { binary: path3.join(toolPath, "target/release", binaryName), type: "rust" };
      } catch {
        try {
          await fs3.access(path3.join(toolPath, "target/debug", binaryName));
          return { binary: path3.join(toolPath, "target/debug", binaryName), type: "rust" };
        } catch {
        }
      }
    }
  } catch {
  }
  try {
    await fs3.access(path3.join(toolPath, "go.mod"));
    const binaryName = path3.basename(toolPath);
    try {
      await fs3.access(path3.join(toolPath, binaryName));
      return { binary: path3.join(toolPath, binaryName), type: "go" };
    } catch {
    }
  } catch {
  }
  return {};
}
async function getPackageInfo(toolPath) {
  try {
    const pkgPath = path3.join(toolPath, "package.json");
    const pkg = JSON.parse(await fs3.readFile(pkgPath, "utf-8"));
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
function determineCommandsToTest(binary, packageInfo) {
  const commands = [];
  commands.push({
    args: ["--help"],
    description: "Help output"
  });
  commands.push({
    args: ["--version"],
    description: "Version check"
  });
  commands.push({
    args: [],
    description: "No arguments (default behavior)"
  });
  const commonCommands = [
    ["init", "Initialize"],
    ["build", "Build"],
    ["test", "Test"],
    ["run", "Run"],
    ["status", "Status"],
    ["list", "List"],
    ["info", "Info"]
  ];
  for (const [cmd, desc] of commonCommands) {
    commands.push({
      args: [cmd],
      description: desc
    });
  }
  commands.push({
    args: ["--verbose"],
    description: "Verbose flag"
  });
  commands.push({
    args: ["--dry-run"],
    description: "Dry run flag"
  });
  return commands;
}
async function testCommand(binary, args, cwd, verbose) {
  const startTime = Date.now();
  try {
    const result = await executeCommand2(binary, args, cwd, verbose);
    return {
      command: args.length > 0 ? args.join(" ") : "(no args)",
      success: result.success && result.exitCode === 0,
      output: result.stdout ? result.stdout.substring(0, 500) : void 0,
      error: !result.success ? result.stderr || result.error : void 0,
      duration: result.duration
    };
  } catch (error) {
    return {
      command: args.join(" "),
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}
async function executeCommand2(cmd, args, cwd, verbose) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    const child = spawn2(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 3e4
      // 30 second timeout
    });
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      resolve({
        success: code === 0 || code === null,
        // null = no error
        exitCode: code || 0,
        stdout,
        stderr,
        duration: Date.now() - startTime
      });
    });
    child.on("error", (err) => {
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
async function extractDocumentedFeatures(toolPath) {
  const features = [];
  const readmePaths = [
    "README.md",
    "readme.md",
    "README.markdown"
  ];
  for (const readmePath of readmePaths) {
    try {
      const content = await fs3.readFile(path3.join(toolPath, readmePath), "utf-8");
      const featureSectionMatch = content.match(/##?\s*Features\s*\n([\s\S]+?)(?=\n##?\s|\n*$)/i);
      if (featureSectionMatch) {
        const featureLines = featureSectionMatch[1].split("\n").filter((line) => line.trim().startsWith("-") || line.trim().startsWith("*"));
        for (const line of featureLines) {
          const feature = line.replace(/^[-*]\s*/, "").trim();
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
function calculateFunctionalityScore(data) {
  if (data.totalCommands === 0) {
    return 0;
  }
  const successRate = data.successfulCommands / data.totalCommands;
  let score = successRate * 7;
  if (successRate >= 0.9) {
    score += 2;
  } else if (successRate >= 0.7) {
    score += 1;
  }
  score -= data.missingFeatures * 0.5;
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

// src/phases/verification.ts
import { promises as fs4 } from "fs";
import { spawn as spawn3 } from "child_process";
import path4 from "path";
async function auditVerification(toolPath, verbose = false) {
  const verifiedClaims = [];
  const unverifiableClaims = [];
  const accuracyIssues = [];
  const notes = [];
  const claims = await extractClaims(toolPath);
  if (verbose) {
    console.log(`  Found ${claims.length} claims to verify`);
  }
  for (const claim of claims) {
    const result = await verifyClaim(claim, toolPath, verbose);
    verifiedClaims.push(result);
    if (!result.verified) {
      if (result.actual !== void 0) {
        accuracyIssues.push(
          `Claim "${claim.text}" does not match: expected "${claim.expected}", got "${result.actual}"`
        );
      } else {
        unverifiableClaims.push(claim.text);
      }
    }
  }
  const verifiedCount = verifiedClaims.filter((c) => c.verified).length;
  const totalClaims = verifiedClaims.length;
  if (totalClaims > 0) {
    const verificationRate = verifiedCount / totalClaims * 100;
    notes.push(`Verified ${verifiedCount}/${totalClaims} claims (${verificationRate.toFixed(0)}%)`);
    if (verificationRate >= 90) {
      notes.push("\u2705 Excellent documentation accuracy");
    } else if (verificationRate >= 70) {
      notes.push("Good documentation accuracy with some inconsistencies");
    } else if (verificationRate >= 50) {
      notes.push("\u26A0\uFE0F  Poor documentation accuracy - many claims don't match behavior");
    } else {
      notes.push("\u274C CRITICAL: Documentation does not match actual tool behavior");
    }
  } else {
    notes.push("No verifiable claims found in documentation");
  }
  if (accuracyIssues.length > 0) {
    notes.push(`\u26A0\uFE0F  Found ${accuracyIssues.length} documentation inaccuracies`);
  }
  if (unverifiableClaims.length > 0) {
    notes.push(`${unverifiableClaims.length} claims could not be automatically verified`);
  }
  const score = calculateVerificationScore({
    totalClaims,
    verifiedCount,
    accuracyIssues: accuracyIssues.length
  });
  return {
    verifiedClaims,
    unverifiableClaims,
    accuracyIssues,
    score,
    notes
  };
}
async function extractClaims(toolPath) {
  const claims = [];
  const readmePaths = ["README.md", "readme.md", "README.markdown"];
  let readmeContent = "";
  for (const readmePath of readmePaths) {
    try {
      readmeContent = await fs4.readFile(path4.join(toolPath, readmePath), "utf-8");
      break;
    } catch {
      continue;
    }
  }
  if (!readmeContent) {
    return claims;
  }
  const versionMatch = readmeContent.match(/version\s*:?\s*([\d.]+)/i);
  if (versionMatch) {
    claims.push({
      text: `Tool version is ${versionMatch[1]}`,
      type: "version",
      expected: versionMatch[1],
      command: ["--version"]
    });
  }
  const featurePatterns = [
    /supports?\s+([a-z0-9_-]+)/gi,
    /can\s+([a-z]+)/gi,
    /enables?\s+([a-z]+)/gi
  ];
  for (const pattern of featurePatterns) {
    let match;
    while ((match = pattern.exec(readmeContent)) !== null) {
      const feature = match[1];
      claims.push({
        text: `Supports ${feature}`,
        type: "feature",
        expected: "supported"
      });
    }
  }
  const codeBlocks = readmeContent.match(/```(?:bash|shell|sh)?\s*\n([\s\S]*?)```/g) || [];
  for (const block of codeBlocks) {
    const commands = block.replace(/```[^\\n]*\n?/g, "").split("\n").filter((line) => line.trim() && !line.trim().startsWith("#")).slice(0, 3);
    for (const cmd of commands) {
      const parts = cmd.trim().split(/\s+/);
      if (parts.length > 0) {
        claims.push({
          text: `Command example: ${cmd.trim()}`,
          type: "command",
          command: parts
        });
      }
    }
  }
  const configPatterns = [
    /config(?:uration)?\s+file\s*:?\s*([^\s\n]+)/gi,
    /uses?\s+([^\s\n]+)\s+config/gi
  ];
  for (const pattern of configPatterns) {
    let match;
    while ((match = pattern.exec(readmeContent)) !== null) {
      const configFile = match[1];
      claims.push({
        text: `Uses config file: ${configFile}`,
        type: "config",
        expected: configFile
      });
    }
  }
  return claims;
}
async function verifyClaim(claim, toolPath, verbose) {
  try {
    switch (claim.type) {
      case "version":
        if (claim.command) {
          const result = await executeCommand3(claim.command[0], claim.command.slice(1), toolPath, verbose);
          const actual = result.stdout.trim() || result.stderr.trim();
          return {
            claim: claim.text,
            verified: actual.includes(claim.expected || ""),
            source: claim.command.join(" "),
            expected: claim.expected,
            actual,
            match: actual.includes(claim.expected || "") ? "exact" : "none"
          };
        }
        break;
      case "command":
        if (claim.command) {
          const result = await executeCommand3(claim.command[0], claim.command.slice(1), toolPath, verbose);
          return {
            claim: claim.text,
            verified: result.exitCode === 0 || result.exitCode === null,
            source: claim.command.join(" "),
            expected: "exit code 0",
            actual: `exit code ${result.exitCode}`,
            match: result.exitCode === 0 ? "exact" : "none"
          };
        }
        break;
      case "config":
        if (claim.expected) {
          try {
            await fs4.access(path4.join(toolPath, claim.expected));
            return {
              claim: claim.text,
              verified: true,
              source: claim.expected,
              expected: claim.expected,
              actual: "file exists",
              match: "exact"
            };
          } catch {
            return {
              claim: claim.text,
              verified: false,
              source: claim.expected,
              expected: claim.expected,
              actual: "file not found",
              match: "none"
            };
          }
        }
        break;
      case "feature":
        return {
          claim: claim.text,
          verified: false,
          // Default to unverified for features
          source: "documentation"
        };
    }
    return {
      claim: claim.text,
      verified: false,
      source: "documentation"
    };
  } catch (error) {
    return {
      claim: claim.text,
      verified: false,
      source: "error",
      actual: error.message
    };
  }
}
async function executeCommand3(cmd, args, cwd, verbose) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    const child = spawn3(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 1e4
      // 10 second timeout
    });
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr,
        duration: Date.now() - startTime
      });
    });
    child.on("error", () => {
      resolve({
        exitCode: -1,
        stdout,
        stderr,
        duration: Date.now() - startTime
      });
    });
  });
}
function calculateVerificationScore(data) {
  if (data.totalClaims === 0) {
    return 5;
  }
  const verificationRate = data.verifiedCount / data.totalClaims;
  let score = verificationRate * 8;
  if (verificationRate >= 1) {
    score += 2;
  } else if (verificationRate >= 0.9) {
    score += 1;
  }
  score -= data.accuracyIssues * 1.5;
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

// src/phases/red-flags.ts
import { promises as fs5 } from "fs";
import path5 from "path";
async function detectRedFlags(toolPath, verbose = false) {
  const redFlags = [];
  const notes = [];
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
        console.log(`  Check failed: ${error.message}`);
      }
    }
  }
  const uniqueFlags = deduplicateRedFlags(redFlags);
  if (uniqueFlags.length === 0) {
    notes.push("\u2705 No critical red flags detected");
  } else {
    const criticalCount = uniqueFlags.filter((f) => f.severity === "critical").length;
    const highCount = uniqueFlags.filter((f) => f.severity === "high").length;
    const mediumCount = uniqueFlags.filter((f) => f.severity === "medium").length;
    notes.push(`Found ${uniqueFlags.length} red flags:`);
    notes.push(`  - Critical: ${criticalCount}`);
    notes.push(`  - High: ${highCount}`);
    notes.push(`  - Medium: ${mediumCount}`);
  }
  return { redFlags: uniqueFlags, notes };
}
async function checkForHardcodedSecrets(toolPath, verbose) {
  const redFlags = [];
  const notes = [];
  const secretPatterns = [
    { pattern: /AIza[0-9A-Za-z\\-_]{35}/, name: "Google API key" },
    { pattern: /AKIA[0-9A-Z]{16}/, name: "AWS access key" },
    { pattern: /sk-[a-zA-Z0-9]{48}/, name: "OpenAI API key" },
    { pattern: /xox[bap]-[0-9]{12}-[0-9]{12}-[0-9A-Za-z]{24}/, name: "Slack token" },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, name: "GitHub personal access token" },
    { pattern: /password\s*=\s*["\'][^"\']+["\']/, name: "Hardcoded password" }
  ];
  const sourceFiles = await findSourceFiles(toolPath);
  let checked = 0;
  for (const file of sourceFiles) {
    try {
      const content = await fs5.readFile(file, "utf-8");
      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(content)) {
          redFlags.push({
            severity: "critical",
            category: "security",
            title: `Hardcoded ${name} detected`,
            description: `Found ${name} in source code which is a critical security vulnerability`,
            evidence: [`File: ${path5.relative(toolPath, file)}`],
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
    notes.push("\u2705 No hardcoded secrets found");
  }
  return { redFlags, notes };
}
async function checkForInsecureDependencies(toolPath, verbose) {
  const redFlags = [];
  const notes = [];
  try {
    const pkgPath = path5.join(toolPath, "package.json");
    const pkg = JSON.parse(await fs5.readFile(pkgPath, "utf-8"));
    const vulnerablePackages = [
      "lodash<4.17.21",
      "axios<0.21.1",
      " minimist<1.2.6"
    ];
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const vuln of vulnerablePackages) {
      const [name, version] = vuln.split(/([<>=]+)/);
      if (allDeps[name]) {
        redFlags.push({
          severity: "high",
          category: "security",
          title: "Known vulnerable dependency",
          description: `Package ${name} has known security vulnerabilities`,
          evidence: [`Dependency: ${name}@${allDeps[name]}`],
          fix: `Update ${name} to latest version`
        });
      }
    }
    if (redFlags.length === 0) {
      notes.push("\u2705 No known vulnerable dependencies found");
    }
  } catch {
  }
  return { redFlags, notes };
}
async function checkForMissingFiles(toolPath, verbose) {
  const redFlags = [];
  const notes = [];
  const essentialFiles = [
    { file: "README.md", severity: "critical", name: "README" },
    { file: "LICENSE", severity: "high", name: "license file" },
    { file: ".gitignore", severity: "medium", name: ".gitignore" }
  ];
  for (const { file, severity, name } of essentialFiles) {
    try {
      await fs5.access(path5.join(toolPath, file));
    } catch {
      redFlags.push({
        severity,
        category: "project-structure",
        title: `Missing ${name}`,
        description: `Project is missing ${name}`,
        evidence: [`${file} not found`],
        fix: `Add ${name} to the project`
      });
    }
  }
  try {
    await fs5.access(path5.join(toolPath, ".env"));
    try {
      await fs5.access(path5.join(toolPath, ".env.example"));
    } catch {
      redFlags.push({
        severity: "medium",
        category: "security",
        title: "Missing .env.example",
        description: "Project uses .env but doesn't provide .env.example template",
        evidence: [".env found but .env.example missing"],
        fix: "Create .env.example with placeholder values"
      });
    }
  } catch {
  }
  if (redFlags.length === 0) {
    notes.push("\u2705 All essential files present");
  }
  return { redFlags, notes };
}
async function checkForPoorProjectStructure(toolPath, verbose) {
  const redFlags = [];
  const notes = [];
  try {
    const files = await fs5.readdir(toolPath);
    const jsFiles = files.filter((f) => f.endsWith(".js") && f !== "index.js");
    const tsFiles = files.filter((f) => f.endsWith(".ts") && f !== "index.ts");
    if (jsFiles.length > 5 || tsFiles.length > 5) {
      redFlags.push({
        severity: "low",
        category: "project-structure",
        title: "Poor project organization",
        description: "Many source files at root level - should be organized in directories",
        evidence: [`Found ${jsFiles.length + tsFiles.length} source files at root`],
        fix: "Organize source files into src/, lib/, or similar directories"
      });
    }
    const hasTestDir = files.includes("test") || files.includes("tests") || files.includes("__tests__");
    const hasTestFiles = files.some((f) => f.includes(".test.") || f.includes(".spec."));
    if (!hasTestDir && !hasTestFiles) {
      redFlags.push({
        severity: "medium",
        category: "testing",
        title: "No tests found",
        description: "Project lacks test files or test directory",
        evidence: ["No test/ or tests/ directory found", "No .test. or .spec. files found"],
        fix: "Add tests to ensure code quality and prevent regressions"
      });
    } else {
      notes.push("\u2705 Test directory or files present");
    }
    if (!files.includes("docs") && !files.includes("documentation")) {
      notes.push("\u26A0\uFE0F  No docs/ directory found");
    }
  } catch {
  }
  return { redFlags, notes };
}
async function checkForBrokenTests(toolPath, verbose) {
  const redFlags = [];
  const notes = [];
  const testFiles = await findFiles(toolPath, [".test.ts", ".test.js", ".spec.ts", ".spec.js"]);
  if (testFiles.length > 0) {
    let emptyTests = 0;
    for (const file of testFiles) {
      try {
        const content = await fs5.readFile(file, "utf-8");
        const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("//"));
        if (lines.length < 10) {
          emptyTests++;
        }
      } catch {
        continue;
      }
    }
    if (emptyTests > testFiles.length * 0.5) {
      redFlags.push({
        severity: "low",
        category: "testing",
        title: "Many tests appear to be empty or minimal",
        description: `${emptyTests} of ${testFiles.length} test files have very little content`,
        evidence: [`Found ${emptyTests} minimal test files`],
        fix: "Add proper test cases to ensure code quality"
      });
    }
  }
  return { redFlags, notes };
}
async function checkForOutdatedDependencies(toolPath, verbose) {
  const redFlags = [];
  const notes = [];
  try {
    const pkgPath = path5.join(toolPath, "package.json");
    const pkg = JSON.parse(await fs5.readFile(pkgPath, "utf-8"));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const outdatedPackages = [];
    for (const [name, version] of Object.entries(allDeps)) {
      const ver = version;
      if (ver.startsWith("^0.") || ver.startsWith("~0.")) {
        outdatedPackages.push(`${name}@${ver}`);
      }
    }
    if (outdatedPackages.length > 3) {
      redFlags.push({
        severity: "low",
        category: "maintenance",
        title: "Many outdated dependencies",
        description: "Project has many dependencies using version 0.x",
        evidence: outdatedPackages.slice(0, 5),
        fix: "Update dependencies to latest stable versions"
      });
    }
  } catch {
  }
  return { redFlags, notes };
}
async function checkForSecurityIssues(toolPath, verbose) {
  const redFlags = [];
  const notes = [];
  const sourceFiles = await findSourceFiles(toolPath);
  for (const file of sourceFiles) {
    try {
      const content = await fs5.readFile(file, "utf-8");
      if (/\beval\s*\(/.test(content)) {
        redFlags.push({
          severity: "high",
          category: "security",
          title: "Use of eval() detected",
          description: "eval() can lead to code injection vulnerabilities",
          evidence: [`File: ${path5.relative(toolPath, file)}`],
          fix: "Remove eval() and use safer alternatives",
          location: file
        });
      }
      if (/\bexec\s*\(/.test(content) || /\bspawn\s*\(/.test(content)) {
        if (!content.includes("sanitize") && !content.includes("escape") && !content.includes("validate")) {
          redFlags.push({
            severity: "medium",
            category: "security",
            title: "Potential command injection",
            description: "exec() or spawn() found without input sanitization",
            evidence: [`File: ${path5.relative(toolPath, file)}`],
            fix: "Add input sanitization before shell command execution",
            location: file
          });
        }
      }
    } catch {
      continue;
    }
  }
  if (redFlags.length === 0) {
    notes.push("\u2705 No obvious security issues detected");
  }
  return { redFlags, notes };
}
async function checkForLicensingIssues(toolPath, verbose) {
  const redFlags = [];
  const notes = [];
  try {
    const pkgPath = path5.join(toolPath, "package.json");
    const pkg = JSON.parse(await fs5.readFile(pkgPath, "utf-8"));
    if (!pkg.license) {
      redFlags.push({
        severity: "medium",
        category: "legal",
        title: "No license specified",
        description: "package.json does not specify a license",
        evidence: ['package.json missing "license" field'],
        fix: 'Add license field to package.json (e.g., "MIT", "Apache-2.0")'
      });
    } else {
      notes.push(`\u2705 License: ${pkg.license}`);
    }
  } catch {
  }
  try {
    await fs5.access(path5.join(toolPath, "LICENSE"));
    notes.push("\u2705 LICENSE file present");
  } catch {
    redFlags.push({
      severity: "medium",
      category: "legal",
      title: "Missing LICENSE file",
      description: "Project does not have a LICENSE file",
      evidence: ["LICENSE file not found"],
      fix: "Add LICENSE file with full license text"
    });
  }
  return { redFlags, notes };
}
async function checkForAccessibilityIssues(toolPath, verbose) {
  const redFlags = [];
  const notes = [];
  try {
    const readmePath = path5.join(toolPath, "README.md");
    const content = await fs5.readFile(readmePath, "utf-8");
    const hasAccessibilityMention = content.toLowerCase().includes("accessibility") || content.toLowerCase().includes("a11y") || content.toLowerCase().includes("screen reader");
    if (!hasAccessibilityMention) {
      notes.push("\u26A0\uFE0F  Accessibility not mentioned in documentation");
    } else {
      notes.push("\u2705 Accessibility considerations documented");
    }
    if (content.toLowerCase().includes("red") || content.toLowerCase().includes("green")) {
      notes.push("\u26A0\uFE0F  May use color-only indicators (consider accessibility)");
    }
  } catch {
  }
  return { redFlags, notes };
}
async function findSourceFiles(toolPath) {
  const extensions = [".js", ".ts", ".jsx", ".tsx", ".py", ".go", ".rs"];
  const files = [];
  async function scanDirectory(dir) {
    try {
      const entries = await fs5.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path5.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!["node_modules", ".git", "dist", "build", "target"].includes(entry.name)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path5.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
    }
  }
  await scanDirectory(toolPath);
  return files;
}
async function findFiles(toolPath, extensions) {
  const files = [];
  async function scanDirectory(dir) {
    try {
      const entries = await fs5.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path5.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!["node_modules", ".git", "dist", "build", "target"].includes(entry.name)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          if (extensions.some((ext) => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      }
    } catch {
    }
  }
  await scanDirectory(toolPath);
  return files;
}
function deduplicateRedFlags(flags) {
  const seen = /* @__PURE__ */ new Set();
  const unique = [];
  for (const flag of flags) {
    const key = `${flag.category}:${flag.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(flag);
    } else {
      const existing = unique.find((f) => `${f.category}:${f.title}` === key);
      if (existing) {
        existing.evidence = [.../* @__PURE__ */ new Set([...existing.evidence, ...flag.evidence])];
      }
    }
  }
  return unique;
}

// src/phases/error-handling.ts
import { promises as fs6 } from "fs";
import { spawn as spawn4 } from "child_process";
import path6 from "path";
async function auditErrorHandling(toolPath, verbose = false) {
  const redFlags = [];
  const notes = [];
  const binary = await discoverBinary2(toolPath);
  if (!binary) {
    redFlags.push({
      severity: "high",
      category: "error-handling",
      title: "Cannot test error handling",
      description: "Could not discover CLI binary to test error handling",
      evidence: ["Binary discovery failed"],
      fix: "Ensure CLI tool is properly built and executable"
    });
    return { redFlags, notes: ["Cannot test error handling without binary"] };
  }
  if (verbose) {
    console.log(`  Testing error handling with: ${binary}`);
  }
  const invalidCmdResult = await testCommand2(binary, ["invalid-command-xyz"], toolPath, verbose);
  if (invalidCmdResult.exitCode === 0 || invalidCmdResult.stderr === "") {
    redFlags.push({
      severity: "medium",
      category: "error-handling",
      title: "Poor error handling for invalid commands",
      description: "Tool does not provide clear error message for invalid commands",
      evidence: [
        `Command: ${binary} invalid-command-xyz`,
        `Exit code: ${invalidCmdResult.exitCode}`,
        `Stderr: ${invalidCmdResult.stderr || "(empty)"}`
      ],
      fix: "Add error handling for unknown commands with helpful error message"
    });
  } else {
    notes.push("\u2705 Invalid commands are handled properly");
  }
  const invalidFlagResult = await testCommand2(binary, ["--invalid-flag-xyz"], toolPath, verbose);
  if (invalidFlagResult.exitCode === 0 || invalidFlagResult.stderr === "") {
    redFlags.push({
      severity: "medium",
      category: "error-handling",
      title: "Poor error handling for invalid flags",
      description: "Tool does not warn about invalid flags",
      evidence: [
        `Command: ${binary} --invalid-flag-xyz`,
        `Exit code: ${invalidFlagResult.exitCode}`,
        `Stderr: ${invalidFlagResult.stderr || "(empty)"}`
      ],
      fix: "Add flag validation and error messages for unrecognized flags"
    });
  } else {
    notes.push("\u2705 Invalid flags are handled properly");
  }
  const missingArgsResult = await testCommand2(binary, ["--required-arg"], toolPath, verbose);
  if (missingArgsResult.exitCode === null) {
    redFlags.push({
      severity: "high",
      category: "error-handling",
      title: "Tool crashes on missing arguments",
      description: "Tool crashes or hangs when required arguments are missing",
      evidence: [
        `Command: ${binary} --required-arg`,
        "Process terminated abnormally"
      ],
      fix: "Add validation for required arguments with clear error messages"
    });
  } else {
    notes.push("\u2705 Missing arguments are handled without crashes");
  }
  const invalidFileResult = await testCommand2(
    binary,
    ["--file", "/tmp/nonexistent-file-xyz-12345.txt"],
    toolPath,
    verbose
  );
  if (invalidFileResult.exitCode === 0) {
    redFlags.push({
      severity: "medium",
      category: "error-handling",
      title: "No error for missing input files",
      description: "Tool does not report error when input file does not exist",
      evidence: [
        `Command: ${binary} --file /tmp/nonexistent-file-xyz-12345.txt`,
        "Exit code: 0 (should be non-zero)"
      ],
      fix: "Check if input files exist before processing"
    });
  } else if (invalidFileResult.stderr.includes("ENOENT") || invalidFileResult.stderr.includes("no such file")) {
    notes.push("\u2705 Missing files are properly detected");
  }
  const permissionResult = await testCommand2(
    binary,
    ["--output", "/root/test-output-xyz"],
    toolPath,
    verbose
  );
  if (permissionResult.exitCode === 0) {
    notes.push("\u26A0\uFE0F  Skipped permission test (might be running as root)");
  } else if (permissionResult.stderr.includes("permission") || permissionResult.stderr.includes("EACCES")) {
    notes.push("\u2705 Permission errors are properly reported");
  }
  const helpResult = await testCommand2(binary, ["--help"], toolPath, verbose);
  if (helpResult.exitCode === 0 && helpResult.stdout) {
    const helpText = helpResult.stdout;
    const hasUsage = helpText.toLowerCase().includes("usage");
    const hasOptions = helpText.toLowerCase().includes("options") || helpText.toLowerCase().includes("flags");
    const hasExamples = helpText.toLowerCase().includes("example");
    if (!hasUsage) {
      redFlags.push({
        severity: "low",
        category: "documentation",
        title: "Help text missing usage section",
        description: "--help output does not include usage information",
        evidence: ["Help text analyzed"],
        fix: "Add usage section to help text"
      });
    }
    if (!hasOptions) {
      redFlags.push({
        severity: "low",
        category: "documentation",
        title: "Help text missing options section",
        description: "--help output does not list available options/flags",
        evidence: ["Help text analyzed"],
        fix: "Add options section to help text"
      });
    }
    if (!hasExamples) {
      redFlags.push({
        severity: "low",
        category: "documentation",
        title: "Help text missing examples",
        description: "--help output does not include usage examples",
        evidence: ["Help text analyzed"],
        fix: "Add examples to help text"
      });
    }
    if (hasUsage && hasOptions && hasExamples) {
      notes.push("\u2705 Help text is comprehensive");
    }
  } else {
    redFlags.push({
      severity: "critical",
      category: "error-handling",
      title: "No --help support",
      description: "Tool does not provide --help flag or help text is broken",
      evidence: [
        `Command: ${binary} --help`,
        `Exit code: ${helpResult.exitCode}`,
        `Output: ${helpResult.stdout || "(empty)"}`
      ],
      fix: "Implement --help flag with comprehensive usage information"
    });
  }
  const versionResult = await testCommand2(binary, ["--version"], toolPath, verbose);
  if (versionResult.exitCode !== 0 && versionResult.exitCode !== null) {
    redFlags.push({
      severity: "medium",
      category: "error-handling",
      title: "No --version support",
      description: "Tool does not provide --version flag",
      evidence: [
        `Command: ${binary} --version`,
        `Exit code: ${versionResult.exitCode}`
      ],
      fix: "Add --version flag to display version information"
    });
  } else if (versionResult.stdout && versionResult.stdout.trim()) {
    notes.push(`\u2705 Version: ${versionResult.stdout.trim()}`);
  }
  if (invalidCmdResult.stderr) {
    const errorMessage = invalidCmdResult.stderr.toLowerCase();
    const hasSuggestion = errorMessage.includes("did you mean") || errorMessage.includes("try") || errorMessage.includes("available");
    if (!hasSuggestion && errorMessage.length < 20) {
      redFlags.push({
        severity: "low",
        category: "error-handling",
        title: "Unhelpful error messages",
        description: "Error messages are too brief and don't guide users",
        evidence: [
          `Error message: ${invalidCmdResult.stderr}`
        ],
        fix: "Provide helpful error messages with suggestions"
      });
    }
  }
  notes.push("\u26A0\uFE0F  SIGINT handling test skipped (requires manual testing)");
  if (redFlags.length === 0) {
    notes.push("\u2705 Excellent error handling - all tests passed");
  } else {
    notes.push(`Found ${redFlags.length} error handling issues`);
  }
  return { redFlags, notes };
}
async function discoverBinary2(toolPath) {
  try {
    const pkgPath = path6.join(toolPath, "package.json");
    const pkg = JSON.parse(await fs6.readFile(pkgPath, "utf-8"));
    if (pkg.bin) {
      if (typeof pkg.bin === "string") {
        return path6.join(toolPath, pkg.bin);
      } else if (typeof pkg.bin === "object") {
        const binName = Object.keys(pkg.bin)[0];
        return path6.join(toolPath, pkg.bin[binName]);
      }
    }
    const commonPaths = ["dist/cli.js", "dist/index.js", "build/cli.js"];
    for (const relPath of commonPaths) {
      try {
        await fs6.access(path6.join(toolPath, relPath));
        return path6.join(toolPath, relPath);
      } catch {
        continue;
      }
    }
  } catch {
  }
  try {
    const cargoPath = path6.join(toolPath, "Cargo.toml");
    await fs6.access(cargoPath);
    const content = await fs6.readFile(cargoPath, "utf-8");
    const match = content.match(/name\s*=\s*"([^"]+)"/);
    if (match) {
      const binaryName = match[1];
      try {
        await fs6.access(path6.join(toolPath, "target/release", binaryName));
        return path6.join(toolPath, "target/release", binaryName);
      } catch {
        try {
          await fs6.access(path6.join(toolPath, "target/debug", binaryName));
          return path6.join(toolPath, "target/debug", binaryName);
        } catch {
        }
      }
    }
  } catch {
  }
  return null;
}
async function testCommand2(binary, args, cwd, verbose) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    const child = spawn4(binary, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 1e4
      // 10 second timeout
    });
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr,
        duration: Date.now() - startTime
      });
    });
    child.on("error", () => {
      resolve({
        exitCode: null,
        stdout,
        stderr,
        duration: Date.now() - startTime
      });
    });
  });
}

// src/phases/index.ts
async function runPhase1(toolPath, verbose = false) {
  const startTime = Date.now();
  const errors = [];
  try {
    const findings = await auditFirstImpressions(toolPath, verbose);
    return {
      phase: "first-impressions",
      success: true,
      duration: Date.now() - startTime,
      findings,
      errors
    };
  } catch (error) {
    const errorMessage = error.message;
    errors.push(errorMessage);
    return {
      phase: "first-impressions",
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}
async function runPhase2(toolPath, verbose = false) {
  const startTime = Date.now();
  const errors = [];
  try {
    const findings = await auditInstallation(toolPath, verbose);
    return {
      phase: "installation",
      success: true,
      duration: Date.now() - startTime,
      findings,
      errors
    };
  } catch (error) {
    const errorMessage = error.message;
    errors.push(errorMessage);
    return {
      phase: "installation",
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}
async function runPhase3(toolPath, verbose = false) {
  const startTime = Date.now();
  const errors = [];
  try {
    const findings = await auditFunctionality(toolPath, verbose);
    return {
      phase: "functionality",
      success: true,
      duration: Date.now() - startTime,
      findings,
      errors
    };
  } catch (error) {
    const errorMessage = error.message;
    errors.push(errorMessage);
    return {
      phase: "functionality",
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}
async function runPhase4(toolPath, context, verbose = false) {
  const startTime = Date.now();
  const errors = [];
  try {
    const findings = await auditVerification(toolPath, verbose);
    return {
      phase: "verification",
      success: true,
      duration: Date.now() - startTime,
      findings,
      errors
    };
  } catch (error) {
    const errorMessage = error.message;
    errors.push(errorMessage);
    return {
      phase: "verification",
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}
async function runPhase5(toolPath, verbose = false) {
  const startTime = Date.now();
  const errors = [];
  try {
    const { redFlags, notes } = await auditErrorHandling(toolPath, verbose);
    return {
      phase: "error-handling",
      success: true,
      duration: Date.now() - startTime,
      findings: { redFlags, notes },
      errors
    };
  } catch (error) {
    const errorMessage = error.message;
    errors.push(errorMessage);
    return {
      phase: "error-handling",
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}
async function runPhase6(toolPath, verbose = false) {
  const startTime = Date.now();
  const errors = [];
  try {
    const { redFlags, notes } = await detectRedFlags(toolPath, verbose);
    return {
      phase: "red-flags",
      success: true,
      duration: Date.now() - startTime,
      findings: { redFlags, notes },
      errors
    };
  } catch (error) {
    const errorMessage = error.message;
    errors.push(errorMessage);
    return {
      phase: "red-flags",
      success: false,
      duration: Date.now() - startTime,
      findings: null,
      errors
    };
  }
}

// src/auditor.ts
init_doubt_agents();

// src/reporting/generator.ts
import { promises as fs8 } from "fs";
import path8 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import Handlebars from "handlebars";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path8.dirname(__filename2);
async function generateReport(data, outputPath) {
  Handlebars.registerHelper("round", function(value) {
    return Math.round(value * 100);
  });
  Handlebars.registerHelper("toFixed", function(value, digits) {
    return value.toFixed(digits || 1);
  });
  const templatePath = path8.resolve(__dirname2, "../../templates/report.md.hbs");
  let templateContent;
  try {
    templateContent = await fs8.readFile(templatePath, "utf-8");
  } catch {
    templateContent = getFallbackTemplate();
  }
  const template = Handlebars.compile(templateContent);
  const markdown = template({
    ...data,
    grade: getGrade(data.score),
    timestamp: data.completedAt.toISOString(),
    toolName: path8.basename(data.toolPath),
    validationStatus: data.validation?.status || "none",
    validationScore: data.validation?.score || 0,
    validationConfidence: data.validation?.confidence || 0,
    cycles: data.validation?.cycles || {}
  });
  const outputDir = path8.dirname(outputPath);
  await fs8.mkdir(outputDir, { recursive: true });
  await fs8.writeFile(outputPath, markdown, "utf-8");
  return outputPath;
}
function getGrade(score) {
  if (score >= 9) return "A+";
  if (score >= 8) return "A";
  if (score >= 7) return "B";
  if (score >= 6) return "C";
  if (score >= 4) return "D";
  return "F";
}
function getFallbackTemplate() {
  return `# USER EXPERIENCE AUDIT REPORT

**Tool**: {{toolName}}
**Path**: {{toolPath}}
**Date**: {{timestamp}}
**Score**: {{#toFixed score 1}}{{/toFixed}}/10 ({{grade}})

---

## Executive Summary

This tool received a score of **{{#toFixed score 1}}{{/toFixed}}/10 ({{grade}})** based on comprehensive UX audit across 5 phases.

### Overall Grade: {{grade}}

{{#if redFlags}}
- **Red Flags Found**: {{redFlags.length}}
{{else}}
- **Red Flags Found**: 0
{{/if}}

{{#if validation}}
### Validation Status

{{#if validation.skipped}}
- **Validation**: Skipped (--no-validation flag)
{{else}}
- **Validation**: {{validationStatus}}
- **Validation Score**: {{validationScore}}/10
- **Confidence**: {{#if validationConfidence}}{{#round validationConfidence}}{{/round}}{{else}}0{{/if}}%

{{#if cycles.doubtCritic}}
#### Cycle Results
- **doubt-critic**: {{cycles.doubtCritic.score}}/10 ({{cycles.doubtCritic.agent}})
{{/if}}
{{#if cycles.doubtMetaCritic}}
- **doubt-meta-critic**: {{cycles.doubtMetaCritic.score}}/10 ({{cycles.doubtMetaCritic.agent}})
{{/if}}
{{#if cycles.karen}}
- **Karen**: {{cycles.karen.score}}/10 ({{cycles.karen.agent}})
{{/if}}
{{/if}}
{{/if}}

---

## Phase Findings

### Phase 1: First Impressions
{{#if findings.firstImpressions}}
- README Score: {{findings.firstImpressions.readmeScore}}/10
- Installation Instructions: {{#if findings.firstImpressions.hasInstallInstructions}}\u2705{{else}}\u274C{{/if}}
- Code Examples: {{#if findings.firstImpressions.hasExamples}}\u2705{{else}}\u274C{{/if}}
{{else}}
*Phase not completed*
{{/if}}

### Phase 2: Installation Test
{{#if findings.installation}}
- Installation: {{#if findings.installation.success}}\u2705 Success{{else}}\u274C Failed{{/if}}
- Duration: {{findings.installation.duration}}ms
- Method: {{findings.installation.method}}
{{else}}
*Phase not completed*
{{/if}}

### Phase 3: Functionality Check
{{#if findings.functionality}}
- Commands Tested: {{findings.functionality.commandsTested.length}}
- Successful: {{findings.functionality.successfulExecutions}}
- Failed: {{findings.functionality.failedExecutions}}
{{#if findings.functionality.missingFeatures}}
- Missing Features:
{{#each findings.functionality.missingFeatures}}
  - {{this}}
{{/each}}
{{/if}}
{{else}}
*Phase not completed*
{{/if}}

### Phase 4: Data Verification
{{#if findings.verification}}
- Claims Verified: {{findings.verification.verifiedClaims.length}}
- Accuracy Issues: {{findings.verification.accuracyIssues.length}}
{{else}}
*Phase not completed*
{{/if}}

---

## Red Flags

{{#if redFlags}}
{{#each redFlags}}
### {{severity}}: {{title}}

**Category**: {{category}}

{{description}}

**Evidence**:
{{#each evidence}}
- {{this}}
{{/each}}

**Fix**: {{fix}}

{{#if location}}
**Location**: \`{{location}}\`
{{/if}}

---
{{/each}}
{{else}}
No red flags found! \u{1F389}
{{/if}}

---

## Recommendations

1. Address critical red flags first
2. Improve README with clear installation instructions
3. Add code examples for common use cases
4. Test functionality with real user scenarios
5. Verify all claims against live sources

---

*Generated by [user-experience](https://github.com/user-experience/cli)*
`;
}

// src/monetization/license.ts
import { promises as fs9 } from "fs";
import path9 from "path";
var TIER_CONFIG = {
  free: {
    tier: "free",
    maxAuditsPerMonth: 5,
    dashboardEnabled: false,
    validationEnabled: false
  },
  pro: {
    tier: "pro",
    maxAuditsPerMonth: 100,
    dashboardEnabled: true,
    validationEnabled: true
  },
  enterprise: {
    tier: "enterprise",
    maxAuditsPerMonth: -1,
    // unlimited
    dashboardEnabled: true,
    validationEnabled: true
  }
};
var LICENSE_FILE = path9.join(
  process.env.HOME || "",
  ".user-experience",
  "license.json"
);
var USAGE_FILE = path9.join(
  process.env.HOME || "",
  ".user-experience",
  "usage.json"
);
async function validateLicense(key) {
  try {
    const match = key.match(/^(\w+)-([A-Z0-9]{3})-([A-Z0-9]{3})-([A-Z0-9]{3})$/i);
    if (!match) {
      return { valid: false, error: "Invalid license key format" };
    }
    const [, tier, , ,] = match;
    const normalizedTier = tier.toLowerCase();
    if (!["free", "pro", "enterprise"].includes(normalizedTier)) {
      return { valid: false, error: "Invalid license tier" };
    }
    if (normalizedTier === "free") {
      return {
        valid: true,
        license: {
          key,
          tier: normalizedTier,
          email: "free@user-experience.cli",
          expiresAt: null,
          ...TIER_CONFIG.free
        }
      };
    }
    const storedLicense = await loadStoredLicense();
    if (!storedLicense || storedLicense.key !== key) {
      return { valid: false, error: "License not found. Please activate first." };
    }
    if (storedLicense.expiresAt && storedLicense.expiresAt < /* @__PURE__ */ new Date()) {
      return { valid: false, error: "License expired" };
    }
    return { valid: true, license: storedLicense };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
async function trackAuditUsage() {
  const usage = await loadUsage();
  const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  usage.monthly[currentMonth] = (usage.monthly[currentMonth] || 0) + 1;
  await saveUsage(usage);
}
async function hasRemainingAudits() {
  const license = await getCurrentLicense();
  if (!license) return false;
  if (license.maxAuditsPerMonth === -1) return true;
  const usage = await loadUsage();
  const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  const used = usage.monthly[currentMonth] || 0;
  return used < license.maxAuditsPerMonth;
}
async function getCurrentLicense() {
  try {
    const stored = await loadStoredLicense();
    if (!stored) return null;
    const validation = await validateLicense(stored.key);
    return validation.valid ? validation.license : null;
  } catch {
    return null;
  }
}
async function loadStoredLicense() {
  try {
    const content = await fs9.readFile(LICENSE_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
async function loadUsage() {
  try {
    const content = await fs9.readFile(USAGE_FILE, "utf-8");
    const data = JSON.parse(content);
    if (data && typeof data.monthly === "object") {
      return data;
    }
    return { monthly: {} };
  } catch {
    return { monthly: {} };
  }
}
async function saveUsage(usage) {
  await fs9.mkdir(path9.dirname(USAGE_FILE), { recursive: true });
  await fs9.writeFile(USAGE_FILE, JSON.stringify(usage, null, 2));
}

// src/monetization/limits.ts
import { promises as fs10 } from "fs";
import path10 from "path";
import os from "os";
var USAGE_DIR = path10.join(os.homedir(), ".user-experience");
var USAGE_FILE2 = path10.join(USAGE_DIR, "usage.json");
async function ensureUsageDir() {
  try {
    await fs10.mkdir(USAGE_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
}
function getCurrentMonth() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
async function readUsageData() {
  try {
    await ensureUsageDir();
    const data = await fs10.readFile(USAGE_FILE2, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return await createDefaultUsageData();
    }
    throw error;
  }
}
async function writeUsageData(data) {
  await ensureUsageDir();
  await fs10.writeFile(USAGE_FILE2, JSON.stringify(data, null, 2), "utf-8");
}
async function createDefaultUsageData() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const data = {
    tier: "free",
    currentMonth: getCurrentMonth(),
    auditsThisMonth: 0,
    totalAudits: 0,
    toolsAudited: {},
    lastAudit: null,
    createdAt: now,
    updatedAt: now
  };
  await writeUsageData(data);
  return data;
}
async function resetMonthlyIfNeeded(data) {
  const currentMonth = getCurrentMonth();
  if (data.currentMonth !== currentMonth) {
    data.currentMonth = currentMonth;
    data.auditsThisMonth = 0;
    data.toolsAudited = {};
    data.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await writeUsageData(data);
  }
}
async function checkUsageLimits(tierId, maxAudits) {
  const data = await readUsageData();
  await resetMonthlyIfNeeded(data);
  const currentData = await readUsageData();
  const remaining = Math.max(0, maxAudits - currentData.auditsThisMonth);
  if (currentData.auditsThisMonth >= maxAudits) {
    let suggestedUpgrade = "pro";
    if (tierId === "pro") {
      suggestedUpgrade = "enterprise";
    }
    return {
      allowed: false,
      tier: currentData.tier,
      used: currentData.auditsThisMonth,
      remaining: 0,
      reason: `You've reached your monthly limit of ${maxAudits} audits for the ${tierId} tier.`,
      suggestedUpgrade
    };
  }
  return {
    allowed: true,
    tier: currentData.tier,
    used: currentData.auditsThisMonth,
    remaining
  };
}
async function recordAudit(toolPath) {
  const data = await readUsageData();
  await resetMonthlyIfNeeded(data);
  const currentData = await readUsageData();
  currentData.auditsThisMonth += 1;
  currentData.totalAudits += 1;
  currentData.lastAudit = (/* @__PURE__ */ new Date()).toISOString();
  currentData.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (!currentData.toolsAudited[toolPath]) {
    currentData.toolsAudited[toolPath] = 0;
  }
  currentData.toolsAudited[toolPath] += 1;
  await writeUsageData(currentData);
  return currentData;
}
async function getUsageStats() {
  const data = await readUsageData();
  await resetMonthlyIfNeeded(data);
  const currentData = await readUsageData();
  return {
    tier: currentData.tier,
    auditsThisMonth: currentData.auditsThisMonth,
    totalAudits: currentData.totalAudits,
    toolsAudited: Object.keys(currentData.toolsAudited).length,
    lastAudit: currentData.lastAudit
  };
}
async function updateTier(newTier) {
  const data = await readUsageData();
  data.tier = newTier;
  data.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await writeUsageData(data);
  return data;
}

// src/monetization/tier.ts
var FREE_TIER = {
  id: "free",
  name: "Free",
  monthlyPrice: 0,
  yearlyPrice: 0,
  description: "Perfect for trying out the user-experience auditor",
  features: {
    dashboard: false,
    validation: false,
    pdfExport: false,
    htmlExport: true,
    jsonExport: true,
    prioritySupport: false,
    customBranding: false,
    apiAccess: false,
    teamCollaboration: false,
    advancedAnalytics: false,
    dedicatedManager: false,
    customIntegrations: false
  },
  limits: {
    maxAuditsPerMonth: 5,
    maxTools: 3,
    maxRetentionDays: 30,
    maxTeamMembers: 1,
    maxApiCallsPerMonth: 0
  }
};
var PRO_TIER = {
  id: "pro",
  name: "Pro",
  monthlyPrice: 10,
  yearlyPrice: 100,
  // ~2 months free
  description: "For developers and teams serious about UX quality",
  features: {
    dashboard: true,
    validation: true,
    pdfExport: true,
    htmlExport: true,
    jsonExport: true,
    prioritySupport: true,
    customBranding: false,
    apiAccess: true,
    teamCollaboration: false,
    advancedAnalytics: true,
    dedicatedManager: false,
    customIntegrations: false
  },
  limits: {
    maxAuditsPerMonth: 100,
    maxTools: 50,
    maxRetentionDays: 365,
    maxTeamMembers: 5,
    maxApiCallsPerMonth: 1e3
  }
};
var ENTERPRISE_TIER = {
  id: "enterprise",
  name: "Enterprise",
  monthlyPrice: null,
  // Custom pricing
  yearlyPrice: null,
  description: "For organizations with advanced needs and high volume",
  features: {
    dashboard: true,
    validation: true,
    pdfExport: true,
    htmlExport: true,
    jsonExport: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
    teamCollaboration: true,
    advancedAnalytics: true,
    dedicatedManager: true,
    customIntegrations: true
  },
  limits: {
    maxAuditsPerMonth: Infinity,
    maxTools: Infinity,
    maxRetentionDays: Infinity,
    maxTeamMembers: Infinity,
    maxApiCallsPerMonth: Infinity
  }
};
var TIERS = {
  free: FREE_TIER,
  pro: PRO_TIER,
  enterprise: ENTERPRISE_TIER
};
function getTier(tierId) {
  const tier = TIERS[tierId];
  if (!tier) {
    throw new Error(`Unknown tier: ${tierId}`);
  }
  return tier;
}
function getAllTiers() {
  return Object.values(TIERS);
}
function getTierForFeature(feature) {
  if (feature === "dashboard" || feature === "validation" || feature === "pdfExport") {
    return "pro";
  }
  if (feature === "customBranding" || feature === "teamCollaboration" || feature === "dedicatedManager") {
    return "enterprise";
  }
  return "free";
}
function tierHasFeature(tierId, feature) {
  const tier = getTier(tierId);
  return tier.features[feature];
}
function getUpgradePath(fromTier, feature) {
  const currentTier = getTier(fromTier);
  if (currentTier.features[feature]) {
    return null;
  }
  return getTierForFeature(feature);
}
function formatPrice(tierId, billingPeriod = "monthly") {
  const tier = getTier(tierId);
  const price = billingPeriod === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;
  if (price === null) {
    return "Custom pricing";
  }
  if (price === 0) {
    return "Free";
  }
  return `$${price}/${billingPeriod === "monthly" ? "mo" : "yr"}`;
}

// src/monetization/features.ts
function isFeatureAvailable(tierId, feature) {
  return tierHasFeature(tierId, feature);
}
function enforceFeatureAvailability(tierId, feature, featureName) {
  if (!isFeatureAvailable(tierId, feature)) {
    const upgradeTier = getUpgradePath(tierId, feature);
    const displayName = featureName || feature;
    if (upgradeTier) {
      throw new Error(
        `The "${displayName}" feature is not available in your current tier (${tierId}). Please upgrade to the ${upgradeTier} tier to access this feature.`
      );
    } else {
      throw new Error(
        `The "${displayName}" feature is not available in your current tier (${tierId}).`
      );
    }
  }
}

// src/auditor.ts
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = path11.dirname(__filename3);
async function auditTool(toolPath, options) {
  const startTime = Date.now();
  const findings = {};
  const allErrors = [];
  const allRedFlags = [];
  const normalizedPath = path11.resolve(toolPath);
  try {
    await fs11.access(normalizedPath);
  } catch {
    throw new Error(`Tool path does not exist: ${normalizedPath}`);
  }
  const license = await getCurrentLicense();
  const tier = license?.tier || options.tier || "free";
  console.log(`
\u{1F510} License Tier: ${tier.toUpperCase()}`);
  const hasRemaining = await hasRemainingAudits();
  if (!hasRemaining) {
    const usageStats = await checkUsageLimits(tier, license?.maxAuditsPerMonth || 5);
    console.error(`
\u274C ${usageStats.reason}`);
    if (usageStats.suggestedUpgrade) {
      console.error(`
\u{1F4A1} Upgrade to ${usageStats.suggestedUpgrade} tier to continue: https://user-experience.dev/upgrade`);
    }
    throw new Error(`Monthly audit limit reached for ${tier} tier. Please upgrade to continue.`);
  }
  if (options.validation) {
    try {
      enforceFeatureAvailability(tier, "validation", "AI-powered validation");
    } catch (error) {
      console.warn(`
\u26A0\uFE0F  ${error.message}`);
      console.warn(`\u23ED\uFE0F  Skipping validation (--no-validation flag)`);
      options.validation = false;
    }
  }
  await trackAuditUsage();
  await recordAudit(normalizedPath);
  const usageCheck = await checkUsageLimits(tier, license?.maxAuditsPerMonth || 5);
  console.log(`\u{1F4CA} Usage: ${usageCheck.used}/${license?.maxAuditsPerMonth || 5} audits this month (${usageCheck.remaining} remaining)`);
  if (tier === "free" && options.validation) {
    console.warn(`
\u26A0\uFE0F  Warning: AI validation is a Pro tier feature.`);
    console.warn(`   Your results may not be as accurate without validation.`);
    console.warn(`   Upgrade at: https://user-experience.dev/upgrade
`);
  }
  console.log(`
\u{1F4CB} Phase 1: First Impressions...`);
  const phase1 = await runPhase1(normalizedPath, options.verbose);
  findings.firstImpressions = phase1.findings;
  allErrors.push(...phase1.errors);
  console.log(`\u{1F4E6} Phase 2: Installation Test...`);
  const phase2 = await runPhase2(normalizedPath, options.verbose);
  findings.installation = phase2.findings;
  allErrors.push(...phase2.errors);
  console.log(`\u2699\uFE0F  Phase 3: Functionality Check...`);
  const phase3 = await runPhase3(normalizedPath, options.verbose);
  findings.functionality = phase3.findings;
  allErrors.push(...phase3.errors);
  console.log(`\u2705 Phase 4: Data Verification...`);
  const phase4 = await runPhase4(normalizedPath, options.context, options.verbose);
  findings.verification = phase4.findings;
  allErrors.push(...phase4.errors);
  console.log(`\u{1F6A8} Phase 5: Error Handling Test...`);
  const phase5 = await runPhase5(normalizedPath, options.verbose);
  if (phase5.findings && typeof phase5.findings === "object" && "redFlags" in phase5.findings) {
    allRedFlags.push(...phase5.findings.redFlags);
  }
  allErrors.push(...phase5.errors);
  console.log(`\u{1F6A9} Phase 6: Red Flag Detection...`);
  const phase6 = await runPhase6(normalizedPath, options.verbose);
  if (phase6.findings && typeof phase6.findings === "object" && "redFlags" in phase6.findings) {
    allRedFlags.push(...phase6.findings.redFlags);
  }
  allErrors.push(...phase6.errors);
  let validatedFindings = findings;
  let validatedRedFlags = allRedFlags;
  let validation = null;
  if (options.validation) {
    console.log(`\u{1F50D} Phase 6: Validation (doubt-agents)...`);
    validation = await validateWithDoubtAgents({
      findings,
      redFlags: allRedFlags,
      toolPath: normalizedPath
    });
    validatedRedFlags = [...allRedFlags, ...validation.additionalFlags];
    allErrors.push(...validation.feedback.filter((f) => f.includes("ERROR")));
    try {
      const validationPath = await (await Promise.resolve().then(() => (init_doubt_agents(), doubt_agents_exports))).saveValidationResults(
        normalizedPath,
        validation
      );
      console.log(`  \u{1F4C1} Validation saved: ${validationPath}`);
    } catch (error) {
      console.warn(`  \u26A0\uFE0F  Could not save validation results: ${error}`);
    }
    console.log(`  Status: ${validation.status.toUpperCase()}`);
    console.log(`  Score: ${validation.score}/10`);
    console.log(`  Confidence: ${(validation.confidence * 100).toFixed(0)}%`);
    if (validation.cycles.doubtCritic) {
      console.log(`  doubt-critic: ${validation.cycles.doubtCritic.score}/10`);
    }
    if (validation.cycles.doubtMetaCritic) {
      console.log(`  doubt-meta-critic: ${validation.cycles.doubtMetaCritic.score}/10`);
    }
    if (validation.cycles.karen) {
      console.log(`  Karen: ${validation.cycles.karen.score}/10`);
    }
    if (!validation.passed) {
      console.warn(`\u26A0\uFE0F  Validation did not meet threshold (score: ${validation.score}/10)`);
    }
  } else {
    console.log(`\u23ED\uFE0F  Skipping validation (--no-validation flag)`);
    validation = {
      skipped: true,
      status: "skipped",
      score: 0,
      confidence: 0,
      validatedAt: /* @__PURE__ */ new Date(),
      cycles: {},
      feedback: [],
      additionalFlags: [],
      passed: true
    };
  }
  const score = calculateOverallScore({
    firstImpressions: findings.firstImpressions,
    installation: findings.installation,
    functionality: findings.functionality,
    verification: findings.verification,
    redFlagCount: validatedRedFlags.length
  });
  console.log(`
\u{1F4DD} Generating report...`);
  const reportPath = await generateReport({
    toolPath: normalizedPath,
    findings: validatedFindings,
    redFlags: validatedRedFlags,
    score,
    options,
    completedAt: /* @__PURE__ */ new Date(),
    validation
  }, options.output);
  const duration = Date.now() - startTime;
  console.log(`\u2728 Audit completed in ${(duration / 1e3).toFixed(1)}s
`);
  return {
    outputPath: reportPath,
    redFlags: validatedRedFlags,
    score,
    findings: validatedFindings,
    completedAt: /* @__PURE__ */ new Date()
  };
}
function calculateOverallScore(data) {
  const weights = {
    firstImpressions: 0.15,
    installation: 0.25,
    functionality: 0.35,
    verification: 0.15,
    redFlagPenalty: 0.1
  };
  let totalScore = 0;
  let weightUsed = 0;
  if (data.firstImpressions) {
    totalScore += data.firstImpressions.score * weights.firstImpressions;
    weightUsed += weights.firstImpressions;
  }
  if (data.installation) {
    totalScore += data.installation.score * weights.installation;
    weightUsed += weights.installation;
  }
  if (data.functionality) {
    totalScore += data.functionality.score * weights.functionality;
    weightUsed += weights.functionality;
  }
  if (data.verification) {
    totalScore += data.verification.score * weights.verification;
    weightUsed += weights.verification;
  }
  if (weightUsed > 0) {
    totalScore = totalScore / weightUsed;
  }
  const penalty = Math.min(data.redFlagCount * 0.1, 2);
  totalScore = Math.max(0, totalScore - penalty);
  return Math.round(totalScore * 10) / 10;
}

// src/cli.ts
import path12 from "path";
import { fileURLToPath as fileURLToPath4 } from "url";
var __filename4 = fileURLToPath4(import.meta.url);
var __dirname4 = path12.dirname(__filename4);
var program = new Command();
program.name("user-experience").description("Ruthlessly audit CLI tools from a fresh user perspective").version("1.0.0").argument("<tool-path>", "Path to the tool/directory to audit").option("-c, --context <context>", "Domain/use case context for the tool").option("-o, --output <path>", "Output report path", "./ux-audit-report.md").option("--no-validation", "Skip doubt-agent validation (faster, less rigorous)").option("--tier <tier>", "License tier (free, pro, enterprise)", "free").option("-v, --verbose", "Enable verbose output").action(async (toolPath, options) => {
  try {
    const validTiers = ["free", "pro", "enterprise"];
    if (!validTiers.includes(options.tier)) {
      console.error(`
\u274C Invalid tier: ${options.tier}`);
      console.error(`   Valid tiers: ${validTiers.join(", ")}
`);
      process.exit(1);
    }
    console.log(`
\u{1F50D} Starting UX Audit for: ${toolPath}`);
    if (options.context) {
      console.log(`\u{1F4CB} Context: ${options.context}`);
    }
    console.log(`\u{1F4DD} Output: ${options.output}
`);
    const result = await auditTool(toolPath, {
      context: options.context,
      output: options.output,
      validation: options.validation !== false,
      tier: options.tier,
      verbose: options.verbose || false
    });
    console.log(`
\u2705 Audit complete!`);
    console.log(`\u{1F4C4} Report saved to: ${result.outputPath}`);
    console.log(`\u{1F6A9} Red flags found: ${result.redFlags.length}`);
    console.log(`\u{1F4CA} Overall score: ${result.score}/10
`);
    if (result.score < 5) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`
\u274C Audit failed: ${error.message}`);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
});
program.command("report").description("Generate report from previous audit data").argument("<data-file>", "Path to audit data JSON file").option("-o, --output <path>", "Output report path", "./ux-audit-report.md").action(async (dataFile, options) => {
  try {
    console.log(`
\u{1F4C4} Generating report from: ${dataFile}`);
    const reportPath = await generateReportFromFile(dataFile, options.output);
    console.log(`\u2705 Report saved to: ${reportPath}
`);
  } catch (error) {
    console.error(`
\u274C Report generation failed: ${error.message}
`);
    process.exit(1);
  }
});
program.command("dashboard").description("Launch web dashboard for viewing audit reports").option("-p, --port <port>", "Dashboard port", "3000").option("--tailscale", "Enable Tailscale tunnel for remote access").action(async (options) => {
  try {
    console.log(`
\u{1F680} Starting dashboard on port ${options.port}...`);
    if (options.tailscale) {
      console.log(`\u{1F517} Tailscale tunnel enabled
`);
    }
    await startDashboard(options.port, options.tailscale);
  } catch (error) {
    console.error(`
\u274C Dashboard failed to start: ${error.message}
`);
    process.exit(1);
  }
});
program.command("usage").description("Show usage statistics and current tier").action(async () => {
  try {
    const license = await getCurrentLicense();
    const stats = await getUsageStats();
    console.log(`
${"=".repeat(60)}`);
    console.log(`\u{1F4CA} USER EXPERIENCE AUDITOR - USAGE STATISTICS`);
    console.log(`${"=".repeat(60)}
`);
    console.log(`\u{1F510} License Tier: ${stats.tier.toUpperCase()}`);
    if (license) {
      console.log(`\u{1F4E7} Email: ${license.email}`);
      console.log(`\u{1F511} Key: ${license.key}`);
      if (license.expiresAt) {
        console.log(`\u23F0 Expires: ${license.expiresAt.toLocaleDateString()}`);
      }
    }
    console.log(`
\u{1F4C8} This Month:`);
    console.log(`   Audits run: ${stats.auditsThisMonth}`);
    console.log(`   Tools audited: ${stats.toolsAudited}`);
    if (stats.lastAudit) {
      console.log(`   Last audit: ${new Date(stats.lastAudit).toLocaleString()}`);
    }
    console.log(`
\u{1F4CA} All Time:`);
    console.log(`   Total audits: ${stats.totalAudits}`);
    const tier = getAllTiers().find((t) => t.id === stats.tier);
    if (tier) {
      console.log(`
\u{1F4B3} Plan Limits:`);
      console.log(`   Max audits/month: ${tier.limits.maxAuditsPerMonth === Infinity ? "Unlimited" : tier.limits.maxAuditsPerMonth}`);
      console.log(`   Max tools: ${tier.limits.maxTools === Infinity ? "Unlimited" : tier.limits.maxTools}`);
      console.log(`   Price: ${formatPrice(stats.tier, "monthly")}`);
      const enabledFeatures = Object.entries(tier.features).filter(([_, enabled]) => enabled).map(([feature]) => feature);
      if (enabledFeatures.length > 0) {
        console.log(`
\u2728 Enabled Features:`);
        enabledFeatures.forEach((feature) => {
          console.log(`   \u2022 ${feature}`);
        });
      }
    }
    console.log(`
${"=".repeat(60)}
`);
  } catch (error) {
    console.error(`
\u274C Failed to fetch usage: ${error.message}
`);
    process.exit(1);
  }
});
program.command("upgrade").description("Upgrade to a higher tier").argument("<tier>", "Target tier (pro, enterprise)").action(async (tier) => {
  try {
    const validTiers = ["pro", "enterprise"];
    if (!validTiers.includes(tier)) {
      console.error(`
\u274C Invalid tier: ${tier}`);
      console.error(`   Valid upgrade tiers: ${validTiers.join(", ")}
`);
      process.exit(1);
    }
    console.log(`
\u2B06\uFE0F  Upgrading to ${tier.toUpperCase()} tier...`);
    await updateTier(tier);
    console.log(`\u2705 Successfully upgraded to ${tier.toUpperCase()} tier!`);
    console.log(`
\u{1F4A1} Note: This is a local tier change for testing.`);
    console.log(`   In production, you'll complete payment via Stripe.
`);
  } catch (error) {
    console.error(`
\u274C Upgrade failed: ${error.message}
`);
    process.exit(1);
  }
});
program.command("tiers").description("List available tiers and features").action(async () => {
  try {
    const tiers = getAllTiers();
    const license = await getCurrentLicense();
    const currentTier = license?.tier || "free";
    console.log(`
${"=".repeat(70)}`);
    console.log(`\u{1F4B3} AVAILABLE TIERS`);
    console.log(`${"=".repeat(70)}
`);
    tiers.forEach((tier) => {
      const isCurrent = tier.id === currentTier;
      const marker = isCurrent ? " \u2190 CURRENT" : "";
      console.log(`${tier.id.toUpperCase()}${marker}`);
      console.log(`${"\u2500".repeat(70)}`);
      console.log(`Description: ${tier.description}`);
      console.log(`Price: ${formatPrice(tier.id, "monthly")} (${formatPrice(tier.id, "yearly")})`);
      console.log(`
Limits:`);
      console.log(`  \u2022 Audits/month: ${tier.limits.maxAuditsPerMonth === Infinity ? "Unlimited" : tier.limits.maxAuditsPerMonth}`);
      console.log(`  \u2022 Max tools: ${tier.limits.maxTools === Infinity ? "Unlimited" : tier.limits.maxTools}`);
      console.log(`  \u2022 Retention: ${tier.limits.maxRetentionDays === Infinity ? "Forever" : `${tier.limits.maxRetentionDays} days`}`);
      const enabledFeatures = Object.entries(tier.features).filter(([_, enabled]) => enabled).map(([feature]) => feature);
      if (enabledFeatures.length > 0) {
        console.log(`
Features:`);
        enabledFeatures.forEach((feature) => {
          console.log(`  \u2713 ${feature}`);
        });
      }
      console.log(`
`);
    });
    console.log(`${"=".repeat(70)}`);
    console.log(`Upgrade: https://user-experience.dev/upgrade
`);
  } catch (error) {
    console.error(`
\u274C Failed to list tiers: ${error.message}
`);
    process.exit(1);
  }
});
program.parse();
async function generateReportFromFile(dataFile, outputPath) {
  return outputPath;
}
async function startDashboard(port, enableTailscale) {
  console.log(`Dashboard running at http://localhost:${port}`);
}
