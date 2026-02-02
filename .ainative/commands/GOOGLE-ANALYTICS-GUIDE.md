# Google Analytics MCP Server - Quick Reference Guide

This guide covers all available Google Analytics 4 (GA4) slash commands and operations.

---

## 🎯 Available Slash Commands

### Discovery & Schema Exploration

| Command | Purpose | Use When |
|---------|---------|----------|
| `/ga-search-schema` | Search for dimensions/metrics by keyword | You need to find specific GA4 fields quickly |
| `/ga-list-categories` | List all dimension/metric categories | Starting exploration, want to see what's available |
| `/ga-dimensions-by-category` | Get all dimensions in a category | Need to see all fields in a specific category |
| `/ga-metrics-by-category` | Get all metrics in a category | Need to see all measurements in a category |

### Data Retrieval

| Command | Purpose | Use When |
|---------|---------|----------|
| `/ga-get-data` | Fetch GA4 data with smart protections | Ready to retrieve actual analytics data |
| `/ga-quick-report` | Generate comprehensive overview report | Need a snapshot of overall performance |

---

## 📊 Common Workflows

### Workflow 1: Exploratory Analysis
```
1. /ga-list-categories          → See what's available
2. /ga-dimensions-by-category   → Pick dimensions to analyze
3. /ga-metrics-by-category      → Pick metrics to measure
4. /ga-get-data                 → Retrieve the data
```

### Workflow 2: Targeted Query
```
1. /ga-search-schema            → Search for specific fields (e.g., "conversion")
2. /ga-get-data                 → Retrieve data using found fields
```

### Workflow 3: Quick Insights
```
1. /ga-quick-report             → Get comprehensive overview instantly
```

---

## 🔍 MCP Operations Reference

### Schema Discovery (6 tools)

1. **`mcp__google-analytics__search_schema`**
   - **Purpose**: Keyword search across all dimensions/metrics
   - **Parameters**: `keyword` (string)
   - **Example**: "user", "campaign revenue", "conversion"
   - **Best for**: Quick discovery without loading full schema

2. **`mcp__google-analytics__get_property_schema`**
   - **Purpose**: Get complete GA4 schema
   - **Parameters**: None
   - **⚠️ Warning**: Very large response (10k+ tokens)
   - **Use**: Only when you need the entire schema

3. **`mcp__google-analytics__list_dimension_categories`**
   - **Purpose**: List all dimension categories
   - **Parameters**: None
   - **Returns**: Category names (User, Session, Event, Page, etc.)

4. **`mcp__google-analytics__list_metric_categories`**
   - **Purpose**: List all metric categories
   - **Parameters**: None
   - **Returns**: Category names (User, Session, Revenue, etc.)

5. **`mcp__google-analytics__get_dimensions_by_category`**
   - **Purpose**: Get dimensions in a specific category
   - **Parameters**: `category` (string)
   - **Returns**: All dimensions with descriptions

6. **`mcp__google-analytics__get_metrics_by_category`**
   - **Purpose**: Get metrics in a specific category
   - **Parameters**: `category` (string)
   - **Returns**: All metrics with descriptions

### Data Retrieval (1 tool with smart features)

7. **`mcp__google-analytics__get_ga4_data`**
   - **Purpose**: Intelligent GA4 data retrieval
   - **Parameters**:
     - `dimensions`: Array of dimension names (default: `["date"]`)
     - `metrics`: Array of metric names (default: `["totalUsers", "newUsers", "sessions"]`)
     - `date_range_start`: Start date (default: `"7daysAgo"`)
     - `date_range_end`: End date (default: `"yesterday"`)
     - `dimension_filter`: Optional filter expression
     - `limit`: Max rows (default: 1000)
     - `estimate_only`: Preview row count (default: false)
     - `proceed_with_large_dataset`: Override warnings (default: false)
     - `enable_aggregation`: Server-side aggregation (default: true)

   - **Smart Features**:
     - 🛡️ Data volume protection (warns if >2500 rows)
     - ⚡ Auto-aggregation for non-time queries
     - 📊 Intelligent sorting (date + primary metric)
     - 🎯 Server-side optimization

---

## 💡 Common Use Cases

### 1. **User Growth Analysis**
```markdown
Dimensions: ["date"]
Metrics: ["totalUsers", "newUsers", "activeUsers"]
Date Range: Last 30 days
```

### 2. **Traffic Source Performance**
```markdown
Dimensions: ["sessionSource", "sessionMedium"]
Metrics: ["sessions", "totalUsers", "conversions"]
Date Range: This month
Limit: Top 10 sources
```

### 3. **Top Pages Report**
```markdown
Dimensions: ["pagePath"]
Metrics: ["screenPageViews", "totalUsers", "averageSessionDuration"]
Date Range: Last 7 days
Limit: Top 20 pages
```

### 4. **Device Breakdown**
```markdown
Dimensions: ["deviceCategory"]
Metrics: ["sessions", "totalUsers", "bounceRate"]
Date Range: Last 30 days
```

### 5. **Campaign Performance**
```markdown
Dimensions: ["sessionCampaignName", "sessionSource"]
Metrics: ["sessions", "conversions", "eventValue"]
Date Range: Last 60 days
Filter: Campaign name contains "summer"
```

### 6. **Geographic Analysis**
```markdown
Dimensions: ["country", "city"]
Metrics: ["totalUsers", "sessions", "averageSessionDuration"]
Date Range: Last 30 days
Limit: Top 25 locations
```

---

## 🎨 Common Dimensions

**User Attributes**:
- `userAgeBracket`, `userGender`, `language`, `country`, `city`

**Session Information**:
- `sessionSource`, `sessionMedium`, `sessionCampaignName`, `sessionDefaultChannelGroup`

**Event Tracking**:
- `eventName`, `eventCategory`, `eventLabel`, `eventAction`

**Page/Screen**:
- `pagePath`, `pageTitle`, `landingPage`, `exitPage`, `screenClass`

**Traffic Sources**:
- `source`, `medium`, `campaign`, `channelGroup`, `sourceMedium`

**Device/Tech**:
- `deviceCategory`, `browser`, `operatingSystem`, `platform`

**Time**:
- `date`, `dateHour`, `year`, `month`, `day`, `hour`

---

## 📏 Common Metrics

**User Metrics**:
- `totalUsers`, `newUsers`, `activeUsers`, `returningUsers`, `userEngagementDuration`

**Session Metrics**:
- `sessions`, `sessionsPerUser`, `averageSessionDuration`, `bounceRate`, `engagementRate`

**Event Metrics**:
- `eventCount`, `eventCountPerUser`, `eventValue`, `conversions`

**Revenue Metrics**:
- `totalRevenue`, `purchaseRevenue`, `averageRevenuePerUser`, `transactionRevenue`

**E-commerce**:
- `itemsViewed`, `itemsAddedToCart`, `itemsPurchased`, `cartToViewRate`, `purchaseToViewRate`

**Page/Screen**:
- `screenPageViews`, `screenPageViewsPerSession`, `screenPageViewsPerUser`

---

## ⚙️ Date Range Formats

**Relative Dates**:
- `"today"`, `"yesterday"`
- `"7daysAgo"`, `"30daysAgo"`, `"90daysAgo"`
- `"thisMonth"`, `"lastMonth"`
- `"thisYear"`, `"lastYear"`

**Absolute Dates**:
- `"2024-01-01"` (YYYY-MM-DD format)
- `"2024-12-31"`

**Examples**:
- Last 7 days: `start: "7daysAgo"`, `end: "yesterday"`
- This month: `start: "thisMonth"`, `end: "today"`
- Custom range: `start: "2024-01-01"`, `end: "2024-01-31"`

---

## 🔒 Data Volume Protection

The `get_ga4_data` tool has built-in safeguards:

1. **Row Estimation**: Always estimates result size before fetching
2. **Warning Threshold**: Warns if query would return >2500 rows
3. **Override**: Use `proceed_with_large_dataset: true` to bypass
4. **Estimate Only**: Use `estimate_only: true` to check size without fetching

**Example**:
```typescript
// Step 1: Estimate
{ dimensions: ["pagePath"], metrics: ["sessions"], estimate_only: true }
// Returns: ~5000 rows

// Step 2: Add limit or proceed
{ dimensions: ["pagePath"], metrics: ["sessions"], limit: 100 }
// Or
{ dimensions: ["pagePath"], metrics: ["sessions"], proceed_with_large_dataset: true }
```

---

## 🚀 Pro Tips

1. **Start with search**: Use `/ga-search-schema` to find fields quickly
2. **Estimate first**: Set `estimate_only: true` for large queries
3. **Use limits**: Always set reasonable limits (100-500 rows)
4. **Leverage aggregation**: Enable auto-aggregation for summary stats
5. **Filter wisely**: Use `dimension_filter` to reduce result sets
6. **Combine dimensions**: Group by multiple dimensions for deeper insights
7. **Check categories**: Use category tools to explore related fields

---

## 📚 Quick Examples

### Example 1: Daily Users (Last Week)
```bash
/ga-get-data
Dimensions: ["date"]
Metrics: ["totalUsers", "newUsers"]
Start: "7daysAgo"
End: "yesterday"
```

### Example 2: Top Traffic Sources
```bash
/ga-get-data
Dimensions: ["sessionSource", "sessionMedium"]
Metrics: ["sessions", "conversions"]
Start: "30daysAgo"
End: "yesterday"
Limit: 10
```

### Example 3: Mobile vs Desktop
```bash
/ga-get-data
Dimensions: ["deviceCategory"]
Metrics: ["sessions", "bounceRate", "averageSessionDuration"]
Start: "30daysAgo"
End: "yesterday"
```

---

## 🆘 Troubleshooting

**"Too many rows" warning**:
- Add a `limit` parameter
- Use more specific dimensions
- Add filters to reduce scope
- Set `proceed_with_large_dataset: true` if needed

**"Field not found" error**:
- Use `/ga-search-schema` to verify field names
- Check case sensitivity (use camelCase)
- Ensure dimension/metric is available for your property

**Empty results**:
- Verify date range has data
- Check filters aren't too restrictive
- Confirm dimensions/metrics are compatible

---

**Last Updated**: 2025-12-26
**MCP Server**: Google Analytics 4
**Version**: Latest
