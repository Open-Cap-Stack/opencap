# OpenCap Stack - Project Context & Priorities

**Last Updated**: 2026-02-02
**Total Open Issues**: 89
**Critical Issues**: 20

---

## Executive Summary

OpenCap Stack is undergoing a major migration from MongoDB to ZeroDB while simultaneously building out compliance features for equity management. The project has two parallel workstreams:

1. **ZeroDB Migration** (Issues #4-#38) - 10 week effort, 202 hours
2. **Backend Gap Analysis** (Issues #39-#51) - 12-18 weeks, 350 hours

---

## Current Priorities

### CRITICAL (Must Address First)

| Issue | Title | Effort | Status |
|-------|-------|--------|--------|
| #125 | Fix Data Model Enum Mismatches with Frontend | 10h | Bug - Blocking |
| #39 | Achieve 80%+ Controller Test Coverage | 40h | Can Start Now |
| #40 | Achieve 80%+ Model Test Coverage | 35h | Can Start Now |
| #4 | Setup ZeroDB project and environment | 8h | Phase 1 Start |
| #7 | Create ZeroDB table creation scripts | 12h | Phase 1 |

### HIGH PRIORITY (Compliance Features)

| Issue | Title | Category |
|-------|-------|----------|
| #59 | Create 409A Valuation Request System | Compliance |
| #60 | Build Material Events Tracking | Compliance |
| #63 | Implement Valuation Audit Trail | Compliance |
| #64 | Create SAFE Data Model and Core Workflow | Fundraising |
| #66 | Build SAFE Digital Signature Workflow | Fundraising |
| #68 | Implement SAFE Conversion Engine | Fundraising |
| #71 | Implement Form 3921 Generation System | Tax |
| #72 | Build Tax Withholding Calculator | Tax |
| #73 | Implement ASC 718 Compliance Reporting | Compliance |
| #74 | Create Rule 701 Disclosures System | Compliance |

---

## ZeroDB Migration Phases

### Phase 1: Foundation (#4-#8) - Week 1-2
- Setup ZeroDB project and environment
- Initialize ZeroDB service
- Create database abstraction layer
- Create table creation scripts
- Setup parallel monitoring

### Phase 2: Data Migration (#9-#14) - Week 3-4
- Migrate User, Company, Stakeholder data
- Migrate Transactions and Financial data
- Migrate Documents and metadata
- Implement continuous sync MongoDB ↔ ZeroDB

### Phase 3: Code Migration (#15-#21) - Week 5-6
- Migrate all controllers to ZeroDB
- Update all tests to use ZeroDB

### Phase 4: Vector Operations (#22-#26) - Week 7
- Document embedding generation
- Semantic document search
- Investment similarity matching

### Phase 5: Advanced Features (#27-#31) - Week 8
- Agent memory for AI features
- Event streaming
- RLHF data collection

### Phase 6: MongoDB Removal (#32-#37) - Week 9-10
- Remove MongoDB dependencies
- Final validation
- Production readiness

---

## Feature Categories

### Equity Management
- #77 Create Equity Grant Model and Workflow
- #78 Implement Automated Vesting Schedules
- #79 Build Exercise Management System
- #81 Implement Termination Equity Workflow
- #110 Implement Equity Plan Reports

### Fundraising (SAFE)
- #64 Create SAFE Data Model and Core Workflow
- #66 Build SAFE Digital Signature Workflow
- #68 Implement SAFE Conversion Engine

### Compliance & Tax
- #59 Create 409A Valuation Request System
- #60 Build Material Events Tracking
- #63 Implement Valuation Audit Trail
- #71 Implement Form 3921 Generation System
- #72 Build Tax Withholding Calculator
- #73 Implement ASC 718 Compliance Reporting
- #74 Create Rule 701 Disclosures System
- #76 Implement Security Issuances Register

### Communications
- #86 Create Bulk Messaging System
- #87 Implement Email Delivery Tracking
- #88 Build Automated Triggered Messages
- #91 Build Investor Communication System

### Documents
- #98 Implement Document Version Control
- #100 Build Digital Signature Workflow
- #102 Add Document Audit Trail
- #122 Add Document Download and Preview Endpoints

### Secondary Transactions
- #103 Create Secondary Transaction Model
- #104 Build Transfer Approval Workflow
- #105 Implement Tender Offer System

### Infrastructure
- #46 Implement Security and Compliance Services
- #47 Implement Database Optimization and Caching
- #48 Implement API Rate Limiting
- #49 Complete Neo4j Integration
- #50 Implement Data Processing Pipeline
- #51 Implement Monitoring Stack

### Subscriptions & Payments
- #114 Define Subscription Tiers
- #115 Implement Subscription System
- #116 Integrate Payment Processing
- #118 Build Webhook System
- #119 Create API Access for Partners

---

## Test Coverage Requirements

**Current State**: Only 7 test files exist
**Target**: 80%+ coverage across all modules

### Test Issues
| Issue | Target | Effort |
|-------|--------|--------|
| #39 | Controller Tests 80%+ | 40h |
| #40 | Model Tests 80%+ | 35h |
| #41 | Middleware Tests | 15h |
| #42 | Integration Tests | 25h |
| #43 | E2E Test Suite | 20h |

---

## Dependency Graph

```
ZeroDB Phase 1 (#4-#8)
    ↓
ZeroDB Phase 2 (#9-#14)
    ↓
ZeroDB Phase 3 (#15-#21) ←── Test Coverage (#39-#43) [parallel]
    ↓
Enhanced Services (#44-#46)
    ↓
Compliance Features (#59-#74)
    ↓
Production Readiness (#35-#37)
```

---

## Branch Naming Convention

```
feature/issue-{number}-{slug}
bug/issue-{number}-{slug}
chore/issue-{number}-{slug}
```

**Examples:**
- `feature/issue-64-safe-data-model`
- `bug/issue-125-enum-mismatch`
- `chore/issue-39-controller-tests`

---

## GitHub Labels

| Label | Description |
|-------|-------------|
| `critical` | Must fix immediately |
| `high-priority` | Important, schedule soon |
| `medium-priority` | Can wait for next sprint |
| `zerodb-migration` | Part of ZeroDB migration |
| `phase-1` to `phase-6` | ZeroDB migration phase |
| `test-coverage` | Test-related issues |
| `compliance` | Regulatory compliance |
| `fundraising` | SAFE/fundraising features |
| `equity` | Equity management |
| `communications` | Messaging features |

---

## Key Metrics

- **Total Issues**: 89 open
- **Critical**: 20 issues
- **High Priority**: 25+ issues
- **ZeroDB Migration**: 34 issues (202 hours)
- **Backend Gaps**: 13 issues (350 hours)
- **Target Timeline**: 36 weeks total

---

## Success Criteria

- [ ] ZeroDB migration complete (all phases)
- [ ] MongoDB fully removed
- [ ] Test coverage ≥80%
- [ ] All critical compliance features implemented
- [ ] SAFE workflow operational
- [ ] 409A valuation system live
- [ ] API response time <500ms
- [ ] Monitoring stack operational

---

## Working with Issues

### Before Starting Work
1. Check issue dependencies
2. Verify ZeroDB migration phase requirements
3. Review related documentation in `docs/`

### PR Requirements
- Reference issue number: `Fixes #123`
- Include test evidence
- Update relevant documentation
- No AI attribution

### Issue Commands
```bash
# List critical issues
gh issue list --label critical

# View issue details
gh issue view {number}

# Start work on issue
gh issue develop {number}
```

---

**Repository**: https://github.com/Open-Cap-Stack/opencapstack
**Documentation**: `docs/` folder
**Migration Guide**: `docs/ZERODB_MIGRATION_PLAN.md`
