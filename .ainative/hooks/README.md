# Git Hooks - File Placement & Commit Message Enforcement

## Quick Install

```bash
# From your project root:
bash .ainative/hooks/install-hooks.sh
```

Or if using .claude:
```bash
bash .claude/hooks/install-hooks.sh
```

## What Gets Installed

### 1. Pre-commit Hook
**Blocks:**
- .md files in root directory (except README.md, CLAUDE.md)
- .sh scripts in root directory
- .sh scripts in backend/ (except backend/start.sh)
- .md files in src/backend/

### 2. Commit-msg Hook
**Blocks:**
- "Claude", "Anthropic", "claude.com"
- "ChatGPT", "OpenAI" (as code author)
- "Copilot", "GitHub Copilot"
- "Generated with", "Powered by" + third-party tools
- "Co-Authored-By: Claude/ChatGPT/Copilot"

**Allows:**
- Built by AINative Dev Team
- Built Using AINative Studio
- All Data Services Built on ZeroDB
- Powered by AINative Cloud

## Testing

After installation, test with:

```bash
# Test file placement (should block)
touch test.md
git add test.md
git commit -m "test"

# Expected: ❌ BLOCKED

# Test commit message (should block)
git commit -m "test

Generated with Claude"

# Expected: ❌ BLOCKED
```

## Manual Installation

If the script doesn't work, install manually:

```bash
cp .ainative/hooks/pre-commit .git/hooks/pre-commit
cp .ainative/hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/commit-msg
```

## Related Documentation

- `.ainative/CRITICAL_FILE_PLACEMENT_RULES.md`
- `.ainative/git-rules.md`
- `.claude/skills/file-placement/SKILL.md`
- `.claude/skills/git-workflow/`
