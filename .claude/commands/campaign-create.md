---
description: Create a new email marketing campaign with conversion tracking
---

You are setting up a new email marketing campaign for AI Native Studio.

**CAMPAIGN SETUP WORKFLOW:**

1. **Get Campaign Details from User**
   Ask the user for:
   - Campaign ID (slug, e.g., "summer2026", "blackfriday2026")
   - Campaign name (display name)
   - Trial days (default: 30)
   - Tier (default: ENTERPRISE)
   - Offer expiration date
   - Plan description

2. **Create Database Record**
   - Connect to Railway database
   - Insert campaign into `campaigns` table
   - Use the SQL pattern from skill: `email-campaign-management.md`

3. **Update Backend Config**
   - Add campaign to `VALID_CAMPAIGNS` in `src/backend/app/api/v1/endpoints/campaign.py`
   - Follow the config pattern from skill

4. **Create Email Template**
   - Create `src/backend/app/services/templates/{campaign_id}_gift.html`
   - Use dark theme styling from skill
   - Include required template variables: `{{email}}`, `{{campaign_id}}`

5. **Send Test Email**
   - Ask user for test email address
   - Send test using Resend API
   - Confirm template renders correctly

6. **Deploy to Railway**
   - Commit changes to git
   - Push to Railway for deployment

7. **Provide Launch Checklist**
   - Share campaign tracking URL
   - Provide stats query command
   - Share reminder email command for later

**REFERENCE SKILL**: Load `email-campaign-management.md` for complete patterns and code examples.

**OUTPUT**: Provide the user with:
- Campaign ID and tracking link
- Command to check stats: `railway run psql -c "SELECT * FROM campaign_clicks WHERE campaign_id = '{campaign_id}'"`
- Command to send reminders later
- Success confirmation with next steps
