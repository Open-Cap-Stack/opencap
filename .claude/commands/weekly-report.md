---
description: Generate comprehensive weekly progress report for AINative platform
---

# Weekly Report Generator

Generate a comprehensive weekly progress report summarizing all development activity.

## Usage

```bash
/weekly-report
```

## What This Does

1. **Analyzes Git Commits** - Fetches all commits from the past 7 days
2. **Reviews GitHub Issues** - Checks closed and created issues
3. **Categorizes Changes** - Features, bug fixes, security, DevOps, etc.
4. **Calculates Statistics** - Commit counts, daily averages, by-repo breakdown
5. **Generates Report** - Creates structured markdown in `docs/reports/`

## Data Collection

When invoked, gather data from these sources:

### Git Commits (Past 7 Days)

```bash
# Core repo commits
cd /Users/ranveerdeshmukh/AINative-core/core
git log --since="7 days ago" --pretty=format:"%h|%ad|%s|%an" --date=short --no-merges

# Commit count by date
git log --since="7 days ago" --format="%ad" --date=short | sort | uniq -c
```

### GitHub Issues

```bash
# Closed issues
gh issue list --repo AINative-Studio/core --state closed --limit 100 --json number,title,closedAt,labels

# All recent issues
gh issue list --repo AINative-Studio/core --state all --limit 100 --json number,title,state,createdAt
```

### PRs Merged

```bash
gh pr list --repo AINative-Studio/core --state merged --limit 50 --json number,title,mergedAt
```

## Report Sections

| Section | Content |
|---------|---------|
| Executive Summary | High-level week overview |
| Major Features | New functionality with commits |
| Critical Bug Fixes | Issues fixed with root causes |
| Security Improvements | Vulnerability patches |
| Infrastructure & DevOps | Deployment changes |
| Frontend Improvements | UI/UX updates |
| Work In Progress | Ongoing work |
| Commit Statistics | Quantitative analysis |
| Success Metrics | KPIs and completion |
| Next Week Priorities | Upcoming focus |

## Output Location

```
docs/reports/WEEKLY_REPORT_YYYY-MM-DD_username.md
```

## Commit Categories

| Keywords | Category |
|----------|----------|
| feat, add, implement | Features |
| fix, resolve, correct | Bug Fixes |
| security, CVE | Security |
| test, spec | Tests |
| deploy, CI/CD | DevOps |
| doc, readme | Docs |

## Impact Levels

- **CRITICAL** - Core functionality, security
- **HIGH** - Major features, significant fixes
- **MEDIUM** - Enhancements, integrations
- **LOW** - Minor fixes, polish

## Example Output Structure

```markdown
# AINative Platform - Weekly Progress Report
## January 6, 2026 - January 13, 2026

## Executive Summary
This reporting period saw **85 commits** across 4 repositories...

## Major Features Implemented
### 1. Feature Name
**Commits**: abc1234, def5678
**Status**: Complete
...

## Commit Statistics
**Total Commits**: 85
**Period**: 7 days
**Daily Average**: 12 commits/day
...
```

## Workflow

1. Run `/weekly-report`
2. Gather commit data from all repos
3. Fetch GitHub issues and PRs
4. Categorize and analyze changes
5. Calculate statistics
6. Generate markdown report
7. Save to `docs/reports/WEEKLY_REPORT_YYYY-MM-DD_username.md`
8. Review and finalize

## Quality Checklist

Before completing:

- [ ] All repos analyzed (core, website, live, chatwoot)
- [ ] Commits linked with hashes
- [ ] Issues referenced with #numbers
- [ ] Impact levels assigned
- [ ] Statistics calculated correctly
- [ ] Next week priorities defined
- [ ] No sensitive data included
- [ ] File in correct location

Invoke this command to generate your weekly progress report.
