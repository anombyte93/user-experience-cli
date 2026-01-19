# Validation Quick Reference Guide

## Command Usage

```bash
# Run audit with validation (default)
user-experience /path/to/tool

# Skip validation for faster audits
user-experience /path/to/tool --no-validation

# Specify output file
user-experience /path/to/tool -o my-report.md
```

## Understanding Validation Output

### Status Values

| Status | Meaning | Confidence |
|--------|---------|------------|
| **VALIDATED** | All cycles passed, high confidence | ≥70% |
| **UNVERIFIED** | Passed but low confidence (inconsistent scores) | <70% |
| **FAILED** | Validation score <6/10 | Any |
| **SKIPPED** | --no-validation flag used | N/A |

### Cycle Scores

Each cycle scores 0-10:
- **doubt-critic**: Obvious errors, missing red flags, evidence quality
- **doubt-meta-critic**: Bias detection, blind spots, false positives
- **Karen**: Evidence validation using SIMP-O-METER

### Confidence Calculation

```
confidence = (completion × 30%) + (consistency × 30%) + (passed × 40%)
```

- **completion**: 3/3 cycles = 100%
- **consistency**: Low score variance = high confidence
- **passed**: All cycles passed = 100%

## Validation Files

### Location
```
/path/to/audited/tool/.ux-audit/validation/
├── validation-2025-01-20T00-30-00-000Z.json
├── validation-2025-01-20T01-15-23-456Z.json
└── ...
```

### JSON Structure
```json
{
  "passed": true,
  "score": 7.3,
  "status": "validated",
  "confidence": 0.85,
  "validatedAt": "2025-01-20T00:30:00.000Z",
  "cycles": {
    "doubtCritic": {
      "cycle": "doubt-critic",
      "score": 7.0,
      "feedback": ["Audit structure appears sound"],
      "redFlags": [],
      "agent": "doubt-critic (deepseek)",
      "duration": 15000,
      "passed": true
    },
    "doubtMetaCritic": { ... },
    "karen": { ... }
  },
  "additionalFlags": [],
  "skipped": false
}
```

## Report Section

Generated reports include:

```markdown
### Validation Status

- **Validation**: VALIDATED
- **Validation Score**: 7.3/10
- **Confidence**: 85%

#### Cycle Results
- **doubt-critic**: 7.0/10 (doubt-critic (deepseek))
- **doubt-meta-critic**: 7.5/10 (doubt-meta-critic (claude))
- **Karen**: 7.5/10 (karen (claude))
```

## Troubleshooting

### Validation Failed
```
⚠️  Validation did not meet threshold (score: 5.5/10)
```
**Action**: Review validation feedback in report, address red flags

### Agent Unavailable
```
⚠ doubt-critic failed: MCP Router not available
```
**Action**: Falls back to mock implementation, audit continues

### Low Confidence
```
Status: UNVERIFIED
Score: 7.5/10
Confidence: 55%
```
**Action**: Validation passed but cycles disagree - manual review recommended

## Best Practices

1. **Always run validation** for production audits (skip only for development)
2. **Review validation feedback** in generated reports
3. **Check confidence scores** - low confidence = inconsistent validation
4. **Track validation history** - files persist in `.ux-audit/validation/`
5. **Address additional red flags** - validation may find issues audit missed

## Integration Points

### For Developers

Add custom validation cycles:

```typescript
// src/validation/doubt-agents.ts
async function runCustomCycle(input: ValidationInput): Promise<CycleResult> {
  return {
    cycle: 'custom-validator',
    score: 8.0,
    feedback: ['Custom validation passed'],
    redFlags: [],
    agent: 'custom-validator',
    duration: 5000,
    passed: true
  };
}
```

### For CI/CD

```yaml
# .github/workflows/ux-audit.yml
- name: Run UX Audit
  run: |
    user-experience ./bin/my-tool --no-validation || true
    user-experience ./bin/my-tool -o ux-report.md
    if [ $? -ne 0 ]; then
      echo "Audit score too low"
      exit 1
    fi
```

---

**Quick Reference**: Validation Status → Confidence → Action Needed
