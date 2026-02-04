# VotingControlCard Component

**Location**: `/frontend/src/components/cap-table/VotingControlCard.tsx`

**Issue**: #214 - Refactor Cap Table Dashboard - Founder-Grade Metrics

---

## Overview

The VotingControlCard is a KPI card component that displays voting power distribution between founders and investors. It's designed for the Cap Table Dashboard to help founders understand and track voting control as a critical decision-making metric.

---

## Features

### 1. Voting Power Display
- Shows founder voting power percentage
- Shows investor voting power percentage
- Visual progress bar showing distribution
- Control status indicator (Founders maintain control / Balanced / Investor control)

### 2. Not Configured State
- Displays when voting rights data is missing
- Shows clear CTA button to configure voting rights
- Informative empty state with icon and description

### 3. Info Tooltip
- Explains voting control importance
- Hover to display tooltip with educational content
- Positioned above the info icon

### 4. Responsive Design
- Green color theme (success = control)
- Gradient background for configured state
- Mobile-friendly layout
- Matches existing card patterns

---

## Props

```typescript
interface VotingControlCardProps {
  ownershipData: OwnershipData[];      // From ownership API endpoint
  shareClasses: ShareClassData[];      // From share classes API endpoint
  onConfigureClick?: () => void;        // Optional callback for CTA button
}
```

### ownershipData
Array of stakeholder ownership records from `/api/v1/cap-table/:companyId/ownership`

```typescript
interface OwnershipData {
  stakeholderId: string;
  stakeholderName: string;
  shares: number;
  ownershipPercentage: number;
  shareClass: string;
  value: number;
  fullyDilutedPercentage?: number;
}
```

### shareClasses
Array of share class data from `/api/v1/cap-table/:companyId/share-classes`

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

### onConfigureClick
Optional callback function triggered when user clicks "Configure Voting Rights" button in the not-configured state.

---

## Usage

### Basic Usage

```tsx
import { VotingControlCard } from '@/components/cap-table/VotingControlCard';

function CapTableDashboard() {
  const { data: ownershipData } = useQuery(['ownership'], () =>
    capTableVisualizationService.getOwnershipBreakdown(companyId)
  );

  const { data: shareClasses } = useQuery(['share-classes'], () =>
    capTableVisualizationService.getShareClassDistribution(companyId)
  );

  const handleConfigure = () => {
    navigate('/settings/share-classes');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <VotingControlCard
        ownershipData={ownershipData || []}
        shareClasses={shareClasses || []}
        onConfigureClick={handleConfigure}
      />
    </div>
  );
}
```

### With Loading State

```tsx
function CapTableDashboard() {
  const { data: ownershipData, isLoading: ownershipLoading } = useQuery(
    ['ownership'],
    () => capTableVisualizationService.getOwnershipBreakdown(companyId)
  );

  const { data: shareClasses, isLoading: classesLoading } = useQuery(
    ['share-classes'],
    () => capTableVisualizationService.getShareClassDistribution(companyId)
  );

  if (ownershipLoading || classesLoading) {
    return <SkeletonCard />;
  }

  return (
    <VotingControlCard
      ownershipData={ownershipData || []}
      shareClasses={shareClasses || []}
      onConfigureClick={() => navigate('/settings/share-classes')}
    />
  );
}
```

---

## Voting Power Calculation

### Current Implementation
The component uses a simplified heuristic for calculating voting power:

1. **Assumes 1 vote per share** (standard for most share classes)
2. **Categorizes stakeholders** by name and share class type:
   - Founders: Name contains "founder" OR share class contains "founder"
   - Investors: Share class contains "preferred" OR "series"
   - Other: Employees, advisors, etc.

3. **Calculates percentages**:
   ```
   founderVotingPower = (founderVotes / totalVotes) * 100
   investorVotingPower = (investorVotes / totalVotes) * 100
   otherVotingPower = (otherVotes / totalVotes) * 100
   ```

### Future Enhancement
For production use, the backend should provide:

```typescript
interface ShareClassData {
  // ... existing fields
  votingRightsPerShare?: number;  // e.g., 1, 10, or 0 for non-voting
}

interface OwnershipData {
  // ... existing fields
  stakeholderType?: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' | 'ADVISOR';
}
```

This would enable:
- Super-voting shares (10 votes per share)
- Non-voting preferred shares (0 votes)
- Accurate stakeholder categorization

---

## States

### 1. Configured State (votingPower.configured = true)

**Display:**
- Green gradient background (success theme)
- Shield icon in green
- Two metric boxes: Founder Control and Investor Control
- Visual progress bar showing distribution
- Status indicator with color coding:
  - Green: Founders > 50% (maintain control)
  - Yellow: Founders 40-50% (balanced)
  - Red: Founders < 40% (investor control)
- Optional "Other" percentage if > 1%

**Conditions:**
- ownershipData is not empty
- Share classes have voting configuration (currently always false in simplified version)

### 2. Not Configured State (votingPower.configured = false)

**Display:**
- Neutral gray background
- Settings icon in gray circle
- "Not Configured" heading
- Descriptive text
- "Configure Voting Rights" CTA button (if onConfigureClick provided)

**Conditions:**
- ownershipData is empty
- Share classes don't have voting rights configured

---

## Design Tokens

### Colors
- **Success theme** (founder control = positive):
  - Background gradient: `from-success-50 to-white`
  - Border: `border-success-200`
  - Icon: `text-success-600`
  - Founder box: `bg-success-100 border-success-200`
  - Progress bar (founders): `bg-success-600`

- **Investor metrics**:
  - Box background: `bg-neutral-100 border-neutral-200`
  - Progress bar: `bg-primary-500`

- **Status indicators**:
  - Maintain control: `bg-success-50 border-success-200 text-success-800`
  - Balanced: `bg-warning-50 border-warning-200 text-warning-800`
  - Investor control: `bg-error-50 border-error-200 text-error-800`

### Typography
- Card title: `text-lg font-medium`
- Metric labels: `text-sm font-medium`
- Metric values: `text-3xl font-bold`
- Status text: `text-sm`

### Spacing
- Card padding: `p-4` (header) / `pt-6` (content)
- Grid gap: `gap-4` (metrics) / `space-y-6` (sections)
- Icon spacing: `space-x-2`

---

## Accessibility

### ARIA Labels
- Tooltip has proper focus states
- Interactive elements are keyboard accessible
- Color is not the only indicator (text labels provided)

### Keyboard Navigation
- CTA button: focusable with Tab
- Info tooltip: shows on hover and focus
- Edit link: keyboard accessible

### Screen Readers
- All metrics have descriptive labels
- Status indicators include text, not just color
- Empty state has clear descriptive text

---

## Testing

### Unit Tests Needed

```typescript
describe('VotingControlCard', () => {
  describe('Voting Power Calculation', () => {
    it('should calculate founder voting power correctly');
    it('should calculate investor voting power correctly');
    it('should handle empty ownership data');
    it('should categorize stakeholders by share class');
    it('should handle 100% founder ownership');
    it('should handle 100% investor ownership');
  });

  describe('Display States', () => {
    it('should show not-configured state when data is empty');
    it('should show configured state with valid data');
    it('should display founder control status correctly');
    it('should show balanced control warning');
    it('should show investor control warning');
  });

  describe('User Interactions', () => {
    it('should call onConfigureClick when CTA button clicked');
    it('should show tooltip on info icon hover');
    it('should allow editing via edit link');
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile');
    it('should render correctly on tablet');
    it('should render correctly on desktop');
  });
});
```

### Integration Tests

```typescript
describe('VotingControlCard Integration', () => {
  it('should integrate with cap table API data');
  it('should update when ownership data changes');
  it('should navigate to configuration on CTA click');
  it('should display loading state appropriately');
});
```

---

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with responsive design

---

## Performance

- **Rendering**: O(n) where n = number of stakeholders
- **Calculation**: Single pass through ownership data
- **Re-renders**: Only when props change (React memoization recommended)

### Optimization Recommendations

```tsx
import { memo } from 'react';

export const VotingControlCard = memo(function VotingControlCard({
  ownershipData,
  shareClasses,
  onConfigureClick
}: VotingControlCardProps) {
  // ... component code
});
```

---

## Related Components

- **FounderOwnershipCard**: Shows fully diluted founder ownership %
- **OptionPoolHealthCard**: Displays option pool metrics
- **BoardControlPanel**: Shows board seat distribution
- **OwnershipDonutChart**: Visual ownership breakdown

---

## API Dependencies

### Required Endpoints
- `GET /api/v1/cap-table/:companyId/ownership`
- `GET /api/v1/cap-table/:companyId/share-classes`

### Service Methods
```typescript
import { capTableVisualizationService } from '@/services/capTableVisualizationService';

// Get ownership data
const ownershipData = await capTableVisualizationService.getOwnershipBreakdown(companyId);

// Get share class data
const shareClasses = await capTableVisualizationService.getShareClassDistribution(companyId);
```

---

## Future Enhancements

1. **Backend Voting Rights Field**
   - Add `votingRightsPerShare` to ShareClassData
   - Support super-voting shares (10x, etc.)
   - Support non-voting shares

2. **Stakeholder Type Classification**
   - Add explicit `stakeholderType` field to OwnershipData
   - Enable accurate categorization beyond heuristics

3. **Board Seat Integration**
   - Link voting control to board representation
   - Show voting power vs board control comparison

4. **Historical Tracking**
   - Chart showing voting control changes over time
   - Alerts when control drops below threshold

5. **Scenario Modeling**
   - Preview voting impact of next funding round
   - Test different investment scenarios

---

## Changelog

### v1.0.0 (2026-02-04)
- Initial implementation for Issue #214
- Voting power calculation with simplified heuristics
- Not configured state with CTA
- Info tooltip
- Green success theme
- Responsive design

---

## Support

For questions or issues:
- GitHub Issue: #214
- Component location: `/frontend/src/components/cap-table/VotingControlCard.tsx`
- Example usage: `/frontend/src/components/cap-table/VotingControlCard.example.tsx`
