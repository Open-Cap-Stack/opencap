---
description: Retrieve Google Analytics 4 data with smart protections
---

Use the mcp__google-analytics__get_ga4_data tool to fetch GA4 data intelligently.

This tool has built-in safeguards:
- ✅ Auto-aggregation when beneficial
- ✅ Data volume warnings (>2500 rows)
- ✅ Automatic sorting by relevance
- ✅ Server-side aggregation support

Common queries to ask the user:
1. **Date range**: "Last 7 days", "This month", or specific dates (YYYY-MM-DD)
2. **Dimensions**: What to group by (date, city, campaign, page, etc.)
3. **Metrics**: What to measure (users, sessions, conversions, revenue, etc.)
4. **Filters**: Any conditions (e.g., only organic traffic)

Default query (if user doesn't specify):
- Dimensions: ["date"]
- Metrics: ["totalUsers", "newUsers", "sessions"]
- Date range: Last 7 days ("7daysAgo" to "yesterday")

Example questions to enable:
- "Show me user growth over the last 30 days"
- "What are my top 10 traffic sources?"
- "How many conversions did we get this month?"
- "Compare sessions by device category"

Pro tips:
- Use `estimate_only: true` to check row count before fetching
- Set `proceed_with_large_dataset: true` to override warnings
- Disable aggregation with `enable_aggregation: false` if needed
