/**
 * Report generation from audit findings
 * Uses Handlebars template for markdown output
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import type { AuditResult, AuditOptions } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ReportData {
  toolPath: string;
  findings: any;
  redFlags: any[];
  score: number;
  options: AuditOptions;
  completedAt: Date;
  validation?: any;
}

/**
 * Generate audit report from findings
 */
export async function generateReport(
  data: ReportData,
  outputPath: string
): Promise<string> {
  // Register Handlebars helpers
  Handlebars.registerHelper('round', function(value: number) {
    return Math.round(value * 100);
  });

  Handlebars.registerHelper('toFixed', function(value: number, digits: number) {
    return value.toFixed(digits || 1);
  });

  // Load template
  const templatePath = path.resolve(__dirname, '../../templates/report.md.hbs');
  let templateContent: string;

  try {
    templateContent = await fs.readFile(templatePath, 'utf-8');
  } catch {
    // Fallback to built-in template if file doesn't exist
    templateContent = getFallbackTemplate();
  }

  // Compile and render template
  const template = Handlebars.compile(templateContent);
  const markdown = template({
    ...data,
    grade: getGrade(data.score),
    timestamp: data.completedAt.toISOString(),
    toolName: path.basename(data.toolPath),
    validationStatus: data.validation?.status || 'none',
    validationScore: data.validation?.score || 0,
    validationConfidence: data.validation?.confidence || 0,
    cycles: data.validation?.cycles || {}
  });

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  // Write report
  await fs.writeFile(outputPath, markdown, 'utf-8');

  return outputPath;
}

/**
 * Get letter grade from numeric score
 */
function getGrade(score: number): string {
  if (score >= 9) return 'A+';
  if (score >= 8) return 'A';
  if (score >= 7) return 'B';
  if (score >= 6) return 'C';
  if (score >= 4) return 'D';
  return 'F';
}

/**
 * Fallback template if external file not found
 */
function getFallbackTemplate(): string {
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
- Installation Instructions: {{#if findings.firstImpressions.hasInstallInstructions}}✅{{else}}❌{{/if}}
- Code Examples: {{#if findings.firstImpressions.hasExamples}}✅{{else}}❌{{/if}}
{{else}}
*Phase not completed*
{{/if}}

### Phase 2: Installation Test
{{#if findings.installation}}
- Installation: {{#if findings.installation.success}}✅ Success{{else}}❌ Failed{{/if}}
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
No red flags found! 🎉
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

// Re-export types
export type * from '../types';
