# Dilution Simulator - UI Specification

**Component**: DilutionSimulator
**Issue**: #214 - Refactor Cap Table Dashboard
**Date**: 2026-02-04

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Calculator Icon] Next-Round Dilution Simulator                │
│ Model the impact of your next funding round                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [1] Round Parameters                                            │
│                                                                 │
│ Raise Amount                                                    │
│ ┌───────────────────────────────────────────┐                  │
│ │ $ [1M, 5M, 500K...]              USD │                  │
│ └───────────────────────────────────────────┘                  │
│ Amount of capital you plan to raise (e.g., 1M, 2.5M, 500K)    │
│                                                                 │
│ Pre-Money Valuation                                             │
│ ┌───────────────────────────────────────────┐                  │
│ │ $ [10M, 25M, 50M...]             USD │                  │
│ └───────────────────────────────────────────┘                  │
│ Company valuation before the new investment                     │
│                                                                 │
│ ☐ Expand Option Pool                                           │
│   Increase option pool as part of this round (pre-money)       │
│                                                                 │
│ [If checked:]                                                   │
│   │ Option Pool Target (% post-money)                          │
│   │ ┌───────────────────┐                                      │
│   │ │ [10, 15, 20...]   % │                                      │
│   │ └───────────────────┘                                      │
│   │ Target option pool percentage after round (typically 10-20%)│
│                                                                 │
│ ────────────────────────────────────────────────────────────── │
│                                                                 │
│ [When no valid inputs:]                                         │
│ ┌───────────────────────────────────────────┐                  │
│ │ [!] Enter round details to see results    │                  │
│ │ Provide the raise amount and pre-money    │                  │
│ │ valuation to simulate dilution impact.    │                  │
│ └───────────────────────────────────────────┘                  │
│                                                                 │
│ [When valid inputs provided:]                                   │
│                                                                 │
│ [2] Simulation Results                                          │
│                                                                 │
│ ┌────────────────────┬────────────────────┐                    │
│ │ POST-MONEY VAL.    │ NEW INVESTOR OWN.  │                    │
│ │ $12M               │ 16.67%             │                    │
│ │ $10M pre + $2M     │ 2,500,000 shares   │                    │
│ └────────────────────┴────────────────────┘                    │
│                                                                 │
│ ┌───────────────────────────────────────────┐                  │
│ │ [↓] Founder Ownership Impact              │                  │
│ │                                           │                  │
│ │ Before    After      Dilution             │                  │
│ │ 64.00%    53.33%    -10.67%               │                  │
│ │                                           │                  │
│ │ Before  ████████████████████░░░░░ 64.0%   │                  │
│ │ After   █████████████░░░░░░░░░░░ 53.3%   │                  │
│ └───────────────────────────────────────────┘                  │
│                                                                 │
│ Additional Details                                              │
│ ┌───────────────────────────────────────────┐                  │
│ │ Total Shares (Current):    12,500,000     │                  │
│ │ New Shares Issued:          2,500,000     │                  │
│ │ [If option pool:]                         │                  │
│ │ Option Pool Expansion:      1,200,000     │                  │
│ │ Option Pool %:                   15.0%    │                  │
│ │ ───────────────────────────────────────   │                  │
│ │ Total Shares (Post-Round): 16,200,000     │                  │
│ └───────────────────────────────────────────┘                  │
│                                                                 │
│ ┌───────────────────────────────────────────┐                  │
│ │ [i] Note: This is a simplified simulation.│                  │
│ │ Actual dilution may vary based on         │                  │
│ │ liquidation preferences, anti-dilution    │                  │
│ │ provisions, conversion rights, and other  │                  │
│ │ term sheet provisions. Consult advisors.  │                  │
│ └───────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Scheme

### Header Section
- **Background**: Gradient from purple-50 to amber-50
- **Icon Background**: purple-100
- **Icon Color**: purple-600
- **Title**: neutral-900 (bold)
- **Subtitle**: neutral-600

### Input Section
- **Step Badge**: purple-100 background, purple-700 text
- **Input Borders**: neutral-300
- **Input Focus**: purple-500 ring
- **Labels**: neutral-700 (medium weight)
- **Help Text**: neutral-500 (small)
- **Checkbox**: purple-600 when checked

### Results Section
- **Step Badge**: amber-100 background, amber-700 text
- **Post-Money Card**: Purple gradient (purple-50 to purple-100), purple-200 border
  - Title: purple-700
  - Value: purple-900 (bold)
  - Subtitle: purple-600
- **Investor Card**: Blue gradient (blue-50 to blue-100), blue-200 border
  - Title: blue-700
  - Value: blue-900 (bold)
  - Subtitle: blue-600
- **Dilution Card**: Red-orange gradient (red-50 to orange-50), red-200 border
  - Icon: red-600
  - "Before" value: neutral-900
  - "After" value: red-700
  - Dilution value: red-600
  - Before bar: blue-600
  - After bar: red-600

### Additional Details
- **Background**: neutral-50
- **Border**: neutral-200
- **Labels**: neutral-600
- **Values**: neutral-900 (medium weight)
- **Total row**: neutral-700/900 (bold)

### Alert Messages
- **Info (no inputs)**: amber-50 background, amber-200 border, amber-600 icon, amber-900 title, amber-700 text
- **Note**: blue-50 background, blue-200 border, blue-800 text
- **Error**: red-50 background, red-200 border, red-600 icon, red-900 title, red-700 text

---

## Typography

### Header
- **Title**: text-lg (18px), font-semibold, text-neutral-900
- **Subtitle**: text-sm (14px), text-neutral-600

### Section Headers
- **Step labels**: text-sm (14px), font-medium, text-neutral-700

### Input Labels
- **Main labels**: text-sm (14px), font-medium, text-neutral-700
- **Help text**: text-xs (12px), text-neutral-500

### Metric Cards
- **Card title**: text-xs (12px), font-medium, uppercase, tracking-wide
- **Main value**: text-2xl (24px), font-bold
- **Subtitle**: text-xs (12px)

### Dilution Impact
- **Section title**: text-sm (14px), font-semibold
- **Column headers**: text-xs (12px), text-neutral-600
- **Values**: text-xl (20px), font-bold

### Additional Details
- **Section title**: text-xs (12px), font-semibold, uppercase, tracking-wide
- **Labels**: text-sm (14px), text-neutral-600
- **Values**: text-sm (14px), font-medium, text-neutral-900
- **Total**: text-sm (14px), font-bold

### Alerts
- **Title**: text-sm (14px), font-medium
- **Body**: text-sm (14px)
- **Note**: text-xs (12px), leading-relaxed

---

## Spacing

### Component Container
- **Outer**: `bg-white rounded-lg shadow-sm border border-neutral-200`
- **Padding**: None (sections have individual padding)

### Header
- **Padding**: `px-6 py-4`
- **Border**: `border-b border-neutral-200`

### Content Area
- **Padding**: `p-6`

### Sections
- **Vertical spacing**: `space-y-4` (16px)
- **Between major sections**: `mb-6` (24px)

### Input Fields
- **Vertical spacing**: `space-y-4` (16px)
- **Label margin**: `mb-2` (8px)
- **Help text margin**: `mt-1` (4px)

### Metric Cards Grid
- **Grid**: `grid-cols-1 sm:grid-cols-2`
- **Gap**: `gap-4` (16px)
- **Card padding**: `p-4` (16px)

### Dilution Impact Card
- **Padding**: `p-5` (20px)
- **Border**: `border-2`
- **Column gap**: `gap-4` (16px)
- **Visual bars spacing**: `mt-4 space-y-2`

### Additional Details
- **Padding**: `p-4` (16px)
- **Grid**: `grid-cols-2 gap-3`

---

## Interactive States

### Input Fields

**Default**:
```css
border: 1px solid neutral-300
background: white
```

**Focus**:
```css
outline: none
ring: 2px solid purple-500
border: 1px solid purple-500
```

**Hover** (not applicable for text inputs, but for buttons):
```css
background: hover:bg-neutral-50
```

### Checkbox

**Unchecked**:
```css
border: 1px solid neutral-300
background: white
```

**Checked**:
```css
background: purple-600
border: purple-600
```

**Focus**:
```css
ring: 2px solid purple-500
```

---

## Responsive Breakpoints

### Mobile (< 640px)
```css
/* Single column layout */
.grid-cols-1
/* Stack all cards vertically */
/* Full width inputs */
/* Reduce padding */
px-4 py-3
```

### Tablet (640px - 1024px)
```css
/* 2-column grid for metric cards */
.sm:grid-cols-2
/* Maintain card layouts */
/* Standard padding */
px-6 py-4
```

### Desktop (> 1024px)
```css
/* Full layout with optimal spacing */
/* All features visible */
/* Maximum readability */
```

---

## Icons

All icons from `lucide-react`:

- **Calculator**: Main header icon (purple-600, 20px)
- **TrendingDown**: Dilution impact icon (red-600, 20px)
- **AlertCircle**: Warning/info messages (amber-600/red-600, 20px)

Icon sizes:
- Header: `w-5 h-5` (20px)
- Cards: `w-5 h-5` (20px)
- Alerts: `w-5 h-5` (20px)

---

## Input Specifications

### Raise Amount Input
```html
<input
  type="text"
  placeholder="1M, 5M, 500K..."
  class="w-full pl-7 pr-12 py-2.5 border border-neutral-300 rounded-lg
         focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
/>
```
- Left padding for "$" symbol
- Right padding for "USD" label

### Pre-Money Valuation Input
```html
<input
  type="text"
  placeholder="10M, 25M, 50M..."
  class="w-full pl-7 pr-12 py-2.5 border border-neutral-300 rounded-lg
         focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
/>
```
- Identical styling to Raise Amount

### Option Pool Percentage Input
```html
<input
  type="text"
  placeholder="10, 15, 20..."
  class="w-full pr-8 py-2.5 border border-neutral-300 rounded-lg
         focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
/>
```
- Right padding for "%" symbol
- No left padding (no currency symbol)

---

## Animation/Transitions

### Input Changes
```css
/* Smooth value transitions */
transition: all 300ms ease-in-out
```

### Progress Bars
```css
/* Smooth width changes */
transition-all duration-300
/* Rounded ends */
rounded-full
```

### Card Appearance
```css
/* Fade in when results appear */
/* No explicit animation needed - React handles DOM updates */
```

---

## Empty/Loading States

### No Inputs Provided
```
┌───────────────────────────────────────────┐
│ [!] Enter round details to see results    │
│ Provide the raise amount and pre-money    │
│ valuation to simulate dilution impact.    │
└───────────────────────────────────────────┘
```
- Amber background (amber-50)
- AlertCircle icon (amber-600)
- Clear, actionable message

### Invalid Inputs
```
┌───────────────────────────────────────────┐
│ [!] Invalid inputs                         │
│ Please check your inputs and ensure all   │
│ values are valid numbers.                 │
└───────────────────────────────────────────┘
```
- Red background (red-50)
- AlertCircle icon (red-600)
- Error explanation

---

## Accessibility Features

### ARIA Labels
```html
<input id="raise-amount" aria-label="Raise Amount" />
<input id="pre-money" aria-label="Pre-Money Valuation" />
<input id="include-option-pool" type="checkbox" aria-label="Expand Option Pool" />
<input id="option-pool" aria-label="Option Pool Target" />
```

### Keyboard Navigation
- All inputs focusable via Tab
- Checkbox toggleable via Space
- No keyboard traps
- Focus indicators visible

### Screen Reader Support
- Semantic HTML structure
- Proper heading hierarchy (h3, h4, h5)
- Descriptive labels on all inputs
- Live regions for dynamic results (implicit via React)

### Color Contrast
All text meets WCAG AA standards:
- Body text: 4.5:1 minimum
- Large text: 3:1 minimum
- Icons: 3:1 minimum

---

## Component States Summary

| State | Appearance |
|-------|------------|
| **Initial Load** | Empty inputs, "Enter details" message |
| **Typing (Invalid)** | Inputs visible, no results, "Enter details" message |
| **Valid Inputs** | Inputs + full results section |
| **Option Pool Enabled** | Additional input field + expanded results |
| **Zero/Negative Input** | "Enter details" message persists |
| **Error State** | Red alert box with error explanation |

---

## Mobile Optimizations

### Touch Targets
- Minimum 44x44px for all interactive elements
- Adequate spacing between inputs
- Large, easy-to-tap checkboxes

### Input Keyboards
```html
<!-- Numeric keyboard on mobile -->
<input type="text" inputmode="decimal" />
```

### Viewport
```css
/* Responsive padding */
px-4 sm:px-6
/* Prevent horizontal scroll */
overflow-x-hidden
```

---

## Print Styles (Future)

For future PDF export feature:
```css
@media print {
  /* Hide input section, show only results */
  /* Optimize colors for grayscale */
  /* Adjust spacing for page layout */
}
```

---

## Dark Mode Support (Future)

Placeholder for dark mode theme:
```css
.dark {
  /* Invert colors */
  /* Maintain contrast ratios */
  /* Adjust gradients */
}
```

---

## Component Dimensions

### Default Width
- Full width of container (100%)
- No max-width constraint
- Responsive within parent

### Recommended Container Width
- Minimum: 320px (mobile)
- Optimal: 600-800px (desktop)
- Maximum: 1200px (dashboard context)

### Height
- Dynamic based on content
- Minimum: ~400px (no results)
- Maximum: ~800px (with results + option pool)

---

## Z-Index Layers

```css
/* No overlays or modals in this component */
/* All elements at default z-index (0) */
/* Focus rings naturally above */
```

---

This UI specification ensures consistent implementation and provides a reference for designers, developers, and QA testers working with the DilutionSimulator component.
