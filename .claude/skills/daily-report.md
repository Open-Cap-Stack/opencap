# Daily Report Generator

Generate a concise daily progress report summarizing development activity for the current day.

## Usage

```bash
/daily-report
```

## What This Does

1. **Analyzes Today's Git Commits** - Fetches all commits from today
2. **Reviews Active Issues** - Checks issues worked on today
3. **Categorizes Changes** - Features, bug fixes, tests, docs, etc.
4. **Generates Report** - Creates structured markdown in `docs/reports/daily/`

## Data Collection

When invoked, gather data from these sources:

### Step 1: Load User Identities

```bash
# Load all your git identities from config
if [ -f .claude/user-identities.json ]; then
    # Extract all git emails
    GIT_EMAILS=$(cat .claude/user-identities.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('|'.join(data['git_emails']))
")
    PRIMARY_NAME=$(cat .claude/user-identities.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data['primary_name'])
")
    echo "Generating report for: $PRIMARY_NAME"
    echo "Tracking emails: $GIT_EMAILS"
else
    # Fallback to current git user
    GIT_EMAILS=$(git config user.email)
    PRIMARY_NAME=$(git config user.name)
    echo "Generating report for: $PRIMARY_NAME <$GIT_EMAILS>"
fi
```

### Step 2: Git Commits (Today - ALL commits across BOTH repos)

IMPORTANT: This project has TWO repos — the backend (opencapstack) and a frontend
submodule (opencap-frontend at ./frontend). You MUST count commits from BOTH repos.

```bash
# Backend commits today (all commits on all branches, including merges)
git log --since="today 00:00" --oneline --all

# Frontend commits today (cd into submodule)
cd frontend && git log --since="today 00:00" --oneline --all && cd ..

# Backend commit count
BACKEND_COMMITS=$(git log --since="today 00:00" --oneline --all | wc -l | tr -d ' ')

# Frontend commit count
FRONTEND_COMMITS=$(cd frontend && git log --since="today 00:00" --oneline --all | wc -l | tr -d ' ')

# Total
TODAY_COMMITS=$((BACKEND_COMMITS + FRONTEND_COMMITS))

# Files changed today
git log --since="today 00:00" --name-only --pretty=format: | sort -u
```

### Step 3: GitHub PRs and Issues (ALL activity, not just assigned)

IMPORTANT: Do NOT use --assignee="@me" or --author="@me" — these filters miss
PRs/issues that were created without assignment. Instead, use date-based queries
and the mergedAt/closedAt fields to get accurate counts.

```bash
# PRs merged today — use mergedAt field for accuracy
# Backend PRs:
gh pr list --state merged --limit 50 --json number,title,mergedAt \
  --jq '[.[] | select(.mergedAt | startswith("YYYY-MM-DD"))] | length'

# Frontend PRs:
gh pr list --state merged --limit 50 --repo Open-Cap-Stack/opencap-frontend \
  --json number,title,mergedAt \
  --jq '[.[] | select(.mergedAt | startswith("YYYY-MM-DD"))] | length'

# Issues closed today — use closedAt field for accuracy
# Backend issues:
gh issue list --state closed --limit 100 --json number,title,closedAt \
  --jq '[.[] | select(.closedAt | startswith("YYYY-MM-DD"))] | length'

# Frontend issues:
gh issue list --state closed --limit 100 --repo Open-Cap-Stack/opencap-frontend \
  --json number,title,closedAt \
  --jq '[.[] | select(.closedAt | startswith("YYYY-MM-DD"))] | length'

# Issues opened today
# Backend:
gh issue list --state all --search "created:YYYY-MM-DD" --json number --jq 'length'

# Frontend:
gh issue list --state all --search "created:YYYY-MM-DD" \
  --repo Open-Cap-Stack/opencap-frontend --json number --jq 'length'
```

### Step 4: Calculate Developer Velocity

```bash
# Use the totals from Step 2 and Step 3 (both repos combined)
TODAY_COMMITS=$((BACKEND_COMMITS + FRONTEND_COMMITS))
PRS_MERGED_TODAY=$((BACKEND_PRS + FRONTEND_PRS))
ISSUES_CLOSED_TODAY=$((BACKEND_ISSUES_CLOSED + FRONTEND_ISSUES_CLOSED))

# Yesterday's commit count (both repos)
YESTERDAY_BACKEND=$(git log --since="yesterday 00:00" --until="today 00:00" --oneline --all | wc -l | tr -d ' ')
YESTERDAY_FRONTEND=$(cd frontend && git log --since="yesterday 00:00" --until="today 00:00" --oneline --all | wc -l | tr -d ' ')
YESTERDAY_COMMITS=$((YESTERDAY_BACKEND + YESTERDAY_FRONTEND))

# 7-day average (both repos)
WEEK_BACKEND=$(git log --since="7 days ago" --oneline --all | wc -l | tr -d ' ')
WEEK_FRONTEND=$(cd frontend && git log --since="7 days ago" --oneline --all | wc -l | tr -d ' ')
WEEK_COMMITS=$((WEEK_BACKEND + WEEK_FRONTEND))
SEVEN_DAY_AVG=$(echo "scale=1; $WEEK_COMMITS / 7" | bc)

# Velocity score (weighted: commits * 1 + issues closed * 3 + PRs merged * 5)
VELOCITY_SCORE=$(echo "$TODAY_COMMITS * 1 + $ISSUES_CLOSED_TODAY * 3 + $PRS_MERGED_TODAY * 5" | bc)

# Productivity rating
if [ "$VELOCITY_SCORE" -ge 50 ]; then
  PRODUCTIVITY_RATING="Exceptional"
elif [ "$VELOCITY_SCORE" -ge 30 ]; then
  PRODUCTIVITY_RATING="Strong"
elif [ "$VELOCITY_SCORE" -ge 15 ]; then
  PRODUCTIVITY_RATING="Good"
else
  PRODUCTIVITY_RATING="Light"
fi
```

## Critical Rules

1. **ALWAYS count BOTH repos** — opencapstack (backend) AND opencap-frontend (submodule at ./frontend)
2. **NEVER use --assignee="@me" or --author="@me"** — these miss activity not assigned to you. Use date-based filtering with closedAt/mergedAt fields instead.
3. **Use closedAt/mergedAt JSON fields** — the `--search "closed:DATE"` parameter is unreliable. Instead, fetch recent items and filter by the JSON date field.
4. **Include issues opened** — not just closed. Track new issues created today.
5. **Break down by repo** — show Backend and Frontend sub-sections under each heading.
6. **List PRs and issues in tables** — use `| PR | Title |` and `| Issue | Title |` table format.
7. **Include issues closed section** — list actual issue numbers and titles from both repos.

## Report Sections

| Section | Content |
|---------|---------|
| Summary | Quick overview with commits, PRs, issues, velocity score |
| Developer Velocity | Today vs yesterday, 7-day average, trend analysis |
| Commits | List of all commits with descriptions (split by Backend/Frontend) |
| PRs Merged | PR tables split by Backend/Frontend |
| Issues Closed | Issue tables split by Backend/Frontend |
| Issues Opened | Issue tables split by Backend/Frontend |
| Files Modified | Key files changed |
| Next Steps | Tomorrow's priorities |

## Output Location

```
docs/reports/daily/DAILY_REPORT_YYYY-MM-DD_username.md
```

## Commit Categories

| Keywords | Category | Emoji |
|----------|----------|-------|
| feat, add, implement | Features | ✨ |
| fix, resolve, correct | Bug Fixes | 🐛 |
| security, CVE | Security | 🔒 |
| test, spec | Tests | ✅ |
| deploy, CI/CD | DevOps | 🚀 |
| doc, readme | Docs | 📝 |
| refactor | Refactor | ♻️ |
| perf, optimize | Performance | ⚡ |

## Example Output Structure

```markdown
# Daily Progress Report - January 27, 2026

**Developer**: Admin User
**Git Identities Tracked**:
- utventures@gmail.com (@urbantech)
- toby@rely.ventures (@relycapital)
- developer@ainative.studio (@developer-ainative)
- admin@ainative.studio

**Total Commits**: 12 (across all your identities)
**Files Modified**: 23
**Issues Assigned**: 5
**Issues Closed**: 2

**Commits by Identity**:
- utventures@gmail.com: 5 commits
- toby@rely.ventures: 3 commits
- developer@ainative.studio: 2 commits
- admin@ainative.studio: 2 commits

---

## Summary

Today focused on upgrading all @ainative.studio users to enterprise tier and creating
training materials for the Agent Swarm builder workshop.

**Note**: This report tracks commits from ALL your configured git identities.

## Developer Velocity

**Today's Productivity**:
- Commits: 12
- Issues Closed: 2
- PRs Merged: 1
- Velocity Score: 19 points (commits×1 + issues×3 + PRs×5)
- Productivity Rating: ✅ Good (above median)

**Comparison**:
- Yesterday: 8 commits
- 7-Day Average: 9.3 commits/day
- Trend: 📈 Above Average (+29% vs 7-day avg)

**Last 7 Days Activity**:
```
Mon  Tue  Wed  Thu  Fri  Sat  Sun
 15    12    8    10    6    3    11
```

**Velocity Benchmarks** (based on last year's data):
- 🔥 Exceptional: 19+ commits/day, 50+ velocity points (top 10%)
- ⭐ Strong: 15+ commits/day, 30+ velocity points (top 25%)
- ✅ Good: 3+ commits/day, 15+ velocity points (above median)
- ⚠️ Light: <3 commits/day, <15 velocity points (below median)

**Analysis**: You're operating 29% above your weekly average with solid output across commits and issue resolution.

## Commits (12)

### Features ✨
- `47d5202` Add community platform roadmap and competitive analysis
- `1603588` Add Agent-402 frontend to CORS whitelist
- `2240ae1` Add API catalog system for AI agents

### Bug Fixes 🐛
- `abc1234` Fix subscription validation for enterprise users
- `def5678` Resolve ZeroDB connection pool exhaustion

### Documentation 📝
- `3efd98b` Add Agent Swarm Workflow V2 API documentation
- `7f2aab0` Create builder workshop curriculum

## Issues Worked On

### Closed ✅
- #992 - Subscription tier validation not working
- #993 - Agent Swarm dashboard access denied

### In Progress 🔄
- #994 - Create training materials for workshop

## Files Modified (23)

**Core Changes:**
- `scripts/upgrade_all_ainative_users.py` - User upgrade script
- `scripts/grant_swarm_subscriptions_fixed.py` - Subscription grants
- `docs/training/BUILDER_CLASS_AGENT_SWARM_1HR.md` - Workshop curriculum

**Configuration:**
- `.env` - Environment updates
- `requirements.txt` - Dependency updates

## Tests Added ✅

None today (focus on infrastructure)

## Time Breakdown

- **Features**: 60% (subscription system, training materials)
- **Bug Fixes**: 25% (database queries, validation)
- **Documentation**: 15% (workshop materials)

## Blockers / Challenges

None - all tasks completed successfully.

## Tomorrow's Priorities

1. Test workshop materials with sample students
2. Deploy Agent Swarm subscription changes to production
3. Create supporting resources (quick reference cards, setup guides)

---

**Report Generated**: 2026-01-27 18:30 PST
```

## Workflow

1. Run `/daily-report`
2. Gather today's commit data
3. Fetch GitHub activity
4. Categorize changes
5. Calculate statistics
6. Generate markdown report
7. Save to `docs/reports/daily/DAILY_REPORT_YYYY-MM-DD_username.md`

## Quality Checklist

Before completing:

- [ ] All today's commits included
- [ ] Commits linked with hashes
- [ ] Issues referenced with #numbers
- [ ] Categories assigned with emojis
- [ ] Time breakdown estimated
- [ ] Tomorrow's priorities defined
- [ ] File in correct location (`docs/reports/daily/`)
- [ ] No sensitive data included

## Usage Tips

**Best Time to Run**: End of day (5-6 PM)

**Frequency**: Daily for active development days

**Purpose**:
- Track daily progress
- Document decisions made
- Identify blockers early
- Plan next day's work
- Build weekly reports from daily summaries

**Integration**: Daily reports feed into weekly reports for comprehensive tracking.

Invoke this command at the end of each workday to generate your daily progress report.
