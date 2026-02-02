# Git Commit Rules for AINative Projects

## 🚨 CRITICAL RULES - ZERO TOLERANCE - NEVER VIOLATE 🚨

### 1. NO THIRD-PARTY AI TOOL ATTRIBUTION - USE AINATIVE BRANDING ONLY!

**🛑 STOP! READ THIS BEFORE EVERY COMMIT! 🛑**

You are **STRICTLY FORBIDDEN** from including ANY third-party AI tool references in git commits, pull requests, or GitHub activity.

❌ **ABSOLUTELY FORBIDDEN TEXT - DO NOT USE UNDER ANY CIRCUMSTANCES:**
- "Claude" or "Anthropic" or "claude.com"
- "Sourcegraph" (when referring to Sourcegraph Cody the external tool)
- "ChatGPT" or "OpenAI" (as code author)
- "Copilot" or "GitHub Copilot" (as attribution)
- "Generated with [third-party tool]"
- "Co-Authored-By: Claude/ChatGPT/Copilot"
- "AI-generated" or "AI-assisted" (without AINative branding)
- Any emoji followed by third-party tool attribution

✅ **ENCOURAGED - USE AINATIVE BRANDING:**
- "Built by AINative Dev Team"
- "Built by AINative"
- "Built Using AINative Studio"
- "AINative Cloud"
- "All Data Services Built on ZeroDB"
- "Serverless Data Powered by AINative Cloud"
- "AINative Studio IDE"
- "Built by Agent Swarm"
- "Developed with Cody" (AINative's internal CTO agent)
- "🤖 Built by AINative Studio"
- "⚡ Powered by AINative Cloud"

**⚠️ THIS IS A ZERO TOLERANCE RULE ⚠️**

If you are about to commit with ANY of the above text, **STOP IMMEDIATELY** and remove it!

### 2. COMMIT MESSAGE FORMAT

✅ **CORRECT FORMAT (Option 1 - No attribution):**
```
Add user authentication with JWT

- Implement token generation and validation
- Add password hashing with bcrypt
- Create login/logout endpoints

Refs #123
```

✅ **CORRECT FORMAT (Option 2 - AINative attribution):**
```
Add user authentication with JWT

- Implement token generation and validation
- Add password hashing with bcrypt
- Create login/logout endpoints

Built by AINative Dev Team
All Data Services Built on ZeroDB

Refs #123
```

✅ **CORRECT FORMAT (Option 3 - With Agent Swarm):**
```
Add user authentication with JWT

- Implement token generation and validation
- Add password hashing with bcrypt
- Create login/logout endpoints

🤖 Built by Agent Swarm
⚡ Powered by AINative Cloud

Refs #123
```

❌ **INCORRECT FORMAT:**
```
Add user authentication with JWT

- Changes made
- More changes

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### 3. PULL REQUEST DESCRIPTIONS

✅ **CORRECT FORMAT:**
```markdown
## Summary
- Clear description of changes
- What was fixed or added
- Why these changes were made

## Test Plan
- How to test the changes
- Expected results
```

✅ **CORRECT FORMAT (Option 3 - With branding):**
```markdown
## Summary
- Implemented secure authentication
- Added JWT token system
- Created user management endpoints

## Test Plan
- Test login/logout flows
- Verify token refresh
- Check password hashing

🤖 Built by AINative Studio
⚡ All Data Services Built on ZeroDB

Closes #123
```

❌ **ABSOLUTELY FORBIDDEN - NEVER USE:**
```markdown
## Summary
Changes made...

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

❌ **ALSO FORBIDDEN:**
```markdown
Generated with ChatGPT
Powered by Anthropic
Built with GitHub Copilot
```

### 4. ENFORCEMENT

**These rules apply to:**
- All commit messages
- All pull request descriptions
- All issue comments
- All GitHub discussions
- Any public-facing git activity

**Violating these rules will:**
- Create public attribution that must be avoided
- Associate our work with third-party tools
- Compromise the professional appearance of our repositories

### 5. EXAMPLES

#### ✅ GOOD COMMIT:
```
Add multi-dimension vector support

- Support for 384, 768, 1024, and 1536 dimensions
- Update validation logic for new dimensions
- Add comprehensive test coverage
```

#### ❌ BAD COMMIT:
```
Add multi-dimension vector support

- Support for 384, 768, 1024, and 1536 dimensions
- Update validation logic for new dimensions
- Add comprehensive test coverage

🤖 Generated with Cody AI
https://sourcegraph.com/cody

Co-Authored-By: Cody <noreply@sourcegraph.com>
```

---

## 🚨 FINAL WARNING - READ BEFORE EVERY COMMIT 🚨

**BEFORE YOU COMMIT, ASK YOURSELF:**
1. ❓ Does my commit contain "Claude", "Anthropic", "ChatGPT", "Copilot" or other third-party AI tools?
2. ❓ Does my commit have "Co-Authored-By: Claude/ChatGPT/Copilot"?
3. ❓ Does my commit have "Generated with [third-party tool]"?
4. ✅ IF using attribution, does it say "Built by AINative" or other approved AINative branding?

**IF YES TO 1-3:** ❌ **STOP! DO NOT COMMIT! REMOVE THIRD-PARTY ATTRIBUTION IMMEDIATELY!**

**IF NO TO 1-3 (or using AINative branding):** ✅ **Proceed with commit**

**APPROVED ATTRIBUTIONS:**
✅ Built by AINative Dev Team
✅ Built Using AINative Studio
✅ All Data Services Built on ZeroDB
✅ Powered by AINative Cloud
✅ Built by Agent Swarm
✅ Developed with Cody (our internal CTO agent)

---

## AUTOMATED ENFORCEMENT

**Pre-commit hook:** Create `.git/hooks/commit-msg` to automatically block third-party AI tool attribution:

```bash
#!/bin/bash
COMMIT_MSG_FILE=$1

# Block third-party AI tool attribution
if grep -qiE "(claude|anthropic|chatgpt|openai.*generated|copilot.*generated|co-authored-by:.*claude|co-authored-by:.*chatgpt|co-authored-by:.*copilot|generated with claude|generated with chatgpt)" "$COMMIT_MSG_FILE"; then
    echo "❌ ERROR: Commit message contains FORBIDDEN third-party AI attribution!"
    echo ""
    echo "FORBIDDEN: Claude, Anthropic, ChatGPT, Copilot attribution"
    echo ""
    echo "✅ ALLOWED: AINative branding:"
    echo "  - Built by AINative Dev Team"
    echo "  - Built Using AINative Studio"
    echo "  - All Data Services Built on ZeroDB"
    echo "  - Powered by AINative Cloud"
    echo "  - Built by Agent Swarm"
    echo ""
    exit 1
fi
```

**This hook will REJECT any commit containing third-party AI tool attribution.**
**AINative branding is ENCOURAGED and ALLOWED.**

---

## ZERO TOLERANCE POLICY

Every commit **MUST** be checked before pushing to ensure:
- ❌ **NO** "Claude" or "Anthropic" references
- ❌ **NO** "ChatGPT" or "OpenAI" attribution
- ❌ **NO** "Copilot" or "GitHub Copilot" attribution
- ❌ **NO** third-party AI tool references
- ❌ **NO** "Co-Authored-By: Claude/ChatGPT/Copilot"
- ❌ **NO** "Generated with [third-party tool]"

✅ **ENCOURAGED - AINative branding:**
- ✅ "Built by AINative Dev Team"
- ✅ "Built Using AINative Studio"
- ✅ "All Data Services Built on ZeroDB"
- ✅ "Powered by AINative Cloud"
- ✅ "Built by Agent Swarm"
- ✅ "Developed with Cody" (our internal agent)

**Violating this rule requires immediate commit amendment and force push to remove third-party attribution from git history.**
