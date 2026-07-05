# Vesting Schedule Calculator: Model Your Equity Over 4 Years

When you join a startup or found a company, equity is often your most valuable compensation. But that equity doesn't land in your account all at once — it accrues over time through a process called vesting. Understanding exactly how your options or shares vest, and what they're worth at each milestone, is critical to making informed career and financial decisions.

A vesting schedule calculator takes the guesswork out of this process. Instead of manually working through spreadsheets, you can model your entire equity journey — cliff dates, monthly vesting increments, acceleration triggers, and total value — in seconds.

This guide walks through how vesting schedule calculators work, how to interpret the results, and how to use OpenCap Stack's built-in vesting calculator to model every scenario your equity might encounter.

## Why You Need to Model Your Equity Vesting

Most employees and founders know they have a 4-year vest with a 1-year cliff. Very few know what that actually means in dollars at month 18, or how much they'd lose by leaving at month 30 instead of month 36.

Without modeling your vesting schedule, you risk:

- **Leaving money on the table** by departing just before a significant vesting event
- **Undervaluing your compensation** when comparing job offers
- **Misjudging your dilution exposure** as a founder granting equity
- **Missing tax planning opportunities** around exercise timing

A vesting schedule calculator turns abstract percentages and dates into concrete numbers you can act on.

## The Standard 4-Year Vesting Schedule With 1-Year Cliff Explained

The most common equity structure in venture-backed startups is a **4-year vesting schedule with a 1-year cliff**. Here's what that means:

**The Cliff**
For the first 12 months, nothing vests. If you leave before month 12 — whether voluntarily or not — you receive zero options or shares. This protects the company from granting equity to employees or founders who don't stay long enough to contribute meaningfully.

**Post-Cliff Vesting**
At month 12, you hit the cliff and a lump sum vests all at once — typically 25% of your total grant. After that, the remaining 75% vests in equal monthly increments over the next 36 months.

**Why This Structure Exists**
The cliff creates alignment between employee tenure and equity ownership. Monthly vesting after the cliff rewards continued contribution without requiring employees to stay until another arbitrary anniversary date.

## How to Use a Vesting Schedule Calculator

A good vesting schedule calculator requires just a few inputs:

1. **Total grant size** — the number of options or shares
2. **Grant date** — when your vesting clock starts
3. **Vesting period** — typically 4 years (48 months)
4. **Cliff period** — typically 1 year (12 months)
5. **Strike price** — what you pay per share to exercise
6. **Current or projected fair market value (FMV)** — what each share is worth now

With these inputs, the calculator produces a month-by-month vesting table, cumulative ownership at any date, and estimated value at each milestone.

## Example: 10,000 Options, 4-Year Vest, 1-Year Cliff

Let's walk through a concrete example to show how the math works.

**Grant details:**
- 10,000 options
- $1.00 strike price (what you pay per share)
- 4-year vesting schedule (48 months)
- 1-year cliff (12 months)
- Current FMV: $5.00 per share

**Month 12 — The Cliff**

At the cliff, 25% of your total grant vests in one event:

```
10,000 options x 25% = 2,500 options vest at month 12
```

Gross value at cliff: 2,500 x ($5.00 - $1.00) = **$10,000**

**Months 13-48 — Monthly Vesting**

The remaining 7,500 options vest over 36 months:

```
7,500 options / 36 months = 208.33 options per month
```

In practice, most vesting agreements round to whole shares, so you'd see approximately 208 options vest most months with the remainder allocated to make the total exact.

**Month 24 Snapshot**

At month 24 (one year past the cliff):
- Cliff vested: 2,500
- Monthly vested (12 months x 208): 2,496
- **Total vested: ~5,000 options (50%)**
- Gross value: 5,000 x ($5.00 - $1.00) = **$20,000**

**Month 48 — Fully Vested**

At month 48, all 10,000 options have vested:
- Total options: 10,000
- Gross value at $5.00 FMV: 10,000 x ($5.00 - $1.00) = **$40,000**

This is your total paper gain assuming the FMV holds. If the company's value grows, the spread between your strike price and FMV widens, increasing the value of every vested option.

## Accelerated Vesting Scenarios

Not all vesting follows the standard monthly schedule. Two acceleration mechanisms are common in startup equity agreements:

### Single-Trigger Acceleration

Single-trigger acceleration vests some or all of your unvested options upon a single event — most commonly an acquisition or change of control. For example, a single-trigger clause might say:

> "Upon a change of control, 50% of unvested options shall immediately vest."

For an employee with 5,000 unvested options at the time of acquisition, this would result in 2,500 additional options vesting immediately.

**Who uses it:** Founders and early executives often negotiate single-trigger acceleration, though investors frequently push back because it reduces the acquirer's ability to retain key talent.

### Double-Trigger Acceleration

Double-trigger acceleration requires two events to occur before unvested options vest:

1. A change of control (the first trigger)
2. The employee's termination without cause or resignation for good reason (the second trigger)

This is more common because it keeps employees incentivized to perform for the acquirer while still protecting them from being let go immediately after a deal closes.

**Modeling acceleration:** A vesting schedule calculator that supports acceleration scenarios lets you compare your total vested value under a standard exit versus an accelerated exit, which directly informs how you negotiate your equity package.

## How to Calculate Value at Various Vesting Milestones

The value of your vested equity depends on two variables you control and one you don't:

**What you control:**
- When you exercise (affects tax treatment)
- Whether you exercise at all

**What you don't control:**
- The FMV at any given time

To calculate value at any milestone:

```
Vested options x (Current FMV - Strike price) = Gross spread
```

For tax purposes, the calculation differs based on option type:

- **Incentive Stock Options (ISOs):** No ordinary income tax at exercise (though AMT may apply); capital gains treatment if held long enough
- **Non-Qualified Stock Options (NSOs/NQSOs):** Ordinary income tax on the spread at exercise

A complete vesting calculator will show you the pre-tax value at each milestone, and ideally flag when your ISO limit ($100,000 per year at FMV) is exceeded so you can plan accordingly.

## Performance-Based Vesting Explained

Time-based vesting is the most common structure, but performance-based vesting is increasingly used for executive compensation and founder grants.

Instead of (or in addition to) vesting based on tenure, performance vesting ties equity milestones to company or individual achievements:

- **Revenue milestones:** 25% vests when the company hits $1M ARR
- **Funding events:** Additional shares vest at Series A, B, etc.
- **Individual KPIs:** Sales quotas, product launches, or other measurable goals

Performance vesting is harder to model because the timeline is uncertain — you don't know when (or if) the trigger will be hit. A vesting calculator that supports performance scenarios lets you run best-case, base-case, and worst-case projections across different milestone timelines.

## Using OpenCap Stack's Built-In Vesting Calculator

OpenCap Stack includes a vesting schedule calculator that's directly integrated with your cap table data. This means you're not working with hypothetical numbers — you're modeling against your actual grant details, current 409A valuation, and company-specific vesting terms.

**What the calculator does:**

- Generates a month-by-month vesting table for any grant
- Shows cumulative vested percentage and share count at any date
- Calculates gross spread based on current FMV or a custom price you enter
- Models acceleration scenarios (single and double trigger)
- Supports cliff periods from 0 to 24 months
- Handles non-standard vesting schedules (weekly, quarterly, annual)

**How to access it:**

1. Navigate to your equity grant in the dashboard
2. Click "View Vesting Schedule"
3. Adjust the FMV input to model future scenarios
4. Export the full schedule as a CSV or PDF

For founders and administrators, the calculator also runs across your entire option pool, showing you total outstanding unvested options, upcoming cliff events, and aggregate vesting costs — essential inputs for financial planning and investor reporting.

## Common Vesting Schedule Variations

While the 4-year/1-year structure dominates, you'll encounter several variations:

### 3-Year Vesting

Some later-stage companies or acqui-hires use a 3-year vest (often with a 1-year cliff and then monthly for 24 months). This is common for retention grants given to employees who already have equity from earlier in their tenure.

### Monthly Vesting From Day One

A small number of companies — particularly those with strong founder-friendly cultures — eliminate the cliff entirely. Equity vests monthly from the grant date. This is uncommon for early employees but sometimes used for advisors or contractors.

### Quarterly Vesting

Some agreements vest in quarterly increments rather than monthly. The cliff still applies, but instead of fractional monthly shares, a full quarter's worth of options vests every three months after the cliff.

### Back-Weighted or Front-Weighted Schedules

Non-linear vesting schedules weight vesting toward the end (back-weighted, common at some large tech companies) or toward the beginning (front-weighted, rare). The most famous back-weighted example is the old Facebook 5-25-35-35 schedule, where only 5% vested in year one.

### Annual Vesting

Early-stage companies occasionally use annual vesting with no monthly increments — 25% per year for 4 years. This is administratively simple but creates "golden handcuff" dynamics where employees are tempted to leave immediately after each anniversary.

## Putting It All Together

Understanding your vesting schedule isn't just about tracking when you'll own your shares — it's about making better decisions. Knowing that you'll hit a major vesting milestone in 90 days informs whether to accept a competing job offer. Modeling an acceleration clause informs how hard to negotiate it. Calculating your spread at different FMV scenarios informs whether to exercise early.

For more on the fundamentals of how equity vesting works, see our guide to [what vesting means for startup equity](/blog/what-is-vesting-startup-equity). If you're new to cap tables and want to understand how your grant fits into the bigger ownership picture, start with [what is a cap table](/blog/what-is-a-cap-table).

Ready to model your own vesting schedule? OpenCap Stack's vesting calculator is available to all users — log in to your dashboard and navigate to any equity grant to get started.
