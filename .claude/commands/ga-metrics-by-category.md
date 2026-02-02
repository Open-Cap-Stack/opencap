---
description: Get all metrics in a specific Google Analytics category
---

Use the mcp__google-analytics__get_metrics_by_category tool to see all metrics within a category.

Workflow:
1. First run /ga-list-categories to see available categories
2. User selects a category (e.g., "User", "Session", "Revenue")
3. Use this tool with the category name
4. Returns all metrics with descriptions

Parameters:
- **category**: The category name (e.g., "User", "Session", "Event", "Revenue")

Common categories to explore:
- **User**: totalUsers, newUsers, activeUsers, userEngagementDuration
- **Session**: sessions, sessionsPerUser, averageSessionDuration, bounceRate
- **Event**: eventCount, eventValue, conversions
- **Revenue**: totalRevenue, purchaseRevenue, transactionRevenue
- **E-commerce**: itemsViewed, itemsAddedToCart, itemsPurchased

After finding metrics, use them in /ga-get-data queries.
