---
description: Email marketing campaigns with Resend API, conversion tracking, and trial activation
---

# Email Campaign Management

## Resend API Rate Limits (CRITICAL)

**Free Tier: 2 emails per second**

```python
# CORRECT
for email in emails:
    send_email(email)
    time.sleep(0.5)  # 2 per second

# WRONG - causes 429 errors
for email in emails:
    send_email(email)  # No delay!
```

## Campaign Database Tables

```sql
-- campaigns table
CREATE TABLE campaigns (
    campaign_id VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    trial_days INTEGER,
    tier VARCHAR(50),  -- ENTERPRISE, SCALE
    offer_expires_at TIMESTAMP
);

-- campaign_clicks table
CREATE TABLE campaign_clicks (
    campaign_id VARCHAR(255),
    email VARCHAR(255),
    click_source VARCHAR(100),
    converted BOOLEAN DEFAULT FALSE
);
```

## Campaign Stats Query

```sql
SELECT
    COUNT(*) as total_clicks,
    COUNT(DISTINCT email) as unique_users,
    COUNT(CASE WHEN converted THEN 1 END) as converted
FROM campaign_clicks
WHERE campaign_id = 'your-campaign-id';
```

## CRITICAL: PostgreSQL Enums are UPPERCASE

```python
# CORRECT
tier = 'ENTERPRISE'
status = 'active'

# WRONG - "invalid input value for enum"
tier = 'enterprise'
status = 'trial'  # doesn't exist!
```

## Trial Activation

```python
cur.execute("""
    UPDATE subscriptions
    SET tier = 'ENTERPRISE',
        status = 'active',
        trial_ends_at = %s
    WHERE user_id = %s
""", (trial_end, user_id))
```

## Email Template Location

```
src/backend/app/services/templates/{campaign_id}_gift.html
src/backend/app/services/templates/{campaign_id}_reminder.html
```

## Campaign Checklist

- [ ] Create campaign record in database
- [ ] Create email templates
- [ ] Test send to yourself
- [ ] Deploy to production
- [ ] Monitor click tracking
- [ ] Send reminders (day 7)
- [ ] Activate trials
- [ ] Generate report

Invoke this skill when managing email campaigns.
