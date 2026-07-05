# How to Calculate Startup Equity Dilution (With Free Calculator)

Equity dilution is one of the most important concepts every founder, investor, and employee needs to understand. Whether you're raising your seed round, negotiating an option pool, or planning a Series A, knowing how dilution works — and how to calculate it — can mean the difference between a great deal and giving away more than you intended.

This guide walks through the dilution formula, real-world examples at different funding stages, and how to use OpenCap Stack's free dilution calculator to model any scenario in minutes.

---

## What Is Equity Dilution and Why Does It Matter?

Equity dilution occurs when a company issues new shares, reducing the ownership percentage of existing shareholders. Your share *count* stays the same, but the total number of shares outstanding increases — so each share represents a smaller slice of the pie.

Dilution matters for three core reasons:

1. **Economic impact**: Smaller ownership percentage means a smaller portion of any future exit proceeds.
2. **Voting control**: Depending on share class and governance rights, dilution can shift decision-making power.
3. **Employee motivation**: Equity grants to employees dilute founders and investors, so modeling the impact upfront protects everyone's interests.

Understanding dilution doesn't mean avoiding it — raising capital almost always requires it. The goal is to understand exactly *how much* dilution each financing event creates, so you can negotiate informed terms.

---

## The Dilution Formula

The core formula is straightforward:

```
New Ownership % = Old Shares ÷ (Old Shares + New Shares)
```

Where:
- **Old Shares** = your shares before the financing round
- **New Shares** = shares issued to new investors in the round

For example, if you own 1,000,000 shares and the company issues 250,000 new shares to investors:

```
New Ownership % = 1,000,000 ÷ (1,000,000 + 250,000)
New Ownership % = 1,000,000 ÷ 1,250,000
New Ownership % = 80%
```

You started at 100% (or your pre-round percentage) and now own 80%. The round caused 20% dilution.

This same formula applies whether you're calculating dilution for founders, angel investors, option pool holders, or any other shareholder.

---

## Step-by-Step Dilution Calculation Walkthrough

Let's build on the formula with a more realistic scenario.

### Before the Round

| Shareholder | Shares | Ownership % |
|---|---|---|
| Founder A | 4,000,000 | 50% |
| Founder B | 4,000,000 | 50% |
| **Total** | **8,000,000** | **100%** |

### The Financing Event

The company raises $1M at a $4M pre-money valuation. This implies a $5M post-money valuation.

New shares issued = Investment ÷ Price Per Share

Price Per Share = Pre-money valuation ÷ Pre-money shares
```
Price Per Share = $4,000,000 ÷ 8,000,000 = $0.50
New Shares = $1,000,000 ÷ $0.50 = 2,000,000
```

### After the Round

| Shareholder | Shares | Ownership % |
|---|---|---|
| Founder A | 4,000,000 | 40% |
| Founder B | 4,000,000 | 40% |
| New Investor | 2,000,000 | 20% |
| **Total** | **10,000,000** | **100%** |

Each founder went from 50% to 40% — a 10 percentage point dilution, or 20% relative dilution.

---

## Seed Round Dilution Example

Let's model a common seed scenario: raising **$500K at a $5M pre-money valuation**.

**Pre-round cap table:**
- Founder A: 3,500,000 shares (35%)
- Founder B: 3,500,000 shares (35%)
- Option Pool: 3,000,000 shares (30%)
- **Total: 10,000,000 shares**

**Round economics:**
- Pre-money valuation: $5,000,000
- Investment: $500,000
- Post-money valuation: $5,500,000
- Price per share: $5,000,000 ÷ 10,000,000 = $0.50
- New shares issued: $500,000 ÷ $0.50 = 1,000,000

**Post-round cap table:**

| Shareholder | Shares | Pre-Round % | Post-Round % | Dilution |
|---|---|---|---|---|
| Founder A | 3,500,000 | 35.0% | 31.8% | -3.2% |
| Founder B | 3,500,000 | 35.0% | 31.8% | -3.2% |
| Option Pool | 3,000,000 | 30.0% | 27.3% | -2.7% |
| Seed Investor | 1,000,000 | — | 9.1% | — |
| **Total** | **11,000,000** | **100%** | **100%** | — |

The seed round created **~9.1% investor ownership** and diluted each founder by about 3.2 percentage points. For a $500K raise, this is a reasonable trade-off — founders retain meaningful control while securing critical early capital.

---

## Series A Dilution Example

Now let's model a Series A: raising **$3M at a $15M pre-money valuation**.

Using the post-seed cap table from above (11,000,000 total shares):

**Round economics:**
- Pre-money valuation: $15,000,000
- Investment: $3,000,000
- Post-money valuation: $18,000,000
- Price per share: $15,000,000 ÷ 11,000,000 = $1.364
- New shares issued: $3,000,000 ÷ $1.364 ≈ 2,200,000

**Post-Series A cap table:**

| Shareholder | Shares | Post-Seed % | Post-Series A % | Dilution |
|---|---|---|---|---|
| Founder A | 3,500,000 | 31.8% | 26.3% | -5.5% |
| Founder B | 3,500,000 | 31.8% | 26.3% | -5.5% |
| Option Pool | 3,000,000 | 27.3% | 22.6% | -4.7% |
| Seed Investor | 1,000,000 | 9.1% | 7.5% | -1.6% |
| Series A Investor | 2,200,000 | — | 16.5% | — |
| **Total** | **~13,200,000** | **100%** | **~100%** | — |

After two rounds, each founder owns approximately 26.3% — down from 35% at founding. They've raised $3.5M total and still hold majority control together. This is a healthy outcome.

Notice that the seed investor also gets diluted at Series A. This is expected, and why pro-rata rights matter (more on that below).

---

## Option Pool Dilution

Option pools deserve special attention because they're often misunderstood — and can be a significant source of hidden dilution.

When VCs negotiate a term sheet, they typically require an option pool expansion *before* the financing closes. This means the dilution from creating or expanding the option pool comes out of the *pre-money* shares, not the post-money shares — diluting founders before the investor even comes in.

**Example:**

You're raising a $2M seed at $8M pre-money, but the investor requires a 15% post-money option pool. If you only have a 10% option pool today, you need to increase it — and that increase dilutes you before the round closes.

This is why it's critical to model option pool impact separately from round dilution when evaluating term sheet economics. OpenCap Stack's [dilution calculator](/blog/startup-dilution-explained) handles this automatically.

For a deeper dive into how cap tables work and where option pools fit in, see our guide: [What Is a Cap Table?](/blog/what-is-a-cap-table)

---

## How to Use OpenCap Stack's Free Dilution Calculator

OpenCap Stack includes a built-in dilution calculator that lets you model any funding scenario without spreadsheets. Here's how to use it:

**Step 1: Enter your current cap table**
Input all existing shareholders, their share counts, and share classes. OpenCap Stack automatically calculates current ownership percentages.

**Step 2: Configure the new round**
Enter the investment amount, pre-money valuation, and any option pool requirements. The calculator automatically determines share price and new shares issued.

**Step 3: Review dilution impact**
The calculator shows a side-by-side comparison of pre-round and post-round ownership for every shareholder, including the dilution percentage for each.

**Step 4: Run multiple scenarios**
Adjust valuation, investment amount, or option pool size to model different term sheet scenarios. Compare outcomes across rounds to understand the cumulative dilution impact over time.

**Step 5: Export and share**
Generate a shareholder-ready dilution report or export to CSV for board presentations.

The calculator handles common complexities including convertible notes, SAFEs, option pool shuffles, and weighted-average anti-dilution calculations.

---

## Anti-Dilution Provisions Explained

Anti-dilution provisions protect investors when a company raises a subsequent round at a *lower* valuation — a "down round." These provisions adjust the investor's conversion price, effectively giving them more shares to compensate for the value loss.

There are two main types:

### 1. Full Ratchet Anti-Dilution
The most aggressive form: the investor's conversion price resets to the new (lower) round price, regardless of how many shares were issued in the down round. This can be severely dilutive to founders and other shareholders.

**Example:** An investor paid $2.00/share in Series A. The company raises a down round at $1.00/share. Full ratchet adjusts the Series A conversion price to $1.00, doubling the Series A investor's share count at conversion.

### 2. Weighted-Average Anti-Dilution
More common and founder-friendly. The conversion price is adjusted based on a weighted average of the old and new prices, accounting for the size of each round. There are two variants:

- **Broad-based**: Weights include all shares outstanding (preferred, common, options, warrants). Most favorable to founders.
- **Narrow-based**: Weights only preferred shares. Less favorable to founders.

**Broad-based weighted-average formula:**
```
New Conversion Price = (A × B + C) ÷ (A + D)
```
Where:
- A = shares outstanding before new issuance
- B = old conversion price
- C = total consideration received in new round
- D = shares issued in new round at new price

For most venture-backed startups, broad-based weighted-average anti-dilution is the market standard. Be cautious of full ratchet provisions — they're rare and typically a red flag.

---

## Pro-Rata Rights and How They Help

Pro-rata rights give existing investors the right (but not the obligation) to participate in future funding rounds to maintain their ownership percentage. They're a key tool for investors who want to avoid dilution.

**How pro-rata rights work:**

If an investor owns 10% of your company after the seed round, pro-rata rights let them invest enough in the Series A to maintain that 10% position. Without pro-rata rights, the Series A would dilute them alongside everyone else.

**From the founder's perspective:**

Pro-rata rights can be beneficial (they bring in known, supportive investors at your next round) or burdensome (if a difficult investor exercises pro-rata, it crowds out new investors). It's worth negotiating pro-rata caps — for example, granting pro-rata only to investors above a minimum check size threshold.

**Common pro-rata structures:**
- Full pro-rata: investor can maintain their exact percentage
- Super pro-rata: investor can buy *more* than their pro-rata share (rare, typically only for lead investors)
- Excluded from future rounds: some bridge rounds or insider rounds carve out pro-rata rights

For more on how dilution compounds across rounds and how to protect against it, see our full guide: [Startup Dilution Explained](/blog/startup-dilution-explained)

---

## Key Takeaways

1. **Dilution formula**: New Ownership % = Old Shares ÷ (Old Shares + New Shares)
2. **Every financing round dilutes all existing shareholders** — model it before signing a term sheet
3. **Option pool expansions cause dilution before the round closes** — account for the "option pool shuffle"
4. **Down rounds trigger anti-dilution provisions** — weighted-average is founder-friendly; full ratchet is not
5. **Pro-rata rights help investors maintain ownership** — negotiate caps to maintain flexibility
6. **Use a dilution calculator** to model scenarios quickly and avoid spreadsheet errors

Understanding dilution isn't just for investors — founders who model their cap table proactively make better decisions at every stage. OpenCap Stack's free dilution calculator gives you the tools to run these scenarios in real time, so you're never caught off guard at the negotiating table.

---

*Ready to calculate your dilution? OpenCap Stack's cap table and dilution tools are free to get started. [Create your free account](https://opencapstack.com) and model your next round in minutes.*
