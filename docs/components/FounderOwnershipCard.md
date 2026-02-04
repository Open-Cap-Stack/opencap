# FounderOwnershipCard Component

**Location**: `/frontend/src/components/cap-table/FounderOwnershipCard.tsx`

**Issue**: #214 - Refactor Cap Table Dashboard - Founder-Grade Metrics

## Overview

The `FounderOwnershipCard` component displays the combined fully diluted ownership percentage for all founders in a company. It provides interactive tooltips for per-founder breakdown and educational information about fully diluted ownership.

## Features

- **Founder Ownership Display**: Shows total fully diluted ownership percentage for all founders combined
- **Per-Founder Breakdown**: Interactive tooltip showing individual founder ownership percentages
- **Educational Tooltip**: Explains "fully diluted" ownership in founder-friendly language
- **Responsive Design**: Matches existing StatCard pattern from CapTableDashboardPage
- **Accessibility**: Full keyboard navigation and ARIA labels
- **Empty State**: Graceful handling when no founders are tagged

## Usage

### Basic Usage

```tsx
import FounderOwnershipCard from '@/components/cap-table/FounderOwnershipCard';
import { capTableVisualizationService } from '@/services/capTableVisualizationService';

function CapTableDashboard() {
  const [visualizationData, setVisualizationData] = useState(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const data = await capTableVisualizationService.getVisualizationData(companyId);
      setVisualizationData(data);
    };
    loadData();
  }, [companyId]);

  if (!visualizationData) return <LoadingScreen />;

  const { ownershipBreakdown, summary } = visualizationData;

  // Create fullyDiluted object
  const fullyDiluted = {
    stakeholders: ownershipBreakdown,
    includesOptions: true,
    includesWarrants: false,
    includesConvertibleNotes: true,
    includesSAFEs: true,
    totalFullyDilutedShares: summary.fullyDilutedShares,
    calculationDate: new Date()
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <FounderOwnershipCard
        ownershipData={ownershipBreakdown}
        fullyDiluted={fullyDiluted}
        onFounderClick={(stakeholderId) => {
          console.log('Founder clicked:', stakeholderId);
          // Navigate to stakeholder detail or show modal
        }}
      />
      {/* Other stat cards */}
    </div>
  );
}
```

### Integration with CapTableDashboardPage

```tsx
import FounderOwnershipCard from '../../components/cap-table/FounderOwnershipCard';

export default function CapTableDashboardPage() {
  // ... existing code ...

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Founder Ownership Card - NEW */}
        <FounderOwnershipCard
          ownershipData={ownershipBreakdown}
          fullyDiluted={{
            stakeholders: ownershipBreakdown,
            includesOptions: true,
            includesWarrants: false,
            includesConvertibleNotes: true,
            includesSAFEs: true,
            totalFullyDilutedShares: summary.fullyDilutedShares,
            calculationDate: lastUpdated
          }}
          onFounderClick={handleStakeholderClick}
        />

        {/* Existing StatCards */}
        <StatCard
          title="Total Shares"
          value={formatNumber(summary.totalShares)}
          subtitle={`${formatNumber(summary.outstandingShares)} outstanding`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="blue"
        />
        {/* ... other cards ... */}
      </div>
    </div>
  );
}
```

## Props

### `FounderOwnershipCardProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `ownershipData` | `OwnershipData[]` | Yes | Array of ownership data for all stakeholders |
| `fullyDiluted` | `FullyDilutedCapTable` | Yes | Fully diluted cap table information |
| `onFounderClick` | `(stakeholderId: string) => void` | No | Callback when a founder name is clicked in the breakdown |

### `OwnershipData` Type

```typescript
interface OwnershipData {
  stakeholderId: string;
  stakeholderName: string;
  shares: number;
  ownershipPercentage: number;
  shareClass: string;
  value: number;
  fullyDilutedPercentage?: number;
  role?: string; // Must contain "founder" (case-insensitive) to be included
}
```

### `FullyDilutedCapTable` Type

```typescript
interface FullyDilutedCapTable {
  stakeholders: OwnershipData[];
  includesOptions: boolean;
  includesWarrants: boolean;
  includesConvertibleNotes: boolean;
  includesSAFEs: boolean;
  totalFullyDilutedShares: number;
  calculationDate: Date;
}
```

## Filtering Logic

The component filters stakeholders to identify founders using the following logic:

- Checks if the `role` field exists on the stakeholder
- Performs a **case-insensitive** substring match for "founder"
- Matches roles like: "Founder", "Co-Founder", "FOUNDER", "co-founder", etc.
- Does NOT match: "Employee", "Investor", "Advisor"

```typescript
// Examples of matching roles
"Founder"          // ✓ Matches
"Co-Founder"       // ✓ Matches
"FOUNDER"          // ✓ Matches
"co-founder"       // ✓ Matches
"founding CEO"     // ✓ Matches (contains "founding")

// Examples of non-matching roles
"Employee"         // ✗ Does not match
"Investor"         // ✗ Does not match
"CEO"              // ✗ Does not match
```

## Features

### Interactive Tooltips

1. **Founder Breakdown Tooltip** (only shown when multiple founders exist)
   - Triggered by Info icon next to "Founder Ownership" title
   - Shows list of founders with individual percentages
   - Founder names are clickable if `onFounderClick` callback is provided
   - Keyboard accessible (shows on focus)

2. **Fully Diluted Explanation Tooltip**
   - Triggered by Info icon next to the percentage value
   - Explains what "fully diluted" means in plain language
   - Founder-friendly educational content
   - Keyboard accessible (shows on focus)

### States

#### Normal State (Multiple Founders)
```
┌─────────────────────────────────────────────┐
│ Founder Ownership ⓘ                        │
│                                             │
│ 52.00% ⓘ                                    │
│ 2 founders (fully diluted)                  │
│                                             │
│                                     [Icon]  │
└─────────────────────────────────────────────┘
```

#### Single Founder State
```
┌─────────────────────────────────────────────┐
│ Founder Ownership                           │
│                                             │
│ 85.00% ⓘ                                    │
│ 1 founder (fully diluted)                   │
│                                             │
│                                     [Icon]  │
└─────────────────────────────────────────────┘
```

#### No Founders State
```
┌─────────────────────────────────────────────┐
│ Founder Ownership                           │
│                                             │
│ —                                           │
│ No founders tagged                          │
│                                             │
│                                     [Icon]  │
└─────────────────────────────────────────────┘
```

## Styling

The component uses the same styling pattern as `StatCard` from `CapTableDashboardPage.tsx`:

- **Container**: White background, rounded corners, border
- **Icon Container**: Blue theme (`bg-blue-50 text-blue-600`)
- **Typography**: Consistent with existing dashboard
- **Responsive**: Works on mobile, tablet, and desktop

## Accessibility

- ✓ Semantic HTML structure
- ✓ ARIA labels for all interactive elements
- ✓ Keyboard navigation support (Tab, Enter)
- ✓ Focus indicators on interactive elements
- ✓ Screen reader friendly tooltips
- ✓ Proper role attributes

## Testing

The component has comprehensive test coverage:

- **22 test cases** covering:
  - Rendering in various states
  - Tooltip interactions (hover and keyboard)
  - Click handlers
  - Data filtering logic
  - Edge cases (empty data, single founder, missing fields)
  - Responsive design
  - Accessibility features

Run tests:
```bash
cd frontend
npm test -- FounderOwnershipCard
```

Run with coverage:
```bash
cd frontend
npm test -- FounderOwnershipCard --coverage
```

## Example Data

### Mock Data for Testing

```typescript
const mockOwnershipData = [
  {
    stakeholderId: 'founder-1',
    stakeholderName: 'John Doe',
    shares: 500000,
    ownershipPercentage: 35.5,
    shareClass: 'Common',
    value: 500000,
    fullyDilutedPercentage: 32.2,
    role: 'Founder'
  },
  {
    stakeholderId: 'founder-2',
    stakeholderName: 'Jane Smith',
    shares: 300000,
    ownershipPercentage: 21.3,
    shareClass: 'Common',
    value: 300000,
    fullyDilutedPercentage: 19.8,
    role: 'Co-Founder'
  },
  {
    stakeholderId: 'investor-1',
    stakeholderName: 'Acme Ventures',
    shares: 200000,
    ownershipPercentage: 14.2,
    shareClass: 'Preferred',
    value: 400000,
    fullyDilutedPercentage: 13.2,
    role: 'Investor' // Will NOT be included in founder calculation
  }
];

const mockFullyDiluted = {
  stakeholders: mockOwnershipData,
  includesOptions: true,
  includesWarrants: false,
  includesConvertibleNotes: true,
  includesSAFEs: true,
  totalFullyDilutedShares: 1550000,
  calculationDate: new Date('2024-01-15')
};
```

## API Integration

The component expects data from the existing API endpoint:

```
GET /api/v1/cap-table/{companyId}/visualization
```

Response includes:
- `ownershipBreakdown`: Array of `OwnershipData`
- `summary`: Contains `fullyDilutedShares` and other metrics

No new API endpoints required - uses existing `capTableVisualizationService`.

## Related Components

- **StatCard** (`CapTableDashboardPage.tsx`) - Parent pattern
- **OwnershipDonutChart** - Sibling component showing ownership visualization
- **OwnershipTable** - Detailed ownership breakdown table

## Future Enhancements

Potential improvements for future iterations:

1. **Trend Indicators**: Show change in founder ownership over time
2. **Vesting Progress**: Include vested vs unvested breakdown
3. **Dilution Alerts**: Warn if founder ownership drops below certain thresholds
4. **Export**: Add founder ownership to CSV/PDF exports
5. **Historical View**: Compare founder ownership across funding rounds

## Notes

- Component uses fully diluted percentages by default for accuracy
- Falls back to basic ownership percentage if `fullyDilutedPercentage` is missing
- Percentages are displayed with 2 decimal precision
- Role matching is case-insensitive for flexibility
- No external dependencies beyond existing project libraries

## Related Documentation

- [Cap Table Visualization Service](/docs/services/capTableVisualizationService.md)
- [Issue #214](https://github.com/Open-Cap-Stack/opencapstack/issues/214)
- [CapTableDashboardPage](/frontend/src/pages/app/CapTableDashboardPage.tsx)
