---
description: List all available Google Analytics dimension and metric categories
---

Use these tools to explore GA4 schema organization:

1. **mcp__google-analytics__list_dimension_categories**
   - Shows all dimension categories (User, Session, Event, Page, Traffic, etc.)

2. **mcp__google-analytics__list_metric_categories**
   - Shows all metric categories (User, Session, Event, Conversion, Revenue, etc.)

This is a low-cost way to start exploring what data is available.

Workflow:
1. Use this command to see all categories
2. User picks a category of interest
3. Use /ga-dimensions-by-category or /ga-metrics-by-category to see details
4. Use /ga-get-data to retrieve actual data

Example categories you might see:
- User Attributes (demographics, interests)
- Session Information (source, medium, campaign)
- Event Tracking (event names, parameters)
- Page Performance (page paths, titles, screen views)
- E-commerce (transaction data, product info)
- Traffic Sources (organic, paid, referral)
