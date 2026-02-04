#!/bin/bash

# Daily Report Generator Script for OpenCap Stack
# Fixed version - works without jq dependency
# Correctly counts PRs, issues, and commits

set -e

# ============================================================================
# CONFIGURATION - Update these for your setup
# ============================================================================
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
REPORT_DIR="$PROJECT_DIR/docs/reports/daily"
LOG_DIR="$PROJECT_DIR/logs"

# Get current user info from git/gh
GH_USERNAME=$(gh api user --jq '.login' 2>/dev/null || echo "unknown")
GIT_EMAIL=$(git config user.email 2>/dev/null || echo "unknown")
GIT_NAME=$(git config user.name 2>/dev/null || echo "$GH_USERNAME")

# Date configuration
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

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

# Get commit counts
log "Collecting commit data..."
TODAY_COMMITS=$(git log --author="$GIT_EMAIL" --since="$DATE 00:00" --until="$DATE 23:59:59" --oneline 2>/dev/null | wc -l | tr -d ' ')
# Also check by username in case email doesn't match
TODAY_COMMITS_BY_NAME=$(git log --author="$GIT_NAME" --since="$DATE 00:00" --until="$DATE 23:59:59" --oneline 2>/dev/null | wc -l | tr -d ' ')
# Use the higher of the two
if [ "$TODAY_COMMITS_BY_NAME" -gt "$TODAY_COMMITS" ]; then
    TODAY_COMMITS=$TODAY_COMMITS_BY_NAME
fi

YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "yesterday" +%Y-%m-%d 2>/dev/null || echo "")
if [ -n "$YESTERDAY" ]; then
    YESTERDAY_COMMITS=$(git log --author="$GIT_EMAIL" --since="$YESTERDAY 00:00" --until="$YESTERDAY 23:59:59" --oneline 2>/dev/null | wc -l | tr -d ' ')
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

# Get PRs merged today (without jq - using grep)
log "Collecting PR data..."
PRS_JSON=$(gh pr list --author "$GH_USERNAME" --state merged --limit 100 --json number,title,mergedAt 2>/dev/null || echo "[]")
PRS_MERGED_TODAY=$(echo "$PRS_JSON" | grep -o "\"mergedAt\":\"${DATE}T[^\"]*\"" | wc -l | tr -d ' ')
log "PRs merged today: $PRS_MERGED_TODAY"

# Get issues closed today
log "Collecting issue data..."
# Use search API for issues closed on specific date
ISSUES_CLOSED_TODAY=$(gh search issues --repo Open-Cap-Stack/opencapstack --closed "$DATE" --limit 200 2>/dev/null | wc -l | tr -d ' ')
log "Issues closed today: $ISSUES_CLOSED_TODAY"

# ============================================================================
# CALCULATE VELOCITY
# ============================================================================
VELOCITY_SCORE=$((TODAY_COMMITS * 1 + ISSUES_CLOSED_TODAY * 3 + PRS_MERGED_TODAY * 5))

# Determine velocity trend
if [ "$(echo "$TODAY_COMMITS > $SEVEN_DAY_AVG" | bc 2>/dev/null || echo 0)" -eq 1 ]; then
    VELOCITY_TREND="Above Average"
elif [ "$(echo "$TODAY_COMMITS < $SEVEN_DAY_AVG" | bc 2>/dev/null || echo 0)" -eq 1 ]; then
    VELOCITY_TREND="Below Average"
else
    VELOCITY_TREND="On Track"
fi

# Productivity rating based on velocity score
if [ "$VELOCITY_SCORE" -ge 50 ]; then
    PRODUCTIVITY_RATING="Exceptional"
elif [ "$VELOCITY_SCORE" -ge 30 ]; then
    PRODUCTIVITY_RATING="Strong"
elif [ "$VELOCITY_SCORE" -ge 15 ]; then
    PRODUCTIVITY_RATING="Good"
else
    PRODUCTIVITY_RATING="Light"
fi

log "Velocity score: $VELOCITY_SCORE"
log "Rating: $PRODUCTIVITY_RATING"

# ============================================================================
# GENERATE REPORT
# ============================================================================
REPORT_FILE="$REPORT_DIR/DAILY_REPORT_${DATE}_${GH_USERNAME}.md"

log "Generating report: $REPORT_FILE"

cat > "$REPORT_FILE" << EOF
# Daily Report - $DATE

**Developer:** $GH_USERNAME
**Generated:** $TIMESTAMP

---

## Summary

| Metric | Value |
|--------|-------|
| Commits Today | $TODAY_COMMITS |
| PRs Merged Today | $PRS_MERGED_TODAY |
| Issues Closed Today | $ISSUES_CLOSED_TODAY |
| Velocity Score | $VELOCITY_SCORE |
| Rating | $PRODUCTIVITY_RATING |

---

## Developer Velocity

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
- Exceptional: 50+ points
- Strong: 30-49 points
- Good: 15-29 points
- Light: <15 points

---

## Commits Today

EOF

# Add commit list
if [ "$TODAY_COMMITS" -gt 0 ]; then
    git log --author="$GIT_EMAIL" --since="$DATE 00:00" --until="$DATE 23:59:59" --pretty=format:"- \`%h\` %s" 2>/dev/null >> "$REPORT_FILE"
    # Also add commits by name if different
    git log --author="$GIT_NAME" --since="$DATE 00:00" --until="$DATE 23:59:59" --pretty=format:"- \`%h\` %s" 2>/dev/null | grep -v "^$" >> "$REPORT_FILE" 2>/dev/null || true
    echo "" >> "$REPORT_FILE"
else
    echo "No commits today." >> "$REPORT_FILE"
fi

# Add PRs merged section
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## PRs Merged Today" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$PRS_MERGED_TODAY" -gt 0 ]; then
    # Extract PR numbers and titles for today
    echo "$PRS_JSON" | grep -E "\"number\":|\"title\":|\"mergedAt\":\"${DATE}" | \
    while read -r line; do
        if echo "$line" | grep -q "\"number\":"; then
            NUM=$(echo "$line" | grep -o '"number":[0-9]*' | grep -o '[0-9]*')
        elif echo "$line" | grep -q "\"title\":"; then
            TITLE=$(echo "$line" | sed 's/.*"title":"\([^"]*\)".*/\1/')
        elif echo "$line" | grep -q "\"mergedAt\":\"${DATE}"; then
            if [ -n "$NUM" ] && [ -n "$TITLE" ]; then
                echo "- #$NUM - $TITLE" >> "$REPORT_FILE"
            fi
            NUM=""
            TITLE=""
        fi
    done

    # Simpler approach - just list the PRs
    gh pr list --author "$GH_USERNAME" --state merged --limit 50 --json number,title,mergedAt 2>/dev/null | \
    grep -B2 "\"mergedAt\":\"${DATE}" | grep -E "number|title" | \
    sed 'N;s/\n/ /' | sed 's/.*"number":\([0-9]*\).*"title":"\([^"]*\)".*/- #\1 - \2/' >> "$REPORT_FILE" 2>/dev/null || true
else
    echo "No PRs merged today." >> "$REPORT_FILE"
fi

# Add issues section
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Issues Closed Today" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$ISSUES_CLOSED_TODAY" -gt 0 ]; then
    gh search issues --repo Open-Cap-Stack/opencapstack --closed "$DATE" --limit 50 2>/dev/null | \
    awk '{print "- #"$2" - "$4" "$5" "$6" "$7" "$8}' >> "$REPORT_FILE" || echo "Unable to fetch issue details" >> "$REPORT_FILE"
else
    echo "No issues closed today." >> "$REPORT_FILE"
fi

# Add files modified section
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Files Modified" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$TODAY_COMMITS" -gt 0 ]; then
    FILES_CHANGED=$(git log --author="$GIT_EMAIL" --since="$DATE 00:00" --until="$DATE 23:59:59" --name-only --pretty=format: 2>/dev/null | sort -u | grep -v "^$" | wc -l | tr -d ' ')
    echo "**Total files changed:** $FILES_CHANGED" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
    git log --author="$GIT_EMAIL" --since="$DATE 00:00" --until="$DATE 23:59:59" --name-only --pretty=format: 2>/dev/null | sort -u | grep -v "^$" | head -50 >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
else
    echo "No files modified today." >> "$REPORT_FILE"
fi

# Footer
cat >> "$REPORT_FILE" << EOF

---

## Next Steps

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
