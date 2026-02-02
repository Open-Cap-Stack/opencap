# Daily Growth Report Generator

Generate comprehensive daily growth report for AINative team and investors using MCP-first workflow.

## Your Task

Generate a comprehensive daily growth report for yesterday (or specified date) following the exact workflow documented in `/Users/aideveloper/core/docs/reports/DAILY_REPORT_WORKFLOW.md`.

## Required Steps

### 1. Data Gathering (MCP-First Workflow)

**CRITICAL**: Follow this exact sequence to minimize tokens and ensure accuracy.

#### Step 1a: Google Analytics MCP - Daily Overview
Query: `mcp__google-analytics__get_ga4_data`
- Dimensions: ["date"]
- Metrics: ["totalUsers", "newUsers", "sessions", "screenPageViews", "engagementRate", "averageSessionDuration", "eventCount"]
- Date range: yesterday → today
- Limit: 1

#### Step 1b: Google Analytics MCP - Event Breakdown
Query: `mcp__google-analytics__get_ga4_data`
- Dimensions: ["eventName"]
- Metrics: ["eventCount"]
- Date range: yesterday → today
- Limit: 20

#### Step 1c: Google Analytics MCP - Geographic Breakdown
Query: `mcp__google-analytics__get_ga4_data`
- Dimensions: ["country"]
- Metrics: ["totalUsers", "newUsers", "sessions"]
- Date range: yesterday → today
- Limit: 10

#### Step 2: Resend MCP - Email List Stats
Query: `mcp__resend__list-audiences`
- No parameters needed
- Extract total contact count

#### Step 3: Railway Database - User Metrics
Connect using `DATABASE_PUBLIC_URL` from `/Users/aideveloper/core/src/backend/.env`

Queries:
```sql
-- New signups yesterday
SELECT COUNT(*) FROM users WHERE DATE(created_at) = '[YESTERDAY]';

-- Email verification rate
SELECT
    COUNT(*) FILTER (WHERE email_verified = true) as verified,
    COUNT(*) as total
FROM users WHERE DATE(created_at) = '[YESTERDAY]';

-- Conversion events
SELECT event_type, COUNT(*), COUNT(DISTINCT user_id)
FROM conversion_events
WHERE DATE(created_at) = '[YESTERDAY]'
GROUP BY event_type ORDER BY COUNT(*) DESC;
```

### 2. Unit Economics Calculation

Calculate the following metrics:

**Revenue**:
- Purchases (from GA4 events or estimate from checkouts)
- Average transaction value: $29.00 (or actual if known)
- Total revenue = purchases × avg_transaction_value

**Costs**:
- Stripe fees: (revenue × 2.9%) + (purchases × $0.30)
- Railway infrastructure: ~$30/month = $1/day
- Traffic acquisition (India): users_from_india × $0.01

**Profitability**:
- Gross profit = revenue - total_costs
- Profit margin = (gross_profit / revenue) × 100%

**CAC & LTV**:
- CAC = (traffic_cost + infrastructure_cost) / signups
- Monthly churn: 5% (assumption)
- LTV (12-month) = $29 × 12 × (1 - 0.05)
- LTV:CAC ratio = LTV / CAC

### 3. Report Generation

Create markdown file at:
`/Users/aideveloper/core/docs/reports/DAILY_GROWTH_REPORT_[DATE].md`

**Required Sections** (in order):
1. Executive Summary (with financial snapshot)
2. 🚀 Marketing Experiment: India Geo-Located Pricing
3. 💰 Unit Economics & Profitability Analysis
4. Traffic & Engagement Metrics
5. Conversion Funnel Performance
6. User Acquisition & Retention
7. Conversion Tracking Health
8. Regional Performance Insights (India, Pakistan deep dives)
9. Key Performance Indicators (KPIs)
10. Opportunities & Action Items
11. Technical Infrastructure Status
12. Investor Highlights
13. Methodology & Data Sources
14. Appendix: Raw Data Sources

### 4. Quality Checks

Before completing, verify:
- [ ] All MCP queries executed successfully
- [ ] Database queries returned data (no errors)
- [ ] Unit economics calculations accurate
- [ ] All sections populated with real data (no placeholders)
- [ ] Financial metrics validated
- [ ] KPIs compared against targets
- [ ] Action items have owners & due dates
- [ ] Markdown formatting correct

## Important Context

### India Pricing Experiment
- 80% OFF standard pricing ($145 → $29/month)
- Target: India market (price-sensitive, high-volume)
- Traffic source: Paid ads at $0.01 CPC
- Hypothesis: Volume at low margins > Premium at high price
- Results to include: Traffic, engagement, conversions, ROI

### Key Metrics to Highlight for Investors
- LTV:CAC ratio (target: 3.0x, actual: ~97x)
- Profit margin (target: 70-80%, actual: ~95%)
- CAC (industry: $50-200, actual: ~$3.42)
- Geographic concentration (top 3 markets: ~70% of traffic)

### MCP-First Workflow Benefits
- Token efficiency: ~6,000 tokens vs 15,000+ database-first
- Data accuracy: Cross-validated across sources
- Industry best practice: External APIs before internal database

## Example Usage

```
User: /daily-growth-report
Claude: Generating daily growth report for December 28, 2025...

[Executes all steps above]

✅ Report generated: /Users/aideveloper/core/docs/reports/DAILY_GROWTH_REPORT_2025-12-28.md
📊 File size: 45,231 bytes
💰 Key Metrics:
  • Revenue: $1,566.00
  • Profit Margin: 95.4%
  • LTV:CAC: 96.76x
  • Total Users: 3,427
```

## Optional Parameters

- `--date YYYY-MM-DD`: Generate report for specific date (default: yesterday)
- `--send-email`: Send report to stakeholders via Resend MCP (future)
- `--post-slack`: Post summary to #daily-metrics Slack channel (future)

## References

- Workflow Documentation: `/Users/aideveloper/core/docs/reports/DAILY_REPORT_WORKFLOW.md`
- Example Report: `/Users/aideveloper/core/docs/reports/DAILY_GROWTH_REPORT_2025-12-28.md`
- MCP Query Reference: `/Users/aideveloper/core/docs/reports/MCP_QUERY_REFERENCE.md`
- Project Rules: `/Users/aideveloper/core/.claude/CLAUDE.md` (Rule 4: Data Gathering - MCP FIRST)
