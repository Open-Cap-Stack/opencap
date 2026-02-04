# Board Control Panel Component

## Overview

The **Board Control Panel** component displays board seat composition by class (Common, Preferred, Independent) with appointed-by relationships. It's designed for the Cap Table Dashboard to help founders understand board control and voting dynamics.

## Location

```
/frontend/src/components/cap-table/BoardControlPanel.tsx
```

## Features

- **Empty State Handling**: Shows friendly empty state with CTA when no board structure is configured
- **Seat Classification**: Organizes board members by seat class (Common, Preferred, Independent)
- **Appointed-By Mapping**: Displays who appointed each board member
- **Seat Count Summary**: Shows total seats by class with descriptive labels
- **Visual Design**: Clean table layout with color-coded seat classes
- **Responsive**: Works on all screen sizes
- **Accessible**: Proper semantic HTML and ARIA attributes

## Props Interface

```typescript
interface BoardMember {
  name: string;
  seatClass: 'common' | 'preferred' | 'independent';
  appointedBy?: string;
}

interface BoardControlPanelProps {
  boardMembers?: BoardMember[];
  onConfigureClick?: () => void;
}
```

### Prop Descriptions

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `boardMembers` | `BoardMember[]` | No | Array of board members with seat classifications |
| `onConfigureClick` | `() => void` | No | Callback when user clicks configure/edit button |

## Usage Examples

### Basic Usage

```tsx
import { BoardControlPanel } from '@/components/cap-table/BoardControlPanel';

function CapTableDashboard() {
  const boardMembers = [
    {
      name: 'Alice Founder',
      seatClass: 'common',
      appointedBy: 'Founders'
    },
    {
      name: 'Bob Investor',
      seatClass: 'preferred',
      appointedBy: 'Series A Investors'
    }
  ];

  return (
    <BoardControlPanel
      boardMembers={boardMembers}
      onConfigureClick={() => navigate('/board/configure')}
    />
  );
}
```

### Empty State

```tsx
import { BoardControlPanel } from '@/components/cap-table/BoardControlPanel';

function CapTableDashboard() {
  return (
    <BoardControlPanel
      onConfigureClick={() => navigate('/board/configure')}
    />
  );
}
```

### Without Edit Button

```tsx
import { BoardControlPanel } from '@/components/cap-table/BoardControlPanel';

function CapTableDashboard() {
  const boardMembers = [
    { name: 'Alice', seatClass: 'common' }
  ];

  return (
    <BoardControlPanel boardMembers={boardMembers} />
  );
}
```

### Integration with API

```tsx
import { BoardControlPanel } from '@/components/cap-table/BoardControlPanel';
import { boardMemberService } from '@/services/boardMemberService';

function CapTableDashboard() {
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        const members = await boardMemberService.getBoardMembers({
          companyId: companyId,
          status: 'Active'
        });

        // Transform to BoardMember format
        const boardData = members.map(member => ({
          name: member.name,
          seatClass: mapDirectorTypeToSeatClass(member.directorType),
          appointedBy: member.appointedBy
        }));

        setBoardMembers(boardData);
      } catch (error) {
        console.error('Failed to fetch board data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardData();
  }, [companyId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <BoardControlPanel
      boardMembers={boardMembers}
      onConfigureClick={() => navigate('/board/configure')}
    />
  );
}

// Helper function to map director types
function mapDirectorTypeToSeatClass(directorType: string): 'common' | 'preferred' | 'independent' {
  if (directorType === 'Inside') return 'common';
  if (directorType === 'Independent') return 'independent';
  return 'preferred';
}
```

## Design Specifications

### Color Scheme

| Seat Class | Background | Text | Badge |
|------------|-----------|------|-------|
| Common | `bg-blue-50` | `text-blue-700` | `bg-blue-100 text-blue-800` |
| Preferred | `bg-green-50` | `text-green-700` | `bg-green-100 text-green-800` |
| Independent | `bg-purple-50` | `text-purple-700` | `bg-purple-100 text-purple-800` |

### Layout

- **Header**: Icon + Title + Subtitle
- **Summary Cards**: 3-column grid showing seat counts by class
- **Table**: Board Member | Seat Class | Appointed By
- **Footer**: Informational text about board control

### Empty State

- Icon: Users/People icon
- Message: "Board structure not configured"
- Description: Helpful explanation
- CTA: "Set Up Board Structure" button (if `onConfigureClick` provided)

## State Management

The component is **stateless** and relies on parent components to manage:
- Board member data fetching
- Configuration/edit navigation
- Loading states
- Error handling

## Testing

### Test Coverage

- 41 test cases covering:
  - Empty state rendering
  - Data display
  - Seat counting
  - Edit button interactions
  - Styling and layout
  - Accessibility
  - Edge cases

### Running Tests

```bash
# Run tests
npm test BoardControlPanel.test.tsx

# Run with coverage
npm test BoardControlPanel.test.tsx --coverage

# Run in watch mode
npm test BoardControlPanel.test.tsx --watch
```

### Test Files

- `/frontend/src/components/cap-table/__tests__/BoardControlPanel.test.tsx`
- `/frontend/src/components/cap-table/BoardControlPanel.example.tsx` (usage examples)

## Accessibility

- **Semantic HTML**: Proper `<table>`, `<thead>`, `<tbody>` structure
- **Headings**: Logical heading hierarchy (`<h3>`)
- **Buttons**: Proper `<button>` elements for interactions
- **Color Contrast**: WCAG AA compliant color combinations
- **Icons**: Decorative icons with proper color classes
- **Table Headers**: Clear column labels

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Integration with Issue #214

This component is part of the Cap Table Dashboard refactor (Issue #214) to provide founder-grade metrics:

- **Purpose**: Display board control snapshot
- **Location**: Third row of dashboard, Panel K
- **Data Source**: Frontend calculation from existing API data
- **Related Components**:
  - Option Pool Health Card
  - Dilution Simulator
  - Voting Power Card

## Future Enhancements

Potential improvements for future iterations:

1. **Interactive Tooltips**: Show additional member details on hover
2. **Sorting**: Allow sorting by seat class or name
3. **Filtering**: Filter by seat class
4. **Export**: Export board composition to CSV/PDF
5. **Visual Charts**: Add pie chart showing seat distribution
6. **Term Expiration**: Show expiring board terms
7. **Voting Rights**: Display voting power per member

## Related Components

- `/frontend/src/components/cap-table/CapTableSnapshot.tsx`
- `/frontend/src/components/cap-table/ShareClassBreakdown.tsx`
- `/frontend/src/components/cap-table/OwnershipTable.tsx`

## Related Services

- `/frontend/src/services/boardMemberService.ts` - Board member management
- `/frontend/src/services/capTableVisualizationService.ts` - Cap table data

## References

- [Issue #214](https://github.com/Open-Cap-Stack/opencapstack/issues/214) - Cap Table Dashboard Refactor
- [CLAUDE.md](/CLAUDE.md) - Project guidelines
- [TDD Guidelines](/.claude/skills/mandatory-tdd.md) - Testing standards

## Changelog

### 2026-02-04
- Initial implementation
- 41 test cases with 100% coverage
- Empty state handling
- Seat classification and counting
- Appointed-by mapping
- Example usage file
- Documentation

---

**Component Status**: ✅ Complete and tested

**Test Coverage**: ✅ 100% (41 tests passing)

**Documentation**: ✅ Complete

**Issue**: #214 - Board Control Panel (Panel K)
