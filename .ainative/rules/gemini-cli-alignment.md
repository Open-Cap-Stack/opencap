# Gemini CLI Alignment Rules

**Purpose**: Ensure AINative Studio project is compatible with both Gemini CLI and Claude Code
**Last Updated**: 2026-01-18

---

## Project Context Compatibility

### Gemini CLI Conventions
Gemini CLI uses `.gemini/` folder with `settings.json` and `GEMINI.md` context files.

### AINative Studio Approach
We use **`.ainative/`** folder to provide similar functionality while maintaining brand identity:

```
.ainative/
├── AINATIVE.md          # Project context (equivalent to GEMINI.md)
├── settings.json        # Gemini CLI-compatible settings
└── rules/               # Custom rules and guidelines
    ├── gemini-cli-alignment.md  # This file
    ├── coding-standards.md
    └── git-workflow.md
```

### Dual Configuration Support

Both configurations coexist for maximum compatibility:

| File | Purpose | Compatible With |
|------|---------|-----------------|
| `.claude/CLAUDE.md` | Claude Code primary context | Claude Code |
| `.ainative/AINATIVE.md` | Project context for all AI tools | Gemini CLI, Claude Code, Cursor, etc. |
| `.ainative/settings.json` | Gemini CLI settings | Gemini CLI |
| `.claude/settings.json` | Claude Code settings | Claude Code |

---

## Configuration Hierarchy

Following Gemini CLI's configuration precedence (lowest to highest):

1. ✅ Hardcoded defaults
2. ✅ System defaults
3. ✅ User settings (`~/.gemini/settings.json` or `~/.claude/settings.json`)
4. ✅ **Project settings** (`.ainative/settings.json` or `.claude/CLAUDE.md`)
5. ✅ Environment variables
6. ✅ Command-line arguments

---

## Context File Pattern

### GEMINI.md Pattern (Gemini CLI)
Gemini CLI uses `GEMINI.md` files for persistent project guidance.

### AINATIVE.md Pattern (Our Implementation)
We provide `AINATIVE.md` with the same functionality but project-specific branding:

```markdown
# AINative Studio Project Context

## Project Overview
[Project description]

## Repository Paths
[Next.js and Vite paths]

## Tech Stack
[Technology details]

## Development Workflow
[Commands and procedures]
```

---

## Settings.json Compatibility

Our `.ainative/settings.json` follows Gemini CLI schema with extensions:

```json
{
  "$schema": "https://google-gemini.github.io/gemini-cli/schemas/settings.schema.json",
  "project": { "name": "..." },
  "paths": { "include_directories": [...] },
  "context": { "primary_context_file": ".ainative/AINATIVE.md" },
  "model": { "default": "gemini-2.5-pro" },
  "tools": { "enabled": [...] },
  "security": { "trusted_folders": [...] },
  "extensions": { "mcp_servers": {...} }
}
```

---

## Tool Integration

### Gemini CLI Built-in Tools
- ✅ `file_read` - File operations
- ✅ `file_write` - File modifications
- ✅ `shell` - Shell commands
- ✅ `web_fetch` - Web fetching
- ✅ `memory` - Persistent context

### AINative Extensions (MCP)
- ✅ `zerodb` - Vector database operations
- ✅ `github` - GitHub API integration
- ✅ `ainative-design` - Design system analysis

### Claude Code Tools
- ✅ `Read` - File reading
- ✅ `Edit` - File editing
- ✅ `Write` - File creation
- ✅ `Bash` - Shell execution
- ✅ `WebFetch` - Web fetching

---

## Memory & Context Management

### Gemini CLI Approach
- Uses `save_memory` tool for persistent context
- Token caching for optimization
- Checkpointing for session state

### AINative Approach
- **Primary Context**: `.ainative/AINATIVE.md` (always loaded)
- **Supplementary Context**: Gap analysis documents
- **MCP Memory**: ZeroDB MCP server for vector memory
- **Session State**: Preserved via gap tracking and issue links

---

## Security & Trusted Folders

### Gemini CLI Security Model
- Trusted folders for execution policies
- Sandboxing for safe execution
- Custom sandbox profiles

### AINative Security Configuration
```json
{
  "security": {
    "trusted_folders": [
      "/Users/aideveloper/ainative-website-nextjs-staging",
      "/Users/aideveloper/core/AINative-website"
    ],
    "sandbox_profile": "default"
  }
}
```

**Trusted Operations**:
- ✅ Read files in project directories
- ✅ Write files in project directories
- ✅ Execute npm/git/node commands
- ❌ System-level modifications
- ❌ Network access outside approved APIs

---

## Command Compatibility

### Gemini CLI Commands
```bash
# Start Gemini CLI
gemini

# With specific directory
gemini --include-directories app,components,lib

# With custom settings
gemini --settings .ainative/settings.json
```

### Claude Code Commands
```bash
# Start Claude Code
claude

# With project context
# Automatically reads .claude/CLAUDE.md and .ainative/AINATIVE.md
```

---

## Path References

### Explicit Path Configuration
Both tools can reference project paths explicitly:

**Next.js (Production)**:
```
/Users/aideveloper/ainative-website-nextjs-staging
```

**Vite (Reference)**:
```
/Users/aideveloper/core/AINative-website
```

### Include Directories
Focus AI attention on relevant code:
```json
"include_directories": [
  "app",           // Next.js pages
  "components",    // React components
  "lib",           // Utilities and config
  "services",      // API services
  "public"         // Static assets
]
```

### Exclude Patterns
Reduce noise from generated files:
```json
"exclude_patterns": [
  "node_modules",
  ".next",
  "dist",
  "build",
  "*.test.ts",
  "*.test.tsx"
]
```

---

## AI Coding Rules (Universal)

### ZERO TOLERANCE: Git Attribution
**NEVER include in commits, PRs, or GitHub activity:**
- ❌ "Claude" / "Anthropic" / "claude.com"
- ❌ "Gemini" / "Google" / AI tool names
- ❌ "Generated with [AI Tool]"
- ❌ "Co-Authored-By: [AI Tool]"
- ❌ 🤖 emoji with "Generated with" text
- ❌ Any AI tool attribution

**Rationale**: Professional commits, human ownership, client trust

### Commit Style (Conventional Commits)
```
feat: Add user authentication
fix: Resolve navigation bug
docs: Update API documentation
style: Format code with Prettier
refactor: Simplify pricing logic
test: Add unit tests for services
chore: Update dependencies
```

### Code Quality Standards
- ✅ Linting: `npm run lint` must pass
- ✅ Type checking: `npm run type-check` must pass
- ✅ Build: `npm run build` must succeed
- ✅ Testing: `npm test` must pass (80% coverage minimum)

---

## Usage Guidelines

### For Gemini CLI Users

1. **Navigate to project**:
   ```bash
   cd /Users/aideveloper/ainative-website-nextjs-staging
   ```

2. **Start Gemini CLI**:
   ```bash
   gemini
   ```

3. **CLI will automatically load**:
   - `.ainative/settings.json`
   - `.ainative/AINATIVE.md` (project context)
   - Gap analysis documents (as referenced in context)

4. **Verify context loaded**:
   ```
   @memory What is the project structure?
   ```

### For Claude Code Users

1. **Open project in Claude Code**:
   ```bash
   claude /Users/aideveloper/ainative-website-nextjs-staging
   ```

2. **Claude Code will automatically load**:
   - `.claude/CLAUDE.md` (primary context)
   - `.ainative/AINATIVE.md` (supplementary context)
   - Project rules and gap analysis

3. **Verify context**:
   Ask Claude about project specifics mentioned in AINATIVE.md

### For Other AI Tools (Cursor, Windsurf, etc.)

1. **Read project context manually**:
   - Open `.ainative/AINATIVE.md`
   - Review `settings.json` for configuration

2. **Follow coding rules**:
   - See `.ainative/rules/coding-standards.md`
   - Follow git workflow in `.ainative/rules/git-workflow.md`

---

## MCP Server Integration

### Gemini CLI MCP Support
Gemini CLI natively supports MCP servers via `settings.json`:

```json
{
  "extensions": {
    "mcp_servers": {
      "zerodb": { "enabled": true },
      "github": { "enabled": true },
      "ainative-design": { "enabled": true }
    }
  }
}
```

### Claude Code MCP Configuration
Claude Code uses `~/.claude/settings.json` for MCP servers:

```json
{
  "mcpServers": {
    "ainative-zerodb-mcp-server": {...},
    "@modelcontextprotocol/server-github": {...},
    "ainative-design": {...}
  }
}
```

**Both configurations reference the same MCP servers** for consistent tooling.

---

## Environment Variables

### Gemini CLI Environment Support
Settings.json supports variable resolution:
```json
{
  "deployment": {
    "production_url": "${PRODUCTION_URL}"
  }
}
```

### Claude Code Environment Support
Uses standard `.env.local` files:
```bash
NEXT_PUBLIC_SITE_URL=https://www.ainative.studio
NEXT_PUBLIC_API_URL=https://api.ainative.studio/v1
```

---

## Best Practices

### 1. Keep Context Files in Sync
- Update `.ainative/AINATIVE.md` when project structure changes
- Update `.claude/CLAUDE.md` with Claude-specific instructions
- Both files should reference the same project fundamentals

### 2. Use Appropriate Tool for Task
- **Gemini CLI**: Best for Gemini-specific features, Google workspace integration
- **Claude Code**: Best for complex refactoring, multi-file edits, TDD workflows
- **Both**: Can handle general coding tasks

### 3. Respect Security Boundaries
- Only modify files within trusted folders
- Don't execute arbitrary system commands
- Use sandbox profiles for experimental operations

### 4. Maintain Documentation
- Update gap analysis documents as issues are resolved
- Keep context files current with latest project state
- Document new patterns and conventions

---

## Troubleshooting

### Issue: Gemini CLI not loading context
**Solution**: Verify `.ainative/settings.json` exists and `primary_context_file` path is correct

### Issue: Tools not available
**Solution**: Check `tools.enabled` array in settings.json and verify MCP servers are running

### Issue: Security warnings
**Solution**: Add project path to `security.trusted_folders` in settings.json

### Issue: Context too large
**Solution**: Reduce `context.max_context_files` or use more specific include directories

---

## Migration Notes

### From Vite to Next.js
When referencing Vite code:
1. Use read-only access to `/Users/aideveloper/core/AINative-website`
2. Don't modify Vite code (it's production)
3. Extract patterns and migrate to Next.js equivalent

### From react-helmet-async to Next.js metadata
```typescript
// Vite (old)
<Helmet>
  <title>Page Title</title>
  <meta name="description" content="..." />
</Helmet>

// Next.js (new)
export const metadata: Metadata = {
  title: 'Page Title',
  description: '...',
};
```

---

## Resources

### Gemini CLI
- Docs: https://google-gemini.github.io/gemini-cli/
- GitHub: https://github.com/google-gemini/gemini-cli
- Configuration: https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md

### Claude Code
- Docs: https://docs.claude.com/en/docs/claude-code/
- Project context: `.claude/CLAUDE.md`

### AINative Studio
- Next.js docs: `.ainative/AINATIVE.md`
- Gap analysis: `gaps-backlog.md`, `design-gaps-backlog.md`, `seo-gaps-backlog.md`

---

**Last Updated**: 2026-01-18
**Next Review**: After go-live
