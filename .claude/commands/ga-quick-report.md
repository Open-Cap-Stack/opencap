---
description: Generate a quick Google Analytics overview report
---

Generate a comprehensive GA4 overview report with common metrics.

This command creates a quick snapshot of website performance by fetching:

1. **User Metrics** (last 30 days):
   - Total users
   - New users
   - Active users
   - User engagement

2. **Session Metrics**:
   - Total sessions
   - Sessions per user
   - Bounce rate
   - Average session duration

3. **Traffic Sources** (top 10):
   - Sessions by source/medium
   - Users by channel group

4. **Top Pages** (top 10):
   - Page views
   - Users per page path

5. **Device Breakdown**:
   - Sessions by device category (desktop, mobile, tablet)

Ask the user:
- Date range (default: last 30 days)
- Any specific filters (e.g., only organic traffic)

Then execute multiple /ga-get-data calls to build the complete report.

Present results in a formatted table or markdown for easy reading.
