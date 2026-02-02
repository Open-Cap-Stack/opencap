---
description: Get all dimensions in a specific Google Analytics category
---

Use the mcp__google-analytics__get_dimensions_by_category tool to see all dimensions within a category.

Workflow:
1. First run /ga-list-categories to see available categories
2. User selects a category (e.g., "User", "Session", "Event")
3. Use this tool with the category name
4. Returns all dimensions with descriptions

Parameters:
- **category**: The category name (e.g., "User", "Session", "Event", "Page")

Common categories to explore:
- **User**: userAgeBracket, userGender, city, country, language
- **Session**: sessionSource, sessionMedium, sessionCampaignName
- **Event**: eventName, eventCategory, eventLabel
- **Page**: pagePath, pageTitle, landingPage
- **Traffic**: source, medium, campaign, channelGroup

After finding dimensions, use them in /ga-get-data queries.
