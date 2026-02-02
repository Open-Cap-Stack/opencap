# .ainative Directory

**Purpose**: Project context and configuration for AI coding assistants
**Compatible With**: Gemini CLI, Claude Code, Cursor, Windsurf, and other AI tools
**Last Updated**: 2026-01-18

---

## Quick Start

### For Gemini CLI Users

```bash
# Navigate to project
cd /Users/aideveloper/ainative-website-nextjs-staging

# Start Gemini CLI (automatically loads .ainative/settings.json)
gemini

# Verify context loaded
@memory What is this project?
```

### For Claude Code Users

```bash
# Open project (automatically reads .claude/ and .ainative/)
claude /Users/aideveloper/ainative-website-nextjs-staging
```

### For Other AI Tools

1. Read `AINATIVE.md` for complete project context
2. Review `settings.json` for configuration details
3. Follow rules in `rules/` directory

---

## Directory Structure

```
.ainative/
├── README.md                        # This file (quick reference)
├── AINATIVE.md                      # Complete project context
├── settings.json                    # Gemini CLI-compatible settings
└── rules/
    └── gemini-cli-alignment.md      # Alignment with Gemini CLI conventions
```

---

## File Descriptions

### AINATIVE.md
**Primary project context file** containing:
- Project overview and tech stack
- Repository paths (Next.js + Vite reference)
- Architecture and migration patterns
- Development workflow
- Git rules (ZERO TOLERANCE for AI attribution)
- Gap analysis status
- Environment variables
- Key file references

**When to read**: Always load first for project understanding

### settings.json
**Gemini CLI configuration** following their schema:
- Project metadata
- Path configurations
- Context file references
- Model settings
- Tool permissions
- Security policies
- MCP server integrations
- Development settings

**When to read**: For tool configuration and security settings

### rules/gemini-cli-alignment.md
**Compatibility guide** for Gemini CLI and other AI tools:
- Dual configuration approach (.ainative + .claude)
- Configuration hierarchy
- Tool integration patterns
- Path references
- AI coding rules (universal)
- Usage guidelines for different tools
- MCP server integration
- Best practices

**When to read**: When using Gemini CLI or ensuring cross-tool compatibility

---

## Key Project Paths

### Production Repository (Next.js)
```
/Users/aideveloper/ainative-website-nextjs-staging
```

### Reference Repository (Vite - Read Only)
```
/Users/aideveloper/core/AINative-website
```

---

## Important Rules

### ZERO TOLERANCE: AI Attribution
**NEVER include in commits, PRs, or issues:**
- ❌ "Claude", "Anthropic", "Gemini", "Google"
- ❌ "Generated with [AI Tool]"
- ❌ "Co-Authored-By: [AI Tool]"
- ❌ Any AI tool attribution

### Pre-Commit Checklist
1. ✅ `npm run lint` - must pass
2. ✅ `npm run type-check` - must pass
3. ✅ `npm run build` - must succeed
4. ✅ `npm test` - must pass

---

## Context Loading Order

1. **Primary**: `.ainative/AINATIVE.md` (project fundamentals)
2. **Supplementary**: `.claude/CLAUDE.md` (Claude-specific instructions)
3. **Gap Analysis**:
   - `gaps-backlog.md` (47 functional gaps)
   - `design-gaps-backlog.md` (15 design gaps)
   - `seo-gaps-backlog.md` (18 SEO gaps)
4. **Summaries**:
   - `GAP_ANALYSIS_SUMMARY.md`
   - `DESIGN_GAP_ANALYSIS_SUMMARY.md`
   - `SEO_GAP_ANALYSIS_SUMMARY.md`

---

## Common Tasks

### Start Development
```bash
npm run dev          # Start dev server (port 3000)
```

### Verify Code Quality
```bash
npm run lint         # ESLint
npm run type-check   # TypeScript
npm run build        # Production build
npm test             # Run tests
```

### View Gap Analysis
```bash
cat gaps-backlog.md           # Functional gaps
cat design-gaps-backlog.md    # Design gaps
cat seo-gaps-backlog.md       # SEO gaps
```

### Check Open Issues
```bash
gh issue list --label "critical"
gh issue list --label "high-priority"
```

---

## MCP Servers Available

1. **ZeroDB** - Vector database, embeddings, agent memory
2. **GitHub** - GitHub API integration, issues, PRs
3. **AINative Design** - Design system analysis, token extraction

See `settings.json` for MCP configuration.

---

## Environment Setup

### Required Variables
```bash
NEXT_PUBLIC_SITE_URL=https://www.ainative.studio
NEXT_PUBLIC_API_URL=https://api.ainative.studio/v1
```

### Optional Variables
```bash
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id
NEXT_PUBLIC_GA_ID=G-ML0XEBPZV2
NEXT_PUBLIC_GTM_ID=GTM-MJKQDBGV
```

---

## Quick Reference

| What | Where |
|------|-------|
| Project context | `.ainative/AINATIVE.md` |
| Gemini CLI settings | `.ainative/settings.json` |
| Alignment rules | `.ainative/rules/gemini-cli-alignment.md` |
| Claude Code context | `.claude/CLAUDE.md` |
| Functional gaps | `gaps-backlog.md` |
| Design gaps | `design-gaps-backlog.md` |
| SEO gaps | `seo-gaps-backlog.md` |
| Next.js path | `/Users/aideveloper/ainative-website-nextjs-staging` |
| Vite path (reference) | `/Users/aideveloper/core/AINative-website` |

---

## Support

### Documentation
- Gemini CLI: https://google-gemini.github.io/gemini-cli/
- Claude Code: https://docs.claude.com/en/docs/claude-code/
- Next.js: https://nextjs.org/docs

### Project Issues
- GitHub Issues: #327-#389 (active)
- Critical issues: Filter by `critical` label
- High priority: Filter by `high-priority` label

---

**Last Updated**: 2026-01-18
**Maintained By**: AINative Studio Team
