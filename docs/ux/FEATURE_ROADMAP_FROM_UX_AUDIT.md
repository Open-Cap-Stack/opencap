# Feature Roadmap: Gaps Identified from UX Audit

**Date**: 2026-05-27
**Source**: Analysis of 30 screenshots from reference cap table platform (Cake) + 4 additional reference screenshots (Mantle)
**Scope**: Features that require NEW backend functionality or significant new frontend capabilities beyond UI polish

---

## Overview

These are product-level feature gaps -- capabilities that the reference platform offers which OCS either lacks entirely or has only partially implemented. Each item includes the observed behavior in the reference platform, what OCS has today, and the backend/frontend work required.

---

## Tier 1: High Impact, Core Cap Table Features

### F-001: Onboarding Checklist & Getting Started Flow

**Reference**: Cake has a comprehensive "Getting Started" experience:
- 7-step guided checklist with progress bar
- Steps: Create account, Add shareholders, Invite co-pilots, Set up share classes, Add valuation, Add SAFEs/notes, Add incentive offer
- Each step expandable with illustration and action button
- "Take the tour" interactive walkthrough
- Persists across sessions until completed

**OCS Today**: Company setup page exists, but no guided onboarding after initial setup.

**Work Required**:
- Backend: Track onboarding completion state per company (7 boolean flags)
- Frontend: Onboarding checklist component, progress persistence, step-by-step UI
- Priority: **HIGH** -- directly impacts new user activation and retention

---

### F-002: Employee Portal (MyCake-equivalent)

**Reference**: Cake's "MyCake" mode provides employees a completely different view:
- Personalized home: "Welcome back, [Name]" + "Value of my slice: $X"
- Portfolio section: cards per company showing granted shares + "View" link
- Offers inbox: pending equity offers requiring action
- Documents: personal equity-related documents
- Educational content: video cards (What is vesting?, Why options vs stocks?, etc.)
- "Tell us about yourself" onboarding modal

**OCS Today**: Has `my-equity` and `my-documents` pages, but no cohesive employee experience. No equity value calculator on home. No educational content.

**Work Required**:
- Backend: Aggregate equity value per employee across grants, calculate "my slice" value
- Backend: Employee portfolio API (list all companies + grants)
- Frontend: Personalized employee dashboard, educational content section
- Priority: **HIGH** -- essential for stakeholder self-service and engagement

---

### F-003: To-Do / Action Items System

**Reference**: Cake has a "To do" section with actionable items:
- "Christian Ramos has not confirmed their details in the Option Pool offer"
- Per-item actions: "Check it out", "Send reminder", "Ignore"
- Badge count on navigation (To do: 2)
- "Invite to MyCake" and "Send all reminders" bulk actions

**OCS Today**: Notifications exist but no structured to-do/action item system for pending stakeholder actions.

**Work Required**:
- Backend: Action item model (pending confirmations, unsigned documents, incomplete profiles)
- Backend: "Send reminder" API per stakeholder
- Frontend: To-do list page with per-item actions
- Priority: **HIGH** -- drives completion of critical cap table operations

---

### F-004: Document Preview (Inline SAFE/Note Rendering)

**Reference**: Cake renders SAFE agreements inline with:
- Full document preview panel (right side of detail view)
- Rendered legal document with parties, terms, signatures
- Scrollable document within the page (no separate download required)

**OCS Today**: Documents can be uploaded and listed, but no inline rendering/preview.

**Work Required**:
- Backend: PDF-to-HTML rendering service or PDF.js integration
- Backend: SAFE document template generation from terms
- Frontend: Document preview panel component
- Priority: **HIGH** -- eliminates the need to download/open files externally

---

### F-005: Multi-Step Instrument Creation Wizards

**Reference**: Cake uses 3-step full-screen wizards for:
- Create SAFE: (1) Investor details (2) SAFE details (3) Finalise your SAFE
- Create Convertible Note: Same 3-step pattern
- Create Custom Note: Same 3-step pattern
- Create Grant: Sidebar panel with live preview
- Each wizard has "Existing contact" / "New contact" toggle

**OCS Today**: Creation forms exist but as simple single-page forms without guided flow.

**Work Required**:
- Frontend: Reusable multi-step wizard component
- Frontend: "Existing contact" lookup/autocomplete
- Frontend: Live preview panel for grants (showing est. ownership %, est. value)
- Backend: May need draft/partial-save API for multi-step flows
- Priority: **MEDIUM** -- improves accuracy and reduces form abandonment

---

## Tier 2: Growth & Engagement Features

### F-006: Admin/Employee Role View Toggle

**Reference**: Cake has an "Admin" / "MyCake" toggle in the header. Admins can switch to see the employee view instantly.

**OCS Today**: Role-based navigation exists (employee sees limited sidebar), but no way for admins to preview the employee experience.

**Work Required**:
- Frontend: "View as Employee" toggle in header for admin users
- Backend: No changes needed (existing RBAC can filter)
- Priority: **MEDIUM** -- helps admins validate what their team sees

---

### F-007: Invite Co-Pilots / Team Collaboration

**Reference**: Cake prominently features "Invite co-pilots" button in header:
- Invite founders, attorneys, finance team
- Role-based access (Full Access vs View-only)
- "Last online" tracking per team member
- Role badges (CEO, CFO, Investor, Law Firm)

**OCS Today**: Has invite functionality for employees/service providers, but not as prominent or role-specific.

**Work Required**:
- Backend: "Last online" timestamp tracking per user
- Frontend: Prominent "Invite team" button in header
- Frontend: Team member list with role badges and access level indicators
- Priority: **MEDIUM** -- drives platform adoption within organizations

---

### F-008: Quick Add / Command Palette (Cmd+K)

**Reference**: Cake has a "Quick add" bar at the bottom of the sidebar: "Quick add (eg a SAFE, grant or shares) Cmd+K"

**OCS Today**: No command palette or quick-add functionality.

**Work Required**:
- Frontend: Command palette component (Cmd+K trigger)
- Frontend: Quick-add actions: New SAFE, New grant, New stakeholder, New share class, etc.
- Backend: No changes needed
- Priority: **MEDIUM** -- power user feature, improves efficiency

---

### F-009: Equity Plan Sub-Features

**Reference**: Cake's Plans section includes sub-pages:
- **Options** (stock option pools)
- **RSU** (restricted stock units)
- **RSA** (restricted stock awards) -- marked "NEW"
- **Vesting templates** (reusable vesting schedules)
- **Benchmarking** (compare equity offers by role)
- **Board approvals** (approval workflows)
- **Off-boarding** (handle departing employees)
- **Exercise requests** (process option exercises)

**OCS Today**: Has equity plans and vesting, but lacks dedicated RSU/RSA management, benchmarking, board approvals, off-boarding workflows, and exercise request processing.

**Work Required**:
- Backend: RSU and RSA models and CRUD APIs
- Backend: Vesting template model (reusable across grants)
- Backend: Board approval workflow (request -> approve -> execute)
- Backend: Off-boarding workflow (accelerate/forfeit/exercise window)
- Backend: Exercise request processing pipeline
- Frontend: Dedicated pages for each sub-feature
- Priority: **HIGH** -- core equity management capabilities

---

### F-010: Valuation History with Round Tags

**Reference**: Cake's valuations page shows:
- Most recent valuation with round stage tag (Seed, Pre-Seed, Series A)
- Previous valuations listed chronologically
- Area chart showing valuation growth over time
- "+ Add valuation" button

**OCS Today**: Has valuation API (`/api/v1/valuations`) but frontend may not fully surface round tagging and historical visualization.

**Work Required**:
- Backend: Ensure round/stage field on valuations (may already exist)
- Frontend: Valuation history area chart component
- Frontend: Round stage tag badges
- Priority: **MEDIUM** -- important for investor reporting

---

### F-011: Compliance & Audit Section

**Reference**: Cake has dedicated "Compliance" and "Audit" sidebar sections.

**OCS Today**: Has compliance features (409A, SAFE compliance) but may not surface them under a dedicated compliance navigation section.

**Work Required**:
- Frontend: Dedicated "Compliance" section in sidebar grouping 409A, tax, and regulatory features
- Frontend: "Audit" section for audit trail / transaction logs
- Backend: Likely has the APIs already
- Priority: **MEDIUM** -- important for regulatory-conscious customers

---

### F-012: Engage Section (Stakeholder Communications)

**Reference**: Cake has an "Engage" sidebar section for stakeholder communications and updates.

**OCS Today**: Has messages and communications pages but scattered across navigation.

**Work Required**:
- Frontend: Consolidate communications under "Engage" section
- Frontend: Stakeholder update templates, investor update drafts
- Backend: May need template system for recurring communications
- Priority: **LOW** -- nice-to-have, not core cap table functionality

---

## Tier 3: Monetization & Platform Features

### F-013: Tiered Pricing & Billing UI

**Reference**: Cake has a polished pricing page:
- 3 tiers: Build ($1,000/yr), Team ($2,750/yr), Pro ($7,500/yr)
- Quarterly/Annual toggle with "Save 33%" badge
- Feature comparison list per tier
- "Unlocks" section: 409A Valuation ($1,500/yr toggle), QSBS ($500/yr toggle)
- Inline credit card form
- Real-time total calculation
- "You are over the limit" warning banner

**OCS Today**: Billing page exists but may not have this level of polish.

**Work Required**:
- Backend: Subscription tier management, usage tracking, add-on toggles
- Frontend: Pricing comparison page, plan selector, add-on toggles
- Frontend: Inline payment form integration (Stripe)
- Priority: **LOW** (for now) -- critical for monetization but not for core product

---

### F-014: Stakeholder Portal with Document Sharing

**Reference**: Cake mentions "Stakeholder portal, investor updates & doc sharing" as a feature.

**OCS Today**: Has investor portal pages but may need enhancement.

**Work Required**:
- Backend: Public/authenticated portal for stakeholders to view their equity
- Frontend: Standalone stakeholder portal (possibly separate route)
- Priority: **LOW** -- depends on go-to-market strategy

---

### F-015: Labs / Experimental Features

**Reference**: Cake has a "Labs" badge at bottom of sidebar for beta features.

**OCS Today**: No experimental feature flagging.

**Work Required**:
- Backend: Feature flag system
- Frontend: Labs badge + feature toggles in settings
- Priority: **LOW**

---

## Tier 4: Advanced Features (Observed from Mantle Reference)

### F-016: Equity Plan Modeling & Forecasting

**Reference (Mantle)**: Advanced equity plan modeling:
- "Equity Plan 2025" with "As of" date selector
- Bar chart: Available to grant (solid) + Projected (dashed outline)
- Hiring plan integration: "2025 Hiring plan" with "New Options: 600,000"
- Attrition rate overlay ("2024 Attrition Rate")
- Forward-looking pool depletion projection

**OCS Today**: Has scenarios/dilution pages but likely lacks hiring plan integration and projection modeling.

**Work Required**:
- Backend: Hiring plan model, attrition rate inputs, projection engine
- Frontend: Projection chart with actuals + forecast
- Priority: **LOW** -- advanced feature for larger companies

---

### F-017: Options Drafts & Publishing Workflow

**Reference (Mantle)**: Options management with workflow:
- "Drafts" page with Cancel/Publish buttons
- Options table showing: Id (OPT-55), Status (Published/Terminated), Stakeholder, Grant amount, Exercise price, Vesting schedule, Grant date
- Hover popover on vesting: progress bar showing Vested 40% / Unvested 60%

**OCS Today**: Has equity grants but may lack draft/publish workflow.

**Work Required**:
- Backend: Draft state for equity grants, publish workflow
- Frontend: Draft list with bulk publish
- Frontend: Vesting progress hover popover
- Priority: **MEDIUM** -- important for grant management workflow

---

### F-018: Member Access Management

**Reference (Mantle)**: Team member management:
- Table: Members (avatar + name + email), Role (CEO, CFO, Investor, Law Firm), Access (Full Access, View-only), Last online
- Role badges: "You" badge on current user, "Law Firm" badge
- "Add members" button

**OCS Today**: Has settings/team page but may lack this level of detail.

**Work Required**:
- Frontend: Enhanced team member table with role badges, access levels, last online
- Backend: "Last online" tracking
- Priority: **MEDIUM** -- important for collaboration

---

## Implementation Priority Matrix

| Priority | Features | Estimated Effort |
|----------|----------|-----------------|
| **P0 - Now** | F-001 (Onboarding), F-003 (To-dos), F-004 (Doc Preview) | 2-3 weeks |
| **P1 - Next Sprint** | F-002 (Employee Portal), F-005 (Wizards), F-009 (Equity Sub-features) | 3-4 weeks |
| **P2 - Near Term** | F-006 (View Toggle), F-007 (Invite), F-008 (Cmd+K), F-010 (Valuations), F-011 (Compliance nav) | 2-3 weeks |
| **P3 - Medium Term** | F-012 (Engage), F-017 (Draft/Publish), F-018 (Member Access) | 2-3 weeks |
| **P4 - Future** | F-013 (Pricing), F-014 (Portal), F-015 (Labs), F-016 (Modeling) | 4-6 weeks |

---

## Relationship to UI/UX Gap Analysis

The companion document `UI_UX_GAP_ANALYSIS.md` covers visual and interaction improvements that can be made **today** with existing OCS backend functionality. This document covers features requiring **new backend work** or **significant new frontend capabilities**.

Together, these two documents form a complete picture of what's needed to bring OCS to parity with the reference platform's user experience and feature set.

---

## Notes

- Feature IDs (F-001 through F-018) can be used when creating GitHub issues
- Each feature should have its own GitHub issue with acceptance criteria derived from the reference screenshots
- Screenshots are archived in `/Users/aideveloper/Desktop/ocs_ui/` for reference
- The reference platform (Cake) is a commercially available cap table platform; some features may be behind their paid tiers
- Additional reference screenshots from Mantle show alternative approaches to equity plan modeling and team management
