#!/bin/bash

# Daily Report Generator Script for OpenCap Stack
# Fixed version - works without jq dependency
# Correctly counts PRs, issues, and commits
#
# SCHEDULE: Runs at 11:59 PM Karachi time (PKT)
# WINDOW: Covers 24 hours from 11:59 PM previous day to 11:59 PM current day

set -e

# ============================================================================
# CONFIGURATION - Update these for your setup
# ============================================================================
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
REPORT_DIR="$PROJECT_DIR/docs/reports/daily"
LOG_DIR="$PROJECT_DIR/logs"

# Get current user info from git/gh with better fallbacks
GH_USERNAME=$(gh api user --jq '.login' 2>/dev/null || echo "")
if [ -z "$GH_USERNAME" ]; then
    # Try to get from git remote
    GH_USERNAME=$(git config --get remote.origin.url 2>/dev/null | sed -n 's/.*github.com[:/]\([^/]*\)\/.*/\1/p' || echo "")
fi
if [ -z "$GH_USERNAME" ]; then
    GH_USERNAME="juweriya1"  # Default fallback
fi

GIT_EMAIL=$(git config user.email 2>/dev/null || echo "unknown")
GIT_NAME=$(git config user.name 2>/dev/null || echo "$GH_USERNAME")

# Date configuration
# Report is for TODAY, covering 23:59 PM yesterday to 23:59 PM today
DATE=${DATE:-$(date +%Y-%m-%d)}
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Calculate the time window: yesterday 23:59:00 to today 23:59:00
# This ensures we capture a full 24-hour period ending at 11:59 PM
# Allow YESTERDAY to be overridden for regenerating past reports
if [ -z "$YESTERDAY" ]; then
    YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "yesterday" +%Y-%m-%d 2>/dev/null)
fi
REPORT_START="${YESTERDAY} 23:59:00"
REPORT_END="${DATE} 23:59:00"

# ============================================================================
# SETUP
# ============================================================================
mkdir -p "$REPORT_DIR"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/daily-report-$DATE.log"

log() {
    echo "[$(date +"%H:%M:%S")] $1" >> "$LOG_FILE"
    echo "$1"
}

log "========================================"
log "Daily Report Generator Started"
log "User: $GH_USERNAME ($GIT_EMAIL)"
log "Date: $DATE"
log "========================================"

cd "$PROJECT_DIR"

# ============================================================================
# COLLECT METRICS
# ============================================================================

# Get commit counts using the 23:59 PM to 23:59 PM window
log "Collecting commit data..."
log "Report window: $REPORT_START to $REPORT_END"

# Count all commits in the reporting period (deduped)
TODAY_COMMITS=$(git log --since="$REPORT_START" --until="$REPORT_END" --oneline 2>/dev/null | wc -l | tr -d ' ')

# Get previous day's commits (for comparison) using same window
PREV_DAY=$(date -v-2d +%Y-%m-%d 2>/dev/null || date -d "2 days ago" +%Y-%m-%d 2>/dev/null || echo "")
if [ -n "$PREV_DAY" ]; then
    PREV_REPORT_START="${PREV_DAY} 23:59:00"
    PREV_REPORT_END="${YESTERDAY} 23:59:00"
    YESTERDAY_COMMITS=$(git log --since="$PREV_REPORT_START" --until="$PREV_REPORT_END" --oneline 2>/dev/null | wc -l | tr -d ' ')
else
    YESTERDAY_COMMITS=0
fi

WEEK_COMMITS=$(git log --author="$GIT_EMAIL" --since="7 days ago" --oneline 2>/dev/null | wc -l | tr -d ' ')
if [ "$WEEK_COMMITS" -gt 0 ]; then
    SEVEN_DAY_AVG=$(echo "scale=1; $WEEK_COMMITS / 7" | bc 2>/dev/null || echo "0")
else
    SEVEN_DAY_AVG="0"
fi

log "Today's commits: $TODAY_COMMITS"
log "Yesterday's commits: $YESTERDAY_COMMITS"
log "7-day average: $SEVEN_DAY_AVG"

# Get PRs merged in reporting window
# Use GitHub search API which returns ALL merged PRs for the repo
log "Collecting PR data..."

# Get repository info
REPO_OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null || echo "Open-Cap-Stack")
REPO_NAME=$(gh repo view --json name -q '.name' 2>/dev/null || echo "opencapstack")

# Count PRs merged today using search API (searches all PRs, not just user's)
PRS_MERGED_TODAY=$(gh api "search/issues?q=repo:${REPO_OWNER}/${REPO_NAME}+is:pr+is:merged+merged:${DATE}&per_page=1" 2>/dev/null | \
  python3 -c "import json,sys; print(json.load(sys.stdin).get('total_count', 0))" 2>/dev/null || echo "0")

# Fallback: try gh search if API fails
if [ "$PRS_MERGED_TODAY" = "0" ] || [ -z "$PRS_MERGED_TODAY" ]; then
    PRS_MERGED_TODAY=$(gh search prs --repo "${REPO_OWNER}/${REPO_NAME}" --merged-at "${DATE}" --limit 500 2>/dev/null | wc -l | tr -d ' ' || echo "0")
fi

log "PRs merged today: $PRS_MERGED_TODAY"

# Get issues closed in reporting window using search API
log "Collecting issue data..."

# Count issues closed today using search API
ISSUES_CLOSED_TODAY=$(gh api "search/issues?q=repo:${REPO_OWNER}/${REPO_NAME}+is:issue+is:closed+closed:${DATE}&per_page=1" 2>/dev/null | \
  python3 -c "import json,sys; print(json.load(sys.stdin).get('total_count', 0))" 2>/dev/null || echo "0")

# Fallback: try gh search if API fails
if [ "$ISSUES_CLOSED_TODAY" = "0" ] || [ -z "$ISSUES_CLOSED_TODAY" ]; then
    ISSUES_CLOSED_TODAY=$(gh search issues --repo "${REPO_OWNER}/${REPO_NAME}" --closed "${DATE}" --limit 500 2>/dev/null | wc -l | tr -d ' ' || echo "0")
fi

log "Issues closed today: $ISSUES_CLOSED_TODAY"

# ============================================================================
# CALCULATE VELOCITY
# ============================================================================
VELOCITY_SCORE=$((TODAY_COMMITS * 1 + ISSUES_CLOSED_TODAY * 3 + PRS_MERGED_TODAY * 5))

# Determine velocity trend
if [ "$(echo "$TODAY_COMMITS > $SEVEN_DAY_AVG" | bc 2>/dev/null || echo 0)" -eq 1 ]; then
    VELOCITY_TREND="📈 Above Average"
elif [ "$(echo "$TODAY_COMMITS < $SEVEN_DAY_AVG" | bc 2>/dev/null || echo 0)" -eq 1 ]; then
    VELOCITY_TREND="📉 Below Average"
else
    VELOCITY_TREND="➡️ On Track"
fi

# Productivity rating based on velocity score
if [ "$VELOCITY_SCORE" -ge 50 ]; then
    PRODUCTIVITY_RATING="🔥 Exceptional"
elif [ "$VELOCITY_SCORE" -ge 30 ]; then
    PRODUCTIVITY_RATING="⭐ Strong"
elif [ "$VELOCITY_SCORE" -ge 15 ]; then
    PRODUCTIVITY_RATING="✅ Good"
else
    PRODUCTIVITY_RATING="⚠️ Light"
fi

log "Velocity score: $VELOCITY_SCORE"
log "Rating: $PRODUCTIVITY_RATING"

# ============================================================================
# GENERATE REPORT
# ============================================================================
REPORT_FILE="$REPORT_DIR/DAILY_REPORT_${DATE}_${GH_USERNAME}.md"

log "Generating report: $REPORT_FILE"

cat > "$REPORT_FILE" << EOF
# 📊 Daily Progress Report - $DATE

**Developer:** $GH_USERNAME
**Generated:** $TIMESTAMP
**Reporting Period:** $REPORT_START to $REPORT_END (PKT)

---

## 📈 Summary

| Metric | Value |
|--------|-------|
| Commits Today | $TODAY_COMMITS |
| PRs Merged Today | $PRS_MERGED_TODAY |
| Issues Closed Today | $ISSUES_CLOSED_TODAY |
| Velocity Score | $VELOCITY_SCORE |
| Rating | $PRODUCTIVITY_RATING |

---

## 🚀 Developer Velocity

| Metric | Value |
|--------|-------|
| Today's Commits | $TODAY_COMMITS |
| Yesterday's Commits | $YESTERDAY_COMMITS |
| 7-Day Average | $SEVEN_DAY_AVG commits/day |
| Trend | $VELOCITY_TREND |

**Velocity Score Calculation:**
- Commits × 1 = $TODAY_COMMITS
- Issues × 3 = $((ISSUES_CLOSED_TODAY * 3))
- PRs × 5 = $((PRS_MERGED_TODAY * 5))
- **Total: $VELOCITY_SCORE points**

**Rating Scale:**
- 🔥 Exceptional: 50+ points
- ⭐ Strong: 30-49 points
- ✅ Good: 15-29 points
- ⚠️ Light: <15 points

---

## 💻 Commits Today

EOF

# Add commit list (all commits in the reporting window, no duplicates)
if [ "$TODAY_COMMITS" -gt 0 ]; then
    git log --since="$REPORT_START" --until="$REPORT_END" --pretty=format:"- \`%h\` %s" 2>/dev/null >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    echo "No commits in this reporting period." >> "$REPORT_FILE"
fi

# Add PRs merged section
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## 🔀 PRs Merged Today" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$PRS_MERGED_TODAY" -gt 0 ]; then
    # List all PRs merged today using search API
    gh search prs --repo "${REPO_OWNER}/${REPO_NAME}" --merged-at "${DATE}" --limit 100 --json number,title 2>/dev/null | \
    python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for pr in data:
        print(f\"- #{pr['number']} - {pr['title']}\")
except:
    pass
" >> "$REPORT_FILE" 2>/dev/null || echo "Unable to fetch PR details" >> "$REPORT_FILE"
else
    echo "No PRs merged today." >> "$REPORT_FILE"
fi

# Add issues section
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## ✅ Issues Closed Today" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$ISSUES_CLOSED_TODAY" -gt 0 ]; then
    # List all issues closed today using search API
    gh search issues --repo "${REPO_OWNER}/${REPO_NAME}" --closed "${DATE}" --limit 100 --json number,title 2>/dev/null | \
    python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for issue in data:
        print(f\"- #{issue['number']} - {issue['title']}\")
except:
    pass
" >> "$REPORT_FILE" 2>/dev/null || echo "Unable to fetch issue details" >> "$REPORT_FILE"
else
    echo "No issues closed today." >> "$REPORT_FILE"
fi

# Add files modified section
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## 📁 Files Modified" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$TODAY_COMMITS" -gt 0 ]; then
    FILES_CHANGED=$(git log --since="$REPORT_START" --until="$REPORT_END" --name-only --pretty=format: 2>/dev/null | sort -u | grep -v "^$" | wc -l | tr -d ' ')
    echo "**Total files changed:** $FILES_CHANGED" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
    git log --since="$REPORT_START" --until="$REPORT_END" --name-only --pretty=format: 2>/dev/null | sort -u | grep -v "^$" | head -50 >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
else
    echo "No files modified in this reporting period." >> "$REPORT_FILE"
fi

# Footer
cat >> "$REPORT_FILE" << EOF

---

## 📋 Next Steps

- Review remaining open issues
- Continue with backlog priorities
- Address any code review feedback

---

*Report generated automatically at $(date +"%H:%M %p")*
EOF

log "========================================"
log "Report generated successfully!"
log "Location: $REPORT_FILE"
log "========================================"

echo ""
echo "Daily report generated: $REPORT_FILE"
