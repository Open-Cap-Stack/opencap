# Stock Option Agreement Template: What to Include and Common Mistakes

When a startup grants equity to an employee or advisor, the document that makes it official is the stock option agreement. This agreement defines the terms of the grant, protects both the company and the recipient, and must be executed correctly to be valid. A poorly drafted or incomplete stock option agreement can lead to tax problems, legal disputes, and frustrated employees who thought they understood their equity but didn't.

This guide walks through what every stock option agreement must include, the difference between ISOs and NSOs, the most common mistakes founders make, and how to generate compliant agreements using OpenCap Stack.

---

## What Is a Stock Option Agreement?

A stock option agreement is a legal contract between a company and an individual—typically an employee, advisor, or contractor—that grants the right to purchase a specified number of shares at a fixed price, known as the exercise price or strike price, within a set time period.

Options are not shares. The recipient doesn't own anything at the time of grant. They hold the *right* to buy shares later, usually after satisfying a vesting schedule. If the company grows and the stock price rises above the exercise price, the options become valuable. If the stock price never exceeds the exercise price, the options expire worthless.

Stock options are typically granted under a formal equity incentive plan—such as a 2024 Equity Incentive Plan—and the option agreement is the individual grant document that ties a specific recipient to specific terms under that plan.

---

## ISO vs. NSO: Key Differences and Tax Implications

All stock options fall into one of two categories: Incentive Stock Options (ISOs) or Non-Qualified Stock Options (NSOs, sometimes called NQSOs). The distinction matters enormously for tax purposes.

### Incentive Stock Options (ISOs)

ISOs are available only to employees (not contractors or advisors). The primary tax advantage is that there is no ordinary income tax at exercise, provided certain holding period requirements are met. If the recipient holds the shares for at least two years from the grant date and one year from the exercise date, any gain is taxed as long-term capital gains rather than ordinary income.

The downside: ISOs can trigger the Alternative Minimum Tax (AMT) at exercise, depending on the spread between the exercise price and the fair market value. ISOs also have an annual limitation—no more than $100,000 worth of options (based on exercise price) can become exercisable in any calendar year.

### Non-Qualified Stock Options (NSOs)

NSOs can be granted to employees, contractors, advisors, or anyone else. They don't carry the same preferential tax treatment. At exercise, the spread between the exercise price and the current fair market value is taxed as ordinary income. The company also gets a corresponding tax deduction.

NSOs are more flexible and simpler to administer. Contractors and advisors must receive NSOs because they are not employees and therefore ineligible for ISOs.

Choosing the wrong option type—for example, granting ISOs to a contractor—invalidates the ISO status and creates tax problems for both parties.

---

## What Every Stock Option Agreement Must Include

A complete, legally sound stock option agreement contains the following essential elements:

### 1. Grant Date

The grant date is the date the board of directors formally approved the option grant. This date triggers the start of the ISO holding period clock and, critically, determines what 409A valuation must be used to set the exercise price. Always use the actual board approval date—not the date the paperwork was signed by the recipient.

### 2. Exercise Price (Must Equal or Exceed 409A FMV)

The exercise price is the per-share price the recipient must pay to purchase shares. For ISOs, the exercise price must be at least 100% of the fair market value (FMV) on the grant date (110% for employees owning more than 10% of the company's stock). For NSOs, it must also meet FMV to avoid adverse tax consequences under IRC Section 409A.

FMV is established by a 409A valuation—an independent appraisal performed by a qualified third party. Granting options without a current 409A, or at a price below the 409A-determined FMV, exposes both the company and the recipient to immediate and deferred tax penalties under 409A. See our guide on [what a 409A valuation is](/blog/what-is-a-409a-valuation) for a full breakdown.

### 3. Number of Shares

The agreement must specify the exact number of shares covered by the grant. This number should reflect decisions made at the board level and be consistent with the company's cap table. The grant should also reference the share class (typically common stock) and the total authorized pool under the equity incentive plan.

### 4. Vesting Schedule

The vesting schedule determines when the recipient earns the right to exercise each portion of their options. The standard structure for employees is:

- **4-year total vesting period**
- **1-year cliff**: No options vest for the first 12 months. If the employee leaves before the 1-year mark, they forfeit all unvested options.
- **Monthly vesting after cliff**: Following the cliff, the remaining options vest ratably on a monthly basis over the next 36 months.

At the end of the 4-year period, 100% of the grant is vested. Advisors and contractors often receive different schedules—shorter vesting periods (1–2 years) with no cliff are common.

The vesting schedule, along with the grant date, determines the vesting commencement date and should be spelled out explicitly in the agreement. Learn more about how vesting works in our guide on [startup equity vesting](/blog/what-is-vesting-startup-equity).

### 5. Option Type (ISO or NSO)

The agreement must explicitly state whether the grant is an ISO or NSO. This is not just a formality. It has direct legal and tax consequences for the recipient. The agreement should also note that ISOs are granted under Section 422 of the Internal Revenue Code.

If the option grant exceeds the $100,000 ISO limitation for a given year, the excess automatically converts to NSO treatment. A well-drafted agreement will address how this is handled.

### 6. Expiration Date

Options are not valid indefinitely. The standard expiration term for stock options is 10 years from the grant date (7 years for ISOs granted to 10%+ stockholders). If options are not exercised before the expiration date, they expire and the recipient receives nothing.

This 10-year clock runs regardless of what happens with vesting. An option that is fully vested but never exercised before the expiration date is lost.

### 7. Post-Termination Exercise Period

One of the most important—and most frequently overlooked—provisions is the post-termination exercise period (PTEP). This defines how long a departing employee has to exercise their vested options after leaving the company.

The default under most standard agreements is 90 days following termination (for reasons other than cause or disability). ISO status is lost if the option is not exercised within 90 days of termination, at which point it automatically converts to NSO treatment. Some companies offer extended PTEPs (one to five years, or even until the original expiration date) to give employees more flexibility—particularly if shares are illiquid and there is no near-term liquidity event.

The agreement must also specify what happens to vested options in the case of termination for cause (typically forfeiture), death, or disability.

### 8. Early Exercise Rights

Some companies allow employees to exercise options before they have fully vested. This is known as early exercise. When an employee early exercises, they purchase unvested shares that remain subject to the company's right to repurchase at the original exercise price if the employee leaves before vesting.

Early exercise can be valuable because it starts the capital gains holding period earlier and allows the employee to file an 83(b) election—a tax election that locks in the taxable value at the time of exercise rather than at vesting, potentially reducing the tax bill significantly. The deadline to file the 83(b) election is 30 days from the date of exercise. Missing this window is permanent and can result in substantial unexpected taxes.

If early exercise is permitted, the agreement should clearly state this, and the company should be prepared to issue an 83(b) election form to the employee at the time of exercise.

---

## Common Mistakes Founders Make

### 1. Not Getting a 409A Before Granting Options

This is the most consequential mistake. Granting options without a current 409A valuation—or at a price that is not supported by one—exposes the company to significant legal and tax liability. Under Section 409A of the Internal Revenue Code, options granted below FMV result in automatic ordinary income tax on vesting, plus a 20% penalty tax, plus interest. These consequences fall on the *recipient*, not just the company. Always complete a 409A valuation before the board approves any option grants.

### 2. Setting the Wrong Exercise Price

Even with a 409A in hand, some founders set the exercise price incorrectly—either rounding down, applying the wrong valuation date, or using an outdated valuation. The exercise price must be at least equal to the FMV established by the most recent 409A as of the grant date. A new round of financing or significant company milestones can quickly make a prior 409A stale.

### 3. Missing the 83(b) Election Deadline

When an employee early exercises their options, they have exactly 30 days to file an 83(b) election with the IRS. There are no extensions and no exceptions. Missing this deadline means the employee will owe ordinary income taxes on the difference between the exercise price and FMV at each vesting event—rather than at the time of early exercise when the spread was likely much smaller. Founders should build a process to deliver 83(b) election forms immediately at early exercise.

### 4. Forgetting to Document the Board Approval

Stock option grants must be formally approved by the board of directors (or a designated committee with delegated authority). A grant without proper board documentation is not a valid grant. The board resolution should specify the recipient's name, the number of shares, the exercise price, the grant date, and the option type. Companies that fail to maintain clean board records often discover this problem at the worst possible time—during due diligence for a financing or acquisition.

### 5. Using the Wrong Option Type for Contractors

ISOs are only available to employees. Contractors, consultants, and advisors must receive NSOs. Accidentally granting ISOs to a non-employee does not convert them to NSOs automatically—it simply means the grant is defective and will need to be corrected. The correction process can be complex and may involve reissuing the grant at a new price, creating additional tax complications. Always confirm employment status before selecting the option type.

---

## How to Generate Option Agreements with OpenCap Stack

OpenCap Stack automates the entire option grant workflow—from 409A valuation tracking to legally compliant document generation. Here's how it works:

**1. Set up your equity plan.** Before granting any options, create your equity incentive plan in OpenCap Stack. The platform tracks your authorized pool, outstanding grants, and available shares in real time.

**2. Record your 409A valuation.** Enter your most recent 409A FMV into the system. OpenCap Stack will use this to pre-fill the exercise price on new grants and alert you when your valuation is approaching expiration (typically 12 months).

**3. Create the grant.** Enter the recipient's details, select ISO or NSO, specify the number of shares, and confirm the vesting schedule. The system validates that the exercise price meets the 409A FMV requirement.

**4. Generate the agreement.** OpenCap Stack generates a complete stock option agreement pre-populated with all required fields—grant date, exercise price, vesting schedule, expiration date, option type, and post-termination exercise period.

**5. Collect board approval.** The platform generates the corresponding board resolution template and tracks approval signatures.

**6. Send for signature.** The option agreement is delivered to the recipient for electronic signature. Once signed, it's stored in the recipient's equity profile and on the company's cap table.

OpenCap Stack eliminates the manual errors that cause most option agreement problems—wrong prices, missing clauses, and unsigned documents.

---

## Final Thoughts

A stock option agreement is not a formality. It is a binding legal document that creates real financial rights and obligations. Getting it right requires attention to detail: the correct valuation, the right option type, a clear vesting schedule, and proper board approval.

The most common mistakes—operating without a 409A, using the wrong option type, missing the 83(b) deadline—are entirely preventable with the right process. For startups issuing their first options or scaling their equity programs, using a purpose-built platform like OpenCap Stack removes most of the risk.

If you're ready to start issuing equity the right way, [sign up for OpenCap Stack](https://opencapstack.com/signup) and get your cap table, 409A tracking, and option agreement generation in one place.
