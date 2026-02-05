# Tax Calculation Formulas - IRS Compliance Documentation

**Issue**: #245 - Verify Tax Calculation Math is Correct
**Last Updated**: 2026-02-05
**Status**: Verified and Documented

## Table of Contents

1. [Federal Tax Withholding](#federal-tax-withholding)
2. [FICA Taxes (Social Security and Medicare)](#fica-taxes)
3. [State Tax Withholding](#state-tax-withholding)
4. [Stock Option Tax Treatment](#stock-option-tax-treatment)
5. [Known Issues and Limitations](#known-issues-and-limitations)
6. [IRS References](#irs-references)

---

## Federal Tax Withholding

### Supplemental Wage Method

**IRS Reference**: Publication 15 (Circular E), Section 7 - Supplemental Wages

#### Formula

For supplemental wages (including stock option exercises, RSU vests, bonuses):

```
Federal Withholding = Supplemental Wages × Supplemental Rate
```

#### 2024 Rates

- **Standard Rate**: 22% (for supplemental wages ≤ $1,000,000)
- **High-Income Rate**: 37% (for supplemental wages > $1,000,000)

#### Implementation

```javascript
// For wages ≤ $1M
const FEDERAL_SUPPLEMENTAL_RATE = 0.22;
const federalWithholding = supplementalWages * FEDERAL_SUPPLEMENTAL_RATE;

// For wages > $1M (NOT YET IMPLEMENTED - see Known Issues)
const federalWithholding = (1000000 * 0.22) + ((supplementalWages - 1000000) * 0.37);
```

#### Example

```
Employee exercises NSO options:
- Exercise Price: $1.00
- FMV at Exercise: $11.00
- Shares: 10,000
- Spread: ($11 - $1) × 10,000 = $100,000

Federal Withholding = $100,000 × 22% = $22,000
```

---

## FICA Taxes

### Social Security (OASDI)

**IRS Reference**: Publication 15 (Circular E), Section 8 - Federal Insurance Contributions Act (FICA)

#### Formula

```
Social Security Tax = min(Taxable Wages, Wage Base - YTD Wages) × 6.2%
```

#### 2024 Constants

- **Rate**: 6.2%
- **Wage Base**: $168,600
- **Maximum Annual Tax**: $10,453.20

#### Implementation

```javascript
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 168600;

const cumulativeWages = ytdWages + currentWages;
let ssWages = currentWages;

if (ytdWages >= SOCIAL_SECURITY_WAGE_BASE) {
  ssWages = 0;
} else if (cumulativeWages > SOCIAL_SECURITY_WAGE_BASE) {
  ssWages = SOCIAL_SECURITY_WAGE_BASE - ytdWages;
}

const ssWithholding = ssWages * SOCIAL_SECURITY_RATE;
```

#### Example

```
Scenario 1: Below Wage Base
- Current Wages: $100,000
- YTD Wages: $50,000
- Total: $150,000 (below $168,600)
- SS Tax: $100,000 × 6.2% = $6,200

Scenario 2: Exceeds Wage Base
- Current Wages: $100,000
- YTD Wages: $150,000
- Total: $250,000 (exceeds $168,600)
- Taxable Amount: $168,600 - $150,000 = $18,600
- SS Tax: $18,600 × 6.2% = $1,153.20

Scenario 3: Already Exceeded
- Current Wages: $100,000
- YTD Wages: $170,000
- Total: $270,000 (already exceeded)
- SS Tax: $0
```

### Medicare (HI)

**IRS Reference**: Publication 15 (Circular E), Section 8

#### Formula

```
Medicare Tax = All Wages × 1.45%
```

#### 2024 Constants

- **Rate**: 1.45%
- **Wage Base**: No limit

#### Implementation

```javascript
const MEDICARE_RATE = 0.0145;
const medicareWithholding = wages * MEDICARE_RATE;
```

#### Example

```
Current Wages: $100,000
Medicare Tax: $100,000 × 1.45% = $1,450

Note: No wage cap - applies to all wages
```

### Additional Medicare Tax

**IRS Reference**: IRC Section 3101(b)(2), Publication 15 (Circular E), Section 8

#### Formula

```
Additional Medicare = max(0, Cumulative Wages - Threshold) × 0.9%
```

#### 2024 Thresholds

| Filing Status | Threshold |
|--------------|-----------|
| Single | $200,000 |
| Married Filing Jointly | $250,000 |
| Married Filing Separately | $125,000 |
| Head of Household | $200,000 |

#### Implementation

```javascript
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLDS = {
  single: 200000,
  married_filing_jointly: 250000,
  married_filing_separately: 125000,
  head_of_household: 200000
};

const threshold = ADDITIONAL_MEDICARE_THRESHOLDS[filingStatus];
const cumulativeWages = ytdWages + currentWages;

if (cumulativeWages > threshold) {
  const additionalMedicareBase = ytdWages > threshold
    ? currentWages
    : cumulativeWages - threshold;

  const additionalMedicare = additionalMedicareBase * ADDITIONAL_MEDICARE_RATE;
}
```

#### Example

```
Single Filer:
- Current Wages: $100,000
- YTD Wages: $180,000
- Total: $280,000
- Amount over threshold: $280,000 - $200,000 = $80,000
- Additional Medicare: $80,000 × 0.9% = $720

Married Filing Jointly:
- Current Wages: $100,000
- YTD Wages: $230,000
- Total: $330,000
- Amount over threshold: $330,000 - $250,000 = $80,000
- Additional Medicare: $80,000 × 0.9% = $720
```

---

## State Tax Withholding

### Supplemental Wage Rates

**Note**: State tax laws vary significantly. The implementation includes simplified rates for major states.

#### 2024 State Rates (Supplemental)

| State | Rate | Notes |
|-------|------|-------|
| California (CA) | 10.23% | Supplemental rate |
| New York (NY) | 11.25% | Supplemental rate |
| Massachusetts (MA) | 5.00% | Flat rate |
| Illinois (IL) | 4.95% | Flat rate |
| Pennsylvania (PA) | 3.07% | Flat rate |
| New Jersey (NJ) | 6.37% | Supplemental rate |
| Colorado (CO) | 4.40% | Flat rate |
| Texas (TX) | 0% | No state income tax |
| Florida (FL) | 0% | No state income tax |
| Washington (WA) | 0% | No state income tax |

#### Implementation

```javascript
const STATE_TAX_RATES = {
  CA: { rate: 0.1023, hasSupplemental: true, supplementalRate: 0.1023 },
  NY: { rate: 0.0685, hasSupplemental: true, supplementalRate: 0.1125 },
  // ... etc
};

const stateInfo = STATE_TAX_RATES[stateCode];
if (stateInfo && stateInfo.rate > 0) {
  const stateRate = stateInfo.hasSupplemental
    ? stateInfo.supplementalRate
    : stateInfo.rate;
  const stateWithholding = wages * stateRate;
}
```

#### Example

```
California Employee:
- Wages: $100,000
- CA Withholding: $100,000 × 10.23% = $10,230

Texas Employee:
- Wages: $100,000
- TX Withholding: $0 (no state income tax)
```

---

## Stock Option Tax Treatment

### Non-Qualified Stock Options (NSOs)

**IRS Reference**: Publication 525 - Taxable and Nontaxable Income

#### Tax Treatment

The **spread** (difference between FMV at exercise and exercise price) is taxed as **ordinary income** in the year of exercise.

#### Formula

```
NSO Spread = (FMV at Exercise - Exercise Price) × Shares Exercised
Ordinary Income = NSO Spread
```

#### Withholding Calculation

```javascript
const spread = fmvAtExercise - exercisePrice;
const ordinaryIncome = spread * sharesExercised;

// Subject to all payroll taxes
const federalWithholding = ordinaryIncome * 0.22;
const ssWithholding = calculateSS(ordinaryIncome, ytdWages);
const medicareWithholding = ordinaryIncome * 0.0145;
const additionalMedicare = calculateAdditionalMedicare(ordinaryIncome, ytdWages);
const stateWithholding = ordinaryIncome * stateRate;

const totalWithholding = federal + ss + medicare + additionalMedicare + state;
```

#### Example

```
NSO Exercise:
- Exercise Price: $1.00
- FMV at Exercise: $10.00
- Shares: 10,000

Spread = ($10 - $1) × 10,000 = $90,000 (ordinary income)

Withholding (Single, CA, no YTD wages):
- Federal (22%): $19,800
- State CA (10.23%): $9,207
- Social Security (6.2%): $5,580
- Medicare (1.45%): $1,305
- Total: $35,892
- Net to Employee: $54,108
```

### Incentive Stock Options (ISOs)

**IRS Reference**: IRC Section 422, Publication 525

#### Tax Treatment

ISOs receive preferential tax treatment:
- **No ordinary income** at exercise
- **No regular withholding** at exercise
- Spread is an **AMT preference item**
- Capital gains treatment on sale (if holding period met)

#### Formula

```
ISO Spread = (FMV at Exercise - Exercise Price) × Shares Exercised
AMT Income = ISO Spread (preference item)
Regular Income = $0 (at exercise)
```

#### AMT Calculation

**IRS Reference**: IRC Section 55, Form 6251

```javascript
// No regular withholding
const ordinaryIncome = 0;

// AMT preference item
const amtIncome = (fmvAtExercise - exercisePrice) * sharesExercised;

// If subject to AMT (simplified)
if (isSubjectToAMT) {
  const amtWithholding = amtIncome * 0.26; // Voluntary
}
```

**Note**: Full AMT calculation is complex and includes:
- AMT exemption amounts
- Phase-out thresholds
- 26% or 28% rate depending on income

#### Example

```
ISO Exercise:
- Exercise Price: $1.00
- FMV at Exercise: $10.00
- Shares: 10,000

Regular Tax:
- Ordinary Income: $0
- Withholding: $0

AMT (if applicable):
- AMT Income: $90,000
- AMT (26%): $23,400 (voluntary withholding)
```

### Restricted Stock Units (RSUs)

**IRS Reference**: Publication 525

#### Tax Treatment

**Full FMV** at vest is taxed as **ordinary income**.

#### Formula

```
RSU Income = FMV at Vest × Shares Vested
Ordinary Income = RSU Income
```

#### Withholding Calculation

```javascript
const ordinaryIncome = fmvAtVest * sharesVested;

// Same as NSO - subject to all payroll taxes
const totalWithholding = calculateWithholding(ordinaryIncome);
```

#### Example

```
RSU Vest:
- FMV at Vest: $50.00
- Shares Vested: 1,000

Ordinary Income = $50 × 1,000 = $50,000

Withholding (Single, CA, YTD $100k):
- Federal (22%): $11,000
- State CA (10.23%): $5,115
- Social Security (6.2%): $3,100
- Medicare (1.45%): $725
- Additional Medicare (0.9%): $0 (total < $200k)
- Total: $19,940
- Net to Employee: $30,060
```

---

## Additional Calculations

### Sell-to-Cover Shares

To cover tax withholding by selling shares:

#### Formula

```
Shares to Sell = (Total Withholding × Buffer) / Share Price
Buffer = 1.02 (2% for price fluctuation)
```

#### Implementation

```javascript
const calculateSharesToWithhold = (totalWithholding, sharePrice) => {
  const buffer = 1.02; // 2% buffer
  return Math.ceil((totalWithholding * buffer) / sharePrice);
};
```

#### Example

```
Total Withholding: $10,000
Share Price: $50.00

Shares to Sell = ($10,000 × 1.02) / $50 = 204 shares
```

### Net Amount Calculation

#### Formula

```
Net Amount = Gross Income - Total Withholding
```

#### Implementation

```javascript
const netAmount = grossAmount - totalWithholding;
```

---

## Known Issues and Limitations

### 1. Supplemental Wages Over $1 Million

**Status**: NOT IMPLEMENTED

**IRS Requirement**: For supplemental wages exceeding $1 million in a calendar year:
- First $1M: 22% rate
- Excess over $1M: 37% rate

**Current Behavior**: Applies 22% flat rate to all amounts

**Fix Required**:
```javascript
// Correct implementation needed
if (supplementalWages > 1000000) {
  const federalWithholding = (1000000 * 0.22) + ((supplementalWages - 1000000) * 0.37);
} else {
  const federalWithholding = supplementalWages * 0.22;
}
```

**Tracking**: Issue #245

### 2. AMT Calculation Simplification

**Status**: SIMPLIFIED

**IRS Requirement**: Full AMT calculation includes:
- AMT exemption amounts ($85,700 for single, $133,300 for MFJ in 2024)
- Exemption phase-out thresholds
- 26% rate up to $232,600, 28% above
- Various adjustments and preferences

**Current Behavior**: Flat 26% rate, no exemption

**Impact**: May overestimate AMT liability

**Tracking**: Issue #245

### 3. State Tax Rate Accuracy

**Status**: SIMPLIFIED

**Limitation**: State tax rates are simplified and may not reflect:
- Progressive state tax brackets
- State-specific deductions
- Local taxes
- Recent tax law changes

**Current Behavior**: Uses flat or supplemental rates for major states only

**Recommendation**: Consult state-specific tax professional for accuracy

### 4. TaxCalculator.js - Simple Multiplication

**Status**: OVERLY SIMPLIFIED

**Issue**: Line 21 uses simple multiplication:
```javascript
const CalculatedTax = SaleAmount * TaxRate;
```

**Problems**:
- No progressive tax brackets
- No distinction between ordinary income and capital gains
- No holding period consideration
- No deductions or exemptions

**Impact**: NOT accurate for actual tax liability calculations

**Use Case**: This appears to be a simplified calculator for estimates only

**Recommendation**:
- Add disclaimer that this is an estimate
- Consider implementing progressive brackets
- Add capital gains rates (0%, 15%, 20%)
- Consider QSBS exclusions for startup equity

**Tracking**: Issue #245

### 5. Capital Gains Tax Calculation

**Status**: NOT IMPLEMENTED

The system does not currently calculate capital gains tax on stock sales.

**IRS Reference**: Publication 550

**Required for**:
- NSO/ISO stock sales
- Long-term vs short-term holding periods
- QSBS exclusions (Section 1202)

**Rates**:
- Short-term: Ordinary income rates
- Long-term: 0%, 15%, or 20% depending on income
- NIIT: Additional 3.8% for high earners

**Tracking**: Future enhancement

---

## IRS References

### Primary Publications

1. **Publication 15 (Circular E)**: Employer's Tax Guide
   - Supplemental wage withholding
   - FICA tax rates and wage bases
   - Withholding methods

2. **Publication 525**: Taxable and Nontaxable Income
   - Stock option taxation
   - RSU taxation
   - Compensation income

3. **Publication 550**: Investment Income and Expenses
   - Capital gains and losses
   - Stock sales
   - Holding periods

4. **Form 6251**: Alternative Minimum Tax (AMT)
   - AMT calculation
   - Exemption amounts
   - ISO spread treatment

5. **Form W-4**: Employee's Withholding Certificate
   - Filing status
   - Additional withholding
   - Allowances

### Internal Revenue Code (IRC) Sections

- **IRC Section 422**: Incentive Stock Options
- **IRC Section 83**: Property Transferred in Connection with Performance of Services
- **IRC Section 1202**: Qualified Small Business Stock (QSBS)
- **IRC Section 3101**: FICA Employee Tax
- **IRC Section 3101(b)(2)**: Additional Medicare Tax
- **IRC Section 55**: Alternative Minimum Tax

### Online Resources

- [IRS Withholding Calculator](https://www.irs.gov/individuals/tax-withholding-estimator)
- [IRS Tax Brackets](https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2024)
- [Social Security Wage Base](https://www.ssa.gov/oact/cola/cbb.html)

---

## Testing and Verification

All formulas have been verified with comprehensive test suite:

**Test File**: `/tests/unit/services/taxCalculationFormulas.test.js`

**Test Coverage**:
- Federal supplemental wage withholding (22% rate)
- Social Security wage base cap ($168,600)
- Medicare and Additional Medicare thresholds
- NSO, ISO, and RSU tax treatment
- State tax withholding
- Edge cases and boundary conditions
- High-income scenarios
- Sell-to-cover calculations

**To Run Tests**:
```bash
npm test tests/unit/services/taxCalculationFormulas.test.js
```

---

## Compliance Statement

These tax calculations are based on 2024 IRS guidelines and federal tax law. State and local tax laws vary and may require additional considerations.

**IMPORTANT**: This documentation is for informational purposes only and does not constitute tax advice. Companies should consult with qualified tax professionals for:
- Tax compliance
- Withholding accuracy
- State and local tax requirements
- Company-specific situations

**Last Verified**: 2026-02-05
**IRS Publications Version**: 2024
**Next Review**: Annually or when tax laws change

---

## Change Log

| Date | Change | Issue |
|------|--------|-------|
| 2026-02-05 | Initial documentation with comprehensive IRS references | #245 |
| 2026-02-05 | Documented known issues with >$1M supplemental wages | #245 |
| 2026-02-05 | Documented AMT simplification limitations | #245 |
| 2026-02-05 | Added comprehensive test suite | #245 |
