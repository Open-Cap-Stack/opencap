# .claude Directory Symlink Setup

This guide explains how to share the campaign management system (and other .claude resources) across multiple projects.

---

## What Gets Shared

When you symlink the `.claude/` directory, all projects share:

✅ **Skills** (`.claude/skills/`)
- `email-campaign-management.md` - Complete campaign workflow guide (600+ lines)
- All other skill documents

✅ **Slash Commands** (`.claude/commands/`)
- `/campaign-create` - Create new campaigns
- `/campaign-stats` - Get statistics
- `/campaign-send-reminders` - Send reminder emails
- `/campaign-activate-trials` - Activate trials
- `/campaign-report` - Generate performance reports
- All other custom commands

✅ **Configuration Files**
- `mcp.json.example` - MCP server templates
- `settings.local.json` - Local settings
- Project guides and documentation

---

## Setup Instructions

### For New Projects

**Option 1: Symlink Entire Directory (Recommended)**

```bash
cd /path/to/your-new-project
rm -rf .claude  # Remove if exists
ln -s /Users/aideveloper/core/.claude .claude
```

**Verification**:
```bash
ls -la .claude
# Should show: .claude -> /Users/aideveloper/core/.claude

# Test commands are available
claude /campaign-stats
```

---

**Option 2: Symlink Specific Subdirectories**

If you want project-specific configuration but shared skills/commands:

```bash
cd /path/to/your-new-project
mkdir -p .claude

# Link skills and commands only
ln -s /Users/aideveloper/core/.claude/skills .claude/skills
ln -s /Users/aideveloper/core/.claude/commands .claude/commands

# Keep project-specific config
cp /Users/aideveloper/core/.claude/mcp.json.example .claude/mcp.json
```

---

### For Existing Projects

If your project already has a `.claude/` directory:

```bash
cd /path/to/your-existing-project

# Backup existing .claude
mv .claude .claude.backup

# Create symlink
ln -s /Users/aideveloper/core/.claude .claude

# Restore project-specific files if needed
cp .claude.backup/mcp.json .claude/mcp.json.local
```

---

## Projects Currently Using Symlinks

**Core Projects**:
- `/Users/aideveloper/core` - **Source of truth** (main repository)
- `/Users/aideveloper/AINativeStudio-IDE/ainative-studio` - Website project
- Other projects (add here as you symlink them)

---

## Benefits

✅ **Single Source of Truth**
- Update campaign workflows once in `core`
- All projects get updates automatically
- No duplicate documentation

✅ **Consistent Best Practices**
- Same slash commands everywhere
- Same SQL patterns and error handling
- Same email templates and styling

✅ **Zero Maintenance**
- No manual syncing needed
- Git pull updates all projects
- Changes propagate immediately

✅ **Team Collaboration**
- Everyone uses same tools
- Shared knowledge base
- Easier onboarding

---

## How Updates Work

### Developer Workflow

1. **Make changes in core**:
   ```bash
   cd /Users/aideveloper/core
   vim .claude/skills/email-campaign-management.md
   git add .claude/
   git commit -m "Update campaign management guide"
   git push origin main
   ```

2. **All symlinked projects get updates automatically**:
   ```bash
   # Other developers pull
   cd /path/to/any-symlinked-project
   ls -la .claude  # Still pointing to core
   # Changes are immediately available!
   ```

3. **Team members pull core updates**:
   ```bash
   cd /Users/aideveloper/core
   git pull origin main
   # All symlinked projects now have the updates
   ```

---

## What NOT to Symlink

Keep these project-specific:

❌ `.env` files (secrets)
❌ `node_modules/` (dependencies)
❌ `dist/` or `build/` (compiled code)
❌ `.git/` (version control)
❌ Project-specific configuration files

✅ **Only symlink `.claude/`** for shared tools and documentation

---

## Troubleshooting

### Symlink Not Working

**Check if symlink exists**:
```bash
ls -la .claude
# Should show: .claude -> /path/to/core/.claude
```

**Recreate symlink**:
```bash
rm .claude
ln -s /Users/aideveloper/core/.claude .claude
```

---

### Commands Not Available

**Verify symlink path**:
```bash
readlink .claude
# Should output: /Users/aideveloper/core/.claude
```

**Test command access**:
```bash
ls .claude/commands/campaign-*.md
# Should list 5 campaign commands
```

---

### Changes Not Appearing

**Check if you're editing the right file**:
```bash
# BAD - editing symlink target directly
vim /Users/aideveloper/core/.claude/skills/email-campaign-management.md

# GOOD - edit in core, commit, other projects auto-update
cd /Users/aideveloper/core
vim .claude/skills/email-campaign-management.md
git commit -am "Update guide"
git push
```

---

## Migration Guide

### Moving from Copied .claude to Symlinked

```bash
#!/bin/bash
# migrate-to-symlink.sh

PROJECT_DIR="/path/to/your-project"
CORE_CLAUDE="/Users/aideveloper/core/.claude"

cd "$PROJECT_DIR"

# Backup current .claude
if [ -d ".claude" ] && [ ! -L ".claude" ]; then
  echo "Backing up existing .claude..."
  mv .claude .claude.backup.$(date +%Y%m%d)
fi

# Create symlink
echo "Creating symlink to core..."
ln -sf "$CORE_CLAUDE" .claude

# Verify
if [ -L ".claude" ]; then
  echo "✅ Symlink created successfully"
  ls -la .claude
else
  echo "❌ Symlink creation failed"
fi
```

---

## Best Practices

### DO
✅ Make all changes in `core/.claude/`
✅ Commit and push changes regularly
✅ Test commands after updates
✅ Document changes in commit messages
✅ Keep project-specific config separate

### DON'T
❌ Edit files through symlinks in other projects
❌ Create duplicate skill/command files
❌ Hardcode project-specific paths in shared files
❌ Commit symlinks to git (add `.claude` to `.gitignore`)
❌ Break the symlink accidentally

---

## Git Configuration

### In Core Repository (Source)
```bash
# .gitignore - commit .claude/ to core
# (do NOT ignore .claude/ in core repo)
```

### In Other Projects (Symlinked)
```bash
# .gitignore - ignore symlinked .claude/
.claude/

# OR if you need project-specific .claude config
.claude/*
!.claude/mcp.json.local
!.claude/settings.local.json
```

---

## Questions & Support

**Issue with symlinks?**
- Slack: #engineering
- Contact: DevOps team
- Documentation: This file

**Want to add new shared resources?**
- Add to `core/.claude/`
- Commit and push
- All projects auto-update

**Need project-specific customization?**
- Keep in project directory (not .claude/)
- Or use `.claude/*.local` files (not symlinked)

---

**Last Updated**: January 5, 2026
**Maintained By**: Engineering Team
**Source Repository**: `core/.claude/`
