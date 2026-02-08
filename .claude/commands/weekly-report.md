---
description: Generate comprehensive weekly progress report for OpenCap Stack
---

# Weekly Report Generator

Generate a comprehensive weekly progress report summarizing all development activity across the OpenCap Stack repositories (opencapstack backend and opencap-frontend).

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
# Backend repo commits (opencapstack)
gh api repos/Open-Cap-Stack/opencapstack/commits --paginate -q '.[] | [.sha[:7], .commit.author.date[:10], .commit.message | split("\n")[0], .commit.author.name] | @tsv' --method GET -f since="$(date -v-7d +%Y-%m-%dT00:00:00Z)"

# Frontend repo commits (opencap-frontend)
gh api repos/Open-Cap-Stack/opencap-frontend/commits --paginate -q '.[] | [.sha[:7], .commit.author.date[:10], .commit.message | split("\n")[0], .commit.author.name] | @tsv' --method GET -f since="$(date -v-7d +%Y-%m-%dT00:00:00Z)"
```

### GitHub Issues

```bash
# Backend - Closed issues
gh issue list --repo Open-Cap-Stack/opencapstack --state closed --limit 100 --json number,title,closedAt,labels

# Backend - All recent issues
gh issue list --repo Open-Cap-Stack/opencapstack --state all --limit 100 --json number,title,state,createdAt

# Frontend - Closed issues
gh issue list --repo Open-Cap-Stack/opencap-frontend --state closed --limit 100 --json number,title,closedAt,labels

# Frontend - All recent issues
gh issue list --repo Open-Cap-Stack/opencap-frontend --state all --limit 100 --json number,title,state,createdAt
```

### PRs Merged

```bash
# Backend PRs
gh pr list --repo Open-Cap-Stack/opencapstack --state merged --limit 50 --json number,title,mergedAt

# Frontend PRs
gh pr list --repo Open-Cap-Stack/opencap-frontend --state merged --limit 50 --json number,title,mergedAt
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
# OpenCap Stack - Weekly Progress Report
## January 6, 2026 - January 13, 2026

## Executive Summary
This reporting period saw **85 commits** across the OpenCap Stack repositories...

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
2. Gather commit data from opencapstack backend and opencap-frontend repos
3. Fetch GitHub issues and PRs
4. Categorize and analyze changes
5. Calculate statistics
6. Generate markdown report
7. Save to `docs/reports/WEEKLY_REPORT_YYYY-MM-DD_username.md`
8. Review and finalize

## Quality Checklist

Before completing:

- [ ] All repos analyzed (opencapstack backend, opencap-frontend)
- [ ] Commits linked with hashes
- [ ] Issues referenced with #numbers
- [ ] Impact levels assigned
- [ ] Statistics calculated correctly
- [ ] Next week priorities defined
- [ ] No sensitive data included
- [ ] File in correct location

Invoke this command to generate your weekly progress report.
