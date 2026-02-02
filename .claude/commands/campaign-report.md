---
description: Generate comprehensive campaign performance report with insights
---

You are generating a comprehensive performance report for an email marketing campaign.

**REQUIRED INPUT**: Ask user for `campaign_id` if not provided.

**WORKFLOW:**

1. **Load Campaign Management Skill**
   - Load skill: `email-campaign-management.md`
   - Review "Campaign Report Generation" section

2. **Collect All Metrics**

   **Overall Performance:**
   - Total clicks (all clicks including duplicates)
   - Unique users (distinct emails)
   - Converted users (trials activated or paid)
   - Pending conversions (not yet converted)
   - Conversion rate (converted / unique users %)

   **User Segmentation:**
   - Registered users (have accounts)
   - Non-registered users (no accounts)
   - Already paid users (active subscriptions)
   - Free tier users (eligible for trial)
   - Trials activated (from this campaign)

   **Engagement Breakdown:**
   - Click sources (cta_button, events_click, etc.)
   - Clicks per source
   - Unique users per source
   - Conversion rate by source

   **Email Campaign Results:**
   - Reminder emails sent
   - Reminder success rate
   - Failed sends (rate limits, bounces)
   - Retry attempts

   **Timeline Analysis:**
   - Clicks by day (last 30 days)
   - Peak engagement times
   - Time to conversion (registration delay)
   - Campaign duration

3. **Calculate ROI Metrics**
   - Trial value: Users × $99/month × 30 days
   - Email cost: Emails sent × $0.001 (Resend pricing)
   - Net value: Trial value - Email cost
   - Cost per acquisition (CPA)
   - Expected revenue (conversion rate × trial value)

4. **Identify Issues & Opportunities**

   **Red Flags:**
   - Conversion rate < 1% → Backend integration broken
   - Registration rate < 5% → High friction in signup
   - Email bounce rate > 10% → Bad email list quality
   - Click sources uneven → Some CTAs not working

   **Opportunities:**
   - High click, low registration → Improve onboarding
   - High registration, low activation → Fix trial endpoint
   - Paid users clicking → Upsell opportunity
   - Specific sources converting well → Double down

5. **Generate Report**
   ```
   📈 Campaign Performance Report: {campaign_id}
   ═══════════════════════════════════════════════════════════

   CAMPAIGN OVERVIEW
   ├─ Name: {campaign_name}
   ├─ Launched: {created_at}
   ├─ Expires: {offer_expires_at}
   └─ Duration: {days_running} days

   OVERALL METRICS
   ├─ Total Clicks: XXX
   ├─ Unique Users: XXX
   ├─ Converted: XXX (XX.X%)
   ├─ Pending: XXX
   └─ Conversion Rate: XX.X% (target: 5-15%)

   USER SEGMENTATION
   ├─ Registered: XXX (XX.X% of unique)
   ├─ Non-Registered: XXX (XX.X% of unique)
   ├─ Already Paid: XXX (skip trial)
   ├─ Trials Activated: XXX
   └─ Available for Activation: XXX

   ENGAGEMENT SOURCES
   ├─ cta_button: XXX clicks, XXX unique (XX.X% conv rate)
   ├─ events_click: XXX clicks, XXX unique (XX.X% conv rate)
   ├─ social: XXX clicks, XXX unique (XX.X% conv rate)
   └─ ...

   EMAIL CAMPAIGN RESULTS
   ├─ Reminder Emails Sent: XXX
   ├─ Successful Sends: XXX (XX.X%)
   ├─ Failed/Retries: XXX
   └─ Expected Conversions: XX-XX (5-10% rate)

   VALUE METRICS
   ├─ Trial Value: $X,XXX ($99/mo × 30 days × XXX users)
   ├─ Email Cost: $XX (XXX emails × $0.001)
   ├─ Net Value: $X,XXX
   ├─ Cost per Acquisition: $XX
   └─ Expected Revenue: $X,XXX - $X,XXX

   PERFORMANCE HEALTH
   {green/yellow/red indicators for each metric}
   ✅ Conversion rate: XX.X% (target: 5-15%)
   ✅ Registration rate: XX.X% (target: 10-20%)
   ⚠️  Email bounce rate: XX.X% (target: <10%)
   ❌ Trial activation rate: XX.X% (target: 100%)

   TOP INSIGHTS
   1. {Key finding with data}
   2. {Key finding with data}
   3. {Key finding with data}

   RECOMMENDATIONS
   □ {Action item based on data}
   □ {Action item based on data}
   □ {Action item based on data}

   NEXT STEPS
   □ {Immediate action required}
   □ {Follow-up action}
   □ {Optimization opportunity}
   ```

6. **Export Data**
   - Offer to export raw data to CSV
   - Provide SQL queries for custom analysis
   - Save report to `docs/reports/{campaign_id}_REPORT_{date}.md`

7. **Compare to Benchmarks**
   - Industry average conversion: 2-5%
   - AI Native Studio target: 5-15%
   - Previous campaigns performance
   - Suggest improvements based on gaps

**REFERENCE SKILL**: `email-campaign-management.md` section "Campaign Report Generation"

**OUTPUT**:
- Comprehensive formatted report
- Health indicators (✅⚠️❌)
- Actionable recommendations
- Export commands for raw data
- File path to saved report
