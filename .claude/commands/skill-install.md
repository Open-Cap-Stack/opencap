---
description: Install a skill from local/NPM/GitHub/URL
---

Install a skill from various sources into the AINative Studio Skills Manager.

**Supported Sources:**

1. **Local Path**: Install from a local directory
   ```
   /skill install /path/to/my-skill
   ```

2. **NPM Package**: Install from NPM registry
   ```
   /skill install my-skill-package
   /skill install @scope/my-skill
   ```

3. **GitHub Repository**: Install from GitHub
   ```
   /skill install owner/repo
   /skill install github:owner/repo
   ```

4. **URL**: Install from a direct URL (ZIP or tarball)
   ```
   /skill install https://example.com/skill.zip
   /skill install https://example.com/skill.tar.gz
   ```

**Options:**

- `--force`: Force reinstall even if already installed
- `--skip-validation`: Skip validation during install (use with caution)

**Examples:**

```bash
# Install from local directory
/skill install ./skills/my-custom-skill

# Install from NPM
/skill install @ainative/git-workflow

# Install from GitHub
/skill install ainative/official-skills

# Force reinstall
/skill install my-skill --force
```

**What happens during installation:**

1. **Source Detection**: Automatically detects source type (local, NPM, GitHub, URL)
2. **Download/Copy**: Downloads or copies skill to temporary location
3. **Validation**: Validates skill format (SKILL.md exists and is properly formatted)
4. **Metadata Parsing**: Reads skill metadata (name, version, description)
5. **Installation**: Copies skill to `~/.ainative/skills/{skill-name}/`
6. **Registry Update**: Adds skill to registry at `~/.ainative/skills/registry.json`

**Success Output:**
```
Successfully installed skill 'my-skill' (version 1.0.0) from local
```

**Error Handling:**

- Shows clear error if source is invalid or inaccessible
- Prevents duplicate installations (unless --force is used)
- Validates skill format before completing installation
- Cleans up temporary files even if installation fails

Execute the skill installation by calling the `ainative.skill.install` command with the source parameter.
