# UI/UX Gap Analysis: OCS vs Reference Platform (Cake)

**Date**: 2026-05-27
**Scope**: 30 screenshots analyzed from reference cap table platform (Cake) compared against OCS current frontend
**Goal**: Identify actionable UI/UX improvements implementable today with current OCS functionality

---

## Executive Summary

The reference platform (Cake) demonstrates a polished, production-grade cap table management UI with strong information hierarchy, consistent design language, and intuitive navigation patterns. OCS has solid backend APIs and 40+ pages of functionality, but the frontend presentation has significant gaps in visual polish, data density, navigation clarity, and interactive feedback patterns.

This document covers **UI/UX improvements only** -- things we can fix today using existing OCS backend capabilities. Feature gaps requiring new backend work are tracked separately in `FEATURE_ROADMAP_FROM_UX_AUDIT.md`.

---

## 1. Navigation & Layout

### 1.1 Sidebar Architecture

| Aspect | Cake (Reference) | OCS (Current) | Gap |
|--------|-------------------|---------------|-----|
| Structure | Icon rail (left) + expandable text panel (right) | Single sidebar with collapsible groups | Cake's two-layer approach is more space-efficient |
| Icons | Clean, custom icon set per section | Lucide icons, inconsistent sizing | Need consistent icon sizing and weight |
| Active state | Purple/blue highlight with filled icon variant | Blue text highlight | Add background highlight + icon fill change |
| Grouping | Top-level: Get Started, Cap Table, Plans, Compliance, Audit, Engage, Documents, Settings | Top-level: Cap Table, Equity, Fundraise, Documents, Reports, etc. | OCS has MORE sections -- need to reduce cognitive load |
| Collapse behavior | Icon rail always visible, text collapses | Entire section collapses | Keep icons visible when collapsed |
| Badge counts | Notification badges on nav items (e.g., "To do 2") | No badges | Add badge counts for pending actions |

**Action Items:**
- [ ] Reduce sidebar to icon rail + expandable panel (two-layer navigation)
- [ ] Add active state with background highlight (not just text color)
- [ ] Add notification badges on nav items (pending SAFEs, unsigned docs, etc.)
- [ ] Consolidate navigation groups -- OCS has ~12 top-level groups vs Cake's 7
- [ ] Add company logo/avatar at top of sidebar (Cake shows company initial in circle)

### 1.2 Top Navigation Bar

| Aspect | Cake (Reference) | OCS (Current) |
|--------|-------------------|---------------|
| Top bar | Getting Started progress, Upgrade CTA, Invite co-pilots, Help, Admin/MyCake toggle, avatar | Minimal top bar |
| Role switcher | "Admin" / "MyCake" toggle in header | No role switcher in header |
| Help access | Prominent "? Help" button in header | No persistent help button |
| Keyboard shortcut | "Cmd+K" quick-add button at bottom of sidebar | No command palette |

**Action Items:**
- [ ] Add role context indicator in top bar (Admin/Employee view toggle)
- [ ] Add persistent help button in header
- [ ] Add quick-add shortcut hint (Cmd+K) at sidebar bottom
- [ ] Show user avatar + role indicator in top-right corner

### 1.3 Breadcrumb Navigation

Cake uses breadcrumbs extensively: `Stock options > Pool details > Grant details`

OCS has no breadcrumb navigation on detail pages.

**Action Items:**
- [ ] Add breadcrumb component for all detail/drill-down pages
- [ ] Pattern: `Section > List > Detail` (e.g., "Equity Plans > 2025 Plan > Grant #42")

---

## 2. Dashboard

### 2.1 KPI Summary Cards

| Aspect | Cake (Reference) | OCS (Current) |
|--------|-------------------|---------------|
| Layout | 3-panel: Quick Stats + Total Securities pie + Top Shareholders pie | 3-column KPIs + pie chart + activities + table |
| Quick stats | Stakeholders, Total shares, Total securities, Share price -- each with icon | Amount Raised, Diluted Shares, Total Stakeholders |
| Visual density | Information-rich, compact cards with info tooltips | Cards exist but sparse |
| Pie charts | Two distinct pie charts: security type breakdown + top shareholder breakdown | Single ownership pie chart |

**Action Items:**
- [ ] Add info tooltip icons (i) next to each KPI metric for explanation
- [ ] Add "Share price" KPI card to dashboard (OCS has valuation data)
- [ ] Add second pie chart: security type breakdown (Common vs Preferred vs Options vs Notes)
- [ ] Add "Total securities" vs "Total shares" distinction in KPIs
- [ ] Make pie chart legends interactive (click to filter)

### 2.2 Employee/Stakeholder Home View

Cake shows a personalized "MyCake" view for non-admin users:
- "Welcome back, [Name]" greeting
- "Value of my slice: $4,385,015" hero card
- "What could this equity mean for you?" prompt with edit icon
- "Learn" section with educational video cards (What is vesting?, etc.)
- "Your portfolio" cards showing company grants

OCS has `my-equity` and `my-documents` pages but no personalized home experience.

**Action Items:**
- [ ] Create personalized employee dashboard with welcome message
- [ ] Add "Value of my equity" hero metric card
- [ ] Add educational content section (links to equity education resources)
- [ ] Show portfolio cards for each company the user has grants in

---

## 3. Cap Table Overview

### 3.1 Tab-Based Sub-Navigation

Cake uses horizontal tabs within Cap Table: `Overview | Shareholders | Option holders | SAFEs | Convertible notes | Custom notes | Warrants`

OCS uses separate sidebar nav items for each sub-section.

**Action Items:**
- [ ] Add horizontal tab bar within Cap Table page for sub-views
- [ ] Tabs: Overview, Shareholders, Option Holders, SAFEs, Convertible Notes, Warrants
- [ ] This reduces sidebar clutter and matches user mental model of "cap table has parts"

### 3.2 Diluted/Undiluted Toggle

Cake has a prominent `Fully diluted <toggle> Undiluted` switch with "Download Cap Table" button.

**Action Items:**
- [ ] Add fully diluted / undiluted toggle switch to cap table header
- [ ] Add "Download Cap Table" export button in cap table header (API exists via OCF export)

### 3.3 Owners Table

| Aspect | Cake (Reference) | OCS (Current) |
|--------|-------------------|---------------|
| Columns | Stakeholder (avatar+name), LUV shares, Vested options, Unvested options, Total securities, Total value, Ownership % | Varies by page |
| Row actions | Edit icon (pencil) + Add icon (+) inline per row | Action buttons |
| Search | Inline search bar above table | Basic search |
| Verified badge | Green checkmark next to confirmed stakeholders | No verification indicator |

**Action Items:**
- [ ] Add avatar/initials circle next to stakeholder names in all tables
- [ ] Add inline edit (pencil) and add (+) action icons per row
- [ ] Add verified/confirmed badge icon for stakeholders who have accepted invites
- [ ] Show "Total value" column (shares x share price) in stakeholder tables
- [ ] Standardize table column set across all list views

---

## 4. Equity Plans & Grants

### 4.1 Plans List View

Cake's equity plan card shows:
- Plan name ("2023 Equity Incentive Plan")
- Pool size, Available options, Ownership % as 3 headline metrics
- Vested % and Allocated % with a visual progress bar
- "View pool" and "View grants" CTAs

OCS has equity plan pages but without this card-based summary.

**Action Items:**
- [ ] Create plan summary card with pool size, available, ownership % metrics
- [ ] Add dual progress bar (vested + allocated) below plan cards
- [ ] Sub-navigation under Plans: Options, RSU, RSA, Vesting templates, Benchmarking, Board approvals, Off-boarding, Exercise requests

### 4.2 Grant Detail View

Cake's grant detail page is excellent:
- Header: `[Name]'s grant details` with breadcrumb
- Key fields row: Incentive pool, Status (badge), Converts to, Option type (ISO/NSO), Start date
- Vesting chart: step-function line chart showing vesting over time (cliff + monthly)
- Bottom metrics: Estimated value, Estimated ownership, Strike price, Option expiration
- Right sidebar: Contact card (name + email) + Offer settings (witness signature, email notifications, allow early exercise toggles) + Preview documents

**Action Items:**
- [ ] Add vesting schedule step-function chart to grant detail pages
- [ ] Show key grant fields in horizontal card layout (pool, status badge, type, start date)
- [ ] Add estimated value calculation based on current valuation
- [ ] Add offer settings panel (notification toggles, early exercise option)
- [ ] Add document preview panel in grant detail

---

## 5. SAFEs & Convertible Notes

### 5.1 SAFEs List View

| Aspect | Cake (Reference) | OCS (Current) |
|--------|-------------------|---------------|
| Layout | Sortable table with Investor, Round, Issue date, Total paid, Valuation cap, Discount, Resolution date, Status | Basic list |
| CTA | "New SAFE" primary button + Search + "Bulk upload" | Create button exists |
| Status | Green "Issued" badges | Status text |
| Avatar | Colored initial circles per investor | No avatars |
| Sorting | Click-to-sort on every column (sort arrows visible) | Limited sorting |

**Action Items:**
- [ ] Add colored initial avatar circles for all investor/stakeholder names
- [ ] Add sortable column headers with sort direction indicators
- [ ] Add "Bulk upload" option for SAFEs
- [ ] Add status badges (green=Issued, yellow=Pending, red=Cancelled)
- [ ] Add "Search" input inline with action buttons

### 5.2 SAFE/Note Detail View

Cake shows a split layout:
- **Left panel**: Investor info (avatar, name, status badge), Amount, Contact email, Investment terms table (Note type, Round, Issue date, Valuation cap, Discount)
- **Right panel**: Document preview (rendered SAFE agreement with signatures)
- **Top**: Breadcrumb (Notes > Note details), Actions dropdown

**Action Items:**
- [ ] Create split-panel detail view: terms on left, document preview on right
- [ ] Add breadcrumb navigation on detail pages
- [ ] Add "Actions" dropdown (top-right) for edit/delete/download/send
- [ ] Render document preview inline (PDF/HTML preview of agreement)
- [ ] Show investment terms in structured key-value table

---

## 6. Valuations

Cake's Valuations page:
- "Most recent valuation" card with round tag (Seed), amount ($15,000,000), date
- "Previous valuations" listed as cards below
- Line chart showing valuation history over time (area chart with filled gradient)
- "+ Add valuation" button top-right
- Delete icon per valuation card

**Action Items:**
- [ ] Add valuation history area/line chart (time on X, valuation on Y)
- [ ] Style valuation cards with round tag badges (Pre-Seed, Seed, Series A, etc.)
- [ ] Show "Most recent" prominently at top, previous below
- [ ] Add delete action per valuation card
- [ ] Use gradient-filled area chart for visual appeal

---

## 7. Share Classes

Cake shows share classes as cards:
- Class abbreviation tag (e.g., "LUV")
- Class name ("Common")
- Key-value pairs: Type, Shares authorised, Shares issued, Total invested, Price per share, Par/nominal value
- "More" expandable section
- Edit and Delete actions per card

**Action Items:**
- [ ] Switch share class display from table to card layout
- [ ] Show class abbreviation as colored tag
- [ ] Include key metrics: authorized, issued, invested, price per share, par value
- [ ] Add inline edit/delete actions per card

---

## 8. Forms & Wizards

### 8.1 Multi-Step Wizards

Cake uses full-screen modal wizards for creating SAFEs, Convertible notes, and Custom notes:
- 3-step stepper: (1) Investor details (2) [Type] details (3) Finalise your [Type]
- Clean centered layout with generous whitespace
- "Existing contact" / "New contact" toggle cards
- "Next >" button bottom-right in purple

**Action Items:**
- [ ] Implement multi-step wizard pattern for all creation flows (SAFE, notes, grants)
- [ ] Step 1: Select/create stakeholder, Step 2: Enter terms, Step 3: Review & confirm
- [ ] Use full-screen modal with stepper progress indicator
- [ ] "Existing contact" / "New contact" card toggle for stakeholder selection

### 8.2 Grant Creation Form

Cake's "Create grants" panel:
- Shows total securities context ("Number of securities in the company: 10,262,222")
- Equity input with % <-> # linked toggle (change one, other updates)
- Share class dropdown
- Strike price input with default hint
- Vesting schedule checkbox + configuration
- Expiration type radio buttons (Time-based, At a date, None)
- **Live preview panel**: Shows Warrants count, Est. ownership %, Est. value

**Action Items:**
- [ ] Add live preview panel to grant/equity creation forms
- [ ] Add % <-> # linked inputs for equity amounts
- [ ] Show company total securities context at top of creation forms
- [ ] Add inline default value hints (e.g., "Default strike price: $0.31")

---

## 9. Onboarding & Getting Started

Cake has an excellent onboarding experience:
- "Getting started" checklist with progress bar (4/7 completed)
- Numbered steps: Create account, Add shareholders, Invite co-pilots, Set up share classes, Add valuation, Add SAFEs/notes, Add incentive offer
- Each step has an action button (Add/Set up/Create/Invite)
- Expandable step detail with illustration
- "See what Cake looks like fully set up" link + "Take the tour" CTA
- Quick-add bar: "Quick add (eg a SAFE, grant or shares) Cmd+K"

**Action Items:**
- [ ] Create onboarding checklist page for new companies
- [ ] Track completion state: company setup, shareholders added, share classes configured, valuation added, SAFEs/notes added, grants created
- [ ] Show progress bar (X/Y steps completed)
- [ ] Add "Take the tour" link to interactive walkthrough
- [ ] Add "Quick add" command palette (Cmd+K) for power users

---

## 10. Design System & Visual Polish

### 10.1 Typography

| Element | Cake (Reference) | OCS Recommendation |
|---------|-------------------|--------------------|
| Page title | 32-36px, bold, black | Standardize to text-3xl font-bold |
| Section heading | 20-24px, semibold | text-xl font-semibold |
| Card heading | 16-18px, semibold | text-lg font-semibold |
| Body text | 14px, regular, gray-600 | text-sm text-gray-600 |
| Label text | 12-13px, medium, gray-500 | text-xs font-medium text-gray-500 |

### 10.2 Color Palette

Cake uses a refined palette:
- **Primary**: Purple/Indigo (#6C5CE7 range) for CTAs, active states, links
- **Background**: White content area, very light gray (#FAFAFA) for page background
- **Sidebar**: White/light gray with pink/salmon accent for active section
- **Status green**: Bright green dots for "Issued" / "Active"
- **Status red**: Red dots for "Terminated"
- **Charts**: Coral/salmon, green, yellow, purple, teal for pie chart segments

**Action Items:**
- [ ] Audit and unify color usage across all OCS components
- [ ] Establish 5-color chart palette for consistent data visualization
- [ ] Use status color dots (green/yellow/red) consistently for all status indicators
- [ ] Ensure proper contrast ratios (WCAG AA minimum)

### 10.3 Spacing & Cards

- Cake uses consistent 16-24px padding in cards
- Rounded corners: 8-12px border-radius on all cards
- Subtle borders: 1px solid gray-200 (not heavy shadows)
- Card hover: subtle shadow elevation on interactive cards

**Action Items:**
- [ ] Standardize card padding to p-4 (16px) or p-6 (24px)
- [ ] Use rounded-lg (8px) for all card elements
- [ ] Replace heavy shadows with subtle border + hover shadow
- [ ] Ensure consistent spacing between sections (24-32px gaps)

### 10.4 Empty States

Cake has contextual tooltips/popovers that appear over content:
- "SAFE terms, contracts, and signing, all handled. Now see how much your company is worth." + CTA button
- "1.7M options. 38% vested. Every grant, tracked." + "View grants" CTA
- Feature education inline with the data

**Action Items:**
- [ ] Add contextual empty state messages with educational CTAs
- [ ] When sections have data, show feature discovery popovers (first visit only)
- [ ] Each empty state should explain the value + provide action button

---

## 11. Tables & Data Display

### 11.1 Standard Table Pattern

| Feature | Cake | OCS Gap |
|---------|------|---------|
| Column sorting | Click header to sort, arrow indicators | Add to all tables |
| Row hover | Subtle background highlight | Ensure consistent hover |
| Avatar/initials | Colored circle with initials on every person row | Add to all stakeholder tables |
| Inline actions | Edit/delete icons visible per row | Move from bulk actions to inline |
| Status badges | Colored pill badges (green=active, red=terminated) | Replace text status with badges |
| Search | Inline search above table | Add persistent search input |
| Filters | Filter icon with dropdown | Add filter capabilities |
| Pagination | Not shown (likely infinite scroll or paginated) | Ensure consistent pagination |

**Action Items:**
- [ ] Create reusable DataTable component with: sorting, search, filters, avatars, inline actions, status badges
- [ ] Apply to all list views: stakeholders, grants, SAFEs, documents, etc.
- [ ] Add "Bulk actions" dropdown for multi-select operations

---

## 12. Interactive Feedback

### 12.1 Tooltips & Popovers

Cake uses tooltips extensively:
- Info icons (i) next to technical terms ("Total securities", "Share price")
- Hover reveals explanation tooltip
- Feature discovery popovers on first visit

**Action Items:**
- [ ] Add (i) info icons with tooltips for all financial metrics
- [ ] Tooltips should explain: what the metric means, how it's calculated
- [ ] Examples: "Fully diluted shares include all outstanding options and warrants"

### 12.2 Progress Indicators

- Getting started: progress bar with step count
- Equity plans: dual progress bar (vested % + allocated %)
- Document signing: status progression

**Action Items:**
- [ ] Add progress bars to equity plan cards (vested + allocated)
- [ ] Add document completion progress to data room views
- [ ] Use consistent progress bar styling (gradient fill, percentage labels)

---

## Priority Implementation Order

### Phase 1: Quick Wins (1-2 days each)
1. Add avatar/initials circles to all stakeholder tables
2. Add status badges (colored pills) replacing text statuses
3. Add info tooltips to all financial metrics
4. Add breadcrumb navigation to all detail pages
5. Standardize card padding, border-radius, and spacing
6. Add "Download Cap Table" button to cap table header

### Phase 2: Navigation Overhaul (3-5 days)
7. Consolidate sidebar to icon rail + expandable panel
8. Add horizontal tab bar within Cap Table page
9. Add diluted/undiluted toggle to cap table
10. Add role context indicator in top bar

### Phase 3: Dashboard Enhancement (3-5 days)
11. Add second pie chart (security type breakdown)
12. Add share price KPI card
13. Create personalized employee home view
14. Add onboarding checklist for new companies

### Phase 4: Detail Pages (5-7 days)
15. Create split-panel SAFE/note detail view with document preview
16. Add vesting schedule chart to grant details
17. Add live preview panel to creation forms
18. Implement multi-step wizard pattern for SAFEs/notes/grants

### Phase 5: Data Visualization (3-5 days)
19. Add valuation history area chart
20. Add equity plan progress bars (vested + allocated)
21. Establish 5-color chart palette
22. Add interactive chart legends

---

## Appendix: Screenshot Reference Map

| Screenshot | Platform | Content |
|------------|----------|---------|
| 7.07.37 PM | Cake (admin) | Getting started onboarding checklist |
| 7.07.53 PM | Cake (employee) | To-do list with action items |
| 7.08.19 PM | Cake (employee) | MyCake home - equity value + learn section + modal |
| 7.09.14 PM | Cake (employee) | MyCake home - portfolio view |
| 7.09.39 PM | Cake (employee) | Portfolio detail - key stats + transactions |
| 7.12.07 PM | Cake (admin) | SAFE note detail with document preview |
| 7.12.25 PM | Cake (admin) | Cap Table overview - quick stats + pie charts + tabs |
| 7.12.38 PM | Cake (admin) | Cap Table overview with SAFEs tab tooltip |
| 7.13.05 PM | Cake (admin) | SAFEs list - sortable table with status badges |
| 7.13.16 PM | Cake (admin) | SAFE note detail - terms + document preview |
| 7.13.27 PM | Cake (admin) | Valuations with history chart (scrolled down) |
| 7.13.39 PM | Cake (admin) | Plans > Options - equity plan card with progress |
| 7.13.58 PM | Cake (admin) | Plan detail - pool summary + grants table |
| 7.14.14 PM | Cake (admin) | Grant detail - vesting chart + offer settings |
| 7.14.47 PM | Cake (admin) | Valuations page - single valuation + chart |
| 7.15.06 PM | Cake (admin) | Cap Table overview - full owners table |
| 7.15.18 PM | Cake (admin) | Cap Table scrolled - owners table detail |
| 7.17.03 PM | Cake (admin) | Valuations - multiple entries + chart |
| 7.17.25 PM | Cake (admin) | Pricing page - Build/Team/Pro tiers (annual) |
| 7.17.39 PM | Cake (admin) | Pricing page - quarterly view |
| 7.18.09 PM | Cake (admin) | Pricing page - with QSBS add-on toggled |
| 7.19.04 PM | Cake (admin) | Create SAFE wizard - step 1 investor details |
| 7.19.25 PM | Cake (admin) | Create Convertible note wizard - step 1 |
| 7.19.47 PM | Cake (admin) | Create Warrant grant form with live preview |
| 7.20.03 PM | Cake (admin) | Create Custom note wizard - step 1 |
| 7.20.24 PM | Cake (admin) | Share classes - card layout with details |
| 6.24.10 PM | Mantle (ref) | Options list with vesting popover |
| 6.24.16 PM | Mantle (ref) | Equity plan chart + modelling panel |
| 6.24.24 PM | Mantle (ref) | Member access table with role badges |
| 2.03.41 PM | Other | DigitalOcean support (unrelated) |
