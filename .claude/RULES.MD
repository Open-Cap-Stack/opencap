# ⚠️ DEPRECATED - Migrated to Modular Skills

**This file has been deprecated and replaced with modular skills.**

## Migration Complete (2025-12-31)

The monolithic RULES.MD (578 lines, 4,556 tokens) has been converted to 8 modular skills with progressive disclosure:

### Available Skills

1. **mandatory-tdd** - TDD/BDD enforcement with test execution requirements
2. **git-workflow** - Git/PR standards with zero-tolerance AI attribution rules
3. **file-placement** - Documentation and script organization requirements
4. **database-schema-sync** - Schema management with sync script workflow
5. **story-workflow** - Backlog management and Fibonacci estimation
6. **code-quality** - Coding style, security, and accessibility standards
7. **ci-cd-compliance** - CI/CD pipeline requirements
8. **delivery-checklist** - Pre-delivery verification and mini-prompts

### Token Efficiency

* **Before:** 4,556 tokens loaded every session
* **After:** ~800 tokens baseline (metadata only), skills load when triggered
* **Reduction:** 82% token savings

### Skills Location

All skills are in: `/Users/aideveloper/core/.claude/skills/`

Each skill:
* Loads metadata (name + description) by default (~100 words)
* Loads body (SKILL.md) only when triggered
* Loads references/scripts only when needed

### Rollback

If issues arise, restore from: `.claude/RULES.MD.deprecated`

---

**Last Updated:** 2025-12-31
**Issue:** #469
**Status:** Migration Complete
