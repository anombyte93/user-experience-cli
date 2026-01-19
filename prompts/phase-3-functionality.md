# Phase 3: Functionality Check

Test the tool's actual capabilities:

## 1. Run Main Commands

Execute the tool's primary commands:
- Run `--help` or equivalent to see available commands
- Execute documented examples from README
- Test common workflows mentioned in documentation

## 2. What Works?

Document successful executions:
- List commands that executed without errors
- Note expected behavior that matched documentation
- Capture output samples (first 20 lines max)
- Identify features working as designed

## 3. What's Broken?

Document failures and issues:
- Crashes with error messages (include full error)
- Silent failures (no output when expected)
- Missing features mentioned but not implemented
- Inconsistent behavior vs documentation
- Performance issues (hangs, excessive delays)

## 4. Edge Cases Tested

Test boundary conditions:
- Empty input
- Very large input
- Invalid input types
- Missing required arguments
- Concurrent operations (if applicable)

## 5. Output Format

Structure your findings:

```markdown
### Successful Executions
- Command: `tool --help`
- Status: ✅ Working
- Notes: Displays 15 commands, formatted clearly

### Failed Executions
- Command: `tool process --input file.txt`
- Status: ❌ Crashed
- Error: "TypeError: Cannot read property 'map' of undefined"
- Line: src/processor.js:42

### Missing Features
- Documented `--watch` flag not implemented
- README mentions export functionality, no such command exists
```

## Be Ruthless

If something crashes, say so explicitly. If documentation lies, call it out. This phase determines if the tool actually delivers on its promises.
