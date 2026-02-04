# Dilution Simulator - Integration Checklist

**Component**: DilutionSimulator
**Issue**: #214 - Refactor Cap Table Dashboard
**Target**: Cap Table Dashboard Page

---

## Pre-Integration Checklist

### 1. Verify Dependencies
- [ ] React 18+ installed
- [ ] TypeScript configured
- [ ] Tailwind CSS configured
- [ ] `lucide-react` installed
- [ ] `capTableVisualizationService` exists in project
- [ ] `OwnershipData` and `CapTableSummary` types available

### 2. Review Component Files
- [ ] Read `/frontend/src/components/cap-table/DilutionSimulator.tsx`
- [ ] Read `/frontend/src/components/cap-table/DilutionSimulator.README.md`
- [ ] Review example usage in `DilutionSimulator.example.tsx`
- [ ] Understand props interface and required data

### 3. Identify Integration Point
- [ ] Locate cap table dashboard component
- [ ] Identify where widget should be placed
- [ ] Check if `VisualizationData` is already being fetched
- [ ] Confirm data structure matches expected types

---

## Integration Steps

### Step 1: Import Component

In your cap table dashboard file (e.g., `CapTableDashboard.tsx`):

```typescript
import { DilutionSimulator } from '@/components/cap-table/DilutionSimulator';
```

**Verification**:
- [ ] Import statement added
- [ ] No TypeScript errors
- [ ] Path resolves correctly

---

### Step 2: Check Data Availability

Ensure you have access to required data:

```typescript
// You should already have something like:
const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null);

useEffect(() => {
  const fetchData = async () => {
    const data = await capTableVisualizationService.getVisualizationData(companyId);
    setVisualizationData(data);
  };
  fetchData();
}, [companyId]);
```

**Verification**:
- [ ] `visualizationData.ownershipBreakdown` exists
- [ ] `visualizationData.summary` exists
- [ ] Data structure matches `OwnershipData[]` and `CapTableSummary`

---

### Step 3: Add Component to Layout

Add the component to your dashboard layout:

```typescript
return (
  <div className="space-y-6">
    {/* Existing widgets */}
    <OwnershipDonutChart data={visualizationData.ownershipBreakdown} />

    {/* NEW: Add DilutionSimulator */}
    {visualizationData && (
      <DilutionSimulator
        currentOwnership={visualizationData.ownershipBreakdown}
        summary={visualizationData.summary}
        className="shadow-lg"
      />
    )}

    {/* Other widgets */}
  </div>
);
```

**Verification**:
- [ ] Component renders without errors
- [ ] Header and inputs are visible
- [ ] No console errors
- [ ] Layout looks correct

---

### Step 4: Test Basic Functionality

**Manual Tests**:
- [ ] Enter raise amount: "$2M"
- [ ] Enter pre-money: "$10M"
- [ ] Verify results appear
- [ ] Check "Post-Money Valuation" shows "$12M"
- [ ] Check "New Investor Ownership" shows percentage
- [ ] Check "Founder Ownership Impact" shows before/after

**Expected Results**:
- Results update in real-time as you type
- No "Calculate" button needed
- All values formatted correctly (currency, percentages)

---

### Step 5: Test Option Pool Feature

**Manual Tests**:
- [ ] Check "Expand Option Pool" checkbox
- [ ] Option pool input field appears
- [ ] Enter "15" in option pool field
- [ ] Verify additional details section shows pool expansion
- [ ] Verify dilution increases appropriately

**Expected Results**:
- Option pool input only visible when checkbox checked
- Pool percentage validates (0-100%)
- Results recalculate including pool expansion

---

### Step 6: Test Edge Cases

**Test Cases**:
- [ ] Empty inputs (should show "Enter details" message)
- [ ] Zero raise amount (should show "Enter details" message)
- [ ] Negative values (should be handled gracefully)
- [ ] Very large numbers (should not crash)
- [ ] Invalid characters in currency (should parse or default to 0)

**Expected Results**:
- No crashes or errors
- Appropriate messages displayed
- Component remains stable

---

### Step 7: Test Responsive Design

**Device Tests**:
- [ ] Desktop (1920x1080) - full layout
- [ ] Laptop (1366x768) - comfortable layout
- [ ] Tablet (768x1024) - 2-column cards
- [ ] Mobile (375x667) - single column, stacked

**Browser Tests**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Expected Results**:
- All layouts render correctly
- No horizontal scroll
- Touch targets adequate on mobile
- Text readable at all sizes

---

### Step 8: Test Accessibility

**Keyboard Tests**:
- [ ] Tab through all inputs
- [ ] Space toggles checkbox
- [ ] All inputs reachable via keyboard
- [ ] Focus indicators visible

**Screen Reader Tests** (Optional but recommended):
- [ ] VoiceOver/NVDA reads labels correctly
- [ ] Input purpose is clear
- [ ] Results are announced

**Expected Results**:
- Full keyboard accessibility
- Clear focus indicators
- Logical tab order

---

### Step 9: Performance Check

**Performance Tests**:
- [ ] Type rapidly in inputs - no lag
- [ ] Results update smoothly
- [ ] No API calls made (check Network tab)
- [ ] No memory leaks (check over time)

**Expected Results**:
- Instant calculations
- Smooth UI updates
- Zero network requests for calculations

---

### Step 10: Integration with Dashboard

**Layout Tests**:
- [ ] Component fits well in dashboard grid
- [ ] Spacing consistent with other widgets
- [ ] Colors match dashboard theme
- [ ] No layout shifts when results appear

**Recommended Layout** (from Issue #214):
```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Row 1 */}
  <OwnershipDonutChart />
  <ShareClassBreakdown />

  {/* Row 2 */}
  <DilutionSimulator />
  <DilutionImpactChart />
</div>
```

**Expected Results**:
- Clean 2-column grid on desktop
- Single column on mobile
- Equal height cards (or natural height)

---

## Post-Integration Checklist

### Code Quality
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Follows project linting rules
- [ ] Component props documented
- [ ] Error boundaries in place (optional)

### Testing
- [ ] Run unit tests: `npm test DilutionSimulator.test.tsx`
- [ ] Tests pass (25+ tests)
- [ ] Coverage above 90%
- [ ] No test failures

### Documentation
- [ ] Update dashboard documentation
- [ ] Add usage notes if needed
- [ ] Update user guide (if applicable)
- [ ] Add to component library/Storybook (if used)

### Git
- [ ] Create feature branch: `feature/issue-214-dilution-simulator`
- [ ] Commit with clear message (NO AI attribution)
- [ ] Push to remote
- [ ] Open PR referencing Issue #214

---

## Troubleshooting Guide

### Issue: Component Not Rendering

**Possible Causes**:
1. Import path incorrect
2. Data not available (null/undefined)
3. TypeScript errors preventing compilation

**Solutions**:
```typescript
// Add debug logging
console.log('Ownership data:', visualizationData?.ownershipBreakdown);
console.log('Summary data:', visualizationData?.summary);

// Add conditional rendering
{visualizationData?.ownershipBreakdown && visualizationData?.summary ? (
  <DilutionSimulator
    currentOwnership={visualizationData.ownershipBreakdown}
    summary={visualizationData.summary}
  />
) : (
  <div>Loading dilution simulator...</div>
)}
```

---

### Issue: "Property does not exist on type" Error

**Possible Cause**: Type mismatch between service and component

**Solution**:
```typescript
// Check type definitions match
import { OwnershipData, CapTableSummary } from '@/services/capTableVisualizationService';

// Verify your data structure
const ownership: OwnershipData[] = visualizationData.ownershipBreakdown;
const summary: CapTableSummary = visualizationData.summary;
```

---

### Issue: Results Not Updating

**Possible Cause**: Stale props or memoization issue

**Solution**:
```typescript
// Ensure data is fresh
useEffect(() => {
  const fetchData = async () => {
    const data = await capTableVisualizationService.getVisualizationData(companyId);
    setVisualizationData(data);
  };
  fetchData();
}, [companyId]); // Re-fetch when companyId changes
```

---

### Issue: Calculation Results Seem Wrong

**Possible Cause**: Missing fully diluted percentages or incorrect founder detection

**Solution**:
```typescript
// Check if fullyDilutedPercentage is populated
console.log('Ownership with FD:', visualizationData.ownershipBreakdown.map(o => ({
  name: o.stakeholderName,
  fd: o.fullyDilutedPercentage,
  basic: o.ownershipPercentage
})));

// Check share class names for founder detection
console.log('Share classes:', visualizationData.ownershipBreakdown.map(o => o.shareClass));
```

Component looks for "common" or "founder" in share class names. If your data uses different naming, you may need to adjust the founder detection logic.

---

### Issue: Styling Looks Off

**Possible Cause**: Tailwind classes not compiled or custom theme conflict

**Solution**:
```bash
# Rebuild Tailwind
npm run build:css

# Check if custom theme overrides purple/amber colors
# Review tailwind.config.js
```

---

### Issue: Mobile Layout Broken

**Possible Cause**: Container constraints or viewport issues

**Solution**:
```typescript
// Ensure parent container is responsive
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  <DilutionSimulator {...props} />
</div>

// Check viewport meta tag in index.html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

---

## Testing Checklist (Before PR)

### Unit Tests
- [ ] Run: `npm test DilutionSimulator.test.tsx`
- [ ] All 25+ tests pass
- [ ] Coverage > 90%
- [ ] No warnings

### Integration Tests (Manual)
- [ ] Component renders in dashboard
- [ ] Can enter raise amount
- [ ] Can enter pre-money valuation
- [ ] Results appear correctly
- [ ] Option pool toggle works
- [ ] Mobile layout works
- [ ] Desktop layout works

### Browser Tests
- [ ] Chrome ✓
- [ ] Firefox ✓
- [ ] Safari ✓
- [ ] Edge ✓

### Device Tests
- [ ] Desktop ✓
- [ ] Tablet ✓
- [ ] Mobile ✓

### Accessibility Tests
- [ ] Keyboard navigation ✓
- [ ] Focus indicators ✓
- [ ] Screen reader (optional) ✓

---

## Common Integration Patterns

### Pattern 1: Dashboard Grid
```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <DilutionSimulator {...props} />
</div>
```

### Pattern 2: Standalone Page
```typescript
<div className="max-w-5xl mx-auto p-6">
  <h1>Funding Round Simulator</h1>
  <DilutionSimulator {...props} />
</div>
```

### Pattern 3: Tab Content
```typescript
<Tabs>
  <TabPanel value="overview">...</TabPanel>
  <TabPanel value="simulator">
    <DilutionSimulator {...props} />
  </TabPanel>
</Tabs>
```

### Pattern 4: With Error Boundary
```typescript
<ErrorBoundary fallback={<ErrorMessage />}>
  <DilutionSimulator {...props} />
</ErrorBoundary>
```

---

## Performance Benchmarks

Expected performance metrics:

| Metric | Target | Acceptable |
|--------|--------|------------|
| **Initial Render** | < 100ms | < 200ms |
| **Input Response** | < 16ms (60fps) | < 33ms (30fps) |
| **Calculation Time** | < 5ms | < 10ms |
| **Memory Usage** | < 5MB | < 10MB |
| **Bundle Size** | < 8KB gzipped | < 15KB gzipped |

---

## Support & Resources

### Documentation
- Component README: `/frontend/src/components/cap-table/DilutionSimulator.README.md`
- UI Spec: `/docs/reports/DILUTION_SIMULATOR_UI_SPEC.md`
- Delivery Report: `/docs/reports/DILUTION_SIMULATOR_DELIVERY.md`

### Examples
- Usage Examples: `/frontend/src/components/cap-table/DilutionSimulator.example.tsx`

### Tests
- Unit Tests: `/frontend/src/components/cap-table/DilutionSimulator.test.tsx`

### Issue Tracking
- GitHub Issue: #214 - Refactor Cap Table Dashboard

---

## Final Verification

Before marking as complete:

- [ ] Component integrated in dashboard
- [ ] All tests passing
- [ ] Manual testing complete
- [ ] Responsive design verified
- [ ] Accessibility checked
- [ ] Documentation updated
- [ ] PR created and reviewed
- [ ] No regressions in other components
- [ ] Performance acceptable
- [ ] User feedback positive (if available)

---

## Sign-off

| Checkpoint | Status | Verified By | Date |
|------------|--------|-------------|------|
| **Code Review** | ⬜ Pending | | |
| **Testing** | ⬜ Pending | | |
| **Design Review** | ⬜ Pending | | |
| **Accessibility** | ⬜ Pending | | |
| **Performance** | ⬜ Pending | | |
| **Documentation** | ⬜ Pending | | |

---

**Integration Prepared By**: Claude Code
**Date**: February 4, 2026
**Component Version**: 1.0
**Ready for Integration**: ✅ YES

---

## Next Steps After Integration

1. **Monitor Usage**: Track how founders use the simulator
2. **Gather Feedback**: Ask users for feature requests
3. **Iterate**: Plan Phase 2 enhancements (save scenarios, PDF export)
4. **Scale**: Consider expanding to multi-round simulation
5. **Integrate**: Connect with other dashboard widgets for cohesive UX

Good luck with the integration! 🚀
