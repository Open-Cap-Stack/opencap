---
title: "How to Create a Cap Table From Scratch (Step-by-Step with Free Template)"
slug: how-to-create-a-cap-table
meta_title: "How to Create a Cap Table From Scratch | Step-by-Step Guide"
meta_description: "Learn how to create a cap table from scratch with our step-by-step guide. Includes a free cap table template, real examples, and common mistakes to avoid."
category: guides
published: 2026-07-02
updated: 2026-07-02
keywords:
  - how to create a cap table
  - cap table template
  - cap table spreadsheet
  - make a cap table
  - cap table example
author: OpenCap Stack Team
---

# How to Create a Cap Table From Scratch (Step-by-Step with Free Template)

You just incorporated your startup. Your co-founder is asking about equity splits. Your lawyer wants to know how many shares to authorize. And somewhere in the back of your mind, you know you need a cap table — but you have never actually built one.

Good news: creating a cap table is not as complicated as it seems. If you can fill out a spreadsheet, you can build a cap table. The trick is getting the structure right from the beginning so it scales as you raise money, hire employees, and issue stock options.

This guide walks you through every step of creating a cap table from scratch, with real numbers and a template you can use today. If you need a refresher on cap table basics first, check out our guide on [what a cap table is and why it matters](/blog/what-is-a-cap-table).

---

## What Is a Cap Table (Quick Recap)

A **cap table** (capitalization table) is the definitive record of who owns equity in your company. It tracks every shareholder, the type and number of shares they hold, and their ownership percentage. Every time you issue shares, grant options, raise a round, or convert a SAFE, the cap table updates to reflect the new ownership structure.

At its core, a cap table answers one question: **who owns what?**

Early on, a cap table might be a simple two-row spreadsheet. By Series A, it needs to track multiple share classes, an option pool, vesting schedules, convertible instruments, and fully diluted ownership. Getting the foundation right now saves you from painful rewrites later.

---

## What to Include in Your Cap Table

Before you start building, you need to know what goes into a well-structured cap table. Here are the essential components.

### Founders and common shares

Every cap table starts with the founders. You will record each founder's name, the number of common shares they hold, and their vesting schedule. Most startups issue common stock to founders at par value (typically $0.0001 per share) at the time of incorporation.

### Share classes

Your company will have at least one share class (Common Stock) from day one. As you raise priced rounds, you will add preferred share classes (Series Seed Preferred, Series A Preferred, etc.). Each class has different rights — liquidation preferences, anti-dilution protections, voting rights — and your cap table needs to track them separately.

### Employee stock option pool (ESOP)

The option pool is a block of shares reserved for future employees, advisors, and contractors. Startups typically set aside 10% to 20% of total authorized shares. The pool is listed on the cap table as "reserved" shares, and individual grants are tracked as they are issued.

### SAFEs and convertible notes

If you raise pre-seed or seed money using [SAFEs](https://www.ycombinator.com/documents) (Simple Agreements for Future Equity) or convertible notes, these need to appear on your cap table even before they convert into shares. They represent future dilution, and ignoring them gives you a dangerously inaccurate picture of ownership. Learn more about how this impacts you in our [dilution guide](/blog/startup-dilution-explained).

### Warrants

Less common at the earliest stages, but warrants (the right to purchase shares at a set price) sometimes appear in venture debt or strategic partnership agreements. Include them if applicable.

---

## How to Create a Cap Table: Step-by-Step Guide

Here is the complete process, from incorporation through your first outside investment. Follow these steps in order — each one builds on the last.

### Step 1: Incorporate your company and authorize shares

Everything starts with incorporation. When you file your Certificate of Incorporation (typically in Delaware), you will specify the number of **authorized shares** — this is the maximum number of shares the company can issue without a board vote to increase the authorization.

A common setup for an early-stage startup:

- **10,000,000 authorized shares of Common Stock** at $0.0001 par value
- Some founders authorize 15,000,000 or 20,000,000 to leave room for the option pool without needing a charter amendment later

At this point, your cap table looks like this:

| Category | Shares |
|---|---|
| Authorized Common Stock | 10,000,000 |
| Issued Shares | 0 |
| Available for Issuance | 10,000,000 |

**Tip:** Authorize more shares than you plan to issue immediately. It costs nothing and avoids the hassle (and legal fees) of amending your charter later when you need to create an option pool or issue investor shares.

### Step 2: Issue founder shares

Next, the board (which at this point is just the founders) approves the issuance of shares to each founder. You will need a **Board Consent** and a **Stock Purchase Agreement** for each founder.

Here is a typical two-founder split:

| Shareholder | Share Class | Shares Issued | Price Per Share | Ownership % |
|---|---|---|---|---|
| Alice Chen (CEO) | Common | 4,500,000 | $0.0001 | 56.25% |
| Bob Martinez (CTO) | Common | 3,500,000 | $0.0001 | 43.75% |
| **Total Issued** | | **8,000,000** | | **100%** |

**Key decisions at this stage:**

- **The split.** There is no universal rule. 50/50 is common, but many successful startups use unequal splits based on the idea originator, time commitment, or capital contribution. Whatever you choose, document it clearly and agree on it before issuing shares.
- **Vesting schedule.** Even though founders are buying shares on day one, those shares should vest over time (typically four years with a one-year cliff). If a co-founder leaves after six months, vesting ensures they do not walk away with half the company. The company retains a repurchase right on unvested shares.
- **83(b) election.** When shares are subject to vesting, founders should file an [83(b) election](https://www.irs.gov/businesses/small-businesses-self-employed/election-under-irc-section-83b) with the IRS within 30 days of the stock purchase. This election lets you pay taxes on the shares at their current (very low) value rather than at their future (hopefully much higher) value as they vest.

### Step 3: Create the employee stock option pool

Before you make your first hire, set aside shares for the option pool. This ensures you can offer equity compensation without needing a new board vote for every single grant.

A typical early-stage option pool is 10% to 15% of authorized shares:

| Shareholder | Share Class | Shares | Ownership % |
|---|---|---|---|
| Alice Chen (CEO) | Common | 4,500,000 | 45.0% |
| Bob Martinez (CTO) | Common | 3,500,000 | 35.0% |
| ESOP (unallocated) | Common (reserved) | 2,000,000 | 20.0% |
| **Total (fully diluted)** | | **10,000,000** | **100%** |

Notice that the founders' ownership percentages dropped. Alice went from 56.25% to 45%, and Bob went from 43.75% to 35%. That is because the option pool dilutes existing shareholders proportionally. This is normal and expected — the pool is how you attract the team that will make those shares worth something.

**What you will need:**

- A **Stock Option Plan** (also called an Equity Incentive Plan) approved by the board and shareholders
- A **409A valuation** before you start granting options (this determines the exercise price for tax purposes)

### Step 4: Record any SAFEs or convertible notes

If you are raising a pre-seed round using SAFEs (as most startups do today), you need to record each instrument on your cap table. SAFEs do not create new shares immediately, but they represent a claim on future equity.

Let us say you raise $500,000 across two SAFEs:

| Instrument | Investor | Amount | Valuation Cap | Discount |
|---|---|---|---|---|
| SAFE 1 | Angel Investor Group | $300,000 | $6,000,000 | None |
| SAFE 2 | Startup Fund LP | $200,000 | $8,000,000 | 20% |

Your cap table should now show both the issued equity and the outstanding convertible instruments:

| Shareholder / Instrument | Type | Shares / Amount | Ownership (est.) |
|---|---|---|---|
| Alice Chen (CEO) | Common | 4,500,000 | ~40.5% |
| Bob Martinez (CTO) | Common | 3,500,000 | ~31.5% |
| ESOP (unallocated) | Common (reserved) | 2,000,000 | ~18.0% |
| Angel Investor Group | SAFE ($6M cap) | $300,000 | ~5.0% |
| Startup Fund LP | SAFE ($8M cap) | $200,000 | ~2.5% |
| **Estimated total** | | | **~97.5%*** |

*Percentages are estimated. Actual conversion depends on the terms of the next priced round. The numbers do not always sum to exactly 100% because SAFE conversion math depends on the future round price.

**Important:** Many founders skip this step and only track issued shares. This is one of the most common cap table mistakes. Those SAFEs will convert into real shares at your next priced round, and if you have not been tracking them, you will be blindsided by how much dilution actually occurred. Read more about [how startup dilution works](/blog/startup-dilution-explained).

### Step 5: Track individual option grants

As you hire employees and bring on advisors, you will grant stock options out of the ESOP. Each grant needs to be tracked individually on the cap table with the following details:

| Employee | Grant Date | Options Granted | Exercise Price | Vesting Schedule | Vested | Exercised |
|---|---|---|---|---|---|---|
| Dana Lee (Eng #1) | 2026-03-15 | 200,000 | $0.15 | 4yr / 1yr cliff | 50,000 | 0 |
| Erik Patel (Design) | 2026-06-01 | 100,000 | $0.15 | 4yr / 1yr cliff | 0 | 0 |
| Advisor – Sarah Kim | 2026-04-01 | 50,000 | $0.15 | 2yr / no cliff | 25,000 | 0 |

Update your option pool tracker:

| ESOP Detail | Shares |
|---|---|
| Total Option Pool | 2,000,000 |
| Granted (outstanding) | 350,000 |
| Exercised | 0 |
| Available for future grants | 1,650,000 |

This level of detail matters. When an employee leaves, you need to know exactly how many options vested, how many they exercised, and how many return to the pool. When an investor asks about your option pool during fundraising, you need to tell them how much is allocated versus available.

### Step 6: Model your next round (scenario planning)

Before you walk into investor meetings, model what your cap table will look like after the round. This is where most founders get tripped up — and where spreadsheets start to break down.

Let us say you are raising a $2M Seed round at a $8M pre-money valuation ($10M post-money). Here is what happens:

**The math:**
- Post-money valuation: $10,000,000
- Investor ownership: $2,000,000 / $10,000,000 = 20%
- SAFE conversions: The $300K SAFE at a $6M cap converts at the cap price; the $200K SAFE at an $8M cap converts at the cap price
- New shares issued to Seed investors and SAFE conversions

**Post-Seed Cap Table:**

| Shareholder | Share Class | Shares | Ownership % |
|---|---|---|---|
| Alice Chen (CEO) | Common | 4,500,000 | 33.0% |
| Bob Martinez (CTO) | Common | 3,500,000 | 25.7% |
| ESOP (total pool) | Common (reserved) | 2,000,000 | 14.7% |
| Angel Investor Group (SAFE converted) | Series Seed Preferred | 681,818 | 5.0% |
| Startup Fund LP (SAFE converted) | Series Seed Preferred | 340,909 | 2.5% |
| Seed Lead Investor | Series Seed Preferred | 2,613,636 | 19.2% |
| **Total (fully diluted)** | | **13,636,363** | **100%** |

Alice dropped from ~40.5% to 33.0%. Bob dropped from ~31.5% to 25.7%. That dilution is the cost of raising capital — but the company is now worth $10M instead of an estimated $6-8M, so each person's shares are worth more in dollar terms.

Running these scenarios before fundraising helps you negotiate from a position of knowledge rather than guessing.

---

## Complete Cap Table Example: Two Founders, Angel, and SAFE

Here is a consolidated cap table example you can use as a template. This represents a typical early-stage startup after incorporating, issuing founder shares, creating an option pool, and raising a small pre-seed round.

### Company: Example Corp

**Authorized Shares:** 10,000,000 Common Stock

| # | Shareholder | Type | Shares / Amount | Vesting | Ownership % (FD) |
|---|---|---|---|---|---|
| 1 | Alice Chen (CEO) | Common Stock | 4,500,000 | 4yr / 1yr cliff | 45.0% |
| 2 | Bob Martinez (CTO) | Common Stock | 3,500,000 | 4yr / 1yr cliff | 35.0% |
| 3 | ESOP – Unallocated | Common (reserved) | 1,650,000 | — | 16.5% |
| 4 | ESOP – Dana Lee | Option Grant | 200,000 | 4yr / 1yr cliff | 2.0% |
| 5 | ESOP – Erik Patel | Option Grant | 100,000 | 4yr / 1yr cliff | 1.0% |
| 6 | ESOP – Sarah Kim (Advisor) | Option Grant | 50,000 | 2yr / monthly | 0.5% |
| | **Total Issued + Reserved** | | **10,000,000** | | **100%** |
| 7 | Angel Investor Group | SAFE ($6M cap) | $300,000 | — | ~5.0%* |
| 8 | Startup Fund LP | SAFE ($8M cap) | $200,000 | — | ~2.5%* |

*Estimated ownership upon conversion at next priced round. Fully diluted percentages will shift at conversion.

This is the template most early-stage startups should follow. You can recreate it in a spreadsheet or, better yet, in cap table software that handles the conversion math and dilution modeling automatically.

---

## Common Cap Table Mistakes (and How to Avoid Them)

### Over-complicating it from day one

You do not need a 47-tab spreadsheet with scenario modeling when you have two founders and zero employees. Start simple. Track shareholders, share counts, share classes, and ownership percentages. Add complexity only as your company demands it.

### Not tracking SAFEs and convertible instruments

This is the single most dangerous mistake founders make. Your cap table might show you owning 50% of the company, but if you have $1M in outstanding SAFEs, your real ownership after conversion could be 35%. Always maintain a "fully diluted" view that includes all convertible instruments.

### Ignoring dilution math

Many first-time founders are shocked at how much ownership they give up in a seed round — especially when you factor in SAFE conversions and the option pool. Before raising, model the dilution. Understand what your ownership will look like after the round closes. Our [dilution explainer](/blog/startup-dilution-explained) walks through the math in detail.

### Skipping vesting for founders

It feels awkward to put vesting on your own shares, but it protects everyone. If your co-founder leaves after three months, vesting ensures the company can recover the unvested shares. Every investor and every startup lawyer will insist on founder vesting — so you might as well do it from the start.

### Using one spreadsheet with no backup or version control

Cap tables change frequently. If your only record is a Google Sheet that three people can edit, you will eventually have a version control disaster. At minimum, date your versions and keep a changelog. Better yet, use purpose-built software that maintains an audit trail automatically.

---

## When to Upgrade From Spreadsheets to Software

A spreadsheet is a perfectly reasonable starting point. But there are clear signs that you have outgrown it:

- **You have raised money using SAFEs.** Modeling conversion scenarios across multiple SAFEs with different caps and discounts is where spreadsheets fail. One wrong formula and your ownership math is off by percentage points.
- **You have more than 5 stakeholders.** Founders, angels, advisors with equity, early employees with options — once you cross five or six entries, the spreadsheet gets unwieldy.
- **You are about to raise a priced round.** Investor counsel will want a cap table they trust. A well-organized cap table in dedicated software carries far more credibility than a spreadsheet.
- **You need scenario modeling.** "What if we raise $3M at $12M pre-money? What about $15M?" Running these scenarios by hand is slow and error-prone.
- **You are granting stock options regularly.** Tracking vesting schedules, exercise windows, termination provisions, and 409A valuations in a spreadsheet is a ticking time bomb.

The cost of getting your cap table wrong is real. Fundraising delays, legal disputes, unhappy employees who were promised one thing and received another — all of these stem from cap table errors. The right software pays for itself the first time it catches a mistake you would have missed in a spreadsheet.

---

## Get Started with OpenCap Stack

If you are ready to move beyond spreadsheets, OpenCap Stack gives you everything you need to manage your cap table from incorporation through your Series A and beyond — for free.

Here is what you get:

- **Cap table management** — Track founders, investors, share classes, option pools, SAFEs, and convertible notes in a single source of truth.
- **Dilution modeling** — Run what-if scenarios for future rounds and see how they affect every shareholder's ownership.
- **Vesting schedule tracking** — Monitor vesting progress for every founder and employee grant, with automatic cliff and monthly vesting calculations.
- **83(b) election reminders** — Never miss the 30-day filing deadline for restricted stock.
- **Document storage and data rooms** — Keep board consents, stock purchase agreements, and investor documents organized and shareable.
- **OCTA-compatible** — Built on the Open Cap Table Alliance standard, so your data is portable and never locked in.

You can create your first cap table in under 10 minutes.

**[Sign up for OpenCap Stack free &rarr;](https://opencap.stack)**

---

## Frequently Asked Questions

### How many shares should I authorize when incorporating?

Most startups authorize 10,000,000 shares of Common Stock at incorporation. This gives you enough room to issue founder shares, create an option pool, and have headroom for future issuances without needing to amend your charter. Some founders authorize 15,000,000 or 20,000,000 to leave extra room. There is no cost difference — par value is typically $0.0001 per share regardless of the number authorized.

### Do I need a lawyer to create a cap table?

You do not need a lawyer to create the cap table document itself — it is a record you maintain. However, you do need a lawyer for the underlying legal actions that the cap table reflects: filing your Certificate of Incorporation, drafting Stock Purchase Agreements, creating your Equity Incentive Plan, and issuing board consents. The cap table is the summary; the legal documents are the source.

### How do I handle a 50/50 founder split on my cap table?

Record it the same way you would any other split: each founder gets their shares listed on the cap table with their vesting schedule. The more important question is whether 50/50 is the right split for your situation. While it is common, many advisors recommend having a slight imbalance (e.g., 51/49 or 55/45) so there is a tiebreaker for major decisions. Whatever you decide, make sure both founders agree and that the vesting terms are documented.

### When should I start tracking my cap table?

Start on the day you incorporate. Your first cap table entry is the founder share issuance. If you wait until your first fundraise to create a cap table, you will be scrambling to reconstruct months (or years) of equity events under time pressure. It takes five minutes to set up a cap table at incorporation. It takes days to reconstruct one retroactively.
