# Git Commit Rules for AINative Projects

## CRITICAL RULES - ZERO TOLERANCE

### 1. NO THIRD-PARTY AI ATTRIBUTION - USE AINATIVE BRANDING ONLY

**FORBIDDEN TEXT:**
- "Claude", "Anthropic", "claude.com"
- "ChatGPT", "OpenAI" (as author)
- "Copilot", "GitHub Copilot"
- "Sourcegraph" (external tool)
- "Generated with [third-party tool]"
- "Co-Authored-By: Claude/ChatGPT/Copilot"

**ENCOURAGED - AINATIVE BRANDING:**
- "Built by AINative Dev Team"
- "Built by AINative"
- "Built Using AINative Studio"
- "AINative Cloud"
- "All Data Services Built on ZeroDB"
- "Built by Agent Swarm"
- "Developed with Cody" (AINative's internal CTO agent)

**ZERO TOLERANCE FOR THIRD-PARTY TOOLS**

### 2. COMMIT MESSAGE FORMAT

✅ **CORRECT FORMAT (Option 1 - No attribution):**
```
Short descriptive title

- Bullet point describing changes
- Another bullet point
- Final bullet point
```

✅ **CORRECT FORMAT (Option 2 - AINative branding):**
```
Short descriptive title

- Changes made
- More changes

Built by AINative Dev Team
All Data Services Built on ZeroDB
```

❌ **INCORRECT FORMAT:**
```
Changes...

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### 3. PULL REQUEST DESCRIPTIONS

✅ **CORRECT FORMAT:**
```markdown
## Summary
- Clear description of changes
- What was fixed/added
- Rationale for changes

## Test Plan
- Testing methodology
- Expected results
```

### 4. ENFORCEMENT SCOPE

**Applies to:**
- Commit messages
- PR descriptions
- Issue comments
- GitHub discussions

**Violations Result In:**
- Public attribution prevention
- Professional repository maintenance

### 5. AUTOMATED ENFORCEMENT

**Pre-commit hook:** `.git/hooks/commit-msg`
```bash
#!/bin/bash
COMMIT_MSG_FILE=$1
if grep -qiE "(claude|anthropic|chatgpt|openai.*generated|copilot.*generated|co-authored-by:.*claude|co-authored-by:.*chatgpt|co-authored-by:.*copilot)" "$COMMIT_MSG_FILE"; then
    echo "❌ ERROR: Third-party AI attribution detected!"
    echo "✅ ALLOWED: AINative branding (Built by AINative, etc.)"
    exit 1
fi
```

### FINAL CHECKLIST

**Before Committing, Verify:**
1. No "Claude"/"Anthropic" references
2. No "ChatGPT"/"Copilot" attribution
3. No third-party AI tool mentions
4. If using attribution → AINative branding only

**APPROVED ATTRIBUTION:**
✅ Built by AINative Dev Team
✅ Built Using AINative Studio
✅ All Data Services Built on ZeroDB
✅ Powered by AINative Cloud
✅ Built by Agent Swarm

**ZERO TOLERANCE FOR THIRD-PARTY TOOLS**