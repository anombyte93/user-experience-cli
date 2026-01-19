# Red Flag Checklist

## Severity Levels
- 🔴 **CRITICAL**: Data loss, security, financial loss
- 🟠 **HIGH**: Major functionality broken, misleading claims
- 🟡 **MEDIUM**: Poor UX, missing features
- 🔵 **LOW**: Documentation gaps, minor issues

## Red Flag Categories

### Documentation
- [ ] README lies about features
- [ ] Installation instructions fail
- [ ] Examples don't work
- [ ] Wrong data sources claimed

### Data Accuracy
- [ ] Numbers don't match sources
- [ ] Timestamps missing/wrong
- [ ] Calculations incorrect
- [ ] No verification possible

### Functionality
- [ ] Promised features don't exist
- [ ] Commands crash silently
- [ ] Dependencies not documented
- [ ] Configuration unclear

### User Impact
- [ ] Financial loss possible
- [ ] Security vulnerabilities
- [ ] Wasted time investment
- [ ] Misleading expectations

## Documentation Template

For each red flag:
```
### 🚩 RED FLAG #N: {Title}
- **Severity**: {CRITICAL|HIGH|MEDIUM|LOW}
- **Issue**: {Description}
- **Evidence**: {What shows the problem}
- **Impact**: {How this hurts users}
- **User Action**: {What user must do to work around}
```
