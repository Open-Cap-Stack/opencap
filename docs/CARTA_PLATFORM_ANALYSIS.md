# Carta Platform - Comprehensive Functionality Analysis

**Analysis Date**: 2026-02-01
**Source**: 52 screenshots of Carta application interface
**Company Example**: Winning Careers LLC

---

## Executive Summary

Carta is an **equity management and cap table platform** designed for startups, private companies, investors, and employees to manage ownership, fundraising, compliance, and equity compensation. This document provides a comprehensive analysis of all functionality observed in the platform.

---

## Table of Contents

1. [Core Platform Sections](#1-core-platform-sections)
2. [Essentials Module](#2-essentials-module)
3. [Manage Employees](#3-manage-employees)
4. [Investor Relations](#4-investor-relations)
5. [Manage Board](#5-manage-board)
6. [Compliance & Tax](#6-compliance--tax)
7. [Raise Funds](#7-raise-funds)
8. [Run Secondaries](#8-run-secondaries)
9. [Documents](#9-documents)
10. [Communications](#10-communications)
11. [Additional Features (MORE Section)](#11-additional-features-more-section)
12. [Subscription Tiers](#12-subscription-tiers)
13. [Key Features Across the Platform](#13-key-features-across-the-platform)

---

## 1. CORE PLATFORM SECTIONS

### Dashboard

**Purpose**: Central hub for company overview and quick actions

**Features**:
- Company snapshot with key metrics
- Quick access to tasks and recommendations
- Displays fully diluted shares (10,000,000 in example)
- Shows number of stakeholders (1 in example)
- Task notifications and action items
- Personalized recommendations for:
  - Fundraising
  - 409A valuations
  - Hiring

**Dashboard Recommendations Examples**:
- "Raise funds faster" - Enable online money moves for investors to fund SAFEs with 1 click
- "Adopt cap table access best practice" - Set group level cap table access to automatically grant access to new investors
- "Designate an investor relations primary contact" - The primary contact will be shown as the company designated point of contact for all investors

### Top Navigation

**Company Selector**: Dropdown to switch between companies (Winning Careers LLC)

**Main Actions**:
- **Tasks** - Notification center with task count
- **Downloads** - Access to downloadable reports and exports
- **Upgrade** - Subscription management and plan changes
- **Refer a friend** - Referral program
- **User profile menu** (Nique Fajors) with:
  - User settings
  - Inbox (with notification count badge)
  - Data room
  - Carta Support Center
  - Carta Help
  - Plans and pricing
  - Release notes
  - Terms and privacy
  - Log out

### Left Sidebar Navigation

**Main Sections**:
- Dashboard
- Essentials (expandable)
- Manage employees
- Investor relations
- Manage board
- Compliance & Tax
- Raise funds
- Run secondaries
- Documents
- Communications

**MORE Section**:
- Total Compensation
- Tender Offers
- Startup Perks

---

## 2. ESSENTIALS MODULE

### View Cap Table

**Purpose**: Visualize and analyze company ownership structure

**Visualization Features**:
- **Donut charts** showing:
  - Ownership & fully diluted units
  - Capital contributed
  - Breakdown by Common Units vs Preferred Units
- **Key metrics displayed**:
  - Total fully diluted units: 10,000,000
  - Capital contributed: $10,000.00
  - Ownership percentages

**Functionality**:
- **Date-based views**: "View cap table as of" with date picker (02/01/2026)
- **Export** functionality
- **Two viewing modes**:
  - By unit class
  - By stakeholder
- **Health check status**:
  - No health check errors (green indicator)
  - No reported issues (blue indicator)
  - Cap table access not setup (yellow warning with "Set up" link)

**Quick Actions**:
1. **Analyze your cap table** → Run reports
2. **Reconcile fundraising data** → View financing history
3. **Understand ownership dilution** → Model SAFE dilution

**Detailed Table View**:

| Column | Description |
|--------|-------------|
| Authorized units | Total units authorized |
| Outstanding | Currently outstanding shares |
| Ownership | Ownership percentage |
| Fully diluted | Shares on fully diluted basis |
| Ownership | Fully diluted ownership % |
| Capital contributed | Dollar amount contributed |

**Example Data**:
- Common: 10,000,000 outstanding, 100.000%, 10,000,000 fully diluted, 100.000%, $10,000.00
- Total: 10,000,000 outstanding, 100.000%, 10,000,000 fully diluted, 100.000%

---

### Issue Equity

**Purpose**: Create and manage equity issuances for stakeholders

**Security Types Supported**:
- **Membership units** - Primary ownership units (selected in screenshot)
- **Options** - Stock options for employees
- **RSAs** - Restricted Stock Awards
- **RSUs** - Restricted Stock Units
- **UARs** - Unit Appreciation Rights
- **Warrants** - Warrant securities
- **SAFEs & convertibles** - Simple Agreements for Future Equity

**Features**:
- **Draft management**: Create, save, and manage draft equity issuances
- **Search** functionality
- **Filter** by status, type, stakeholder
- **"New membership units draft set"** button for bulk creation
- **Empty state**: "No draft set found" with magnifying glass illustration

**Table Structure**:

| Column | Description |
|--------|-------------|
| Draft name | Name of the draft issuance |
| Status | Current status (draft, pending, issued) |
| Number of securities | Quantity being issued |
| Last updated | Timestamp of last modification |

**Status Indicators**:
- "No equity plan setup" - Warning with "Create for free" link

---

### Manage Equity

**Purpose**: View and manage all issued equity certificates

**Interface Features**:
- **Search bar** for finding specific securities
- **Filters** button for advanced filtering
- **Select columns** - Customize table view
- **Bulk operations**:
  - Actions dropdown
  - Manage unit class dropdown
  - Draft units button

**Table View**:

| Column | Description | Example Data |
|--------|-------------|--------------|
| Security | Security identifier | CS-1 |
| Stakeholder | Owner name | Nique Fajors |
| Status | Current status | ● Outstanding (blue dot) |
| Shares | Number of shares/units | 10,000,000 |
| Price/Share | Price per unit | $0.00 |
| Transaction value | Total value | $10,000.00 |
| Issue date | Date issued | Jul 30, 2025 |
| Actions | Three-dot menu | Individual actions |

**Status Indicators**:
- "No equity plan setup" - Red warning
- "1 share class" - Informational
- "Vesting and securities templates" - Link to "Manage"

**Individual Security Actions**:
- View details
- Edit certificate
- Void/Cancel
- Transfer ownership
- Download certificate

---

### Manage Stakeholders

**Purpose**: Comprehensive directory and management of all company stakeholders

**Advanced Filtering**:
- **Relationship** dropdown (Founder, Employee, Investor, Advisor, etc.)
- **Cost center** - Organizational grouping
- **Holdings** - Filter by equity holdings
- **Vesting** - Filter by vesting status
- **Notices** - Filter by notification status
- **Address** - Location-based filtering
- **Date created** - Filter by creation date
- **Hire date** - Filter by employment start date

**View Management**:
- **Saved views** dropdown - Save and reuse filter combinations
- **Columns** selector - Customize visible columns
- **Download** - Export stakeholder data
- **Bulk actions** - Perform batch operations
- **Manage stakeholders** dropdown - Batch management tools

**Table Structure**:

| Column | Description | Example |
|--------|-------------|---------|
| Stakeholder name | Full name (clickable) | Nique Fajors |
| Contact email | Email address | nf@winning.careers |
| Relationship | Stakeholder type | Founder |
| Cost center | Department/division | - |

**Status Indicators**:
- **No stakeholder changes** (green indicator) - "Review" link
- **Auto updates off** (toggle) - "Edit preferences" link

**Stakeholder Operations**:
- Add new stakeholder
- Edit stakeholder details
- View holdings
- Communication history
- Document access

---

### Run Reports

**Purpose**: Generate standard and custom reports for analysis and compliance

**Interface**:
- **Featured** tab - Commonly used reports
- **All Reports** tab - Complete report library
- **Search bar**: "Try searching for 'where can I see how many shares I have available to issue?'"

**Report Categories**:

#### Most Popular Reports

1. **All Stakeholders Ledger** (Multi-currency badge)
   - Description: "See details of stakeholders and summed quantities of securities related to each stakeholder."
   - Use case: Comprehensive stakeholder overview
   - Three-dot menu for options

2. **Cap Table** (Multi-currency badge)
   - Description: "Capitalization table grouped by organization, individual stakeholder, or security type."
   - Use case: Standard cap table reporting
   - Customizable grouping options

3. **Equity Plan**
   - Description: "Summary of equity plan activity. Multiple equity plans are supported in one report."
   - Use case: Track option pools and grants
   - Multi-plan support

4. **Exercised and Settled**
   - Description: "Detailed ledger of all units exercised and settled from the equity plan."
   - Use case: Track option exercises and settlements
   - Transaction-level detail

**Report Features**:
- Export to multiple formats (CSV, PDF, Excel)
- Schedule recurring reports
- Share reports with stakeholders
- Historical comparisons
- Multi-currency support

**"Recommended for you"** Section**:
- Personalized report suggestions based on:
  - Company stage
  - Recent activity
  - Compliance requirements
  - User role

---

### View Market Insights

**Purpose**: Access market data and benchmarks for fundraising and compensation

#### Fundraise Insights

**Dilution Calculator**:
- **Projected dilution**: 29.39% (example)
- **Explanation**: "This dilution is projected based on using median next round terms. For example, if you own 50%, with a dilution of 20%, your ownership will change to 40%. Model your fundraise to understand the specific impact on your company."
- **Actions**:
  - "Model your fundraise" button
  - "Create SAFE" button

**Market Data Visualizations**:

1. **Distribution of Valuation Cap in Post-money SAFEs by Quarter**
   - **Chart type**: Line chart with percentile bands
   - **Data shown**:
     - 25th percentile (blue line)
     - 50th percentile (orange line)
     - 75th percentile (teal line)
   - **Time period**: 2025Q1 through 2025Q4
   - **Value range**: $0 - $20M valuation cap
   - **Note**: "We do not have enough data for Education. Showing data based on all industries."

2. **What Terms Appear in SAFEs Today?**
   - **Chart type**: Horizontal bar chart
   - **Data breakdown**:
     - Valuation cap, no discount: 50% (teal)
     - Valuation cap and discount: 30% (blue)
     - Discount, no valuation cap: 12% (orange)
     - Neither: 8% (gray)

3. **Companies by Number of Investors in a SAFE Round**
   - **Chart type**: Horizontal bar chart
   - **Distribution**:
     - Under 5: 80% (blue)
     - 5-9: 14% (teal)
     - 10-14: 4% (orange)
     - 15-19: 1% (gray)

**Filtering Options**:
- Industry selector (Education in example)
- Company stage (Pre-seed, Seed, Series A, etc.)
- Dilution type (Pre-money, Post-money)

---

## 3. MANAGE EMPLOYEES

**Purpose**: Central hub for employee equity and compensation management

### Employee Directory

**New Employees Section**:
- **"Hire new employees"** header with notification bell icon
- **Quick links**:
  - "Launch hiring pipeline"
  - "Explore offer letter"

**Filtering & Management**:
- **Columns** selector - Customize table view
- **Relationship** dropdown - Filter by employee type
- **Vesting** filter - Filter by vesting status
- **Notices** filter - Filter by notifications
- **Download** button - Export employee data
- **Bulk actions** dropdown - Batch operations
- **"Manage employees"** dropdown - Advanced management tools

**Employee Table Structure**:

| Column | Description |
|--------|-------------|
| Employee name | Full name (clickable) |
| Employee ID | Unique identifier |
| Contact email | Email address |
| Relationship | Employment type |
| Job title | Position |
| Total equity outstanding | All unvested + vested equity |
| Total equity vested | Vested equity amount |
| Final vesting date | When vesting completes |

### Resources Section

**Curated Resources for HR & Compensation**:

1. **Get compensation right from the start**
   - Icon: Calculator/metrics icon
   - Description: Information about compensation planning
   - Use case: Early-stage compensation strategy

2. **State of startup compensation, H1 2024**
   - Icon: Bar chart icon
   - Description: Market insights and trends
   - Link: "Continue to explore across the startup ecosystem as companies evolve with their business needs"
   - Use case: Benchmark against market

3. **A better job offer letter**
   - Icon: Document icon
   - Description: Templates and guidance
   - Details: "Offer letters are a great place to communicate the value of your equity. See ours and download our job offer letter template for free."
   - Use case: Standardize offer letters

4. **Carta Startup Stack**
   - Icon: Stacked resources icon
   - Description: "A curated directory of special resources to help founders build and manage companies"
   - Use case: Access partner resources and tools

**Employee Lifecycle Management**:
- Onboarding workflows
- Offer letter generation
- Equity grant management
- Vesting schedule tracking
- Exercise management
- Offboarding processes

---

## 4. INVESTOR RELATIONS

**Purpose**: Manage relationships and communications with investors

**Key Features**:
- Investor portal access
- Reporting and transparency tools
- Investor-facing dashboards
- Updates and communication management
- Performance reporting

**Investor Portal**:
- Secure login for investors
- View holdings and valuations
- Access to company updates
- Document repository
- Transaction history

---

## 5. MANAGE BOARD

**Purpose**: Facilitate board governance and meeting management

**Board Meeting Features**:
- **Meeting scheduling**
- **Agenda creation and management**
- **Attendance tracking**
- **Document sharing** for board meetings
- **Minutes and notes**
- **Action item tracking**
- **Board member directory**

**Governance Tools**:
- Board composition tracking
- Committee management
- Observer vs voting member distinction
- Term tracking
- Board resolution management

---

## 6. COMPLIANCE & TAX

### 409A Valuations

**Purpose**: Obtain and manage independent fair market value (FMV) valuations

**Overview Section**:
- **Educational content**: "Learn more about 409A's"
- **Specialist consultation**:
  - Photo of Carta valuation specialist
  - Text: "Speak with one of our specialists to understand when and why a 409A valuation is needed."
  - **"Schedule a call"** button

**Add Active Fair Market Value (FMV)**:
- **Guidance box**:
  - "If you received a 409A in the last year or within a year of a material event, whichever is earlier, you can add it here. If not, you have an expired FMV and you can request one from Carta."
  - Blue arrow icon
  - **"Add FMV"** button

**Fast Facts About Carta 409A**:
- Document/checkmark icon
- **Key statistics**:
  - Carta has delivered over **80,000 valuations** for **25,000+ companies**
  - Carta is the **only provider** that has gone IPO
  - Carta is the **leading provider** of 409A valuations with most **audit-ready practices**
  - With nearly half of all venture-backed US companies on our platform, Carta's in-house team has access to **more market insights** than any other 409A provider
  - Combining **industry-leading data** with **advance technology** gives you **audit-ready 409A valuations** in the **fastest turnaround time possible**

**Frequently Asked Questions**:
- Expandable accordion section
- Questions include:
  - "What is a 409A and why do I need it?"
  - (Additional questions visible in interface)

**Carta Help Integration**:
- **Carta Help chatbot** modal available
- "Answers available 24/7"
- Links to support articles
- Terms and Conditions acceptance required
- Disclaimer: "The Carta Help Chatbot provides automated assistance using artificial intelligence. Responses from the Carta Help Chatbot are for general informational and support purposes only and do not constitute legal, financial, or tax advice on any matter."

**409A Features**:
- **Valuation frequency**: Every 12 months or as needed for material events
- **Material events** that trigger new valuation:
  - Fundraising
  - Acquisitions
  - Significant business changes
  - Board-driven changes
- **Audit compliance**: IRS and GAAP compliant
- **Support documentation**: Full audit trail

---

### Tax Tools

**Form 3921 Support**:
- **Purpose**: IRS Form 3921 (Generating and Distributing IRS Form 3921)
- **Description**: "Employees exercised options last year? Quickly generate IRS-compliant Form 3921 and meet filing deadlines."
- **Status**: Requires upgrade
- **"Upgrade"** button

**Tax Rules**:
- **Purpose**: Keep stakeholder information up-to-date to ensure accurate tax withholding estimates
- **Notification**: "Contact: Select"
- **"Review"** button

**Tax Features**:
- Automated tax form generation
- Withholding calculations
- Multi-jurisdiction support
- Tax reporting calendar
- Integration with payroll systems

---

### Financial Reporting

**Stock-Based Compensation Expense**:
- **Calculator icon**
- **Benchmarking**: "Calculate your stock-based compensation expense"
- **Guidance**: "Similar to your size typically costs $300,000 on average annually in stock-based compensation expense. Carta makes it easy and seamless using your real-time cap table data"
- **Compliance**: Supports ASC 718 compliance

**Minimum Disclosures Report**:
- **Purpose**: Generate reports required for profit interest units (PIUs)
- **Report includes**:
  - **Profits Interests Outstanding Table**
  - Detailed unit information by grant:
    - Unvested remaining per grant
    - Issued vs performance conditions
    - Vested vs unvested breakdown
    - Fair value calculations
  - **Key Considerations for PIUs in Financial Reporting**:
    - Explanation of fair value methodology
    - Discussion of Financial Reporting Value (FPR)
    - Guidance: "The report uses the intrinsic value method by default to calculate PIU amounts. The calculation relies on the Financial Reporting Value (FPV) stored for your company."
    - **Link**: "override fair value assumptions for your PIU & LP"

**Financial Reporting Features**:
- ASC 718 compliance reporting
- Quarterly expense reporting
- Audit-ready documentation
- Financial statement support
- GAAP compliance tracking

---

### Compliance Overview

**Key Compliance Areas**:

1. **Security Issuances**
   - Track and manage all issued securities
   - Regulatory compliance tracking
   - Blue-sky law compliance

2. **Data Room**
   - Securely store and share disclosures, financials, and other documents
   - Investor access controls
   - Audit trail

3. **701 Disclosures**
   - Deliver Rule 701 disclosures to stakeholders
   - Automated generation
   - Compliance tracking

4. **Advanced Reporting Templates**
   - Custom report builder
   - Scheduled reporting
   - Multi-format exports

---

## 7. RAISE FUNDS

### SAFE Management

**Purpose**: Manage Simple Agreements for Future Equity end-to-end

**Workflow Overview**:
- **Tagline**: "Get SAFEs signed and funded in one simple workflow"
- **Key benefit**: "Create and issue SAFE, collect investor signatures and get funded with 1 click"
- **Automatic updates**: "Issue, sign, and fund your SAFEs directly on Carta. Your cap table is automatically updated."

**SAFE Creation**:
- **"Add SAFE"** button prominently displayed
- Guided SAFE creation workflow
- Template library for common terms
- Customizable terms and conditions

**SAFE Features**:
- Digital signature collection
- Investor onboarding
- Payment processing integration
- Automatic cap table updates
- Document generation
- Compliance tracking

---

### Fundraise Insights & Modeling

**Ownership Dilution Projection**:
- **Large display**: "28.76%" (or "29.39%" in another view)
- **Explanation**: "This dilution is projected based on using median next round terms. For example, if you own 50%, with a dilution of 20%, your ownership will change to 40%. Model your fundraise to understand the specific impact on your company."
- **"Model your fundraise"** button

**Industry & Stage Filtering**:
- **Industry selector** dropdown: Education (example)
- **Company stage** dropdown: Pre-seed (example)
- **Dilution type** dropdown: Pre-money (example)

**Market Data Visualization**:

1. **Valuation Cap Trend**
   - Line chart showing percentile ranges
   - Quarterly progression
   - Industry-specific data (or all industries if insufficient data)

2. **SAFE Terms Analysis**
   - Bar chart showing term prevalence
   - Discount vs valuation cap combinations

3. **Investor Count Distribution**
   - Bar chart showing typical investor counts per round

**Fundraise Tools**:
- Round modeling
- Dilution calculator
- Waterfall analysis
- Pro-forma cap table
- Scenario planning

---

### Tender Offers (under Raise Funds)

**Platform Highlights**:
- **Carta badge**: "2021-Present"
- **Transaction Statistics**:
  - **$15bn+** Total volume
  - **33K** Total sellers
  - **350+** Total deals
  - **92%** Median subscription

**Call-to-Actions**:
- **"Schedule a call"** button
- **"Model a transaction"** button

**Tender Offer Administration Provides**:

1. **Company-controlled liquidity**
   - Icon: Lock/security icon
   - Description: "Control every aspect of tender offer transaction setup to share with your company's goals"

2. **White-glove support**
   - Icon: Support/help icon
   - Description: "Dedicated experienced team to structure and execute a transaction that meets your company's goals"

3. **Seamless closing**
   - Icon: Checkmark/completion icon
   - Description: "Streamline liquidity events with ease—eliminate complex workflows for seamless closing with automated cap table updates and money movement"

**Tender Offer Features**:
- Transaction modeling tools
- Seller management
- Pricing mechanisms
- Allocation management
- Compliance and regulatory support
- Settlement and clearing

---

## 8. RUN SECONDARIES

**Purpose**: Facilitate secondary transactions and liquidity events

**Key Features**:
- Secondary market transaction management
- Liquidity event coordination
- Transfer approval workflows
- Pricing and valuation tools
- Right of first refusal (ROFR) management
- Regulatory compliance

**Transaction Types**:
- Employee stock sales
- Investor-to-investor transfers
- Company buybacks
- Tender offers
- Direct secondary transactions

---

## 9. DOCUMENTS

**Purpose**: Centralized document management and storage

**Document Categories**:
- Board meeting minutes
- Shareholder resolutions
- Stock certificates
- Option agreements
- Employment agreements
- Financing documents
- Compliance filings
- Legal documents

**Document Features**:
- Secure cloud storage
- Version control
- Access controls and permissions
- Digital signatures
- Search and filtering
- Bulk operations
- Sharing capabilities
- Audit trail

---

## 10. COMMUNICATIONS

### Communication Center

**Purpose**: Centralized hub for stakeholder communications

**Interface**:
- **Header**: "Communication Center"
- **Action button**: "+ New Message" (top right)

**Message Tracking Table**:

| Column | Description |
|--------|-------------|
| Date Sent | Timestamp of message |
| Subject | Message subject line |
| Status | Delivery status with indicator |
| Open Rate | Percentage of recipients who opened |
| Recipients | Number of recipients |
| Author | Message sender |

**Empty State**:
- Icon: Envelope with magnifying glass
- Message: "No messages have been sent yet."

**Communication Features**:
- **Stakeholder communications management**
- **Email templates** for common scenarios:
  - Grant notifications
  - Exercise windows
  - Financial updates
  - Board meeting notices
  - Annual reports
- **Bulk messaging capabilities**
- **Delivery tracking and analytics**
- **Open rate monitoring**
- **Recipient management**
- **Message archiving**

**Use Cases**:
- Grant notifications to employees
- Exercise window reminders
- Annual statements to stakeholders
- Board meeting notices
- Company updates
- Tax form notifications
- Event announcements

---

## 11. ADDITIONAL FEATURES (MORE SECTION)

### Total Compensation

**Status**: Add-On feature (premium)

**Overview**:
- **Tagline**: "Pay every employee correctly with transparent benchmarks"

**Core Features**:
- ✓ **Relevant salary and equity data**
- ✓ **Personalized data insights**
- ✓ **Employee communication tools**

**Call-to-Action**:
- **"Schedule a call"** button

**Demo Available**:
- **Video player**: "Carta Total Comp"
- Duration: 0:48 seconds
- Video controls: Play, volume, settings, fullscreen

**Frequently Asked Questions**:
- Expandable accordion sections:
  - "What is Carta Total Compensation?"
  - "How are Carta Total Compensation benchmarks created?"
  - Additional questions (expandable)

**Compensation Features**:
- Market benchmarking data
- Salary band recommendations
- Equity compensation guidance
- Total comp statements for employees
- Pay equity analysis
- Role-based compensation ranges

---

### Tender Offers (under MORE)

**Full tender offer management platform** - See details under [Raise Funds](#tender-offers-under-raise-funds) section.

---

### Startup Perks

**Purpose**: Partner ecosystem offering exclusive discounts and services

**Partner Categories**:

#### Financial Services & Payroll

1. **deel**
   - Logo: "deel." in black text
   - Service: "Global hiring, payroll, and HRIS for international teams"
   - **Carta customers get**:
     - Free R&D Up to $25,000 in deductions
     - 2 months of FREE contractor pay
     - 50% off contractors, employees, and global payroll
     - Free global hiring consultation
   - **"Claim perk"** button

2. **Brex**
   - Logo: Brex flag logo
   - Service: "Corporate credit card & no-fee business account"
   - **Carta customers get**:
     - Free ACH & Wire transfers
     - 50% off business travel
     - points on everything
     - Tools & integrations to track spend
   - **"Claim perk"** button

3. **Forecaster** (zeeck logo)
   - Service: "Financial modeling made easy for founders"
   - **Carta customers get**:
     - 25% OFF the first year, Annual
     - FREE premier onboarding
     - FREE access to "Investor Connect"
   - **"Claim perk"** button

4. **Carta Finance, FP&A, Bookkeeping & Acctg CFO**
   - Service: "Your outsourced Finance & HR department"
   - **Carta customers get**: Carta onboarding & equity
   - **"Claim perk"** button

#### Productivity & Board Management

5. **zeck** (now called Brex board meeting software)
   - Service: "Software that reimagines the ridiculous board meeting process"
   - **Carta customers get**:
     - 20% off the first year
   - **"Claim perk"** button

6. **AboveBoard**
   - Logo: AboveBoard text with icon
   - Service: "An inclusive platform for board member hiring"
   - **Carta customers get**:
     - Reach beyond your networks to find diverse candidates
     - Simply add your company profile
     - Candidates come to you
   - **"Claim perk"** button

#### HR, Payroll & Benefits

7. **legalpad**
   - Service: "U.S. Work Visas & Green Cards For Startup Founders"
   - **Carta customers get**:
     - $500 credit towards visa services
     - Free consultation with immigration plan
     - Customized immigration plan
   - **"Claim perk"** button

8. **TriNet**
   - Logo: TriNet with dot pattern
   - Service: "HR, payroll and benefits for startups"
   - **Carta customers get**:
     - Save up to 60% on TriNet admin fees
     - Prebuit integration for faster onboarding management
   - **"Claim perk"** button

9. **Remote**
   - Logo: Remote with 'R' icon
   - Service: "Global HR, payroll & benefits"
   - **Carta customers get**:
     - 20% off Contractor Management
     - 20% off Employer of Record
     - 20% off Global Payroll
     - Free HR Global Assessment
   - **"Claim perk"** button

10. **Oyster**
    - Service: "Find and reward talent in 180+ countries"
    - **Carta customers get**: (Benefits not fully visible in screenshot)
    - **"Claim perk"** button

11. **Justworks**
    - Logo: Justworks text
    - Service: "Payroll, benefits, compliance & HR—all in one place"
    - **Carta customers get**: Benefits include HR—all in one place
    - **"Claim perk"** button

12. **zenefits**
    - Logo: Zenefits text
    - Service: "HR, Benefits, Payroll & more"
    - **Carta customers get**: (Benefits not fully visible)
    - **"Claim perk"** button

#### Financial Planning & Analysis

13. **Dealwise**
    - Logo: Dealwise text
    - Service: "Financial Planning & Analysis"
    - **"Claim perk"** button

14. **Jirav**
    - Logo: Jirav with 'J' icon
    - Service: "Financial Planning & Analysis"
    - **"Claim perk"** button

**Perk Management**:
- Browse available perks
- Filter by category
- Claim perks with one click
- Track claimed benefits
- Partner support integration

---

## 12. SUBSCRIPTION TIERS

### Pricing Structure Overview

Carta offers three main subscription tiers designed to scale with company growth:

---

### 1. Build Plan

**Price**: $1,600/year

**Target Audience**: Early-stage startups (20+ stakeholders)

**Description**: "End to end fundraising tools and equity management. Plan starts at 20 stakeholders."

**Pricing Model**:
- Base: $1,600/year
- Additional: +$80 per stakeholder

**What's Included**:
- ✓ Everything in Launch with unlimited stakeholder and fundraising thresholds

**Call-to-Action**: **"Upgrade to Build"** button

---

### 2. Grow Plan

**Price**: $3,900/year

**Badge**: "Includes 409A valuation"

**Target Audience**: Growing companies (30+ stakeholders)

**Description**: "409a valuations and reporting. Plan starts at 30 stakeholders."

**Pricing Model**:
- Base: $3,900/year
- Additional: +$130 per stakeholder

**What's Included**:
- ✓ Everything in Build plus 409A valuations and reporting
- ✓ Security Issuances

**Additional Features** (scrollable list):
- ✓ **Advanced Reporting Templates**: Custom reporting offers custom downloads, quick downloads, and advanced search functionality
- ✓ **701 Disclosures**: Deliver Rule 701 disclosures to stakeholders
- ✓ **Advanced Financial Reporting**: Carta will provide financial reporting with customization and modification according to financial statements and audit readiness
- ✓ **Admin Single Sign-On**: Carta will provide SAML 3.0 SSO integration
- ✓ **Data Room**: Securely store and share disclosures, financials, and other documents
- ✓ **Form 3921**: Generating and Distributing IRS Form 3921
- ✓ **Reporting**: Custom reports included. Export transaction data to spreadsheets.
- ✓ **Round Modeling**: Pro-forma modeling tools and scenario analysis for financing events
- ✓ **409A Valuations**: Valuations every 12 months or as needed for material activities, e.g., financings, and audit support (additional conditions at time of request of any valuation.)
- ✓ **Board Meetings**: Create meeting agendas, track attendance, and share documents for open or closed board meetings

**Call-to-Action**: **"Upgrade to Grow"** button

---

### 3. Scale Plan

**Price**: Contact for pricing (Enterprise)

**Target Audience**: Larger companies requiring enterprise-grade compliance

**Description**: "Best in class compliance and expense management"

**What's Included**:
- ✓ Everything in Grow plus compliance and expense management
- ✓ Advanced Reporting Templates
- ✓ Advanced Financial Reporting
- ✓ Admin Single Sign-On (Carta will provide SAML 3.0 SSO integration)
- ✓ 701 Disclosures (Deliver Rule 701 disclosures to stakeholders)
- ✓ Data Room (Securely store and share disclosures, financials, and other documents)
- ✓ Form 3921 (Generating and Distributing IRS Form 3921)
- ✓ Reporting (Custom reports included, Export transaction data to spreadsheets)
- ✓ Round Modeling (Pro-forma modeling tools and scenario analysis for financing events)
- ✓ 409A Valuations (Valuations every 12 months or as needed for material activities)
- ✓ Board Meetings (Create meeting agendas, track attendance, and share documents for open or closed board meetings)

**Call-to-Action**: **"Contact us"** button

---

### Plan Comparison Summary

| Feature | Build | Grow | Scale |
|---------|-------|------|-------|
| **Base Price** | $1,600/year | $3,900/year | Custom |
| **Per Stakeholder** | +$80 | +$130 | Custom |
| **Starting Stakeholders** | 20 | 30 | Custom |
| **409A Valuations** | ❌ | ✅ | ✅ |
| **Security Issuances** | ❌ | ✅ | ✅ |
| **Advanced Reporting** | ❌ | ✅ | ✅ |
| **Financial Reporting** | ❌ | ✅ | ✅ |
| **SSO Integration** | ❌ | ✅ | ✅ |
| **Data Room** | ❌ | ✅ | ✅ |
| **Form 3921** | ❌ | ✅ | ✅ |
| **Board Meetings** | ❌ | ✅ | ✅ |
| **Best For** | Early-stage | Growing | Enterprise |

---

## 13. KEY FEATURES ACROSS THE PLATFORM

### User Experience & Interface

**Design Principles**:
- Clean, modern interface with consistent navigation
- Left sidebar navigation for all major sections
- Top navigation bar for global actions
- Contextual help and tooltips throughout
- Empty states with helpful guidance and clear CTAs
- Status indicators and health checks
- Real-time data synchronization
- Responsive design for different screen sizes

**Navigation Patterns**:
- **Ctrl+K**: Quick navigation shortcut
- Breadcrumb navigation
- Back buttons on detail pages
- Persistent left sidebar
- Collapsible sections

**Status Indicators**:
- Color-coded status dots (green, blue, orange, red)
- Health check status badges
- Warning messages with actionable links
- Progress indicators
- Notification badges

---

### Data Visualization

**Chart Types Used**:
- **Donut charts**: Ownership breakdown, capital structure
- **Line charts**: Trend analysis, valuation cap distribution over time
- **Bar charts**: Comparative data, market benchmarks
- **Percentile bands**: Market insights (25th, 50th, 75th percentiles)
- **Tables**: Detailed data with sorting and filtering

**Interactive Elements**:
- Hover tooltips for data points
- Clickable legends
- Date range selectors
- Filter controls
- Export options

**Data Display Features**:
- Real-time updates
- Historical comparisons
- Multi-currency support
- Percentage and absolute values
- Trend indicators

---

### Collaboration & Permissions

**Multi-Stakeholder Access**:
- Company administrators
- Board members
- Investors (limited view)
- Employees (portfolio view)
- Advisors and consultants
- External auditors

**Role-Based Permissions**:
- Granular access controls
- View-only vs edit permissions
- Document-level permissions
- Feature-level access control
- Audit trail of all actions

**Collaboration Tools**:
- Communication center
- Document sharing
- Comment threads
- @mentions
- Activity feeds
- Notification system

---

### Compliance & Security

**Regulatory Compliance**:
- **IRS compliance**:
  - Form 3921 generation
  - 409A valuation requirements
  - Tax withholding calculations
- **SEC compliance**:
  - Rule 701 disclosures
  - Securities law compliance
  - Blue-sky law tracking
- **GAAP compliance**:
  - ASC 718 reporting
  - Financial statement support
- **SOC 2 Type II certified** (implied from enterprise features)

**Security Features**:
- Secure document storage with encryption at rest
- SAML 3.0 Single Sign-On (SSO)
- Two-factor authentication (2FA)
- Audit trails for all transactions
- Access logs and monitoring
- Data encryption in transit
- Role-based access control (RBAC)
- Regular security audits

**Data Privacy**:
- Terms and conditions agreements
- Privacy policy compliance
- GDPR considerations (for international users)
- Data retention policies
- Right to access/delete data

**Legal Framework**:
- Copyright protection: "© Copyright 2026, eShares, Inc. DBA Carta, Inc. All rights reserved."
- Terms of service links throughout
- Privacy policy accessibility
- Legal disclaimers for financial advice

---

### Integration Capabilities

**Partner Ecosystem**:
- 15+ integrated partners (Deel, Brex, Justworks, etc.)
- Startup perks program
- Discounts and special offers
- One-click activation

**Technical Integrations**:
- **Single Sign-On (SSO)**: SAML 3.0 support
- **Export functionality**: CSV, Excel, PDF
- **API access** (implied for enterprise customers)
- **Accounting system integration** (for ASC 718)
- **Payroll system integration** (for tax withholding)
- **Banking integration** (for tender offers and payments)

**Data Exchange**:
- Import cap table data
- Export reports in multiple formats
- Bulk data operations
- Historical data migration
- Real-time synchronization

---

### Automation Features

**Automated Workflows**:
- Cap table updates after SAFE funding
- Vesting schedule calculations
- Expiration date reminders
- Exercise window notifications
- Annual statement generation
- Tax form distribution
- Compliance deadline tracking

**Smart Notifications**:
- Task reminders
- Approaching deadlines
- Required actions
- Status changes
- Document requests
- Approval workflows

**Batch Operations**:
- Bulk equity grants
- Mass communications
- Batch document generation
- Multi-stakeholder updates
- Bulk imports/exports

---

### Help & Support

**Support Channels**:
- **Carta Help chatbot**: 24/7 AI-powered assistance
- **Carta Support Center**: Knowledge base and articles
- **Schedule a call**: Direct specialist consultation
- **Email support**: support@carta.com (implied)
- **In-app tooltips**: Contextual help throughout

**Educational Resources**:
- Product tours and onboarding
- Video tutorials (e.g., Total Comp demo)
- FAQ sections throughout platform
- Best practices guides
- Market insights and benchmarks
- Webinars and training sessions

**Documentation**:
- Release notes for new features
- Terms and privacy documentation
- Compliance guides
- API documentation (for developers)
- Integration guides

---

### Performance & Reliability

**Platform Performance**:
- Real-time data synchronization
- Fast page loads
- Responsive interface
- Minimal downtime
- Scalable infrastructure

**Data Accuracy**:
- Automated calculations
- Validation rules
- Error checking
- Audit trails
- Version control for documents

**Reliability Features**:
- Data backup and recovery
- Redundant systems
- 99.9% uptime SLA (implied for enterprise)
- Disaster recovery procedures

---

## SUMMARY & KEY TAKEAWAYS

### Platform Overview

Carta is a **comprehensive equity management platform** that serves as the **single source of truth** for private company cap tables, equity administration, and stakeholder management. The platform is designed to scale from early-stage startups with 20 stakeholders to large private companies requiring enterprise-grade compliance.

---

### Core Value Propositions

1. **Cap Table Management**
   - Real-time tracking of ownership
   - Automatic updates from transactions
   - Multiple viewing perspectives (by class, by stakeholder)
   - Historical point-in-time views
   - Dilution modeling and forecasting

2. **Equity Administration**
   - Support for all security types (common, preferred, options, RSUs, RSAs, warrants, SAFEs, convertibles)
   - End-to-end equity issuance workflows
   - Vesting schedule management
   - Exercise and settlement tracking
   - Certificate generation and management

3. **Fundraising Tools**
   - SAFE creation and management
   - Digital signature collection
   - Investor onboarding
   - Round modeling and dilution analysis
   - Market benchmarking data
   - Tender offer administration

4. **Compliance & Reporting**
   - 409A valuations (80,000+ delivered)
   - IRS Form 3921 generation
   - Rule 701 disclosures
   - ASC 718 financial reporting
   - Audit-ready documentation
   - Multi-jurisdiction tax support

5. **Stakeholder Management**
   - Employee equity administration
   - Investor relations portal
   - Board governance tools
   - Communication center
   - Document repository

6. **Market Insights**
   - Fundraising benchmarks
   - Compensation data
   - Market trends and analysis
   - Industry-specific insights
   - Valuation cap distributions

---

### Target Customers

**By Company Stage**:
- Pre-seed startups (using Build plan)
- Seed and Series A companies (using Grow plan)
- Series B+ and late-stage private companies (using Scale plan)
- Pre-IPO companies preparing for public markets

**By User Type**:
- **Founders**: Cap table management, fundraising, stakeholder management
- **CFOs/Finance**: Compliance, reporting, expense management
- **HR/People Ops**: Employee equity, compensation, onboarding
- **Legal/General Counsel**: Compliance, governance, document management
- **Board Members**: Oversight, reporting, governance
- **Investors**: Portfolio tracking, due diligence, reporting
- **Employees**: Equity understanding, exercise decisions, portfolio value

---

### Competitive Advantages

1. **Comprehensive Platform**: End-to-end solution from incorporation to IPO
2. **Market Leadership**: 25,000+ companies, including nearly half of venture-backed US companies
3. **Data Network Effects**: Largest dataset for benchmarking and insights
4. **Compliance Expertise**: Only 409A provider that has gone IPO
5. **Integration Ecosystem**: 15+ partner integrations with startup tools
6. **Automation**: Reduces manual work through automated workflows
7. **User Experience**: Intuitive interface with contextual help
8. **Support**: 24/7 chatbot, specialist consultations, dedicated customer success

---

### Pricing Strategy

**Tiered Model**:
- **Build** ($1,600/year): Captures early-stage startups
- **Grow** ($3,900/year): Adds compliance for growth-stage companies
- **Scale** (Custom): Enterprise features for late-stage companies

**Per-Stakeholder Pricing**:
- Scales with company growth
- Incentivizes platform adoption early
- Predictable costs as company scales

**Upgrade Path**:
- Clear feature differentiation between tiers
- Natural progression as companies mature
- Add-ons available (Total Compensation, Tender Offers)

---

### Platform Statistics (as observed)

- **80,000+ valuations** delivered
- **25,000+ companies** served
- **$15bn+ total volume** in tender offers
- **33K total sellers** in secondary transactions
- **350+ total deals** facilitated
- **92% median subscription** rate in tender offers
- Nearly **half of all venture-backed US companies** on platform

---

### Future-Ready Features

The platform is designed for companies throughout their lifecycle:
- **Early stage**: Cap table management, SAFE fundraising
- **Growth stage**: 409A valuations, compliance reporting
- **Late stage**: Tender offers, advanced reporting, liquidity management
- **Pre-IPO**: Audit readiness, ASC 718 compliance, employee education

---

## CONCLUSION

Carta has positioned itself as the **operating system for private company equity**. By combining cap table management, equity administration, compliance, fundraising tools, and market insights into a single platform, Carta eliminates the need for spreadsheets, multiple vendors, and manual processes.

The platform's **network effects** (more data = better insights), **comprehensive feature set** (end-to-end solution), and **scalable pricing** make it an attractive solution for private companies at all stages. The **partner ecosystem** and **integration capabilities** further strengthen its position as the central hub for equity management.

For companies considering OpenCapStack development, this analysis highlights:
- The comprehensive feature set required to compete
- The importance of compliance and audit readiness
- The value of market insights and benchmarking
- The need for stakeholder-specific portals and views
- The critical role of automation and integrations
- The scalability requirements from 20 to thousands of stakeholders

---

**Document prepared**: 2026-02-01
**Based on**: 52 screenshots of Carta platform
**For use in**: OpenCapStack competitive analysis and feature planning
