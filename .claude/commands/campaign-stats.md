---
description: Get comprehensive statistics for an email campaign
---

You are generating a statistics report for an email marketing campaign.

**REQUIRED INPUT**: Ask user for `campaign_id` if not provided.

**WORKFLOW:**

1. **Load Campaign Management Skill**
   - Load skill: `email-campaign-management.md`
   - Use SQL query patterns from "Campaign Statistics Query Patterns" section

2. **Get Campaign Overview**
   - Total clicks
   - Unique users
   - Converted users
   - Pending conversions
   - Conversion rate (%)

3. **Get User Breakdown**
   - Registered users (have accounts)
   - Non-registered users (clicked but no account)
   - Already paid users (active paid subscriptions)
   - Available for trial activation

4. **Get Click Sources**
   - Breakdown by `click_source` (cta_button, events_click, etc.)
   - Clicks and unique users per source

5. **Get Timeline Analysis**
   - Clicks by day (last 30 days)
   - Conversion timeline
   - Peak engagement times

6. **Generate Report**
   Display formatted report:
   ```
   📊 Campaign Statistics: {campaign_id}
   ═══════════════════════════════════════════

   OVERALL METRICS
   ├─ Total Clicks: XXX
   ├─ Unique Users: XXX
   ├─ Converted: XXX (XX.X%)
   └─ Pending: XXX

   USER BREAKDOWN
   ├─ Registered: XXX (have accounts)
   ├─ Non-Registered: XXX (need reminder emails)
   ├─ Already Paid: XXX (skip trial activation)
   └─ Available for Activation: XXX

   CLICK SOURCES
   ├─ cta_button: XXX clicks (XXX unique)
   ├─ events_click: XXX clicks (XXX unique)
   └─ ...

   RECOMMENDATIONS
   - Send reminder emails to XXX non-registered users
   - Activate trials for XXX registered users
   - Expected additional conversions: XX-XX (5-10% rate)
   ```

7. **Provide Action Commands**
   - Command to send reminders
   - Command to activate trials
   - Command to export data

**REFERENCE SKILL**: `email-campaign-management.md` for all SQL patterns

**OUTPUT**: Formatted statistics report with actionable next steps
