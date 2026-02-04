# LiquidationPreferenceCard Component

## Overview

The `LiquidationPreferenceCard` component displays the total liquidation preference stack for a company's cap table, showing the amount that must be paid to preferred shareholders before common shareholders receive any proceeds in a liquidation event.

**Issue**: #214 - Refactor Cap Table Dashboard - Founder-Grade Metrics (Frontend Only)

## Purpose

This component helps founders and executives understand:
- The total liquidation preference overhang
- Round-by-round breakdown of investor preferences
- Terms (1x non-participating, 2x participating, etc.)
- Impact on exit scenarios for common equity holders

## Features

- **Total Preference Display**: Shows total liquidation preference in prominent, formatted currency
- **Empty State Handling**: Graceful display when no funding rounds exist
- **Expandable Details**: Round-by-round breakdown with dates and amounts
- **Term Configuration Warning**: Alerts when using default terms
- **Educational Content**: Explains liquidation preference concepts
- **Responsive Design**: Works on mobile and desktop
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels

## Component Location

```
/frontend/src/components/cap-table/LiquidationPreferenceCard.tsx
```

## Props Interface

```typescript
interface LiquidationPreferenceCardProps {
  shareClasses: ShareClassData[];        // Share class distribution
  dilutionHistory: DilutionEvent[];      // Dilution events including funding rounds
  onConfigureClick?: () => void;         // Optional callback for configuration
  className?: string;                     // Optional custom styling
}
```

### ShareClassData Type

```typescript
interface ShareClassData {
  className: string;
  shares: number;
  percentage: number;
  color: string;
  authorized: number;
  outstanding: number;
  type: 'common' | 'preferred' | 'convertible';
}
```

### DilutionEvent Type

```typescript
interface DilutionEvent {
  eventId: string;
  date: Date;
  type: 'funding_round' | 'option_pool' | 'safe_conversion' | 'stock_split' | 'exercise';
  description: string;
  dilutionPercentage: number;
  stakeholderImpact: Record<string, number>;
  sharesIssued: number;
  pricePerShare?: number;
  totalValue?: number;
}
```

## Usage Examples

### Basic Usage

```tsx
import React, { useEffect, useState } from 'react';
import LiquidationPreferenceCard from './components/cap-table/LiquidationPreferenceCard';
import { capTableVisualizationService } from './services/capTableVisualizationService';

function CapTableDashboard() {
  const [shareClasses, setShareClasses] = useState([]);
  const [dilutionHistory, setDilutionHistory] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await capTableVisualizationService.getVisualizationData('company-id');
    setShareClasses(data.shareClassDistribution);
    setDilutionHistory(data.dilutionHistory);
  };

  return (
    <div className="p-6">
      <LiquidationPreferenceCard
        shareClasses={shareClasses}
        dilutionHistory={dilutionHistory}
      />
    </div>
  );
}
```

### With Configuration Handler

```tsx
function DashboardWithConfig() {
  const handleConfigure = () => {
    // Navigate to configuration page or open modal
    router.push('/settings/liquidation-preferences');
  };

  return (
    <LiquidationPreferenceCard
      shareClasses={shareClasses}
      dilutionHistory={dilutionHistory}
      onConfigureClick={handleConfigure}
    />
  );
}
```

### In Dashboard Grid

```tsx
function MetricsDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <OwnershipCard />
      <OptionPoolCard />
      <div className="lg:col-span-2">
        <LiquidationPreferenceCard
          shareClasses={shareClasses}
          dilutionHistory={dilutionHistory}
          onConfigureClick={handleConfigure}
        />
      </div>
    </div>
  );
}
```

## Calculation Logic

The component calculates liquidation preference as follows:

```typescript
// Filter funding rounds with totalValue
const fundingRounds = dilutionHistory.filter(
  event => event.type === 'funding_round' && event.totalValue
);

// Calculate preference for each round
const terms = fundingRounds.map(round => ({
  roundName: round.description,
  date: round.date,
  amount: round.totalValue * liquidationMultiple, // Default: 1x
  multiple: liquidationMultiple,                   // Default: 1
  participating: isParticipating                   // Default: false
}));

// Sum total preference
const total = terms.reduce((sum, term) => sum + term.amount, 0);
```

### Default Assumptions

- **Liquidation Multiple**: 1x (standard)
- **Participation**: Non-participating
- **Preference Order**: Chronological by round date

## States

### 1. Empty State
Displayed when no funding rounds exist:
- Amber-themed warning
- Educational message
- Configure CTA (if callback provided)

### 2. Data Display State
Displayed when funding rounds exist:
- Red-themed for risk indication
- Total preference amount
- Terms configuration warning
- Expandable details section

### 3. Expanded State
Shows detailed breakdown:
- Round-by-round preference amounts
- Dates and terms for each round
- Total preference summary
- Educational information panel
- Configure CTA (if callback provided)

## Visual Design

### Color Scheme

- **Primary**: Red (#DC2626) - Indicates risk/priority
- **Warning**: Amber (#D97706) - Empty state or missing terms
- **Info**: Blue (#2563EB) - Educational content
- **Background**: White with gray borders

### Typography

- **Title**: 18px (lg), semibold
- **Amount**: 36px (4xl), bold
- **Labels**: 14px (sm), medium
- **Descriptions**: 14px (sm), regular

### Icons

- **Main**: Dollar sign in red circle
- **Warning**: Triangle alert
- **Info**: Circle with 'i'
- **Expand**: Chevron down (rotates)

## Accessibility Features

- **ARIA Labels**: All interactive elements labeled
- **Semantic HTML**: Proper heading hierarchy (h3, h4)
- **Keyboard Navigation**: All actions keyboard accessible
- **Focus States**: Visible focus indicators
- **Screen Reader Support**: Descriptive text for all elements

## Responsive Behavior

- **Mobile**: Single column, stacked layout
- **Tablet**: Maintains single column
- **Desktop**: Full width with proper spacing
- **Large Screens**: Max-width constraint for readability

## Testing

### Test Coverage

- ✅ 33 passing tests
- ✅ Component rendering
- ✅ Empty state handling
- ✅ Calculation logic
- ✅ Expandable sections
- ✅ Currency formatting
- ✅ Configure actions
- ✅ Accessibility
- ✅ Edge cases

### Running Tests

```bash
cd frontend
npm test -- LiquidationPreferenceCard.test.tsx
```

### Test Files

- Component: `/frontend/src/components/cap-table/LiquidationPreferenceCard.tsx`
- Tests: `/frontend/src/__tests__/components/cap-table/LiquidationPreferenceCard.test.tsx`
- Examples: `/frontend/src/components/cap-table/LiquidationPreferenceCard.example.tsx`

## Integration Points

### Services Used

- `capTableVisualizationService` - Fetch cap table data
- Data from `/api/v1/cap-table/{companyId}/visualization`

### Related Components

- `OwnershipDonutChart` - Ownership visualization
- `ShareClassBreakdown` - Share class details
- `DilutionImpactChart` - Dilution analysis
- `CapTableSnapshot` - Point-in-time cap table

### Navigation

When `onConfigureClick` is provided:
- Navigate to liquidation preference settings
- Open configuration modal
- Trigger funding round creation flow

## Future Enhancements

### Planned Features

1. **Custom Terms Configuration**
   - Set liquidation multiples per round
   - Toggle participating/non-participating
   - Capped participation amounts

2. **Waterfall Simulation**
   - Show payout distribution at various exit values
   - Visualize preference stack impact
   - Common vs preferred payout comparison

3. **Term Variations**
   - Seniority preferences (Series B over Series A)
   - Pari passu preferences
   - Multiple liquidation preferences

4. **Export Functionality**
   - PDF report generation
   - CSV data export
   - Share via email

5. **Real-time Updates**
   - WebSocket updates for funding events
   - Notification of term changes
   - Collaborative editing

## Performance Considerations

- **Memoization**: Uses `useMemo` for calculations
- **Lazy Rendering**: Expanded section only renders when opened
- **Efficient Re-renders**: Proper dependency arrays
- **Optimized Filtering**: Single pass through dilution history

## Known Limitations

1. **Default Terms**: Currently uses 1x non-participating for all rounds
2. **No Seniority**: Doesn't support preference ordering beyond chronological
3. **Simple Calculation**: Doesn't handle capped participation
4. **Static Multiples**: Multiples are not yet configurable via UI

## Related Documentation

- [Issue #214](https://github.com/Open-Cap-Stack/opencapstack/issues/214)
- [Cap Table Visualization Service](/docs/frontend/services/CapTableVisualizationService.md)
- [Dilution Event Types](/docs/frontend/types/DilutionEvent.md)
- [Share Class Data Model](/docs/frontend/types/ShareClassData.md)

## Support

For questions or issues:
- Check test file for usage examples
- Review example file for integration patterns
- See related components for similar patterns
- Consult cap table visualization service documentation

---

**Component Status**: ✅ Complete and Tested
**Last Updated**: 2026-02-04
**Author**: OpenCapStack Team
**Issue**: #214
