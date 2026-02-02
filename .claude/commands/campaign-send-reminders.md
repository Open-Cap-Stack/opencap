---
description: Send reminder emails to users who clicked but didn't register
---

You are sending reminder emails to non-registered users from a campaign.

**REQUIRED INPUT**: Ask user for `campaign_id` if not provided.

**CRITICAL REQUIREMENTS:**
- ⚠️ **Rate limiting**: 2 emails per second (0.5s delay between sends)
- ⚠️ **Template variable**: Replace `{{email}}` with recipient email
- ⚠️ **Resend API key**: Must be available in environment
- ⚠️ **Dry run first**: ALWAYS show preview before sending live

**WORKFLOW:**

1. **Load Campaign Management Skill**
   - Load skill: `email-campaign-management.md`
   - Review "Reminder Email Campaign Workflow" section

2. **Check Prerequisites**
   - [ ] Reminder template exists: `src/backend/app/services/templates/{campaign_id}_reminder.html`
   - [ ] RESEND_API_KEY is set in environment
   - [ ] Database connection pool has capacity (run `check_db_connection_pool.py`)

3. **Get Non-Registered Users**
   - Query campaign_clicks for non-converted users without accounts
   - Use SQL pattern from skill
   - Show count and first 10 emails to user

4. **Create/Update Send Script**
   - Create `scripts/send_{campaign_id}_reminder.py` if doesn't exist
   - Use script template from skill
   - **CRITICAL**: Set `RATE_LIMIT_DELAY = 0.5` (2 per second)

5. **Dry Run Preview**
   - Run script with `--dry-run` flag
   - Show user:
     - Total emails to send
     - Estimated send time
     - Sample of first 10 recipients
   - Ask for confirmation before proceeding

6. **Send Reminder Emails**
   - Run script with `--yes` flag for auto-confirmation
   - Monitor progress and catch rate limit errors
   - Track success/failure counts

7. **Retry Failed Sends**
   - If any emails failed (rate limit 429 errors):
     - Create retry script with failed emails
     - Run retry with proper 0.5s delay
     - Verify 100% delivery

8. **Update Campaign Stats**
   - Query updated conversion numbers
   - Show before/after comparison
   - Provide next steps

**SCRIPT EXECUTION PATTERN:**
```bash
# Step 1: Dry run to preview
railway run -s "AINative- Core -Production" \
  python3 scripts/send_{campaign_id}_reminder.py --dry-run

# Step 2: Send live (after user confirms)
railway run -s "AINative- Core -Production" \
  python3 scripts/send_{campaign_id}_reminder.py --yes

# Step 3: Retry failed (if needed)
railway run -s "AINative- Core -Production" \
  python3 scripts/retry_{campaign_id}_reminder.py
```

**REFERENCE SKILL**: `email-campaign-management.md` section "Reminder Email Campaign Workflow"

**OUTPUT**:
- Success/failure counts
- Resend email IDs for tracking
- Retry command if needed
- Expected conversion impact (5-10% of reminder recipients)
