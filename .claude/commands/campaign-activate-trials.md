---
description: Activate trials for registered users who clicked the campaign
---

You are activating ENTERPRISE trials for users who clicked a campaign and registered.

**REQUIRED INPUT**: Ask user for `campaign_id` if not provided.

**CRITICAL REQUIREMENTS:**
- ⚠️ **UPPERCASE enums**: Use 'ENTERPRISE' not 'enterprise'
- ⚠️ **Active status**: Use 'active' NOT 'trial' (trial status doesn't exist)
- ⚠️ **NULL organization_id**: Handle users without organizations separately
- ⚠️ **Dry run first**: ALWAYS preview before activating

**WORKFLOW:**

1. **Load Campaign Management Skill**
   - Load skill: `email-campaign-management.md`
   - Review "Trial Activation Workflow" section

2. **Check Prerequisites**
   - [ ] Campaign exists in backend `VALID_CAMPAIGNS`
   - [ ] Database connection pool has capacity
   - [ ] Trial days and tier are configured

3. **Get Users for Activation**
   - Query for users who:
     - Clicked the campaign (campaign_clicks)
     - Have registered accounts (users.email match)
     - Haven't been converted yet (converted = FALSE)
   - Use SQL pattern from skill

4. **Categorize Users**
   - **Will activate**: Free tier users → ENTERPRISE trial
   - **Already paid**: Active paid subscriptions → Mark converted only
   - **No account**: Skip (handled by reminder emails)

5. **Create/Update Activation Script**
   - Create `scripts/fix_{campaign_id}_conversions.py` if doesn't exist
   - Use script template from skill
   - **CRITICAL**: Use UPPERCASE enum values

6. **Dry Run Preview**
   - Run script with `--dry-run` flag
   - Show user:
     - Total pending conversions
     - Users to activate (with trial end dates)
     - Users already paid (will mark converted only)
     - Users without accounts (skip)
   - Ask for confirmation

7. **Activate Trials**
   - Run script without `--dry-run`
   - For each user:
     - Calculate trial_end_date (now + trial_days)
     - Create or update subscription with:
       - tier = 'ENTERPRISE'
       - status = 'active'
       - trial_ends_at = trial_end_date
     - Mark campaign_click as converted
   - Handle errors gracefully (rollback on failure)

8. **Verify Activation**
   - Query subscriptions to confirm trials created
   - Check campaign_clicks for converted = TRUE
   - Provide success summary

**ACTIVATION LOGIC (CRITICAL):**
```python
# CORRECT - UPPERCASE enum, active status, handle NULL org_id
if user['organization_id']:
    cur.execute("""
        INSERT INTO subscriptions (
            user_id, organization_id, tier, status,
            trial_ends_at, plan_name, ...
        ) VALUES (
            %s, %s, 'ENTERPRISE', 'active',
            %s, %s, ...
        )
    """, (...))
else:
    # User subscription (no organization_id column)
    cur.execute("""
        INSERT INTO subscriptions (
            user_id, tier, status,
            trial_ends_at, plan_name, ...
        ) VALUES (
            %s, 'ENTERPRISE', 'active',
            %s, %s, ...
        )
    """, (...))
```

**COMMON ERRORS TO AVOID:**
- ❌ Using 'enterprise' → Use 'ENTERPRISE'
- ❌ Using 'trial' status → Use 'active' with trial_ends_at
- ❌ Inserting NULL in organization_id → Skip column if NULL
- ❌ Not rolling back on error → Use try/except with rollback

**SCRIPT EXECUTION:**
```bash
# Dry run preview
railway run -s "AINative- Core -Production" \
  python3 scripts/fix_{campaign_id}_conversions.py --dry-run

# Activate trials
railway run -s "AINative- Core -Production" \
  python3 scripts/fix_{campaign_id}_conversions.py
```

**REFERENCE SKILL**: `email-campaign-management.md` section "Trial Activation Workflow"

**OUTPUT**:
- Count of trials activated
- Count already paid (marked converted)
- Count without accounts (skipped)
- Trial end dates for each user
- Verification query results
