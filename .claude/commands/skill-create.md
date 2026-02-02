---
description: Create a new skill with proper directory structure and templates
---

Create a new skill scaffold with the proper directory structure, templates, and configuration files.

**Usage:**

```bash
/skill create <skill-name>
```

**Requirements:**

- Skill name must be lowercase
- Only alphanumeric characters and hyphens allowed
- Must start with a letter
- Should be descriptive and unique

**Valid Examples:**
```bash
/skill create my-custom-skill
/skill create react-patterns
/skill create test-automation
/skill create api-design
```

**Invalid Examples:**
```bash
/skill create MySkill           # ❌ No uppercase
/skill create my_skill          # ❌ No underscores
/skill create 123-skill         # ❌ Must start with letter
/skill create my skill          # ❌ No spaces
```

**Generated Structure:**

When you run `/skill create my-skill`, it creates:

```
~/.ainative/skills/my-skill/
├── SKILL.md              # Main skill definition
├── references/           # Reference documentation
│   └── example.md       # Example reference file
└── tests/               # Skill tests (optional)
    └── test.md          # Test template
```

**SKILL.md Template:**

```markdown
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
category: general
location: managed
tags:
  - custom
  - example
---

# My Skill

## Description
Detailed description of your skill...

## When to Use
- Use case 1
- Use case 2

## Examples
Example usage...

## Best Practices
- Best practice 1
- Best practice 2
```

**Success Output:**

```
✓ Skill 'my-skill' created successfully!

Location: ~/.ainative/skills/my-skill

Next steps:
1. Edit SKILL.md to define your skill
2. Add reference documentation in references/
3. Test your skill with /skill test my-skill
4. Enable your skill in settings

Structure created:
  ✓ SKILL.md (skill definition)
  ✓ references/ (documentation)
  ✓ tests/ (test cases)

Quick start:
  code ~/.ainative/skills/my-skill/SKILL.md
```

**What Gets Created:**

1. **Skill Directory**: `~/.ainative/skills/{skill-name}/`
2. **SKILL.md**: Main skill file with frontmatter template
3. **references/**: Directory for additional documentation
4. **references/example.md**: Example reference document
5. **tests/**: Directory for skill tests (optional)
6. **Registry Entry**: Automatically added to skills registry

**Frontmatter Fields:**

Required:
- `name`: Skill identifier (auto-filled from skill-name)
- `description`: Brief description (you need to fill this in)
- `version`: Semantic version (default: 1.0.0)

Optional:
- `category`: Skill category (general, testing, git, etc.)
- `location`: managed (default) or project
- `tags`: Array of keywords for searchability
- `author`: Your name or organization
- `homepage`: URL to documentation
- `repository`: Git repository URL

**After Creation:**

1. **Edit SKILL.md**: Fill in description, examples, and usage guidelines
2. **Add References**: Create additional documentation files
3. **Test**: Verify skill loads and works correctly
4. **Enable**: Add to enabled skills in settings
5. **Share**: Optionally publish to community marketplace

**Error Handling:**

- Validates skill name format before creation
- Checks if skill already exists
- Ensures ~/.ainative/skills/ directory exists
- Handles filesystem errors gracefully
- Shows helpful error messages for common issues

**Common Errors:**

- **Invalid Name Format**:
  ```
  Invalid skill name: 'My_Skill'
  Skill names must be lowercase with hyphens only.
  Example: my-custom-skill
  ```

- **Already Exists**:
  ```
  Skill 'my-skill' already exists at:
  ~/.ainative/skills/my-skill

  Use a different name or delete the existing skill first.
  ```

Execute the skill creation by calling the `ainative.skill.create` command with the skill name parameter.
