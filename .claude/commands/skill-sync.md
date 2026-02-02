---
description: Sync skills from core repository when .claude is symlinked
---

Synchronize skills from the core repository by pulling the latest changes.

**Prerequisites:**
- The `.claude` directory must be symlinked to a git repository
- The core repository should be on the `main` branch

**What this command does:**

1. **Detect Symlink:**
   - Verifies `.claude` directory is a symbolic link
   - Resolves the symlink target path
   - If not symlinked, displays setup instructions

2. **Pull Latest Changes:**
   - Navigates to the core repository directory
   - Checks for uncommitted changes (warns if found)
   - Executes `git pull origin main`
   - Shows git output to user

3. **Refresh Skills Registry:**
   - Re-scans `.claude/skills/` directory
   - Updates skills registry in `~/.ainative/skills/registry.json`
   - Identifies updated skills, new skills, and removed skills

4. **Display Summary:**
   - Shows which skills were updated (with version changes)
   - Shows which skills are new
   - Shows which skills are unchanged
   - Displays total count

**Usage:**
```bash
/skill sync
```

**Expected Output (when symlinked):**
```
Checking for skill updates...

Detected symlink: .claude → /Users/aideveloper/core/.claude
Pulling latest changes from core repository...

✓ Repository updated successfully

Refreshing skills cache...

Updated Skills:
  ✓ git-workflow (1.0.0 → 1.1.0)
  ✓ mandatory-tdd (1.2.0 → 1.3.0)
  + delivery-checklist (1.0.0) [NEW]

Total: 10 skills in registry (3 updated, 1 new, 6 unchanged)

Your skills are now up to date!
```

**Expected Output (when NOT symlinked):**
```
⚠️  Skills sync not available

Your .claude directory is not symlinked to the core repository.

To enable syncing:
1. Clone core repository: git clone https://github.com/ainative/core.git
2. Remove current .claude: rm -rf .claude
3. Create symlink: ln -s /path/to/core/.claude .claude

After setup, run /skill sync again to pull latest skills.
```

**Error Handling:**

- **Uncommitted Changes:** Warns user and asks to commit/stash before pulling
- **Merge Conflicts:** Shows conflict resolution instructions
- **Network Failures:** Shows helpful error message with retry suggestion
- **Permission Errors:** Shows permission fix suggestions
- **Not a Git Repository:** Shows error and setup instructions

Execute the skill sync operation by:
1. Checking if `.claude` is a symlink
2. If symlinked, pull latest changes from git repository
3. Refresh the skills registry
4. Display a summary of changes
