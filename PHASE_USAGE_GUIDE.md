# Audit Phase Usage Guide

## Quick Reference

### Running Individual Phases

```typescript
import { runPhase1, runPhase2, runPhase3, runPhase4, runPhase5, runPhase6 } from './phases';

// Phase 1: First Impressions
const result1 = await runPhase1('/path/to/tool', true); // verbose = true

// Phase 2: Installation Test
const result2 = await runPhase2('/path/to/tool', true);

// Phase 3: Functionality Check
const result3 = await runPhase3('/path/to/tool', true);

// Phase 4: Data Verification
const result4 = await runPhase4('/path/to/tool', 'development context', true);

// Phase 5: Error Handling Test
const result5 = await runPhase5('/path/to/tool', true);

// Phase 6: Red Flag Detection
const result6 = await runPhase6('/path/to/tool', true);
```

---

## Phase 1: First Impressions

### What It Checks
- README existence and quality
- Installation instructions
- Code examples
- Project description clarity
- Documentation structure

### Scoring Criteria (0-10)
- README exists: +1.5
- README quality (0-10): ×0.35
- Installation instructions: +2.0
- Code examples: +2.0
- Description clarity (0-10): ×0.35

### Example Output
```typescript
{
  hasReadme: true,
  readmeScore: 7.5,
  hasInstallInstructions: true,
  hasExamples: true,
  descriptionClarity: 6.0,
  score: 8.2,
  notes: [
    "✅ Excellent success rate - tool is reliable",
    "Found 3 code examples in README"
  ]
}
```

---

## Phase 2: Installation Test

### What It Checks
- Package type detection (Node.js, Rust, Go, Python, Ruby, Docker)
- Prerequisites (npm, cargo, go, pip installed)
- Actual installation execution
- Installation duration
- Binary availability

### Scoring Criteria (0-10)
- Base success: +7.0
- Fast install (<10s): +2.0
- Medium install (10-30s): +1.0
- Slow install (>60s): -1.0
- Warnings: -0.5 each

### Example Output
```typescript
{
  attempted: true,
  success: true,
  duration: 12450,
  method: 'npm install',
  errors: [],
  warnings: [],
  score: 8.0,
  notes: [
    "Installation method: npm install",
    "✅ Installation completed successfully",
    "✅ Binary installed: mytool"
  ]
}
```

---

## Phase 3: Functionality Check

### What It Checks
- Binary discovery
- Command execution (--help, --version, no args)
- Common commands (init, build, test, run, etc.)
- Success/failure rates
- Missing features

### Scoring Criteria (0-10)
- Success rate (0-1): ×7.0
- Perfect rate (100%): +2.0
- Good rate (90%+): +1.0
- Missing features: -0.5 each

### Example Output
```typescript
{
  commandsTested: [
    {
      command: '--help',
      success: true,
      output: 'Usage: mytool [options]...',
      duration: 120
    },
    // ... more commands
  ],
  successfulExecutions: 12,
  failedExecutions: 3,
  missingFeatures: ['supports concurrent processing'],
  score: 7.5,
  notes: [
    "Success rate: 80% (12/15)",
    "Good success rate - some commands may need attention"
  ]
}
```

---

## Phase 4: Data Verification

### What It Checks
- Version claims match --version output
- Command examples actually work
- Config files exist as documented
- Feature claims are accurate

### Scoring Criteria (0-10)
- Verification rate (0-1): ×8.0
- Perfect verification (100%): +2.0
- Good verification (90%+): +1.0
- Accuracy issues: -1.5 each

### Example Output
```typescript
{
  verifiedClaims: [
    {
      claim: 'Tool version is 1.2.3',
      verified: true,
      source: '--version',
      expected: '1.2.3',
      actual: 'mytool v1.2.3',
      match: 'partial'
    }
  ],
  unverifiableClaims: ['Supports concurrent processing'],
  accuracyIssues: [],
  score: 9.0,
  notes: [
    "Verified 8/9 claims (89%)",
    "Good documentation accuracy with some inconsistencies"
  ]
}
```

---

## Phase 5: Error Handling Test

### What It Checks
- Invalid command handling
- Invalid flag handling
- Missing argument handling
- Missing file error reporting
- Permission error handling
- Help text quality (usage, options, examples)
- Version flag support
- Error message helpfulness

### Red Flag Severities
- **Critical**: No --help support, crashes on missing args
- **High**: Poor error handling for invalid commands/flags
- **Medium**: No error for missing files, no --version
- **Low**: Unhelpful error messages, missing help sections

### Example Output
```typescript
{
  redFlags: [
    {
      severity: 'critical',
      category: 'error-handling',
      title: 'No --help support',
      description: 'Tool does not provide --help flag',
      evidence: ['Command: ./mytool --help', 'Exit code: 1'],
      fix: 'Implement --help flag with comprehensive usage information'
    }
  ],
  notes: [
    '✅ Invalid commands are handled properly',
    '✅ Invalid flags are handled properly',
    '⚠️  SIGINT handling test skipped (requires manual testing)'
  ]
}
```

---

## Phase 6: Red Flag Detection

### What It Checks
- Hardcoded secrets (API keys, passwords, tokens)
- Vulnerable dependencies
- Missing essential files (README, LICENSE, .gitignore)
- Poor project structure
- Broken or minimal tests
- Outdated dependencies
- Security issues (eval(), command injection)
- Licensing issues
- Accessibility considerations

### Red Flag Categories
- **security**: Secrets, vulnerabilities, code injection
- **project-structure**: Organization, file placement
- **testing**: Test quality and coverage
- **maintenance**: Outdated dependencies
- **legal**: Licensing issues
- **documentation**: Missing or poor docs

### Example Output
```typescript
{
  redFlags: [
    {
      severity: 'critical',
      category: 'security',
      title: 'Hardcoded Google API key detected',
      description: 'Found Google API key in source code',
      evidence: ['File: src/config.ts'],
      fix: 'Remove API key from source code and use environment variables',
      location: '/path/to/src/config.ts'
    },
    {
      severity: 'medium',
      category: 'testing',
      title: 'No tests found',
      description: 'Project lacks test files or test directory',
      evidence: ['No test/ or tests/ directory found'],
      fix: 'Add tests to ensure code quality and prevent regressions'
    }
  ],
  notes: [
    '✅ No hardcoded secrets found in sensitive areas',
    '⚠️  Found 3 red flags:',
    '  - Critical: 1',
    '  - High: 0',
    '  - Medium: 2'
  ]
}
```

---

## Common Patterns

### Accessing Phase Results
```typescript
const phase1 = await runPhase1(toolPath, verbose);
const findings = phase1.findings as FirstImpressionsFindings;

console.log(`Score: ${findings.score}/10`);
console.log(`Notes: ${findings.notes.join(', ')}`);
```

### Handling Red Flags
```typescript
const phase6 = await runPhase6(toolPath, verbose);
const { redFlags, notes } = phase6.findings as { redFlags: RedFlag[], notes: string[] };

// Count by severity
const criticalCount = redFlags.filter(f => f.severity === 'critical').length;
const highCount = redFlags.filter(f => f.severity === 'high').length;

// Display top issues
redFlags.slice(0, 5).forEach(flag => {
  console.log(`[${flag.severity.toUpperCase()}] ${flag.title}`);
  console.log(`  Fix: ${flag.fix}`);
});
```

### Calculating Overall Score
```typescript
// Weighted average of all phases
const weights = {
  firstImpressions: 0.15,
  installation: 0.25,
  functionality: 0.35,
  verification: 0.15
};

let totalScore = 0;
for (const [phase, weight] of Object.entries(weights)) {
  totalScore += findings[phase].score * weight;
}

// Apply red flag penalty
totalScore -= Math.min(redFlags.length * 0.1, 2.0);
```

---

## Tips

### Use Verbose Mode for Debugging
```typescript
const result = await runPhase1(toolPath, true); // Shows detailed progress
```

### Combine Phases for Full Audit
```typescript
const results = await Promise.all([
  runPhase1(toolPath, false),
  runPhase2(toolPath, false),
  runPhase3(toolPath, false)
]);
```

### Handle Phase Failures Gracefully
```typescript
try {
  const result = await runPhase2(toolPath, verbose);
  if (!result.success) {
    console.error(`Phase failed: ${result.errors.join(', ')}`);
  }
} catch (error) {
  console.error(`Phase error: ${error.message}`);
}
```

### Extract Specific Metrics
```typescript
// Installation success rate
const installSuccess = findings.installation?.success || false;

// Functionality success rate
const successRate = findings.functionality
  ? findings.functionality.successfulExecutions / findings.functionality.commandsTested.length
  : 0;

// Critical red flags
const criticalFlags = redFlags.filter(f => f.severity === 'critical');
```

---

## Best Practices

1. **Run Phases in Order**: Phases are designed to build on each other
2. **Use Verbose Mode**: Enable verbose mode during development and debugging
3. **Review Red Flags First**: Critical and high-severity flags should be addressed immediately
4. **Check Scores**: Low scores in any phase indicate areas needing improvement
5. **Validate Evidence**: Review the evidence arrays to understand why issues were flagged
6. **Iterate**: Fix issues and re-run specific phases to verify improvements

---

## Troubleshooting

### Phase 2 Fails: "Binary Not Found"
- Ensure the project has been built (`npm run build`, `cargo build`, etc.)
- Check that the binary path is correct
- Verify the project has a package.json, Cargo.toml, or go.mod

### Phase 3 Shows All Commands Failed
- Check if the binary is executable
- Verify Node.js, Rust, or Go is installed
- Try running the binary manually to see error messages

### Phase 5 Shows Missing --help
- Implement a --help flag
- Add usage, options, and examples sections
- Return exit code 0 when --help is used

### Phase 6 Shows False Positives
- Review the evidence arrays
- Check if patterns need adjustment for your project
- Report false positives to improve detection accuracy

---

## See Also
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Detailed implementation overview
- [src/types/index.ts](./src/types/index.ts) - Type definitions
- [src/phases/](./src/phases/) - Phase implementations
