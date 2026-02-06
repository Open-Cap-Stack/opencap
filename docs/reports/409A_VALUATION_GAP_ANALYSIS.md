# 409A Valuation System Gap Analysis

**Document Version:** 1.0
**Date:** February 6, 2026
**Prepared For:** OpenCap Stack Leadership Team
**Classification:** Internal

---

## Executive Summary

This document presents a comprehensive gap analysis of OpenCap Stack's current 409A valuation functionality against industry-standard requirements for a defensible, IRS-compliant 409A valuation system.

### Key Findings

| Assessment Area | Current Maturity | Target Maturity | Gap |
|-----------------|------------------|-----------------|-----|
| Valuation Workflow & Tracking | **Strong** | Production | Low |
| Audit Trail & Compliance | **Strong** | Production | Low |
| Cap Table Foundation | **Good** | Production | Medium |
| Preferred Stock Economics | **Partial** | Production | High |
| Financial Data Integration | **Partial** | Production | High |
| Valuation Methodology Engine | **Not Implemented** | Production | Critical |
| Market Data & Comparables | **Not Implemented** | Production | Critical |

### Strategic Position

OpenCap Stack has built a **solid foundation** for 409A valuation management with excellent workflow orchestration and audit capabilities. However, the platform currently functions as a **valuation tracking system** rather than a **valuation calculation platform**.

**Recommendation:** Prioritize data collection completeness and integration with third-party valuation providers before building internal calculation engines. This approach reduces liability while delivering immediate value to customers.

---

## Current State Assessment

### What We Do Well

#### 1. Valuation Request & Workflow Management
The `Valuation409A` model provides enterprise-grade workflow capabilities:

- **Complete Lifecycle Management**
  - Request initiation with reason categorization
  - Status progression: `requested` → `in_progress` → `draft_received` → `under_review` → `approved` → `expired`
  - Validated state transitions preventing invalid workflows

- **Valuation Firm Integration**
  - Firm assignment with contact management
  - Communication history tracking
  - Service package and turnaround tracking via `ValuationPartner` model

- **Expiration & Renewal Management**
  - Automatic 12-month expiration calculation
  - 60-day renewal reminder triggers
  - Batch processing for expired valuations

#### 2. Audit Trail & Compliance Reporting
The `ValuationAuditService` delivers comprehensive compliance capabilities:

- **IRS Compliance (IRC Section 409A)**
  - Independent appraiser verification
  - Methodology documentation requirements
  - 12-month validity enforcement
  - Board approval tracking

- **GAAP Compliance (ASC 718)**
  - Fair value measurement documentation
  - Methodology consistency checks
  - Assumption tracking requirements

- **Audit Defense**
  - Complete status history with timestamps
  - User attribution for all changes
  - Document versioning and storage
  - Export functionality for external auditors

#### 3. Cap Table Foundation
Core equity tracking infrastructure exists:

| Component | Model | Status |
|-----------|-------|--------|
| Share Classes | `ShareClass` | Functional |
| Stakeholders | `Stakeholder` | Functional |
| Security Issuances | `SecurityIssuance` | Comprehensive |
| Vesting Schedules | `VestingSchedule` | Comprehensive |
| Equity Grants | `EquityGrant` | Good |
| Waterfall Analysis | `WaterfallAnalysis` | Excellent |

#### 4. Financial Reporting Models
Foundational financial data structures exist:

| Component | Model | Capabilities |
|-----------|-------|--------------|
| Balance Sheet | `BalanceSheet` | Full asset/liability breakdown, ratio calculations |
| Financial Metrics | `FinancialMetrics` | 30+ financial ratios across all categories |
| Cash Flow | `CashFlowStatement` | Operating/investing/financing breakdown |

---

## Gap Analysis by Requirement Layer

### Layer 0: Absolute Prerequisites

These are non-negotiable requirements. Without them, a defensible 409A cannot be issued.

#### Company Identity & Legal Structure

| Required Field | Current Status | Priority |
|----------------|----------------|----------|
| Legal entity name | ✅ `CompanyName` exists | - |
| Entity type (C-Corp, S-Corp, LLC) | ⚠️ `CompanyType` exists but uses incorrect enum values | High |
| Jurisdiction (state/country) | ❌ Missing | High |
| State of incorporation | ❌ Missing | High |
| Date of incorporation | ✅ `corporationDate` exists | - |
| EIN | ✅ `TaxID` exists | - |
| Fiscal year end | ❌ Missing | Medium |

**Impact:** Without proper legal structure tracking, valuation methodology selection and tax treatment cannot be properly determined.

#### Cap Table (Fully Diluted, Exact)

| Required Component | Current Status | Gap Description |
|--------------------|----------------|-----------------|
| Authorized shares | ✅ In `ShareClass` | - |
| Issued & outstanding common | ⚠️ Partial | Need aggregation logic |
| Preferred shares by class/series | ⚠️ Exists | Missing preference terms |
| Options granted (vested/unvested) | ✅ In `EquityGrant` | - |
| Option pool reserved/unallocated | ⚠️ Partial | Need explicit pool tracking |
| Warrants | ✅ In `SecurityIssuance` | - |
| SAFEs with conversion mechanics | ⚠️ `SAFE` model exists | Conversion mechanics incomplete |
| Convertible notes | ⚠️ Model exists | Conversion mechanics incomplete |

**Critical Gap:** Securities exist but lack the detailed economics (issue date, exercise price, vesting terms, conversion terms) required for proper 409A allocation.

---

### Layer 1: Equity Economics

This is where most startups fail their 409A requirements.

#### Preferred Stock Rights & Preferences

**Current State:** Rights are tracked in a separate `InvestorRights` model but are NOT linked to share classes for valuation purposes.

| Required Preference Data | Current Status | Impact |
|--------------------------|----------------|--------|
| Liquidation preference (1x, 2x, etc.) | ❌ Not in ShareClass | Cannot calculate waterfall from FMV |
| Participation rights | ❌ Missing | Affects value allocation |
| Participation caps | ❌ Missing | Affects upside scenarios |
| Conversion ratio | ⚠️ Partial | Method exists but not populated |
| Dividend terms (cumulative/non-cumulative) | ❌ Missing | Affects preference stack |
| Redemption rights | ⚠️ In InvestorRights | Not linked to valuation |
| Seniority stack | ❌ Missing | Critical for waterfall |

**Recommendation:** Create a `preferred_terms` table linked to `share_classes` with all preference economics.

#### Recent Financing History

**Current State:** `FundraisingRoundModel` exists but lacks valuation-critical fields.

| Required Field | Current Status | Notes |
|----------------|----------------|-------|
| Date | ✅ Exists | - |
| Amount raised | ✅ Exists | - |
| Pre-money valuation | ❌ Missing | Critical for backsolve |
| Post-money valuation | ❌ Missing | Critical for backsolve |
| Price per share | ❌ Missing | Anchor for valuation |
| Investors | ✅ Exists | - |
| Type (priced vs SAFE/notes) | ⚠️ Partial | Needs enum refinement |
| Arm's length flag | ❌ Missing | IRS requirement |
| Insider round flag | ❌ Missing | Affects reliability |
| Down round flag | ❌ Missing | Material event |

**Note:** The `FundraisingModel` (scenario planning tool) has many of these fields but is designed for projections, not historical record-keeping.

---

### Layer 2: Financial Performance

#### Historical Financials

| Required Component | Current Status | Gap |
|--------------------|----------------|-----|
| Income Statement | ❌ No dedicated model | Critical for DCF |
| Balance Sheet | ✅ `BalanceSheet` model | Good |
| Cash Flow Statement | ⚠️ `CashFlowStatement` exists | Needs enhancement |
| Revenue tracking | ❌ Not structured | Required even pre-revenue |
| Burn rate | ⚠️ Calculable | Not explicit |
| Cash on hand | ✅ In BalanceSheet | - |

#### Forward-Looking Projections

| Required Component | Current Status | Impact |
|--------------------|----------------|--------|
| Revenue projections (3-5 years) | ❌ Missing | Cannot run DCF |
| Cost structure projections | ❌ Missing | Cannot run DCF |
| Headcount growth | ❌ Missing | Affects OpEx projections |
| Capital needs | ❌ Missing | Affects dilution modeling |
| Break-even assumptions | ❌ Missing | Risk assessment |
| Management-approved forecasts | ❌ No approval workflow | Audit requirement |

**Recommendation:** Create `forecasts` and `forecast_lines` models with board approval workflow.

---

### Layer 3: Market & Risk Context

#### Business Description

| Required Component | Current Status |
|--------------------|----------------|
| Product description | ❌ Not structured |
| Target customer | ❌ Not structured |
| Market size (TAM/SAM/SOM) | ❌ Missing |
| Revenue model | ❌ Missing |
| Competitive landscape | ❌ Missing |
| Go-to-market strategy | ❌ Missing |

**Note:** This information typically exists in pitch decks but is not captured in structured form.

#### Company Stage & Risk Factors

| Risk Category | Current Status |
|---------------|----------------|
| Company stage classification | ❌ Missing |
| Customer concentration risk | ❌ Missing |
| Technology risk | ❌ Missing |
| Regulatory risk | ❌ Missing |
| Key-person risk | ❌ Missing |
| Capital dependency risk | ❌ Missing |

**Impact:** Risk factors directly affect discount rates and volatility assumptions in valuation models.

---

### Layer 4: Valuation Method Inputs

**This is the most critical gap.** The platform has no valuation calculation capability.

#### Market Approach Inputs

| Required Component | Current Status |
|--------------------|----------------|
| Public company comparables | ❌ Not implemented |
| M&A transaction comparables | ❌ Not implemented |
| Revenue multiples database | ❌ Not implemented |
| EBITDA multiples database | ❌ Not implemented |
| Industry classification | ❌ Missing in Company model |

#### Income Approach (DCF) Inputs

| Required Component | Current Status |
|--------------------|----------------|
| Financial forecasts | ❌ Missing (Layer 2 gap) |
| Discount rate / WACC | ❌ Not tracked |
| Terminal value assumptions | ❌ Not tracked |
| Risk-free rate | ❌ Not tracked |
| Equity risk premium | ❌ Not tracked |

#### Backsolve / OPM Inputs

| Required Component | Current Status |
|--------------------|----------------|
| Volatility assumption | ❌ Not tracked |
| Time to liquidity (years) | ❌ Not tracked |
| Risk-free rate | ❌ Not tracked |
| Recent round implied value | ❌ Cannot calculate (missing round data) |
| Option pricing model | ❌ Not implemented |
| Value allocation across classes | ❌ Not implemented |

---

### Layer 5: Process & Compliance Metadata

**This layer is our strongest area.**

#### Valuation Metadata

| Required Component | Current Status |
|--------------------|----------------|
| Valuation effective date | ✅ Tracked |
| Valuation firm | ✅ Tracked |
| Methodologies used | ⚠️ Enum exists, not detailed |
| Assumptions documentation | ⚠️ Partial (in documents) |
| Board approval date | ✅ Tracked |
| Expiration tracking | ✅ Automated |

#### Option Grant Tracking

| Required Component | Current Status |
|--------------------|----------------|
| Grant date | ✅ In EquityGrant |
| FMV at grant date | ⚠️ Field exists, not enforced |
| Board approval date | ⚠️ Partial |
| Exercise price vs FMV comparison | ❌ Not automated |
| Link to 409A valuation | ❌ Missing |

**Critical Gap:** Equity grants are not linked to 409A valuations. The system cannot verify that grants were made at or above FMV from a valid 409A.

---

## Data Model Comparison

### Required Tables vs. Current Implementation

| Required Table | Purpose | Current Status | Action Required |
|----------------|---------|----------------|-----------------|
| `companies` | Legal structure | ⚠️ Partial | Add entity type, jurisdiction, fiscal year |
| `stakeholders` | Security holders | ✅ Exists | Minor enhancements |
| `share_classes` | Equity classes | ✅ Exists | Link to preferred_terms |
| `preferred_terms` | Liquidation preferences | ❌ Missing | **Create new table** |
| `equity_plans` | Option pools | ⚠️ Partial | Consolidate from VestingSchedule |
| `security_issuances` | All securities | ✅ Good | Add valuation link |
| `option_terms` | Option specifics | ⚠️ In EquityGrant | Normalize |
| `warrant_terms` | Warrant specifics | ❌ Missing | **Create new table** |
| `safe_terms` | SAFE specifics | ⚠️ Partial | Enhance conversion mechanics |
| `note_terms` | Note specifics | ⚠️ Partial | Enhance conversion mechanics |
| `vesting_schedules` | Vesting rules | ✅ Good | - |
| `financing_rounds` | Historical rounds | ⚠️ Exists | Add valuation fields |
| `round_investments` | Per-investor detail | ❌ Missing | **Create new table** |
| `financial_periods` | Reporting periods | ❌ Missing | **Create new table** |
| `income_statement` | P&L data | ❌ Missing | **Create new table** |
| `forecasts` | Forward projections | ❌ Missing | **Create new table** |
| `forecast_lines` | Projection details | ❌ Missing | **Create new table** |
| `valuations` | 409A records | ✅ Valuation409A | Enhance with methods |
| `valuation_methods` | Methodology details | ❌ Missing | **Create new table** |
| `valuation_assumptions` | Model inputs | ❌ Missing | **Create new table** |
| `valuation_allocations` | Waterfall results | ❌ Missing | **Create new table** |
| `board_approvals` | Governance | ⚠️ Scattered | **Consolidate** |

---

## Strategic Recommendations

### Recommended Approach

Based on the gap analysis, we recommend a **phased approach** that prioritizes data collection and third-party integration over building internal valuation engines.

> **Key Insight:** The immediate opportunity is not to replace professional 409A firms, but to:
> 1. Collect all required inputs in structured form
> 2. Provide pre-409A estimates for planning
> 3. Flag risks and compliance issues
> 4. Deliver clean, audit-ready data to certified providers

This approach:
- Reduces liability (we're not issuing valuations)
- Delivers faster time-to-value
- Creates competitive differentiation through data quality
- Positions us for future calculation capabilities

### Implementation Roadmap

#### Phase 1: Data Model Completion (Foundation)
**Timeline:** 4-6 weeks
**Priority:** Critical

| Deliverable | Description |
|-------------|-------------|
| `preferred_terms` table | Liquidation preferences, participation, seniority |
| Company model enhancement | Entity type, jurisdiction, fiscal year |
| Financing round fields | Pre/post money, price per share, arm's length |
| `valuation_assumptions` table | Volatility, discount rate, time to liquidity |
| `valuation_methods` table | Methodology weights and summaries |

#### Phase 2: Financial Data Integration
**Timeline:** 4-6 weeks
**Priority:** High

| Deliverable | Description |
|-------------|-------------|
| `financial_periods` table | Standardized reporting periods |
| Income statement model | Revenue, COGS, OpEx, EBITDA |
| `forecasts` model | Management projections with approval workflow |
| Historical data import | Connect to accounting systems |

#### Phase 3: Valuation Provider Integration
**Timeline:** 6-8 weeks
**Priority:** High

| Deliverable | Description |
|-------------|-------------|
| Data export API | Clean, structured data for valuation firms |
| Provider portal | Secure access for third-party appraisers |
| Automated data collection | Pre-engagement questionnaire |
| Report ingestion | Parse and store valuation reports |

#### Phase 4: Pre-409A Estimation Tools
**Timeline:** 8-12 weeks
**Priority:** Medium

| Deliverable | Description |
|-------------|-------------|
| Simple OPM calculator | Black-Scholes for internal estimates |
| Comparable company lookup | Industry multiples reference |
| Sensitivity analysis | Range estimates based on inputs |
| Risk flagging | Material events, expiration warnings |

#### Phase 5: Advanced Capabilities
**Timeline:** 12+ weeks
**Priority:** Lower

| Deliverable | Description |
|-------------|-------------|
| Full DCF model | Integrated with forecasts |
| Waterfall from FMV | Auto-calculate allocations |
| ASC 718 automation | Expense calculation from grants |
| Audit report generation | One-click compliance packages |

---

## Risk Assessment

### Current Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Grants issued above valid 409A FMV | Medium | High | Link grants to valuations |
| Expired valuation used for grants | Medium | High | Block grants if 409A expired |
| Incomplete audit trail | Low | High | Current system is strong |
| Preference stack errors in waterfall | Medium | Medium | Create preference model |
| Material events not triggering re-valuation | High | Medium | Implement event catalog |

### Compliance Gaps

| Requirement | Current State | Risk Level |
|-------------|---------------|------------|
| IRC 409A: Independent appraisal | Tracked | Low |
| IRC 409A: Reasonable valuation method | Not enforced | Medium |
| IRC 409A: 12-month validity | Enforced | Low |
| ASC 718: FMV at grant date | Not enforced | High |
| ASC 718: Expense recognition | Not calculated | Medium |

---

## Appendix A: Current Model Inventory

### Valuation-Related Models

| Model | File | Purpose |
|-------|------|---------|
| Valuation409A | `models/Valuation409A.js` | Core valuation tracking |
| ValuationPartner | `models/ValuationPartner.js` | Firm management |
| MaterialEvent | `models/MaterialEvent.js` | Trigger events |
| WaterfallAnalysis | `models/WaterfallAnalysis.js` | Exit scenarios |

### Cap Table Models

| Model | File | Purpose |
|-------|------|---------|
| ShareClass | `models/ShareClass.js` | Equity classes |
| Stakeholder | `models/Stakeholder.js` | Security holders |
| SecurityIssuance | `models/SecurityIssuance.js` | All issuances |
| EquityGrant | `models/EquityGrant.js` | Option/RSU grants |
| VestingSchedule | `models/VestingSchedule.js` | Vesting rules |
| SAFE | `models/SAFE.js` | SAFE instruments |
| InvestorRights | `models/InvestorRights.js` | Rights tracking |

### Financial Models

| Model | File | Purpose |
|-------|------|---------|
| BalanceSheet | `models/BalanceSheet.js` | Assets/liabilities |
| FinancialMetrics | `models/FinancialMetrics.js` | Ratio calculations |
| CashFlowStatement | `models/CashFlowStatement.js` | Cash flows |
| FundraisingModel | `models/FundraisingModel.js` | Scenario planning |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| 409A Valuation | IRS-compliant fair market value determination for private company stock |
| ASC 718 | GAAP accounting standard for stock-based compensation |
| Backsolve | Valuation method that derives value from recent financing |
| DCF | Discounted Cash Flow valuation methodology |
| FMV | Fair Market Value |
| OPM | Option Pricing Model (Black-Scholes or binomial) |
| Waterfall | Distribution of proceeds across securities by preference |
| WACC | Weighted Average Cost of Capital (discount rate) |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-06 | Engineering Team | Initial analysis |

---

*This document is confidential and intended for internal use only.*
