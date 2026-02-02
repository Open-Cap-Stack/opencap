---
description: Uninstall an installed skill
---

Uninstall a skill from the AINative Studio Skills Manager.

**Usage:**

```bash
/skill uninstall <skill-name>
```

**Options:**

- `--skip-confirmation`: Skip confirmation prompt (use with caution)

**Examples:**

```bash
# Uninstall a skill with confirmation
/skill uninstall git-workflow

# Uninstall without confirmation
/skill uninstall my-skill --skip-confirmation
```

**What happens during uninstallation:**

1. **Validation**: Checks if skill is installed
2. **Confirmation**: Prompts user to confirm (unless --skip-confirmation)
3. **Removal**: Deletes skill directory from `~/.ainative/skills/{skill-name}/`
4. **Registry Update**: Removes skill entry from `~/.ainative/skills/registry.json`
5. **Cache Clear**: Clears any cached skill data

**Confirmation Prompt:**
```
Are you sure you want to uninstall 'git-workflow'?
This will permanently delete the skill files.

[Yes] [No]
```

**Success Output:**
```
Successfully uninstalled skill 'git-workflow'
```

**Error Handling:**

- Shows error if skill is not installed
- Allows user to cancel during confirmation
- Handles permission errors gracefully
- Shows helpful message if skill is currently in use

**Important Notes:**

- Uninstalling a skill does NOT remove it from enabled skills list
- You may want to disable the skill first before uninstalling
- Custom skills stored locally can be reinstalled from their original location
- Official skills can be reinstalled from NPM or GitHub

Execute the skill uninstallation by calling the `ainative.skill.uninstall` command with the skill name parameter.
