# OpenCapStack Growth Engine Plan
## Applying the Nicole Cheung UGC Playbook to B2B Fintech

**Author:** Growth Strategy  
**Date:** 2026-05-19  
**Target:** $150K MRR across Cap Table, SPV, and 409A products  
**Team Size Assumed:** 2-3 people executing this plan

---

## Executive Summary

Nicole Cheung reached $300K MRR with consumer apps by making the app's **output** the marketing asset. The same principle applies to OpenCapStack — but instead of "glow-up before/afters," your viral content is "cap table before/after Series A," "what a dirty term sheet does to your equity," and "why your 409A is probably wrong."

The core difference from consumer UGC: B2B creators are fewer, but each carries 10x the conversion weight. One tweet from a YC partner or a Carta-skeptic lawyer reaches the exact buyer. You don't need 200 creators. You need 20 who are credible in the startup finance ecosystem.

The other critical difference: B2B buyers are paranoid about trust. The hard paywall works here only if you have enough brand credibility first. This plan sequences that correctly.

---

## Section 1: Virality Hooks — Making Product Outputs Into Content

### 1.1 Cap Table Management

**What the product produces:** Stakeholder records, share class breakdowns, vesting schedules, dilution calculations, waterfall analysis at various exit valuations.

**The virality opportunity:** Dilution is emotionally charged. Founders don't truly understand what happens to their equity until they see a real number. The waterfall analysis controller already calculates net proceeds per stakeholder at any exit valuation. That output, visualized, is shocking and shareable.

**Specific shareable outputs to build:**

| Output | Format | Platform | Hook |
|--------|--------|----------|------|
| "Your equity after Seed → Series A → Series B" | Side-by-side table with % change highlighted in red/green | LinkedIn, Twitter | Founder anger/education |
| Waterfall breakdown at $10M, $50M, $100M exits | Stacked bar chart per stakeholder class | LinkedIn | VC education |
| Vesting cliff visualization | Timeline graphic showing when value unlocks | Twitter | Employee/founder retention |
| "Dirty term sheet impact simulator" | Before/after equity table with a 2x liquidation preference applied | LinkedIn | Lawyer and founder content |
| Cap table health score card | Letter grade (A-F) on 5 dimensions: clean structure, option pool size, pro-rata coverage, missing documents, 409A currency | Twitter | Instant engagement hook |

**The build required:** A `/share` endpoint that generates a read-only, public, branded PNG or OG-image of any of the above outputs. This is a 1-2 day engineering task. The waterfall analysis service already produces the data. You are just wrapping it in a shareable visual layer.

### 1.2 SPV Management

**What the product produces:** SPV structure with LP list, allocation, carry percentage, instrument type (SAFE/note/equity), valuation cap, round size, co-investor list.

**The virality opportunity:** Emerging GPs are desperate for credibility. Showing a clean, professional SPV deal page signals legitimacy to LPs. The SPV wizard (wizardStep, wizardCompletedSteps fields already in the model) produces a structured deal memo that most syndicates currently write in Google Docs. That professionalism gap is the content hook.

**Specific shareable outputs to build:**

| Output | Format | Platform | Hook |
|--------|--------|----------|------|
| SPV deal page preview (anonymized) | Branded deal card: company stage, round size, instrument, carry, minimum check | Twitter, AngelList-style communities | "This is what a professional deal looks like" |
| "Good SPV vs bad SPV" breakdown | Side-by-side comparison of terms (clean carry structure vs hidden fees, reasonable minimums vs LP-hostile structure) | LinkedIn | GP/LP education |
| SPV completion checklist with % done | Progress bar: legal entity, memo, data room, LP commitments | Twitter | FOMO / urgency content |
| "The carry math on a $1M SPV into a 10x outcome" | Simple table: gross proceeds, carry taken, LP net | Twitter | LP due diligence education |

**The build required:** Public deal preview page (no login required) with company name redacted, generated from the SPV model's existing fields. Toggle: "Share deal preview." Branded footer: "Created with OpenCapStack."

### 1.3 409A Valuations

**What the product produces:** Valuation requests, completeness scores, FMV at grant, export packages for third-party providers, financing history context.

**The virality opportunity:** The 409A completeness scoring function (already built in `valuation409AExportController.js`) produces a structured list of CRITICAL and WARNING gaps. That output — "your 409A data has 3 critical gaps that could void your option grants" — is genuinely alarming and highly shareable in startup CFO and legal circles.

**Specific shareable outputs to build:**

| Output | Format | Platform | Hook |
|--------|--------|----------|------|
| 409A readiness score (A-F) | Single score card with breakdown: company data completeness, cap table accuracy, financing history, option grant records | LinkedIn, Twitter | CFO fear-of-compliance hook |
| "409A timeline for a Series A company" | Calendar graphic: when to order, turnaround time, cost range, IRS penalty if skipped | Twitter/LinkedIn | Founder education |
| "The $500K mistake" | Narrative post: founder granted options without valid 409A, IRS reclassified, employees owed taxes. Real pattern, anonymized numbers | LinkedIn long-form | High engagement, high share rate |
| 409A cost comparison table | OpenCapStack vs Big 4 vs boutique firm vs VC-backed competitor, by turnaround and price | LinkedIn | Direct conversion hook |

**The build required:** Public-facing 409A readiness quiz (5 questions, no signup required) that ends with a score and "Get your full report" CTA. The quiz output IS the lead gen. This is a 2-3 day frontend task.

---

## Section 2: UGC Creator Strategy for B2B Fintech

### 2.1 The Creator Landscape

This is not a consumer market. You are not recruiting 200 lifestyle creators. You are recruiting 20 domain-credible operators. The math still works: 20 creators with 5,000-50,000 engaged followers in the startup ecosystem each produce $30K+ in attributed pipeline per quarter.

**Creator archetypes to target:**

**Tier 1 — High Trust, High Conversion (5-8 people)**
- Startup lawyers who post about equity, option grants, term sheets (Twitter/LinkedIn-native)
- Former Carta/Pulley employees who left and have opinions about the space
- YC alumni who document their fundraising process publicly
- Startup CFOs running "fractional CFO" practices for 5-15 companies simultaneously

These people post about equity already. You are not asking them to learn a new subject. You are giving them a tool that makes their existing content better and paying them to use it.

**Tier 2 — Volume Creators, Moderate Trust (8-12 people)**
- Emerging fund managers and angels who post deal flow updates
- "Startup school" accounts on LinkedIn and Twitter that teach founders finance basics
- Fintech newsletter writers (Exec Sum, The CFO, Not Boring ecosystem)
- CPAs and accountants who serve startups and post educational content

**Tier 3 — Platform Amplifiers (5 accounts)**
- Communities with distribution: OnDeck, Pioneer, Mainstream VC Discord, Lenny's Slack (startup ops channel), SaaStr community

### 2.2 Finding Creators

Do not use an influencer marketplace. Every good B2B creator will reject a cold marketplace pitch. Use this sourcing approach:

**Search strings to use on LinkedIn and Twitter today:**
- "cap table" + "wrote this" or "built this" (people documenting their actual experience)
- "409A" + "what I learned" or "mistake we made"
- "SPV" + "here's how" or "we just closed"
- "option pool" + "founders should know"
- Filter: 500-50,000 followers, posted in last 30 days, engagement rate above 2%

**Signal to look for:** Someone who already creates educational content about equity, not someone with a large following who you will pay to learn the topic. Domain credibility is the only currency that works in this market.

### 2.3 The 4-Step System Adapted for B2B

**Step 1: Source**
- Build a list of 50 candidates using the search strings above
- Qualify: Do they already post about equity/startup finance? Do their posts get traction?
- Target list size: 50 candidates → 20 outreach → 10 conversations → 5 active creators to start

**Step 2: Onboard**
- Do not send a rate card. Send a personal email referencing a specific post they wrote.
- Offer: Free access to all three products + $500/month retainer for 2 posts per month + 20% revenue share on referred signups (tracked via UTM/referral code)
- Onboarding deliverable: A 30-minute Loom walkthrough of the product, recorded by your team, tailored to their audience (founders, lawyers, GPs)
- Mandatory: They must use the product on a real or realistic scenario before posting. No abstract endorsements.

**Step 3: Manage**
- Weekly Slack channel with all creators. Share what's working, what angles are getting traction, new features to demo
- Provide a "content brief" every 2 weeks: a specific hook, the supporting data from the product, a suggested format. They own the voice. You own the brief.
- Track every post in a shared Airtable: creator, platform, post date, impressions, clicks, signups attributed

**Step 4: Systemize**
- After 60 days, identify the 3 creators and 2 content formats driving 80% of results (Pareto will be brutal and obvious)
- Double down on those creators, increase their retainer, give them early access to new features
- Cut or deprioritize creators who are not converting, regardless of follower count

### 2.4 Incentive Structure

| Creator Tier | Monthly Retainer | Revenue Share | Requirements |
|-------------|------------------|---------------|--------------|
| Tier 1 (5-8 people) | $500-$1,500/mo | 20% first-year ARR | 2 posts/month, product screenshots required |
| Tier 2 (8-12 people) | $200-$500/mo | 15% first-year ARR | 2 posts/month |
| Tier 3 (amplifiers) | $0-$200/mo | 10% | Community post or newsletter mention |

Total creator budget at scale (20 creators): $8,000-$15,000/month. At $150K MRR target, that is 5-10% of revenue — entirely defensible CAC.

---

## Section 3: Channel Testing Roadmap — 2-3 Week Sprints

Run each channel test with a clear hypothesis and a binary pass/fail decision at the end of the sprint window. Do not blend channels. One channel per sprint for the first 3 months.

### Sprint Order and Rationale

**Sprint 1 (Weeks 1-2): LinkedIn — Organic Founder/CFO Content**

Hypothesis: "Equity education posts with real data outputs from our product, posted by our founding team or early advisors, will reach 5,000+ startup founders/CFOs per post and generate 50 qualified signups in 14 days."

What to test:
- 6 posts over 2 weeks (3 per week is too aggressive for LinkedIn algorithm; aim for 3-4 total, high quality)
- Post formats: carousel (dilution breakdown), text-only (controversial opinion on Carta pricing), screenshot with annotation (409A completeness score)
- Success metric: 50 signups, 5% conversion from signup to paid trial start

Why first: LinkedIn is where startup CFOs, lawyers, and finance operators live. The content format matches the product (serious, data-driven). No paid spend needed to validate organic.

Decision rule: If fewer than 30 signups in 14 days, the content angle or targeting is wrong. Reframe the hook before moving on.

**Sprint 2 (Weeks 3-4): Twitter/X — VC and Founder Community**

Hypothesis: "Thread-style posts explaining cap table mechanics, SPV structure, or 409A compliance will get 500+ engagements and send 100 clicks to the product per thread."

What to test:
- 4 threads over 2 weeks, each structured as "10 things founders get wrong about [topic]" or "I ran [calculation] on 50 seed-stage cap tables and here's what I found"
- Attach actual product screenshots (anonymized) as social proof
- Engage with every reply within 2 hours to feed the algorithm

Why second: Twitter/X is where the VC-founder conversation happens in real time. The feedback loop is faster than LinkedIn. You will learn what hooks land within 72 hours of posting.

Decision rule: 3 of 4 threads must hit 200+ engagements to continue this channel. One viral thread does not validate the channel — consistency does.

**Sprint 3 (Weeks 5-6): Startup-Specific Reddit — r/startups, r/entrepreneur, r/venturecapital**

Hypothesis: "Genuinely educational posts about equity mechanics, written without product promotion, will drive 200+ upvotes and 50+ organic clicks to our free tools."

What to test:
- Do NOT post about the product. Post genuinely useful content (e.g., "I analyzed 100 cap tables and here are the 5 most common mistakes — here's what to look for")
- Include a subtle CTA at the end: "We built a tool for this if anyone wants to check theirs"
- Track via UTM parameter

Why third: Reddit has extremely high trust within startup communities but brutal spam detection. You are testing whether organic education converts here. If it does, it scales with minimal ongoing effort.

Decision rule: 2 posts with 100+ upvotes = channel worth continuing. Anything below that means the content is not right for this community.

**Sprint 4 (Weeks 7-8): Newsletter Sponsorships — Targeted Fintech/Startup Finance**

Hypothesis: "A sponsored slot in a startup finance newsletter with 5,000-15,000 CFO/founder subscribers converts at 2%+ to free trial."

What to test:
- Buy 2-3 newsletter sponsorships in targeted publications (The CFO, Exec Sum, FounderPath newsletter, Cashflow)
- Test two creative angles: (1) "Your 409A might have critical gaps" fear-based, (2) "Cap table management built for founders, not lawyers" utility-based
- Budget: $500-$2,000 per placement to test

Why fourth: Newsletter readers are in a consumption mindset and self-select into niche topics. A startup finance newsletter audience is already pre-qualified.

Decision rule: 2% conversion from click to trial signup. Below 1% means the audience match or copy is wrong.

**Sprint 5 (Weeks 9-10): YouTube — Educational Long-Form**

Hypothesis: "10-15 minute walkthroughs of real equity scenarios (series A dilution, SPV structure, 409A for first-time option grant) will rank in search and drive 20 qualified signups per video within 30 days."

What to test:
- 2-3 videos: "How to read your cap table after Series A," "Building an SPV from scratch," "When do you need a 409A and what does it cost"
- No production budget required — screen recording with voiceover, good audio
- Optimize titles and descriptions for search intent, not social virality

Why fifth: YouTube SEO compounds over time. A good video drives leads for 2-3 years. This channel has the longest payback but the best LTV-weighted CAC.

Decision rule: 100 views in 30 days with 5%+ click-through to product. Lower than that, the topic selection is wrong.

**Channels to deprioritize initially:**
- TikTok: Wrong demographic for B2B fintech; revisit only if a creator organically finds traction there
- Podcasts: High effort, long lead time, difficult to attribute. Test after Month 4 once messaging is locked in
- Paid search: Do not run paid search until organic conversion rate is validated. You will burn budget learning the wrong lesson.

---

## Section 4: Paywall vs Freemium Decision

### The Nicole Cheung Model and Why It Partially Applies

Her hard paywall works because she has massive top-of-funnel via UGC, the product is impulse-purchasable ($10-30/month consumer), and the decision-maker and buyer are the same person in 60 seconds.

OpenCapStack's buying dynamics are different in three ways:
1. The buyer cycle is 7-30 days for a $200-$500/month product
2. The decision-maker (CFO, founder, GP) often needs to show value to a second stakeholder (co-founder, fund admin, lawyer) before purchasing
3. Trust in financial software requires a "try before you commit" moment — the stakes of wrong data are real

### The Recommended Model: Trust-First Freemium with Hard Conversion Gate

**Cap Table Management**
- Free tier: Up to 10 stakeholders, 1 share class, no export, no 409A integration
- Paid: Everything. Priced at $199/month for seed stage, $499/month for Series A+
- Rationale: Founders will use the free tier to build their first cap table (high activation). The moment they need to share with a lawyer or run a dilution scenario, they hit the paywall. That is the natural conversion moment — they have existing data and real urgency.

**SPV Management**
- No free tier. $299/month per active SPV or $999/month unlimited SPVs
- Rationale: SPV users are running real transactions. There is no "test drive" equivalent. The professional output IS the product. A hard paywall with a 14-day free trial (credit card required) works here.
- Key conversion hook: The first time someone uses the deal preview share link and gets a positive LP response, they will pay immediately. Build for that moment.

**409A Valuations**
- Free: 409A readiness quiz and score (the 5-question version described in Section 1.3)
- Paid: Full valuation report, export package for providers, historical tracking: $149-$299 per valuation request, or $299/month for unlimited requests
- Rationale: 409A is a compliance purchase, not a feature purchase. The fear of getting it wrong is stronger than the cost of paying for it. The free readiness quiz creates the fear. The paid product resolves it.

### Summary Table

| Product | Free Tier | Paid Entry | Conversion Trigger |
|---------|-----------|------------|-------------------|
| Cap Table | 10 stakeholders, 1 share class | $199/month | Needing export, dilution modeling, or 409A link |
| SPV | 14-day trial | $299/month/SPV | First LP share link sent |
| 409A | Readiness quiz | $149/valuation | Score shows critical gaps |

---

## Section 5: The 10 Viral Content Concepts

These are specific, executable content pieces. Each one is tied to actual data your system already produces.

**Concept 1: "Your cap table after every funding round" — Animated progression**
Show a founder's equity going from 100% at incorporation → 85% post-SAFE → 70% post-Seed → 55% post-Series A → 45% post-Series A option pool refresh. Numbers are realistic composites. Each step labeled with what happened. The emotional gut-punch is the final number. Format: LinkedIn carousel, 6 slides.

**Concept 2: "The $400K SPV carry math" — Transparency post**
Show the full math: GP puts in $50K lead check, charges 20% carry, SPV invests $500K total into a company that exits at 5x. Here's how much each party made. Most LPs have never seen this laid out cleanly. Format: Twitter thread with a simple table in each tweet.

**Concept 3: "We ran a 409A completeness check on 50 anonymous cap tables — here's what we found"**
Aggregate anonymized completeness score data (using the scoring function already in `valuation409AExportController.js`). Report: X% had missing entity type, X% had no financing history, X% had grants issued without a valid 409A. Format: LinkedIn long-form post or newsletter.

**Concept 4: "The dirty term sheet simulator"**
Take a clean $5M Series A (standard 1x non-participating preferred) and a "dirty" version (2x participating preferred + full ratchet). Show what founders and common stockholders receive in a $30M exit under each scenario. The difference is staggering. The product already handles this via the waterfall analysis. Format: LinkedIn carousel.

**Concept 5: "Your option grant might be worthless — here's why"**
Explain the 409A > 90-day rule, what happens when options are granted at below-FMV strike prices (IRS Section 409A penalties, 20% excise tax + interest), and how many early-stage companies get this wrong because their 409A is stale. End with a CTA to the free readiness quiz. Format: Twitter thread.

**Concept 6: "SPV structure: solo GP vs. manager entity vs. fund-of-one — the actual differences"**
Walk through 3 different structures an angel can use to pool capital, with the tradeoffs on liability, cost, and regulatory exposure. Use the SPV model's fields (incorporationType, adviserType, masterPartnershipEntity) as the structural skeleton. Format: LinkedIn carousel or YouTube video.

**Concept 7: "What Carta doesn't want you to know about your cap table export"**
Document the format differences, what data gets lost in a Carta export vs. an OCTA-compliant format, and why that matters for your 409A provider. This is a direct competitive play. It will be shared heavily by anyone who has experienced Carta frustration. Format: LinkedIn long-form + follow-up Twitter thread.

**Concept 8: "I modeled 5 exit scenarios for a seed-stage company — the liquidation preference math will surprise you"**
Use the waterfall analysis to show a company with $3M in SAFE notes (post-money, $10M cap) exiting at $8M, $15M, $25M, $50M, and $100M. Show how founder and common stockholder proceeds change at each exit. Show at what exit value the liquidation preference stops mattering. Format: LinkedIn carousel, data-heavy.

**Concept 9: "The 10-minute SPV deal memo review checklist"**
A practical checklist for LPs evaluating an SPV: 10 questions to ask before committing. Anchor it to real fields in a professional deal memo (memo quality, data room completeness, co-investors listed, carry structure, minimum check). This positions OpenCapStack as the standard for what a professional deal memo looks like. Format: Twitter thread + downloadable PDF.

**Concept 10: "Cap table red flags that kill acquisition deals"**
Interview 3 M&A lawyers or startup founders who have been through acquisitions. Document the cap table issues that created problems during due diligence: missing founder agreements, option pool larger than documented, uncapped SAFEs in a small exit. Tie back to the cap table health score. Format: LinkedIn interview-style post or YouTube short series.

---

## Section 6: 90-Day Execution Plan

This is week-by-week for a team of 2-3 people. One person owns growth/content, one owns engineering/product, one (if you have a third) handles creator relationships and outreach.

### Month 1: Build the Foundation (Weeks 1-4)

**Week 1 — Engineering + Infrastructure**
- Build the `/share` endpoint: generates a branded, read-only, public PNG/OG image for cap table snapshot, waterfall at exit, and 409A completeness score
- Create UTM/referral code system for creator tracking (Airtable or simple DB table)
- Identify 50 creator candidates using the search strings in Section 2.2

**Week 2 — Content Validation**
- Post 3 LinkedIn pieces from the founding team (Concepts 4, 5, and 8 from Section 5 are lowest production cost, highest relevance)
- Start outreach to 20 creator candidates: personal emails referencing their specific posts
- Set up a simple Airtable: creator name, platform, follower count, email sent, response, status

**Week 3 — Creator Onboarding Begins**
- Onboard first 3-5 creators who responded positively
- Record the 30-minute Loom product walkthrough for each creator tier (one for founders, one for lawyers/CFOs, one for GPs/angels)
- Continue LinkedIn posting cadence; review Week 2 data to identify top-performing angle

**Week 4 — Channel Sprint 1 Closes / Sprint 2 Opens**
- Decision on LinkedIn: did it hit 50 signups? Double down or reframe
- Begin Twitter sprint: draft 4 threads using the top-performing angles from LinkedIn
- Begin building the 409A readiness quiz (5 questions, no-signup, public-facing)

### Month 2: Activate Creators and Test Channels (Weeks 5-8)

**Week 5 — Twitter Sprint**
- Post 2 threads (Concepts 1 and 5 work well for Twitter format)
- Set up weekly creator Slack channel; share Week 4 LinkedIn results with context
- Brief creators: provide the first content brief (hook, data, format suggestion)

**Week 6 — Reddit Sprint Begins**
- Post 2 genuinely educational Reddit pieces with subtle CTA
- First creator posts should be live this week; track every post in Airtable
- Ship the 409A readiness quiz to staging; get 5 internal testers

**Week 7 — Creator Feedback Loop**
- Review first 30 days of creator content: what formats are getting traction?
- Identify the 2 creators who are outperforming; increase their engagement (send them exclusive data, early access to new features, bump their retainer)
- 409A quiz goes live; post about it on LinkedIn and Twitter

**Week 8 — Newsletter Sponsorship Test**
- Buy 2 newsletter sponsorships; run A/B test on fear-based vs utility-based copy
- Twitter sprint decision: did 3 of 4 threads hit 200+ engagements?
- Begin documenting everything that is working into a "growth playbook" doc — this is what you will use to onboard future creators and team members

### Month 3: Amplify What Works, Cut What Doesn't (Weeks 9-12)

**Week 9 — YouTube Sprint Begins**
- Record first 2 YouTube videos (no production budget needed: screen recording, good mic, real scenarios)
- Titles: "How to read your cap table after Series A" and "Building an SPV: what every angel investor needs to know"
- Newsletter sponsor results in: conversion rate analysis, decision to continue or kill

**Week 10 — Creator Scale**
- If creator content is converting, recruit 5 more creators from the Tier 2 list
- Cut any creator who has not posted or whose posts are not converting after 60 days
- Implement referral revenue share payouts for the first time — this is a trust signal with creators

**Week 11 — Product Growth Loop**
- Build the SPV deal preview share link (the "share this deal" feature described in Section 1.2)
- Every GP who shares their deal page is showing OpenCapStack's branding to their LPs — passive marketing at no cost
- Track how many new LP-side signups come through shared deal links

**Week 12 — Review and Plan Quarter 2**
- Calculate CAC for each channel tested: LinkedIn organic, Twitter, Reddit, newsletter, YouTube, creator referral
- Identify the 2 channels and 2 creator types producing 80% of results
- Set Quarter 2 budget based on what is working; kill everything else
- Document the 90-day learning in a growth retrospective

---

## Section 7: Growth Metrics and the Path to $150K MRR

### What $150K MRR Looks Like

$150K MRR = $1.8M ARR. This is achievable in 18-24 months from a standing start with the approach above. Here is the breakout by product:

| Product | Target MRR | # Paying Customers | Avg ACV |
|---------|------------|-------------------|---------|
| Cap Table | $60,000 | 300 customers | $200/month avg |
| SPV | $55,000 | 55 active SPVs | ~$300/SPV/month or 55 customers at $1K/month |
| 409A | $35,000 | 175 valuation requests | ~$200/request avg |
| **Total** | **$150,000** | **~530 customers** | |

### The Conversion Funnel

**Cap Table**
- Monthly unique visitors (from all channels): 20,000
- Signup rate: 5% → 1,000 signups
- Free-to-paid conversion: 8% → 80 new paying customers/month
- Churn: 3%/month
- Net new MRR per month at steady state: 80 customers x $200 = $16K/month new MRR

**SPV**
- Monthly qualified leads (angels, GPs who are actively raising): 500
- Trial start rate: 20% → 100 trials
- Trial-to-paid: 25% → 25 new paying SPV customers/month
- Churn: 5%/month (SPVs close and the customer pauses)
- Net new MRR per month: 25 x $300 = $7.5K/month

**409A**
- Monthly readiness quiz completions: 2,000
- Quiz-to-paid conversion: 3% → 60 paid valuations/month
- Repeat rate: 30% of customers order again within 12 months
- Net new MRR contribution: 60 x $200 = $12K/month

### CAC Targets

| Channel | Target CAC | LTV (12-month) | LTV:CAC Target |
|---------|------------|----------------|----------------|
| LinkedIn organic | $0-$50 | $2,400 (Cap Table) | >48:1 |
| Creator referral | $200-$600 | $2,400-$3,600 | 6:1 minimum |
| Newsletter sponsor | $400-$800 | $2,400 | 3:1 minimum |
| YouTube SEO | $100-$300 (amortized) | $2,400 | 8:1+ |

The LTV:CAC hurdle for B2B SaaS is generally 3:1 at minimum. Newsletter and creator referral hit that threshold. Organic channels are pure margin.

### Leading Indicators to Track Weekly

These are the numbers to review every Monday morning:

1. New free signups (by channel via UTM)
2. Free-to-paid conversion rate (by product)
3. Creator posts published (by creator, by platform)
4. Impressions and clicks from creator posts
5. Readiness quiz completions (409A)
6. SPV deal preview link shares (once built)
7. New paid customers (by product)
8. Churn (by product)
9. Net new MRR

If new free signups are growing and free-to-paid is flat or declining, the problem is activation (the product is not showing value fast enough). If signups are flat but conversion is good, the problem is top-of-funnel (content is not reaching enough people). These are different problems requiring different fixes.

---

## Section 8: What to Build This Week

If you have 2-3 people and you start today (2026-05-19), here is the exact prioritized action list:

**Day 1-2 (Engineering)**
1. Build the `/api/v1/share/captable-snapshot` endpoint — generates a branded PNG of a stakeholder ownership breakdown. Use the existing stakeholder data, anonymize names to "Founder 1 / Investor A / Option Pool." This is your first shareable output.
2. Build the referral code system — simple UUID-based referral links stored in the user table, tracked on signup.

**Day 3-4 (Content + Outreach)**
3. Write and schedule the first 3 LinkedIn posts (use Concepts 4, 5, 8 from Section 5).
4. Build the creator candidate list: 50 names, LinkedIn/Twitter profile, follower count, last post date, topic focus. Put it in Airtable.
5. Write 20 personalized creator outreach emails (reference their specific posts, make the pitch concrete: free access + $500/month + 20% referral share).

**Day 5 (Product)**
6. Spec and begin building the 409A readiness quiz — 5 questions, no signup required, produces a letter grade and a 3-bullet "what's missing" breakdown. This is your top-of-funnel lead gen asset.

**This week's success metric:** 3 LinkedIn posts live, 20 creator outreach emails sent, share endpoint in staging, readiness quiz wireframed.

---

## Appendix: The Key Difference From Consumer UGC

Nicole's model works at $300K MRR with 200 creators and a $15/month product because the decision friction is near-zero.

OpenCapStack's path to $150K MRR works with 20 creators and $200-500/month products because the content is trusted by a smaller, higher-value audience. One Kartik Hosanagar or one former Gunderson Dettmer attorney sharing your dilution simulator with 8,000 engaged founder followers is worth more than 50 lifestyle creators with 100K followers combined.

The playbook adapts. The principle does not change: make the product output the content, get credible people to show it to the right audience, convert the people who are already looking for exactly this.

The product is already built. The computational outputs are already rich. The gap is in surfacing those outputs in shareable, emotionally legible formats and putting them in front of the people who care most.

That is what this plan executes.
