# ZeroDB Migration Rollback Plan

## Executive Summary

This document defines the complete rollback strategy for the ZeroDB migration, including decision criteria, execution procedures, data preservation strategies, and communication protocols.

**Recovery Point Objective (RPO)**: 1 hour
**Recovery Time Objective (RTO)**: 4 hours
**Last Updated**: 2026-02-02

---

## Table of Contents

1. [Rollback Decision Criteria](#rollback-decision-criteria)
2. [Pre-Rollback Checklist](#pre-rollback-checklist)
3. [Rollback Procedures](#rollback-procedures)
4. [Data Preservation Strategy](#data-preservation-strategy)
5. [Communication Plan](#communication-plan)
6. [Post-Rollback Validation](#post-rollback-validation)
7. [Lessons Learned Process](#lessons-learned-process)

---

## Rollback Decision Criteria

### Decision Tree

```
START
  |
  ├─> Is error rate > 10%? ──YES──> IMMEDIATE ROLLBACK (P0)
  |         |
  |        NO
  |         |
  ├─> Is data loss detected? ──YES──> IMMEDIATE ROLLBACK (P0)
  |         |
  |        NO
  |         |
  ├─> Is API availability < 95%? ──YES──> EVALUATE ROLLBACK (P1)
  |         |
  |        NO
  |         |
  ├─> Is avg response time > 5s? ──YES──> EVALUATE ROLLBACK (P2)
  |         |
  |        NO
  |         |
  └─> CONTINUE MONITORING
```

### Severity Levels

#### P0 - Critical (Immediate Rollback)
- Data loss or corruption detected
- Error rate > 10% for 15 minutes
- Complete service outage
- Security breach detected
- Data integrity violation (checksum mismatch)

**Action**: Execute immediate rollback without delay

#### P1 - High (Rollback Within 1 Hour)
- Error rate 5-10% sustained for 30 minutes
- API availability < 95% for 30 minutes
- Critical feature broken
- Data inconsistency between MongoDB and ZeroDB > 5%

**Action**: Convene incident response team, prepare for rollback

#### P2 - Medium (Rollback Within 4 Hours)
- Error rate 2-5% sustained for 1 hour
- Average response time > 5s for 1 hour
- Non-critical feature degradation
- User complaints increasing

**Action**: Monitor closely, prepare rollback plan, notify stakeholders

#### P3 - Low (Monitor and Optimize)
- Error rate < 2%
- Response time within acceptable range
- Minor performance issues

**Action**: Continue monitoring, optimize as needed

### Quantitative Thresholds

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|------------------|-------------------|--------|
| Error Rate | > 2% | > 10% | P3 → P0 |
| API Availability | < 99% | < 95% | P3 → P1 |
| Response Time (avg) | > 2s | > 5s | P3 → P2 |
| Data Loss | Any | Any | P0 |
| Checksum Mismatches | > 1% | > 5% | P2 → P0 |
| User Impact | Low | High | P3 → P1 |

### Stakeholder Authorization

| Severity | Approval Required | Notification Required |
|----------|------------------|----------------------|
| P0 | On-call Engineer | CTO, Engineering Lead, All Engineers |
| P1 | Engineering Lead | CTO, Product Team, Support Team |
| P2 | Engineering Lead + CTO | Product Team |
| P3 | Engineering Lead | Engineering Team |

---

## Pre-Rollback Checklist

### Phase 1: Assessment (15 minutes)

- [ ] **Confirm rollback necessity**
  - Document specific failure criteria met
  - Capture error logs and metrics
  - Screenshot monitoring dashboards
  - Record user impact reports

- [ ] **Verify MongoDB health**
  ```bash
  # Check MongoDB connection
  node scripts/validate-mongodb-connection.js

  # Verify MongoDB has sufficient storage
  # Should have at least 2x current ZeroDB data size
  ```

- [ ] **Check backup availability**
  ```bash
  # List recent backups
  ls -lah backups/

  # Verify latest backup integrity
  node scripts/backup-zerodb-data.js --verify-latest
  ```

- [ ] **Estimate data volume**
  ```bash
  # Get ZeroDB data statistics
  node scripts/get-zerodb-stats.js

  # Expected migration time: 1 hour per 10GB
  ```

### Phase 2: Preparation (30 minutes)

- [ ] **Create pre-rollback snapshot**
  ```bash
  # Backup current ZeroDB state
  node scripts/backup-zerodb-data.js --label=pre-rollback

  # Export current configuration
  node scripts/export-config.js --output=config-pre-rollback.json
  ```

- [ ] **Notify stakeholders**
  - Send incident notification email (template in Communication Plan)
  - Update status page
  - Notify support team

- [ ] **Prepare rollback environment**
  ```bash
  # Set environment to rollback mode
  export MIGRATION_MODE=rollback-in-progress

  # Ensure MongoDB is accepting writes
  node scripts/validate-mongodb-writes.js
  ```

- [ ] **Assemble response team**
  - Primary: On-call Engineer
  - Backup: Engineering Lead
  - Observer: CTO (for P0/P1)
  - Communication: Product Manager

---

## Rollback Procedures

### Procedure 1: Quick Rollback (Parallel Mode)

**Use when**: System is in `parallel` migration mode, both databases operational

**Estimated Time**: 15 minutes

```bash
# Step 1: Update environment variable
export MIGRATION_MODE=mongodb-only

# Step 2: Restart application
pm2 restart opencap-backend

# Step 3: Verify MongoDB is primary
node scripts/verify-primary-database.js

# Step 4: Monitor for 15 minutes
# Watch error rate, response time, throughput
```

**Validation**:
- Error rate < 1%
- All API endpoints responding
- Database writes succeeding

### Procedure 2: Full Rollback (ZeroDB-Only Mode)

**Use when**: System is in `zerodb-only` mode, need to migrate back to MongoDB

**Estimated Time**: 2-4 hours (depends on data volume)

```bash
# Step 1: Enable maintenance mode
node scripts/enable-maintenance-mode.js

# Step 2: Create final ZeroDB backup
node scripts/backup-zerodb-data.js --label=final-before-rollback

# Step 3: Verify MongoDB connectivity
node scripts/validate-mongodb-connection.js

# Step 4: Execute rollback migration
node scripts/rollback-to-mongodb.js \
  --validate-before \
  --batch-size=1000 \
  --enable-progress \
  --rollback-on-failure

# Step 5: Verify data integrity
node scripts/validate-rollback.js --comprehensive

# Step 6: Update configuration
export MIGRATION_MODE=mongodb-only
node scripts/update-database-config.js --mode=mongodb-only

# Step 7: Restart application
pm2 restart opencap-backend

# Step 8: Disable maintenance mode
node scripts/disable-maintenance-mode.js

# Step 9: Monitor for 1 hour
# Watch error rate, data consistency, user reports
```

**Validation Checkpoints**:
1. After backup: Verify backup integrity and completeness
2. After migration: Compare record counts between ZeroDB and MongoDB
3. After config update: Verify environment variables
4. After restart: Check all endpoints return 200
5. Post-rollback: Run comprehensive validation suite

### Procedure 3: Emergency Rollback

**Use when**: P0 incident, immediate action required

**Estimated Time**: 30 minutes (may sacrifice some data)

```bash
# Step 1: STOP all writes to ZeroDB immediately
node scripts/emergency-stop-zerodb-writes.js

# Step 2: Switch to MongoDB (skip migration if necessary)
export MIGRATION_MODE=mongodb-only
pm2 restart opencap-backend --force

# Step 3: Assess data loss
node scripts/assess-data-divergence.js

# Step 4: Restore from last known good backup if needed
node scripts/restore-from-backup.js \
  --backup-id=<last-good-backup> \
  --target=mongodb

# Step 5: Notify ALL stakeholders
node scripts/send-emergency-notification.js

# Step 6: Begin incident postmortem documentation
# Use template: docs/templates/incident-postmortem.md
```

**Critical**: In emergency rollback, prioritize service restoration over data migration completeness. Data reconciliation happens post-recovery.

---

## Data Preservation Strategy

### Backup Schedule

**Before Rollback**:
- Create labeled backup: `backup-pre-rollback-{timestamp}`
- Verify backup integrity with checksums
- Store in multiple locations (local + S3)
- Retention: Permanent (or 90 days minimum)

**During Rollback**:
- Create checkpoint backups every 1000 records migrated
- Enable transaction logging
- Record all migration operations in audit trail

**After Rollback**:
- Create labeled backup: `backup-post-rollback-{timestamp}`
- Verify data integrity
- Store rollback report alongside backup

### Data Reconciliation

If data was created in ZeroDB during rollback:

```bash
# Step 1: Identify data created after rollback start
node scripts/identify-divergent-data.js \
  --since=<rollback-start-timestamp>

# Step 2: Extract divergent data
node scripts/export-divergent-data.js \
  --output=divergent-data-{timestamp}.json

# Step 3: Manual review (if necessary)
# Review divergent-data-{timestamp}.json for business criticality

# Step 4: Import to MongoDB
node scripts/import-to-mongodb.js \
  --input=divergent-data-{timestamp}.json \
  --mode=append \
  --validate

# Step 5: Verify reconciliation
node scripts/validate-data-consistency.js
```

### Backup Retention Policy

| Backup Type | Retention Period | Reason |
|------------|-----------------|---------|
| Pre-rollback | 90 days | Legal/audit requirements |
| Daily automated | 7 days | Operational recovery |
| Weekly | 30 days | Extended recovery window |
| Monthly | 1 year | Compliance |
| Pre-production | Permanent | Regulatory |

---

## Communication Plan

### Internal Communication

#### P0 Incident - Immediate Rollback

**Email Template**:
```
Subject: [P0 INCIDENT] ZeroDB Rollback Initiated

Team,

We have initiated an immediate rollback from ZeroDB to MongoDB due to:
[SPECIFIC REASON]

Status: ROLLBACK IN PROGRESS
Started: [TIMESTAMP]
ETA: [ESTIMATED COMPLETION]
Impact: [USER IMPACT DESCRIPTION]

Current metrics:
- Error rate: [X]%
- API availability: [X]%
- Affected users: [NUMBER]

Actions taken:
1. [ACTION 1]
2. [ACTION 2]

Next steps:
1. [NEXT STEP 1]
2. [NEXT STEP 2]

Incident Commander: [NAME]
War Room: [SLACK CHANNEL / ZOOM LINK]

Updates will be provided every 15 minutes.

[YOUR NAME]
```

**Slack Notification**:
```
@channel
🚨 P0 INCIDENT - ZeroDB Rollback Initiated

Reason: [ONE LINE SUMMARY]
Status: In Progress
War Room: #incident-[timestamp]
Commander: @[username]

Next update: 15 minutes
```

#### P1 Incident - Planned Rollback

**Email Template**:
```
Subject: [P1] Planned ZeroDB Rollback - [DATE]

Team,

We will be performing a rollback from ZeroDB to MongoDB:

Reason: [DETAILED EXPLANATION]
Scheduled: [DATE TIME]
Duration: [ESTIMATED DURATION]
Impact: [USER IMPACT - if any]

Pre-rollback checklist:
✅ Backups verified
✅ MongoDB validated
✅ Stakeholders notified

Rollback team:
- Lead: [NAME]
- Backup: [NAME]
- Observer: [NAME]

Communication plan:
- Updates every 30 minutes
- Status page: [LINK]
- Slack channel: #rollback-[date]

[YOUR NAME]
```

### External Communication

#### User-Facing Announcement (if service impact expected)

**Status Page Update**:
```
Title: Scheduled Maintenance - Database Optimization

We will be performing database maintenance on [DATE] from [TIME] to [TIME] [TIMEZONE].

During this window, you may experience:
- Brief service interruptions (< 5 minutes)
- Slower response times
- Read-only mode for certain features

We apologize for any inconvenience. For questions, contact support@opencap.ai

Status: Scheduled
Started: [TIME]
Updates: Every 30 minutes
```

**For P0 Incident (Service Outage)**:
```
Title: Service Disruption - Investigating

We are currently experiencing issues affecting [FEATURE/SERVICE]. Our team is actively investigating and working on a resolution.

Status: Investigating
Impact: [HIGH/MEDIUM/LOW]
Affected Features: [LIST]

Updates will be posted every 15 minutes.

Last Update: [TIME]
Next Update: [TIME + 15 min]
```

### Post-Rollback Communication

**Success Email**:
```
Subject: [RESOLVED] ZeroDB Rollback Completed Successfully

Team,

The rollback from ZeroDB to MongoDB has been completed successfully.

Summary:
- Started: [TIMESTAMP]
- Completed: [TIMESTAMP]
- Duration: [DURATION]
- Records migrated: [NUMBER]
- Data validation: PASSED

Current status:
- System: HEALTHY
- Error rate: [X]% (normal)
- All services: OPERATIONAL

Post-rollback actions:
1. ✅ Data integrity validation complete
2. ✅ Performance metrics normal
3. 🔄 Monitoring extended for 24 hours
4. 📋 Postmortem scheduled for [DATE]

Thank you to the response team for swift action.

[YOUR NAME]
```

---

## Post-Rollback Validation

### Immediate Validation (0-1 hour)

```bash
# 1. Verify MongoDB is primary database
node scripts/verify-primary-database.js
# Expected: MIGRATION_MODE=mongodb-only

# 2. Check record counts match
node scripts/compare-record-counts.js
# Expected: 100% match between source and target

# 3. Validate data integrity
node scripts/validate-data-integrity.js --comprehensive
# Expected: All checksums match, no corruption

# 4. Test critical API endpoints
node scripts/test-critical-endpoints.js
# Expected: All endpoints return 200, data is accurate

# 5. Check error rates
node scripts/get-error-metrics.js --last=1h
# Expected: < 1% error rate
```

### Extended Validation (1-24 hours)

```bash
# 1. Monitor system metrics
# - Error rate
# - Response time
# - Throughput
# - CPU/Memory usage

# 2. Validate business logic
node scripts/validate-business-logic.js
# Test: Financial calculations
# Test: Data relationships
# Test: Audit trail integrity

# 3. User acceptance testing
# - Manually test critical user workflows
# - Review user feedback/support tickets
# - Monitor for unusual patterns

# 4. Performance benchmarking
node scripts/run-performance-benchmark.js
# Compare against pre-migration baseline
# Expected: Similar or better performance

# 5. Data consistency check
node scripts/validate-data-consistency.js --full
# Deep comparison of all records
# Expected: 100% consistency
```

### Rollback Success Criteria

System is considered "successfully rolled back" when ALL criteria are met:

- [ ] **Service Health**
  - API availability > 99.5%
  - Error rate < 1%
  - Average response time < 500ms
  - All critical endpoints operational

- [ ] **Data Integrity**
  - Record count matches ZeroDB backup
  - All checksums validate
  - No data loss detected
  - Business logic validations pass

- [ ] **System Stability**
  - No crashes for 4 hours
  - No memory leaks detected
  - No connection pool exhaustion
  - No database locks/deadlocks

- [ ] **User Experience**
  - No increase in support tickets
  - User workflows functioning normally
  - No data inconsistency reports
  - Dashboard metrics accurate

---

## Lessons Learned Process

### Incident Postmortem Template

**Document**: `docs/postmortems/rollback-{date}.md`

#### 1. Incident Summary
- Date and time of rollback initiation
- Duration of rollback
- Severity level (P0-P3)
- Systems affected
- User impact

#### 2. Timeline of Events
```
[TIME] Event 1: Initial problem detected
[TIME] Event 2: Decision to rollback made
[TIME] Event 3: Rollback initiated
[TIME] Event 4: First validation checkpoint
[TIME] Event 5: Rollback completed
[TIME] Event 6: System validated and stable
```

#### 3. Root Cause Analysis

**5 Whys Method**:
1. Why did we need to rollback? [Answer]
2. Why did [Answer 1] occur? [Answer]
3. Why did [Answer 2] occur? [Answer]
4. Why did [Answer 3] occur? [Answer]
5. Why did [Answer 4] occur? [Answer - Root Cause]

#### 4. Contributing Factors
- Technical factors
- Process factors
- Human factors
- External factors

#### 5. What Went Well
- List actions that helped mitigate the incident
- Praise individuals/teams for effective response
- Identify processes that worked

#### 6. What Went Wrong
- List failures in detection, response, or mitigation
- Identify process gaps
- Note communication breakdowns

#### 7. Action Items

| Action | Owner | Priority | Due Date | Status |
|--------|-------|----------|----------|--------|
| [Action 1] | [Name] | P1 | [Date] | Open |
| [Action 2] | [Name] | P2 | [Date] | Open |

#### 8. Preventive Measures
- What can we do to prevent this from happening again?
- What monitoring/alerting improvements are needed?
- What testing gaps exist?

### Continuous Improvement

After rollback, conduct:
- [ ] Postmortem within 48 hours (blameless)
- [ ] Review rollback procedures for improvements
- [ ] Update documentation based on learnings
- [ ] Enhance monitoring/alerting
- [ ] Add automated tests for failure scenario
- [ ] Share learnings with wider engineering org

---

## Appendix

### A. Quick Reference Commands

```bash
# Check system status
node scripts/check-system-health.js

# Initiate rollback
node scripts/rollback-to-mongodb.js

# Verify rollback
node scripts/validate-rollback.js

# Emergency stop
node scripts/emergency-stop-zerodb-writes.js
```

### B. Contact Information

| Role | Name | Email | Phone | Slack |
|------|------|-------|-------|-------|
| On-Call Engineer | [TBD] | [EMAIL] | [PHONE] | @oncall |
| Engineering Lead | [TBD] | [EMAIL] | [PHONE] | @eng-lead |
| CTO | [TBD] | [EMAIL] | [PHONE] | @cto |
| Product Manager | [TBD] | [EMAIL] | [PHONE] | @pm |

### C. External Resources

- AWS Console: [LINK]
- Monitoring Dashboard: [LINK]
- Status Page: [LINK]
- Documentation: [LINK]

### D. Glossary

- **RPO**: Recovery Point Objective - Maximum acceptable data loss
- **RTO**: Recovery Time Objective - Maximum acceptable downtime
- **P0-P3**: Severity levels for incidents
- **War Room**: Virtual or physical space for incident response coordination

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | SRE Team | Initial rollback plan |

**Review Schedule**: Quarterly or after each rollback execution
**Next Review**: 2026-05-02
