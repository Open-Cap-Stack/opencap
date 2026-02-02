---
description: Browse and search available skills from all marketplace sources
---

Browse available skills from the AINative Studio Skills Marketplace, including official, Anthropic, and community-contributed skills.

**Usage:**

```bash
# Browse all available skills
/skill marketplace browse

# Search for specific skills
/skill marketplace browse react

# Filter by category
/skill marketplace browse --category testing

# Filter by provider
/skill marketplace browse --provider official
/skill marketplace browse --provider anthropic
/skill marketplace browse --provider community

# Combine filters
/skill marketplace browse react --category frontend --provider official

# Force refresh cache
/skill marketplace browse --force-refresh

# Show cache status
/skill marketplace browse --show-cache-status
```

**Marketplace Sources:**

1. **Official Marketplace** (AINative Studio)
   - Curated, tested, and maintained by AINative team
   - High quality standards
   - Regular updates and support

2. **Anthropic Marketplace**
   - Skills from Anthropic's official collection
   - Claude-optimized workflows
   - Best practices from Anthropic

3. **Community Marketplace**
   - User-contributed skills
   - Diverse range of use cases
   - Community-driven support

**Example Output:**

```
Available Skills from Marketplace:

Official Skills:
  • git-workflow (1.1.0) ⭐ 4.8
    Git commit, PR, and branching standards
    Downloads: 1.2k | Last updated: 2 days ago
    Install: /skill install @ainative/git-workflow

  • mandatory-tdd (1.3.0) ⭐ 4.9
    Test-Driven Development enforcement
    Downloads: 980 | Last updated: 1 week ago
    Install: /skill install @ainative/mandatory-tdd

Anthropic Skills:
  • claude-prompting (2.0.0) ⭐ 4.7
    Best practices for Claude prompting
    Downloads: 2.1k | Last updated: 3 days ago
    Install: /skill install @anthropic/claude-prompting

Community Skills:
  • react-patterns (1.5.0) ⭐ 4.5
    React best practices and patterns
    Downloads: 450 | Last updated: 1 month ago
    Install: /skill install community/react-patterns

Total: 150+ skills available
```

**Search Features:**

- **Text Search**: Searches in skill name, description, and keywords
- **Category Filter**: Filter by skill category (testing, git, deployment, etc.)
- **Provider Filter**: Filter by marketplace source
- **Combined Filters**: Use multiple filters together

**Cache Management:**

Skills are cached for 1 hour by default to improve performance:

- **Check Cache Status**:
  ```bash
  /skill marketplace browse --show-cache-status
  ```

- **Force Refresh**:
  ```bash
  /skill marketplace browse --force-refresh
  ```

**Cache Status Output:**
```
Marketplace Cache Status:

Official Marketplace:
  Status: Valid
  Last Update: 15 minutes ago
  Skills Cached: 45

Anthropic Marketplace:
  Status: Valid
  Last Update: 20 minutes ago
  Skills Cached: 32

Community Marketplace:
  Status: Expired
  Last Update: 2 hours ago
  Skills Cached: 73

Run with --force-refresh to update caches.
```

**Skill Information Displayed:**

- **Name**: Skill identifier
- **Version**: Latest available version
- **Rating**: Average user rating (⭐ 0-5)
- **Description**: Brief description of the skill
- **Downloads**: Total download count
- **Last Updated**: When the skill was last updated
- **Install Command**: Ready-to-use install command

**Error Handling:**

- Gracefully handles network failures
- Shows partial results if some sources fail
- Displays helpful error messages
- Suggests retry with --force-refresh if cache is stale

**Quick Actions:**

After browsing, you can:
1. Copy install command directly
2. View detailed skill information
3. Install skill immediately
4. Compare similar skills

Execute the marketplace browse command by calling the marketplace service through the VS Code command palette or chat interface.
