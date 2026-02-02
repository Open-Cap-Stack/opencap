# Daily Report Generator

Generate a concise daily progress report summarizing today's development activity.

## Usage

```bash
/daily-report
```

## What This Does

1. **Analyzes Today's Git Commits** - Fetches all commits from today
2. **Reviews Active Issues** - Checks issues worked on today
3. **Categorizes Changes** - Features, bug fixes, tests, docs, etc.
4. **Calculates Developer Velocity** - Compare today vs yesterday and 7-day average
5. **Generates Report** - Creates structured markdown in `docs/reports/daily/`

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
else
    # Fallback to current git user
    GIT_EMAILS=$(git config user.email)
    PRIMARY_NAME=$(git config user.name)
fi
```

### Step 2: Git Commits (Today - YOUR commits from ALL identities)

```bash
# Build author filter for ALL your emails
AUTHOR_FILTER=$(echo "$GIT_EMAILS" | tr '|' '\n' | sed 's/^/--author="/; s/$/"/' | tr '\n' ' ')

# Today's commits by ANY of your identities
git log $AUTHOR_FILTER --since="today 00:00" --pretty=format:"%h|%s|%ae" --no-merges

# YOUR commit count (all identities)
git log $AUTHOR_FILTER --since="today 00:00" --no-merges --oneline | wc -l

# Files YOU changed today (all identities)
git log $AUTHOR_FILTER --since="today 00:00" --name-only --pretty=format: | sort -u
```

### Step 3: Developer Velocity Metrics

```bash
# Today's commits vs yesterday
TODAY_COMMITS=$(git log $AUTHOR_FILTER --since="today 00:00" --no-merges --oneline | wc -l)
YESTERDAY_COMMITS=$(git log $AUTHOR_FILTER --since="yesterday 00:00" --until="today 00:00" --no-merges --oneline | wc -l)

# 7-day average
WEEK_COMMITS=$(git log $AUTHOR_FILTER --since="7 days ago" --no-merges --oneline | wc -l)
SEVEN_DAY_AVG=$(echo "scale=1; $WEEK_COMMITS / 7" | bc)

# Issues and PRs today
ISSUES_CLOSED_TODAY=$(gh issue list --assignee="@me" --state closed --search "closed:$(date +%Y-%m-%d)" --json number --jq 'length')
PRS_MERGED_TODAY=$(gh pr list --author="@me" --state merged --search "merged:$(date +%Y-%m-%d)" --json number --jq 'length')

# Velocity score: commits×1 + issues×3 + PRs×5
VELOCITY_SCORE=$(echo "$TODAY_COMMITS * 1 + $ISSUES_CLOSED_TODAY * 3 + $PRS_MERGED_TODAY * 5" | bc)
```

## Report Sections

| Section | Content |
|---------|---------|
| Summary | Quick overview of today's work |
| Developer Velocity | Today vs yesterday, 7-day average, productivity rating |
| Commits | List of all commits with descriptions |
| Issues Worked On | Issues closed, updated, or created |
| Files Modified | Key files changed |
| Tests Added | New test coverage |
| Next Steps | Tomorrow's priorities |

## Output Location

```
docs/reports/daily/DAILY_REPORT_YYYY-MM-DD_username.md
```

## Velocity Benchmarks

Based on your historical data (urbantech profile, last year):

| Rating | Daily Criteria |
|--------|----------------|
| 🔥 Exceptional | 19+ commits/day, 50+ velocity points (top 10%) |
| ⭐ Strong | 15+ commits/day, 30+ velocity points (top 25%) |
| ✅ Good | 3+ commits/day, 15+ velocity points (above median) |
| ⚠️ Light | <3 commits/day, <15 velocity points (below median) |

## Workflow

1. Run `/daily-report`
2. Gather today's commit data (all your identities)
3. Calculate velocity metrics
4. Fetch GitHub activity (issues/PRs assigned to you)
5. Categorize changes
6. Generate markdown report
7. Save to `docs/reports/daily/DAILY_REPORT_YYYY-MM-DD_username.md`

Invoke this command at the end of each workday to generate your daily progress report.
