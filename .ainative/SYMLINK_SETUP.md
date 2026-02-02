# .ainative Symlink Setup Guide

**Purpose**: Share .ainative configuration across all AINative Studio projects
**Location**: `/Users/aideveloper/core/.ainative` (central location)
**Last Updated**: 2026-01-18

---

## Overview

The `.ainative` directory is **centrally managed** at `/Users/aideveloper/core/.ainative` and symlinked to all projects. This ensures:

✅ **Single source of truth** for AI coding rules
✅ **No duplication** - update once, apply everywhere
✅ **Consistency** across all AINative Studio projects
✅ **Gemini CLI compatibility** with universal rules

---

## Directory Structure

### Central Location (Source of Truth)
```
/Users/aideveloper/core/.ainative/
├── README.md                        # Quick reference guide
├── AINATIVE.md                      # Universal project context
├── settings.json                    # Gemini CLI settings template
├── SYMLINK_SETUP.md                 # This file
└── rules/
    └── gemini-cli-alignment.md      # Alignment rules
```

### Projects (Symlinked)
```
/Users/aideveloper/[project]/.ainative → /Users/aideveloper/core/.ainative
```

**Example Projects**:
- ✅ `/Users/aideveloper/ainative-website-nextjs-staging/.ainative` → symlink
- ✅ `/Users/aideveloper/ai-kit/.claude` → symlink (already exists)
- Future projects will follow this pattern

---

## Setting Up .ainative in New Projects

### Step 1: Remove Local .ainative (if exists)
```bash
cd /path/to/your/project
rm -rf .ainative
```

### Step 2: Create Symlink
```bash
ln -s /Users/aideveloper/core/.ainative .ainative
```

### Step 3: Verify Symlink
```bash
ls -la .ainative
# Should show: lrwxr-xr-x  .ainative -> /Users/aideveloper/core/.ainative

# Test read access
cat .ainative/README.md | head -10
```

### Step 4: Test with Gemini CLI
```bash
gemini
# Gemini CLI will automatically load .ainative/settings.json and AINATIVE.md
```

---

## Quick Setup Script

Save this as `setup-ainative-symlink.sh`:

```bash
#!/bin/bash
# Setup .ainative symlink for a project

PROJECT_DIR="${1:-.}"
CORE_AINATIVE="/Users/aideveloper/core/.ainative"

cd "$PROJECT_DIR" || exit 1

# Remove existing .ainative if it's not a symlink
if [ -d ".ainative" ] && [ ! -L ".ainative" ]; then
    echo "Removing local .ainative directory..."
    rm -rf .ainative
fi

# Create symlink
if [ ! -e ".ainative" ]; then
    echo "Creating symlink to $CORE_AINATIVE..."
    ln -s "$CORE_AINATIVE" .ainative
    echo "✅ Symlink created successfully!"
else
    echo "✅ Symlink already exists"
fi

# Verify
ls -la .ainative
```

Usage:
```bash
chmod +x setup-ainative-symlink.sh
./setup-ainative-symlink.sh /path/to/project
```

---

## Existing Symlinks

### Projects with .ainative Symlink
1. ✅ **ainative-website-nextjs-staging**
   - Path: `/Users/aideveloper/ainative-website-nextjs-staging/.ainative`
   - Target: `/Users/aideveloper/core/.ainative`
   - Status: Active

### Projects with .claude Symlink (Similar Pattern)
1. ✅ **ai-kit**
   - Path: `/Users/aideveloper/ai-kit/.claude`
   - Target: `/Users/aideveloper/core/.claude`
   - Status: Active (established pattern)

---

## Updating .ainative (Central)

### When to Update

Update `/Users/aideveloper/core/.ainative` when:
- ✅ AI coding rules change (ZERO TOLERANCE policy, commit style, etc.)
- ✅ Gemini CLI configuration needs adjustment
- ✅ MCP servers are added/removed
- ✅ Security policies change (trusted folders, etc.)
- ✅ New AI tools are adopted
- ✅ Universal project patterns emerge

### How to Update

1. **Edit files in central location**:
   ```bash
   cd /Users/aideveloper/core/.ainative
   nano AINATIVE.md  # or settings.json, etc.
   ```

2. **Changes apply immediately** to all symlinked projects (no propagation needed!)

3. **Test with any project**:
   ```bash
   cd /Users/aideveloper/ainative-website-nextjs-staging
   cat .ainative/AINATIVE.md  # Should show updated content
   ```

---

## DO NOT Update in Individual Projects

❌ **NEVER edit .ainative files through project symlinks**

Why?
- Changes would affect ALL projects
- Could break other projects
- Defeats purpose of central management

✅ **ALWAYS update in central location**:
```bash
# ✅ CORRECT
cd /Users/aideveloper/core/.ainative
edit AINATIVE.md

# ❌ WRONG
cd /Users/aideveloper/some-project/.ainative
edit AINATIVE.md  # This updates central too!
```

---

## Project-Specific Context

### Where to Put Project-Specific Info?

**Use `.claude/CLAUDE.md` for project-specific context**:

```
/Users/aideveloper/[project]/
├── .ainative/              # Symlink (universal rules)
└── .claude/
    └── CLAUDE.md           # Project-specific context
```

**Division of Responsibility**:

| File | Scope | Contains |
|------|-------|----------|
| `.ainative/AINATIVE.md` | **Universal** | AI coding rules, commit style, ZERO TOLERANCE policy, Gemini CLI setup |
| `.ainative/settings.json` | **Universal** | Gemini CLI config template, MCP servers, security defaults |
| `.claude/CLAUDE.md` | **Project-specific** | Tech stack, architecture, repo paths, project-specific workflows |

---

## Verification Checklist

### After Setting Up Symlink

- [ ] Symlink exists: `ls -la .ainative`
- [ ] Points to core: Shows `-> /Users/aideveloper/core/.ainative`
- [ ] Can read files: `cat .ainative/README.md` works
- [ ] Gemini CLI loads config: `gemini` starts successfully
- [ ] Git ignores symlink: Check `.gitignore` includes `.ainative` (or commit the symlink)

### Symlink Health Check

Run this periodically:

```bash
#!/bin/bash
# Check .ainative symlink health

CORE_AINATIVE="/Users/aideveloper/core/.ainative"

# Check if core exists
if [ ! -d "$CORE_AINATIVE" ]; then
    echo "❌ Core .ainative missing at $CORE_AINATIVE"
    exit 1
fi

# Check if symlink works
if [ -L ".ainative" ]; then
    TARGET=$(readlink .ainative)
    if [ "$TARGET" = "$CORE_AINATIVE" ]; then
        echo "✅ Symlink healthy: .ainative -> $CORE_AINATIVE"
    else
        echo "⚠️  Symlink points to wrong location: $TARGET"
    fi
else
    echo "❌ .ainative is not a symlink"
fi

# Check read access
if cat .ainative/README.md >/dev/null 2>&1; then
    echo "✅ Read access works"
else
    echo "❌ Cannot read through symlink"
fi
```

---

## Git Considerations

### Option 1: Commit the Symlink (Recommended)

```bash
# .gitignore should NOT include .ainative
git add .ainative
git commit -m "Add .ainative symlink to core configuration"
```

**Pros**:
- Other developers get symlink automatically
- Consistent setup across team
- Clear intent in repository

**Cons**:
- Requires absolute path (works if all developers use same structure)
- May not work on different machines

### Option 2: Ignore and Document

```bash
# .gitignore
.ainative
```

Add to README:
```markdown
## Setup

After cloning, create .ainative symlink:
```bash
ln -s /Users/aideveloper/core/.ainative .ainative
```
```

**Pros**:
- Flexible for different developer setups
- No absolute path issues

**Cons**:
- Manual step for new developers
- Easy to forget

---

## Troubleshooting

### Symlink Broken
```bash
ls: .ainative: No such file or directory
```

**Solution**:
```bash
rm .ainative
ln -s /Users/aideveloper/core/.ainative .ainative
```

### Permission Denied
```bash
cat .ainative/README.md
# Permission denied
```

**Solution**:
```bash
chmod -R +r /Users/aideveloper/core/.ainative
```

### Gemini CLI Not Loading Config
```bash
gemini
# Doesn't load .ainative/settings.json
```

**Solution**:
```bash
# Verify symlink
ls -la .ainative

# Verify file exists
cat .ainative/settings.json | jq .

# Start Gemini CLI with explicit config
gemini --settings .ainative/settings.json
```

---

## Comparison: .claude vs .ainative

### .claude (Claude Code Specific)
- **Location**: Each project has own `.claude/` OR symlinks to core
- **Purpose**: Claude Code configuration and project context
- **Pattern**: Can be symlinked (e.g., `ai-kit/.claude -> core/.claude`)
- **Files**: `CLAUDE.md`, `settings.json`, `agents/`, `skills/`, `rules/`

### .ainative (Universal AI Tools)
- **Location**: Centralized at `/Users/aideveloper/core/.ainative`
- **Purpose**: Universal AI coding rules for all tools (Gemini CLI, Cursor, etc.)
- **Pattern**: ALWAYS symlinked to core
- **Files**: `AINATIVE.md`, `settings.json`, `rules/gemini-cli-alignment.md`

### Relationship
```
Project/
├── .claude/           # Project-specific or symlinked to core
│   └── CLAUDE.md      # Claude Code instructions
└── .ainative/         # ALWAYS symlink to core
    └── AINATIVE.md    # Universal AI rules
```

Both can coexist. Gemini CLI and Claude Code will load both contexts.

---

## Benefits of Symlink Approach

✅ **Single Source of Truth**
- Update rules once, apply everywhere
- No version drift between projects
- Consistent AI behavior across all projects

✅ **Less Maintenance**
- One file to update instead of N projects
- Easier to enforce standards
- Simpler to onboard new projects

✅ **Better Organization**
- Clear separation: core rules vs project-specific
- `.ainative` = universal, `.claude` = project-specific
- Easy to find and update core rules

✅ **Team Consistency**
- Everyone uses same AI coding rules
- No confusion about "which version"
- Easier code reviews (consistent style)

---

## Migration Notes

### Migrating Existing Projects

If a project already has local `.ainative`:

1. **Backup project-specific content** (if any):
   ```bash
   cd /path/to/project
   cp -r .ainative .ainative.backup
   ```

2. **Review for project-specific info**:
   ```bash
   diff .ainative/AINATIVE.md /Users/aideveloper/core/.ainative/AINATIVE.md
   ```

3. **Move project-specific content to .claude/CLAUDE.md**

4. **Replace with symlink**:
   ```bash
   rm -rf .ainative
   ln -s /Users/aideveloper/core/.ainative .ainative
   ```

---

## Future Plans

### Potential Enhancements
- [ ] Add `.ainative/templates/` for project scaffolding
- [ ] Create `.ainative/scripts/` for common tasks
- [ ] Add `.ainative/schemas/` for validation
- [ ] Create project-specific overrides mechanism

### Tools to Support
- ✅ Gemini CLI (primary)
- ✅ Claude Code (via compatibility)
- 🔄 Cursor (TBD - test compatibility)
- 🔄 Windsurf (TBD - test compatibility)
- 🔄 Cody (TBD - test compatibility)

---

**Setup Status**: ✅ Complete
**Current Projects Using Symlink**: ainative-website-nextjs-staging
**Maintained By**: AINative Studio Team
**Last Updated**: 2026-01-18
