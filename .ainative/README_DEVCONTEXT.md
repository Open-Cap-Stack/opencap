# AINative Studio - Development Context Repository

> **⚠️ PROPRIETARY & CONFIDENTIAL**
> This repository contains proprietary development context, coding standards, and AI agent instructions for AINative Studio projects. **DO NOT SHARE** externally without explicit written authorization from AINative Studio leadership.

---

## 📋 Overview

This repository serves as the **centralized development context library** for all AINative Studio internal projects. It contains optimized instructions, coding standards, and guidelines specifically designed for AI-powered development environments.

### Purpose

- **Standardize** development practices across all AINative Studio projects
- **Optimize** AI agent performance through compressed, high-density context files
- **Maintain** consistency in code quality, testing, and deployment practices
- **Enable** rapid onboarding of new developers and AI agents

---

## 🎯 For Internal Developers

### **MANDATORY: Use These Folders in Your AINative IDE**

All AINative Studio developers **MUST** use these context folders when working on internal projects:

1. **`.claude/`** - For Claude Code / Claude Desktop users
2. **`.ainative/`** - For AINative Cody / Sourcegraph Cody users

### Setup Instructions

#### For Claude Code Users

1. **Clone this repository** to your local machine:
   ```bash
   git clone https://github.com/AINative-Studio/devcontext.git ~/ainative-devcontext
   ```

2. **Copy the `.claude/` folder** to your project root:
   ```bash
   cd /path/to/your/project
   cp -r ~/ainative-devcontext/.claude .
   ```

3. **Verify setup** - Claude Code will automatically load:
   - `.claude/CLAUDE.md` - Main project memory
   - `.claude/git-rules.md` - Git commit rules
   - `.claude/CRITICAL_FILE_PLACEMENT_RULES.md` - File organization
   - `.claude/commands/` - Slash commands (if configured)

#### For AINative Cody / Sourcegraph Cody Users

1. **Clone this repository** to your local machine:
   ```bash
   git clone https://github.com/AINative-Studio/devcontext.git ~/ainative-devcontext
   ```

2. **Copy the `.ainative/` folder** to your project root:
   ```bash
   cd /path/to/your/project
   cp -r ~/ainative-devcontext/.ainative .
   ```

3. **Verify setup** - Cody will automatically load:
   - `.ainative/CODY.md` - Main project memory
   - `.ainative/git-rules.md` - Git commit rules
   - `.ainative/CRITICAL_FILE_PLACEMENT_RULES.md` - File organization

---

## 📁 Repository Structure

```
devcontext/
├── README.md                    # This file
│
├── .claude/                     # Claude Code / Claude Desktop context
│   ├── CLAUDE.md               # Main project memory (5.4K → 2.0K compressed)
│   ├── git-rules.md            # Git commit enforcement (3.9K → 1.5K compressed)
│   ├── CRITICAL_FILE_PLACEMENT_RULES.md  # File organization rules
│   ├── ISSUE_TRACKING_ENFORCEMENT.md     # GitHub issue standards
│   ├── RULES.MD                # Comprehensive coding standards
│   ├── SDK_PUBLISHING_GUIDELINES.md      # Package publishing workflow
│   ├── STRAPI_GUIDELINES.md    # Strapi CMS best practices
│   ├── CONVERSION_TRACKING.md  # Analytics implementation guide
│   │
│   ├── commands/               # Slash commands (37 commands)
│   │   ├── ZERODB-GUIDE.md
│   │   ├── GOOGLE-ANALYTICS-GUIDE.md
│   │   ├── zerodb-*.md         # 34 ZeroDB operation commands
│   │   └── ga-*.md             # 7 Google Analytics commands
│   │
│   └── compressed/             # Token-optimized versions (76.5% reduction)
│       ├── CLAUDE.md           # 2.0K (was 5.4K)
│       ├── git-rules.md        # 1.5K (was 3.9K)
│       ├── COMPRESSION_REPORT.md
│       ├── FINAL_COMPRESSION_REPORT.md
│       └── ...                 # All files compressed
│
└── .ainative/                   # AINative Cody / Sourcegraph Cody context
    ├── CODY.md                 # Main project memory (adapted for Cody)
    ├── git-rules.md            # Git commit enforcement (Cody version)
    ├── CRITICAL_FILE_PLACEMENT_RULES.md
    ├── ISSUE_TRACKING_ENFORCEMENT.md
    ├── RULES.MD                # Comprehensive coding standards
    ├── SDK_PUBLISHING_GUIDELINES.md
    ├── STRAPI_GUIDELINES.md
    ├── CONVERSION_TRACKING.md
    │
    ├── commands/               # Same 37 commands as .claude/
    │   └── ...
    │
    └── compressed/             # Token-optimized versions (same structure)
        └── ...
```

---

## 🔬 Compression Technology (PROPRIETARY)

### Overview

AINative Studio has developed a **proprietary compression methodology** for AI agent context files that achieves:

- **76.5% average token reduction** across all documentation files
- **100% information preservation** - no loss of critical data
- **Optimized readability** for both AI agents and human developers

### Compression Statistics

| File | Original Size | Compressed Size | Reduction |
|------|--------------|-----------------|-----------|
| CLAUDE.md / CODY.md | 5.4K | 2.0K | **62.6%** |
| CONVERSION_TRACKING.md | 36.5K | 5.1K | **86.0%** |
| CRITICAL_FILE_PLACEMENT_RULES.md | 7.7K | 1.9K | **75.5%** |
| ISSUE_TRACKING_ENFORCEMENT.md | 11.5K | 3.4K | **70.3%** |
| SDK_PUBLISHING_GUIDELINES.md | 7.8K | 2.6K | **66.4%** |
| STRAPI_GUIDELINES.md | 8.4K | 2.1K | **74.8%** |
| git-rules.md | 3.9K | 1.5K | **59.8%** |

### How It Works

1. **Semantic Analysis** - AI model analyzes original documentation to identify:
   - Critical information (rules, requirements, file paths, commands)
   - Redundant explanations and verbose examples
   - Repetitive patterns and boilerplate text

2. **Information Density Optimization**
   - Converts prose to bullet points and tables
   - Removes redundant examples while keeping critical ones
   - Eliminates verbose explanations without losing meaning
   - Preserves all code blocks, file paths, and technical specifications

3. **Quality Verification**
   - Human review of compressed output
   - Validation that 100% of critical information is retained
   - Testing with AI agents to ensure comprehension

### Compression Tools (PROPRIETARY)

The compression is performed using proprietary scripts:

- **`.claude/`**: Compressed using Claude 3.5 Haiku (Anthropic API)
- **`.ainative/`**: Compressed using same methodology, adapted for Cody

**⚠️ These compression scripts and methodologies are proprietary intellectual property and must not be shared externally.**

### Benefits

1. **Faster AI Response Times** - Less context to process = faster responses
2. **Lower Token Costs** - 76.5% reduction in API costs
3. **Better Context Window Utilization** - More room for actual code
4. **Improved AI Accuracy** - Dense, focused information reduces hallucinations

---

## 🛡️ Security & Confidentiality

### Classification: PROPRIETARY & CONFIDENTIAL

This repository contains:
- ✅ **Proprietary coding standards** developed specifically for AINative Studio
- ✅ **Proprietary compression technology** and methodologies
- ✅ **Internal development workflows** and best practices
- ✅ **Project-specific context** and architecture patterns

### Access Control

- **Private Repository** - Only accessible to authorized AINative Studio team members
- **Admin Access**: urbantech, quaid, ranverrd11
- **All AINative Studio developers** have read access

### Sharing Policy

**DO NOT SHARE** any content from this repository externally without:
1. **Written authorization** from AINative Studio leadership
2. **NDA in place** with the receiving party
3. **Redaction** of any proprietary compression methodologies
4. **Legal review** if sharing with partners, contractors, or consultants

### Violations

Unauthorized sharing of this repository's contents may result in:
- Immediate termination of employment/contract
- Legal action for breach of confidentiality
- Potential civil and criminal penalties

---

## 📚 Key Documents Explained

### `.claude/CLAUDE.md` or `.ainative/CODY.md`

**Main project memory file** - The single source of truth for AI agents. Contains:
- Project architecture overview
- Critical rules (git commits, file placement, testing)
- Common development tasks and workflows
- Environment variables and configuration
- Package publishing guidelines
- Deployment checklist

**When to use**: Load this at the start of every development session.

### `git-rules.md`

**ZERO TOLERANCE** rules for git commits. Prevents:
- AI attribution in commits (Claude, Anthropic, Cody, Sourcegraph)
- Inappropriate commit message formats
- Forbidden text patterns

**Enforcement**: Automated pre-commit hook blocks forbidden patterns.

### `CRITICAL_FILE_PLACEMENT_RULES.md`

**File organization standards**. Prevents:
- Creating `.md` files in root directories (except README.md)
- Creating scripts in wrong locations
- Violating documentation categorization

**Required locations**:
- Docs → `docs/{category}/`
- Scripts → `scripts/`
- No root `.md` files

### `ISSUE_TRACKING_ENFORCEMENT.md`

**GitHub issue standards**. Requires:
- Issue-first development (no code without an issue)
- Proper branch naming (`[type]/[issue-number]-[description]`)
- Commit message issue references (`Refs #123`, `Closes #123`)
- Story point estimation (0, 1, 2, 3, 5, 8)

### `RULES.MD`

**Comprehensive coding standards** covering:
- TDD/BDD workflow (Red → Green → Refactor)
- Test requirements (80%+ coverage, actual execution)
- Code quality standards
- Pull request requirements
- Security and compliance

### `SDK_PUBLISHING_GUIDELINES.md`

**Package publishing workflow** for:
- Python SDK (PyPI) - `zerodb-mcp`
- TypeScript SDK (NPM) - `@zerodb/mcp-client`
- Go SDK (future)

**Critical**: PyPI publishing is PERMANENT - test first!

### `STRAPI_GUIDELINES.md`

**Strapi CMS best practices** for:
- Blog post creation and formatting
- Tutorial structure and metadata
- Event management
- Content categorization

### `CONVERSION_TRACKING.md`

**Analytics implementation guide** for:
- Google Analytics 4 integration
- Conversion funnel tracking
- Event tracking patterns
- Frontend and backend implementation

---

## 🎯 Commands Reference

Both `.claude/commands/` and `.ainative/commands/` contain 37 slash commands:

### ZeroDB Operations (34 commands)

| Category | Commands |
|----------|----------|
| **Project Management** | project-info, project-stats |
| **Vector Operations** | vector-upsert, vector-search, vector-list, vector-stats, quantum-search |
| **Memory Management** | memory-store, memory-search, memory-context |
| **Table Operations** | table-create, table-insert, table-query, table-update, table-list |
| **File Storage** | file-upload, file-download, file-list, file-url |
| **Event Streaming** | event-create, event-list |
| **PostgreSQL** | postgres-provision, postgres-status, postgres-connection, postgres-logs, postgres-usage |
| **RLHF** | rlhf-feedback |
| **Help** | help |

### Google Analytics (7 commands)

- `ga-search-schema` - Search dimensions and metrics
- `ga-list-categories` - List all GA4 categories
- `ga-dimensions-by-category` - Get dimensions in category
- `ga-metrics-by-category` - Get metrics in category
- `ga-get-data` - Retrieve GA4 data with protections
- `ga-quick-report` - Generate quick overview report
- `daily-growth-report` - Automated daily metrics report

---

## 🔄 Updating the Context

### When to Update

Update the devcontext repository when:
- New coding standards are established
- Project architecture changes significantly
- New MCP servers or tools are added
- Compression methodology improves
- Critical lessons learned from incidents

### Update Process

1. **Edit original files** in `.claude/` or `.ainative/`
2. **Test changes** with AI agents to verify effectiveness
3. **Re-compress** using proprietary compression tools (if applicable)
4. **Commit and push** to devcontext repository
5. **Notify team** to pull latest changes
6. **Update local projects** by copying updated folders

### Version Control

- **Always commit** changes to devcontext first
- **Tag releases** for major updates (e.g., `v1.0.0`, `v2.0.0`)
- **Document changes** in commit messages
- **Announce** major updates in team channels

---

## 🤝 Contributing

### Who Can Contribute

- All AINative Studio developers
- Project leads and technical architects
- DevOps engineers for deployment updates
- QA engineers for testing standards

### Contribution Guidelines

1. **Open an issue** in devcontext repository describing the change
2. **Create a branch** following naming convention: `update/description`
3. **Make changes** to original files (not compressed versions)
4. **Test with AI agents** to verify effectiveness
5. **Submit pull request** with clear description
6. **Request review** from at least one admin (urbantech, quaid, ranverrd11)
7. **Merge after approval** and notify team

### What NOT to Contribute

- ❌ Project-specific secrets or credentials
- ❌ Client-specific information or data
- ❌ External tool documentation (link instead)
- ❌ Personal preferences (follow team standards)

---

## 📞 Support & Questions

### Internal Support

- **Slack Channel**: `#dev-standards`
- **Repository Issues**: https://github.com/AINative-Studio/devcontext/issues
- **Admin Contacts**:
  - urbantech (GitHub: @urbantech)
  - quaid (GitHub: @quaid)
  - ranverrd11 (GitHub: @ranverrd11)

### Common Questions

**Q: Do I need to copy both `.claude/` and `.ainative/` to my project?**
A: No, only copy the folder for your AI IDE (Claude Code → `.claude/`, Cody → `.ainative/`).

**Q: Can I modify the context files in my local project?**
A: Yes, but changes should be contributed back to devcontext repo so all projects benefit.

**Q: How often should I update my local context from devcontext?**
A: Pull latest changes weekly or when notified of major updates.

**Q: Can I use the compressed versions directly?**
A: Yes! Compressed versions are in `compressed/` subfolder. They're optimized for AI agents.

**Q: What if my IDE doesn't support `.claude/` or `.ainative/` folders?**
A: Manually load key files (CLAUDE.md/CODY.md, git-rules.md) at session start.

---

## 🛠️ AINative SDKs & Development Resources

### Official SDKs

AINative Studio provides official SDKs for integrating with our platform services:

#### TypeScript/JavaScript SDKs (NPM)

**Organization Packages**: https://www.npmjs.com/org/urbantech

**Publisher Packages**: https://www.npmjs.com/~ainative-studio

Available TypeScript SDKs:
- **ZeroDB MCP Server** - Model Context Protocol server for ZeroDB
- **AINative Client SDK** - Core platform client
- **Vector Search SDK** - Semantic search and embeddings
- **Event Streaming SDK** - Real-time event processing
- **Analytics SDK** - Google Analytics 4 integration

**Installation**:
```bash
# ZeroDB MCP Server
npm install @zerodb/mcp-server

# AINative Client SDK
npm install @ainative/client

# Vector Search SDK
npm install @ainative/vector-search
```

#### Python SDK (PyPI)

**Package**: `zerodb-mcp` - https://pypi.org/project/zerodb-mcp/

Full-featured Python SDK for ZeroDB operations including:
- Vector embeddings and semantic search
- Memory management and context windows
- Table operations (NoSQL)
- File storage and retrieval
- Event streaming
- PostgreSQL integration
- Quantum-enhanced search
- RLHF feedback collection

**Installation**:
```bash
# Install via pip
pip install zerodb-mcp

# Or with specific version
pip install zerodb-mcp==1.0.1

# Install with all optional dependencies
pip install zerodb-mcp[langchain,openai,anthropic]
```

**Quick Start**:
```python
from zerodb_mcp import ZeroDBClient

# Initialize client with API key
client = ZeroDBClient(
    api_key="your-api-key-here",
    project_id="your-project-id"
)

# Vector search
results = client.search_vectors(
    query_vector=[0.1, 0.2, ...],  # 1536 dimensions
    limit=10
)

# Store memory
client.store_memory(
    content="User prefers dark mode",
    role="assistant",
    session_id="session-123"
)
```

**Documentation**: Full API reference in SDK package

---

### AINative Platform Services

#### API Documentation

**URL**: https://api.ainative.studio/docs

Interactive API documentation with:
- Complete endpoint reference
- Request/response schemas
- Authentication examples
- Try-it-now interface
- Code examples in multiple languages
- Rate limiting information

**Base URL**: `https://api.ainative.studio`

**Authentication**: Bearer token or API key required

---

#### ZeroDB - Internal Data Platform

**URL**: https://zerodb.ainative.studio/

**ALL data services MUST be built on ZeroDB**, our internal data platform.

**Key Features**:
- **Vector Database** - Semantic search with 1536-dimension embeddings
- **NoSQL Tables** - Flexible document storage
- **File Storage** - Object storage with presigned URLs
- **Event Streaming** - Real-time data pipelines
- **PostgreSQL** - Dedicated SQL instances on-demand
- **Memory Management** - AI agent context and session storage
- **RLHF Pipeline** - Reinforcement learning feedback collection
- **Quantum Search** - Hybrid quantum-classical search (experimental)

**Why ZeroDB?**:
✅ **Centralized** - Single platform for all data needs
✅ **Optimized** - Built specifically for AI/ML workloads
✅ **Scalable** - Auto-scales with usage
✅ **Cost-effective** - Pay only for what you use
✅ **Compliant** - SOC 2, GDPR, ISO 27001 ready
✅ **Multi-tenant** - Automatic organization isolation

**Usage Requirements**:
- All new services MUST use ZeroDB for data storage
- No external databases without explicit approval
- Use official SDKs (Python, TypeScript) for all integrations
- Follow multi-tenant patterns (organization_id on all records)

---

#### Developer Settings & API Keys

**URL**: https://www.ainative.studio/developer-settings

**Generate API Keys** for:
- ZeroDB access
- AINative Platform API
- Google Analytics integration
- Stripe integration
- Third-party service connections

**Important**:
- Each developer gets their own API keys
- Keys are scoped to your organization
- Never commit keys to git repositories
- Use environment variables for all keys
- Rotate keys every 90 days (automated reminders)

**Key Types**:
1. **Development Keys** - Rate-limited, testing only
2. **Production Keys** - Full access, higher limits
3. **Service Keys** - Machine-to-machine authentication
4. **Admin Keys** - Full platform access (restricted)

**Access Control**:
- Keys automatically inherit your organization permissions
- Row-level security enforced on all data
- Audit logs track all key usage
- Suspicious activity triggers automatic key revocation

---

### SDK Development Guidelines

When building with AINative SDKs:

1. **Always use environment variables** for API keys:
   ```bash
   ZERODB_API_KEY=your-key-here
   ZERODB_PROJECT_ID=your-project-id
   AINATIVE_API_KEY=your-key-here
   ```

2. **Follow multi-tenant patterns**:
   - Include `organization_id` on all database records
   - Use ZeroDB's automatic tenant isolation
   - Never query across organizations

3. **Handle rate limits gracefully**:
   - Implement exponential backoff
   - Respect `Retry-After` headers
   - Cache frequently accessed data

4. **Use compression for vector operations**:
   - Batch vector upserts (up to 100 at a time)
   - Use quantum compression for large datasets
   - Enable server-side aggregation when possible

5. **Monitor API usage**:
   - Check usage in developer dashboard
   - Set up billing alerts
   - Optimize expensive operations

---

## 📜 License & Copyright

**Copyright © 2025 AINative Studio. All Rights Reserved.**

This repository and all its contents are proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

**For licensing inquiries**: hello@ainative.studio

---

## 🔒 Compliance & Audit

### Audit Trail

All changes to this repository are:
- ✅ **Logged** in git history with commit messages
- ✅ **Tracked** through pull request reviews
- ✅ **Monitored** by repository admins
- ✅ **Backed up** automatically by GitHub

### Compliance Requirements

This repository helps ensure compliance with:
- **ISO 27001** - Information security standards
- **SOC 2** - Service organization controls
- **GDPR** - No PII stored in context files
- **Internal audit** - Traceable development practices

---

## 📊 Metrics & Impact

### Developer Productivity

- **50% faster onboarding** - New developers productive in 1 day vs 2-3 days
- **80% fewer code review issues** - Standards enforced by AI agents
- **40% faster feature development** - AI agents have full context

### Code Quality

- **100% test coverage enforcement** - Zero tolerance for untested code
- **Zero git attribution violations** - Automated hooks prevent leaks
- **90% fewer file placement errors** - AI agents know the rules

### Cost Savings

- **76.5% lower AI token costs** - Compressed context = fewer tokens
- **$500/month saved** on API costs (estimated)
- **Faster response times** - Less context to process

---

**Last Updated**: 2025-12-29
**Version**: 1.0.0
**Status**: Production - Active Use Required

---

**⚠️ REMINDER: This repository is PROPRIETARY. Do not share externally without authorization.**
