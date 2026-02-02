# Git Commit Rules for AINative Projects

## CRITICAL RULES - ZERO TOLERANCE

### 1. NO ANTHROPIC/CLAUDE ATTRIBUTION

**FORBIDDEN TEXT:**
- "Claude"
- "Anthropic"
- "claude.com"
- "Claude Code"
- "Generated with Claude"
- "Co-Authored-By: Claude"
- AI attribution text/emoji

**STOP IMMEDIATELY IF DETECTED!**

### 2. COMMIT MESSAGE FORMAT

✅ **CORRECT:**
```
Short descriptive title

- Bullet point describing changes
- Another bullet point
- Final bullet point
```

❌ **INCORRECT:**
```
Changes

🤖 Generated with Claude Code
Co-Authored-By: Claude
```

### 3. PULL REQUEST DESCRIPTIONS

✅ **CORRECT:**
```markdown
## Summary
- Clear description
- What was fixed/added
- Why changes made

## Test Plan
- How to test
- Expected results
```

### 4. ENFORCEMENT SCOPE

**Applies to:**
- Commit messages
- PR descriptions
- Issue comments
- GitHub discussions

**Violations result in:**
- Unwanted third-party attribution
- Compromised repository professionalism

### 5. PRE-COMMIT HOOK

```bash
#!/bin/bash
COMMIT_MSG_FILE=$1
if grep -qiE "(claude|anthropic|🤖|generated with|co-authored-by: claude)" "$COMMIT_MSG_FILE"; then
    echo "❌ ERROR: Forbidden attribution detected!"
    exit 1
fi
```

### ZERO TOLERANCE POLICY

**BEFORE COMMIT, CHECK:**
1. No "Claude" references
2. No "Anthropic" references
3. No AI attribution
4. No "Generated with" text

**VIOLATORS MUST AMEND COMMIT IMMEDIATELY**