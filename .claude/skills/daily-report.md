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

### Step 2: Git Commits (Today - YOUR commits from ALL identities)

```bash
# Build author filter for ALL your emails
# Format: --author="email1\|email2\|email3"
AUTHOR_FILTER=$(echo "$GIT_EMAILS" | tr '|' '\n' | sed 's/^/--author="/; s/$/"/' | tr '\n' ' ')

# Today's commits by ANY of your identities
git log $AUTHOR_FILTER --since="today 00:00" --pretty=format:"%h|%H|%ad|%s|%an|%ae" --date=iso --no-merges

# YOUR commit count (all identities)
git log $AUTHOR_FILTER --since="today 00:00" --no-merges --oneline | wc -l

# Files YOU changed today (all identities)
git log $AUTHOR_FILTER --since="today 00:00" --name-only --pretty=format: | sort -u
```

### Step 3: GitHub Issues (Assigned to YOU)

```bash
# Issues assigned to YOU
gh issue list --assignee="@me" --state all --limit 50 --json number,title,state,updatedAt,labels

# PRs created by YOU
gh pr list --author="@me" --state all --limit 20 --json number,title,state,updatedAt

# Get your GitHub username
GH_USERNAME=$(gh api user --jq .login)
```

### Step 4: Calculate Developer Velocity (YOUR velocity only)

```bash
# Today's commit count (all your identities)
TODAY_COMMITS=$(git log $AUTHOR_FILTER --since="today 00:00" --no-merges --oneline | wc -l | tr -d ' ')

# Yesterday's commit count (all your identities)
YESTERDAY_COMMITS=$(git log $AUTHOR_FILTER --since="yesterday 00:00" --until="today 00:00" --no-merges --oneline | wc -l | tr -d ' ')

# Last 7 days commit counts by day (all your identities)
for i in {0..6}; do
  DAY_COMMITS=$(git log $AUTHOR_FILTER --since="$i days ago 00:00" --until="$((i-1)) days ago 00:00" --no-merges --oneline 2>/dev/null | wc -l | tr -d ' ')
  echo "Day -$i: $DAY_COMMITS commits"
done

# 7-day average (all your identities)
WEEK_COMMITS=$(git log $AUTHOR_FILTER --since="7 days ago" --no-merges --oneline | wc -l | tr -d ' ')
SEVEN_DAY_AVG=$(echo "scale=1; $WEEK_COMMITS / 7" | bc)

# Issues closed today (assigned to you)
ISSUES_CLOSED_TODAY=$(gh issue list --assignee="@me" --state closed --search "closed:$(date +%Y-%m-%d)" --json number --jq 'length')

# PRs merged today (created by you)
PRS_MERGED_TODAY=$(gh pr list --author="@me" --state merged --search "merged:$(date +%Y-%m-%d)" --json number --jq 'length')

# Calculate velocity trend
if [ "$TODAY_COMMITS" -gt "$SEVEN_DAY_AVG" ]; then
  VELOCITY_TREND="📈 Above Average"
elif [ "$TODAY_COMMITS" -lt "$SEVEN_DAY_AVG" ]; then
  VELOCITY_TREND="📉 Below Average"
else
  VELOCITY_TREND="➡️ On Track"
fi

# Velocity score (weighted: commits * 1 + issues * 3 + PRs * 5)
VELOCITY_SCORE=$(echo "$TODAY_COMMITS * 1 + $ISSUES_CLOSED_TODAY * 3 + $PRS_MERGED_TODAY * 5" | bc)

# Productivity rating based on real historical benchmarks (urbantech profile, last year)
# Benchmarks derived from percentile analysis:
# - Exceptional: 90th percentile (19+ commits/day, 50+ velocity points)
# - Strong: 75th percentile (15+ commits/day, 30+ velocity points)
# - Good: 50th percentile (3+ commits/day, 15+ velocity points)
# - Light: Below median (<3 commits/day, <15 velocity points)
if [ "$VELOCITY_SCORE" -ge 50 ] && [ "$TODAY_COMMITS" -ge 19 ]; then
  PRODUCTIVITY_RATING="🔥 Exceptional (top 10%)"
elif [ "$VELOCITY_SCORE" -ge 30 ] && [ "$TODAY_COMMITS" -ge 15 ]; then
  PRODUCTIVITY_RATING="⭐ Strong (top 25%)"
elif [ "$VELOCITY_SCORE" -ge 15 ] && [ "$TODAY_COMMITS" -ge 3 ]; then
  PRODUCTIVITY_RATING="✅ Good (above median)"
else
  PRODUCTIVITY_RATING="⚠️ Light (below median)"
fi
```

## Report Sections

| Section | Content |
|---------|---------|
| Summary | Quick overview of today's work |
| Developer Velocity | Today vs yesterday, 7-day average, trend analysis |
| Commits | List of all commits with descriptions |
| Issues Worked On | Issues closed, updated, or created |
| Files Modified | Key files changed |
| Tests Added | New test coverage |
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
