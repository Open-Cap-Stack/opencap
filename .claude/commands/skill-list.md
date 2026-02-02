---
description: List installed skills with status and details
---

List all installed skills in the AINative Studio Skills Manager with their status, version, and source information.

**Usage:**

```bash
# List all skills
/skill list

# List only enabled skills
/skill list --enabled

# List only disabled skills
/skill list --disabled
```

**Output Format:**

Shows a formatted list with:
- Status icon (✅ enabled / ❌ disabled)
- Skill name and version
- Brief description
- Source (local/official/community)
- Installation date

**Example Output:**

```
Installed Skills:

✅ git-workflow (1.1.0)
   Git commit, PR, and branching standards
   Source: official | Installed: Jan 3, 2026

✅ mandatory-tdd (1.3.0)
   Test-Driven Development enforcement
   Source: official | Installed: Jan 2, 2026

❌ my-custom-skill (1.0.0)
   My experimental skill
   Source: local | Installed: Jan 1, 2026

Total: 3 skills (2 enabled, 1 disabled)
```

**Filtering Options:**

1. **Show All** (default):
   ```bash
   /skill list
   ```
   Shows all installed skills with their enabled/disabled status

2. **Enabled Only**:
   ```bash
   /skill list --enabled
   ```
   Shows only skills that are currently enabled

3. **Disabled Only**:
   ```bash
   /skill list --disabled
   ```
   Shows only skills that are currently disabled

**Empty State Messages:**

- **No skills installed**:
  ```
  No skills installed.

  Use "/skill create <skill-name>" to create a new skill.
  ```

- **No enabled skills**:
  ```
  No enabled skills found.

  Use "/skill list" to see all installed skills.
  ```

- **No disabled skills**:
  ```
  No disabled skills found.

  Use "/skill list" to see all installed skills.
  ```

**Skill Information Displayed:**

- **Name**: The skill identifier (e.g., git-workflow)
- **Version**: Semantic version number (e.g., 1.1.0)
- **Description**: Brief description from SKILL.md metadata
- **Source**: Where the skill was installed from
  - `local`: Installed from local directory
  - `official`: Installed from NPM (official skills)
  - `community`: Installed from GitHub or URL
- **Status**: Whether the skill is enabled (✅) or disabled (❌)
- **Installation Date**: When the skill was installed

Execute the skill list command by calling the `ainative.skill.list` action.
