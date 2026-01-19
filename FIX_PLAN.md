# User-Experience CLI - Finality Fixes Implementation Plan

## Critical Issues to Fix (from Finality Validation)

### 1. CLI Mock Implementation → Real Audit Logic
**Current**: `dist/cli.cjs` uses hardcoded delays
**Fix**: Import and use actual audit functions from `src/phases/`

**Action Steps**:
1. Build TypeScript source with esbuild
2. Create proper ESM bundle that imports from src/phases/
3. Replace mock delays with real phase execution
4. Test against real CLI tools

### 2. Missing Test Files → 100+ Actual Tests
**Current**: Test documentation exists, zero test files
**Fix**: Write actual test files in `src/__tests__/`

**Test Files Needed**:
1. `src/__tests__/phases.test.ts` - Test all 6 audit phases
2. `src/__tests__/auditor.test.ts` - Test orchestration
3. `src/__tests__/monetization.test.ts` - Test tier system
4. `src/__tests__/validation.test.ts` - Test doubt-agent integration
5. `src/__tests__/cli.test.ts` - Test CLI commands
6. `src/__integration__/e2e.test.ts` - End-to-end workflow tests

**Target**: 100+ tests, 90% coverage (vitest.config.ts thresholds)

### 3. Dashboard Not Deployed → Running on Tailscale
**Current**: Dashboard code exists, not deployed
**Fix**: Deploy and expose via Tailscale funnel

**Action Steps**:
1. Install dashboard dependencies: `cd dashboard && npm install`
2. Build dashboard: `npm run build`
3. Start production server: `npm start`
4. Expose via Tailscale: `tailscale funnel --https=443 localhost:3000`

### 4. TypeScript Errors → Clean Compilation
**Current**: 100+ TypeScript diagnostics in dashboard/
**Fix**: Fix all type errors

**Action Steps**:
1. Install missing dependencies in dashboard/
2. Fix JSX type issues (add React types)
3. Fix import paths for next/* modules
4. Ensure clean `tsc --noEmit`

### 5. npm Installability → Published Package
**Current**: Configured but not published
**Fix**: Test local install, then publish

**Action Steps**:
1. Test: `npm install -g .` from project root
2. Verify: `user-experience --help` works globally
3. Publish: `npm publish --access public`

### 6. User Flow Verification → Real Testing
**Current**: No evidence of real user flow testing
**Fix**: Test all flows with real tools

**Test Flows**:
1. New user first audit
2. Report generation
3. Dashboard access
4. Tier upgrade
5. Usage tracking
6. Error handling

## Execution Order

### Phase 1: Fix CLI (Critical)
```bash
cd /home/anombyte/.claude/skills/user-experience
npm run build
./dist/cli.cjs audit /path/to/real/tool
```

### Phase 2: Write Tests (Critical)
```bash
# Create test files
npx vitest run --coverage
# Verify 90%+ coverage
```

### Phase 3: Deploy Dashboard
```bash
cd dashboard
npm install
npm run build
npm start &
tailscale funnel --https=443 localhost:3000
```

### Phase 4: Fix TypeScript
```bash
npx tsc --noEmit
# Fix all errors
```

### Phase 5: Verify Installability
```bash
npm install -g .
user-experience --help
user-experience audit /real/tool
```

### Phase 6: Final Validation
```bash
# Run all tests
npm test

# Verify dashboard
curl https://localhost:3000

# Verify CLI
user-experience audit ./test-tool

# Check coverage
npx vitest --coverage
```

## Success Criteria

✅ CLI executes real audits (not mocks)
✅ 100+ tests passing
✅ 90%+ code coverage
✅ Dashboard accessible via Tailscale
✅ `npm install -g .` works
✅ All TypeScript compilation clean
✅ All user flows tested and working

## Timeline Estimate

- Phase 1 (CLI): 15 iterations
- Phase 2 (Tests): 25 iterations
- Phase 3 (Dashboard): 20 iterations
- Phase 4 (TypeScript): 15 iterations
- Phase 5 (Install): 10 iterations
- Phase 6 (Validation): 15 iterations

**Total**: 100 iterations (as requested)
