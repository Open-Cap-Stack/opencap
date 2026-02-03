#!/bin/bash

# Daily Report Generator Script for OpenCap Stack
# Runs automatically at 11:59 PM Pacific Time
# Author: Urban Tech (utventures@gmail.com)

set -e

# Configuration
PROJECT_DIR="/Users/aideveloper/opencapstack"
REPORT_DIR="$PROJECT_DIR/docs/reports/daily"
LOG_DIR="$PROJECT_DIR/logs"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S %Z")

# Email configuration
EMAIL_TO="toby@ainative.studio"
AINATIVE_API_TOKEN="kLPiP0bzgKJ0CnNYVt1wq3qxbs2QgDeF2XwyUnxBEOM"
SEND_EMAIL=false  # Disabled until email endpoint is configured

# Create directories if they don't exist
mkdir -p "$REPORT_DIR"
mkdir -p "$LOG_DIR"

# Log file
LOG_FILE="$LOG_DIR/daily-report-$DATE.log"

echo "========================================" >> "$LOG_FILE"
echo "Daily Report Generator Started" >> "$LOG_FILE"
echo "Timestamp: $TIMESTAMP" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Change to project directory
cd "$PROJECT_DIR"

# Load user identities
GIT_EMAILS="utventures@gmail.com|toby@rely.ventures|developer@ainative.studio|admin@ainative.studio"
PRIMARY_NAME="Urban Tech"
GH_USERNAME="urbantech"

echo "Generating report for: $PRIMARY_NAME" >> "$LOG_FILE"
echo "Tracking emails: $GIT_EMAILS" >> "$LOG_FILE"

# Build author filter for all emails
AUTHOR_ARGS=""
IFS='|' read -ra EMAILS <<< "$GIT_EMAILS"
for email in "${EMAILS[@]}"; do
    AUTHOR_ARGS="$AUTHOR_ARGS --author=$email"
done

# Get today's commits
TODAY_COMMITS=$(git log $AUTHOR_ARGS --since="today 00:00" --no-merges --oneline 2>/dev/null | wc -l | tr -d ' ')
YESTERDAY_COMMITS=$(git log $AUTHOR_ARGS --since="yesterday 00:00" --until="today 00:00" --no-merges --oneline 2>/dev/null | wc -l | tr -d ' ')
WEEK_COMMITS=$(git log $AUTHOR_ARGS --since="7 days ago" --no-merges --oneline 2>/dev/null | wc -l | tr -d ' ')
SEVEN_DAY_AVG=$(echo "scale=1; $WEEK_COMMITS / 7" | bc)

echo "Today's commits: $TODAY_COMMITS" >> "$LOG_FILE"
echo "Yesterday's commits: $YESTERDAY_COMMITS" >> "$LOG_FILE"
echo "7-day average: $SEVEN_DAY_AVG" >> "$LOG_FILE"

# Get GitHub stats
ISSUES_CLOSED_TODAY=$(gh issue list --assignee="@me" --state closed --search "closed:$DATE" --json number --jq 'length' 2>/dev/null || echo "0")
PRS_MERGED_TODAY=$(gh pr list --author="@me" --state merged --search "merged:$DATE" --json number --jq 'length' 2>/dev/null || echo "0")

echo "Issues closed: $ISSUES_CLOSED_TODAY" >> "$LOG_FILE"
echo "PRs merged: $PRS_MERGED_TODAY" >> "$LOG_FILE"

# Calculate velocity
VELOCITY_SCORE=$(echo "$TODAY_COMMITS * 1 + $ISSUES_CLOSED_TODAY * 3 + $PRS_MERGED_TODAY * 5" | bc)

# Determine velocity trend
if [ $(echo "$TODAY_COMMITS > $SEVEN_DAY_AVG" | bc) -eq 1 ]; then
  VELOCITY_TREND="📈 Above Average"
elif [ $(echo "$TODAY_COMMITS < $SEVEN_DAY_AVG" | bc) -eq 1 ]; then
  VELOCITY_TREND="📉 Below Average"
else
  VELOCITY_TREND="➡️ On Track"
fi

# Productivity rating
if [ $(echo "$VELOCITY_SCORE >= 50" | bc) -eq 1 ] && [ "$TODAY_COMMITS" -ge 19 ]; then
  PRODUCTIVITY_RATING="🔥 Exceptional (top 10%)"
elif [ $(echo "$VELOCITY_SCORE >= 30" | bc) -eq 1 ] && [ "$TODAY_COMMITS" -ge 15 ]; then
  PRODUCTIVITY_RATING="⭐ Strong (top 25%)"
elif [ $(echo "$VELOCITY_SCORE >= 15" | bc) -eq 1 ] && [ "$TODAY_COMMITS" -ge 3 ]; then
  PRODUCTIVITY_RATING="✅ Good (above median)"
else
  PRODUCTIVITY_RATING="⚠️ Light (below median)"
fi

# Generate report file
REPORT_FILE="$REPORT_DIR/DAILY_REPORT_${DATE}_urbantech.md"

cat > "$REPORT_FILE" << EOF
# Daily Progress Report - $(date +"%B %d, %Y")

**Developer**: Urban Tech
**Git Identities Tracked**:
- utventures@gmail.com (@urbantech)
- toby@rely.ventures (@relycapital)
- developer@ainative.studio (@developer-ainative)
- admin@ainative.studio

**Total Commits**: $TODAY_COMMITS (across all your identities)
**Issues Closed**: $ISSUES_CLOSED_TODAY
**PRs Merged**: $PRS_MERGED_TODAY

---

## Developer Velocity

**Today's Productivity**:
- Commits: $TODAY_COMMITS
- Issues Closed: $ISSUES_CLOSED_TODAY
- PRs Merged: $PRS_MERGED_TODAY
- Velocity Score: $VELOCITY_SCORE points (commits×1 + issues×3 + PRs×5)
- Productivity Rating: $PRODUCTIVITY_RATING

**Comparison**:
- Yesterday: $YESTERDAY_COMMITS commits
- 7-Day Average: $SEVEN_DAY_AVG commits/day
- Trend: $VELOCITY_TREND

**Velocity Benchmarks**:
- 🔥 Exceptional: 19+ commits/day, 50+ velocity points (top 10%)
- ⭐ Strong: 15+ commits/day, 30+ velocity points (top 25%)
- ✅ Good: 3+ commits/day, 15+ velocity points (above median)
- ⚠️ Light: <3 commits/day, <15 velocity points (below median)

## Commits Today

EOF

# Add commit list
if [ "$TODAY_COMMITS" -gt 0 ]; then
    echo "### All Commits" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    git log $AUTHOR_ARGS --since="today 00:00" --pretty=format:"- \`%h\` %s" --no-merges >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    echo "No commits today." >> "$REPORT_FILE"
fi

# Add files modified
echo "" >> "$REPORT_FILE"
echo "## Files Modified" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
if [ "$TODAY_COMMITS" -gt 0 ]; then
    FILES_CHANGED=$(git log $AUTHOR_ARGS --since="today 00:00" --name-only --pretty=format: | sort -u | grep -v "^$" | wc -l | tr -d ' ')
    echo "**Total files changed**: $FILES_CHANGED" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
    git log $AUTHOR_ARGS --since="today 00:00" --name-only --pretty=format: | sort -u | grep -v "^$" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
else
    echo "No files modified today." >> "$REPORT_FILE"
fi

# Add GitHub issues
echo "" >> "$REPORT_FILE"
echo "## GitHub Activity" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
if [ "$ISSUES_CLOSED_TODAY" -gt 0 ]; then
    echo "### Issues Closed Today" >> "$REPORT_FILE"
    gh issue list --assignee="@me" --state closed --search "closed:$DATE" --json number,title --jq '.[] | "- #\(.number) - \(.title)"' >> "$REPORT_FILE" 2>/dev/null || echo "- Unable to fetch issues" >> "$REPORT_FILE"
fi
if [ "$PRS_MERGED_TODAY" -gt 0 ]; then
    echo "" >> "$REPORT_FILE"
    echo "### PRs Merged Today" >> "$REPORT_FILE"
    gh pr list --author="@me" --state merged --search "merged:$DATE" --json number,title --jq '.[] | "- #\(.number) - \(.title)"' >> "$REPORT_FILE" 2>/dev/null || echo "- Unable to fetch PRs" >> "$REPORT_FILE"
fi

# Footer
cat >> "$REPORT_FILE" << EOF

---

**Report Generated**: $(date +"%Y-%m-%d %H:%M:%S %Z")
**Automated**: Yes (runs daily at 11:59 PM Pacific)
EOF

echo "Report generated successfully: $REPORT_FILE" >> "$LOG_FILE"

# Send email if enabled
if [ "$SEND_EMAIL" = true ]; then
    echo "Sending email to $EMAIL_TO..." >> "$LOG_FILE"

    # Send email using Node.js script
    EMAIL_RESULT=$(node "$PROJECT_DIR/scripts/send-email-report.js" "$REPORT_FILE" "$EMAIL_TO" 2>&1)
    EMAIL_EXIT_CODE=$?

    if [ $EMAIL_EXIT_CODE -eq 0 ]; then
        echo "$EMAIL_RESULT" >> "$LOG_FILE"
        echo "$EMAIL_RESULT"
    else
        echo "❌ Failed to send email" >> "$LOG_FILE"
        echo "$EMAIL_RESULT" >> "$LOG_FILE"
        echo "❌ Failed to send email: $EMAIL_RESULT"
    fi
fi

echo "========================================" >> "$LOG_FILE"

# Output result
echo "Daily report generated: $REPORT_FILE"
