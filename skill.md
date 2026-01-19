---
type: skill
name: "User Experience Audit"
version: "1.0.0"
---

# User Experience Audit Skill

## Overview
Performs a comprehensive audit of software tools from a fresh user perspective, identifying gaps between documentation and reality.

## Prerequisites
- Tool/CLI being audited
- Access to source code
- Ability to run commands
- Domain knowledge (for context)

## When to Use
- Onboarding to a new project
- Validating tool readiness for release
- Creating user-facing documentation
- Debugging "it doesn't work" reports

## Phases

### Phase 1: First Impressions (2 min)
**Goal**: Document what new users see

1. Check project root files (README, requirements.txt)
2. List directory structure
3. Note initial claims vs reality

**Prompts**: `prompts/phase-1-first-impressions.md`

### Phase 2: Installation Test (3 min)
**Goal**: Verify README instructions work

1. Follow README installation steps exactly
2. Document failures
3. Note missing dependencies

**Prompts**: `prompts/phase-2-installation.md`

### Phase 3: Functionality Check (5 min)
**Goal**: Test what actually works

1. Run main commands
2. Test example usage
3. Identify working vs broken features

**Prompts**: `prompts/phase-3-functionality.md`

### Phase 4: Data Verification (5 min)
**Goal**: Spot-check output accuracy

1. Pick 2-3 examples from output
2. Verify against live data sources
3. Calculate actual numbers (tax, fees, etc.)

**Prompts**: `prompts/phase-4-verification.md`

### Phase 5: Red Flag Documentation (3 min)
**Goal**: List critical issues

Document each red flag with:
- Issue description
- Impact (user confusion, money loss, etc.)
- Evidence (actual vs expected)

**Validation**: `validation/red-flag-checklist.md`

### Phase 6: Final Report (5 min)
**Goal**: Generate actionable assessment

**Template**: `templates/audit-report.md`

## Execution

```bash
/user-experience "<tool-name>" "<context>"
```

### Parameters

| Parameter | Description | Required |
|-----------|-------------|----------|
| `tool-name` | Name of tool being audited | Yes |
| `context` | Domain/use case (e.g., "OSRS flipping") | No |

## Validation

**Success Criteria**:
- ✅ Installation tested
- ✅ Functionality verified
- ✅ Data spot-checked
- ✅ Red flags documented
- ✅ Actionable report generated

**Quality Checks**:
- Evidence provided for each claim
- Distinction between "broken" vs "missing"
- User impact assessed
- Fix priorities assigned
