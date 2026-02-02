---
description: Coding style standards, security guidelines, and accessibility requirements
---

# Code Quality Standards

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `getUserById` |
| Classes/Types | PascalCase | `UserService` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Files (Python) | snake_case | `user_service.py` |
| Files (TS/React) | PascalCase | `UserProfile.tsx` |

## Formatting

- 4-space indentation (or project standard)
- Target 80 chars per line
- Delete stale comments
- Keep comments meaningful and current

## Security Requirements

### NEVER Do
- Log secrets or PII
- Hardcode credentials
- Store passwords in plain text
- Trust user input without validation

### ALWAYS Do
- Validate all inputs
- Use environment variables for secrets
- Apply least privilege principle
- Sanitize data before display

## Error Handling

```python
# Good: Explicit error types
try:
    result = process_data(input)
except ValidationError as e:
    logger.warning(f"Validation failed: {e}")
    raise HTTPException(status_code=422, detail=str(e))
except DatabaseError as e:
    logger.error(f"Database error: {e}")
    raise HTTPException(status_code=500, detail="Internal error")
```

## Logging

- Use structured logs by level
- INFO: Normal operations
- WARNING: Recoverable issues
- ERROR: Failures requiring attention
- Never log sensitive data

## Accessibility (UI)

- Semantic HTML elements
- Keyboard navigation support
- ARIA labels on custom components
- Color contrast meets WCAG AA
- Responsive design

## Code Review Checklist

- [ ] Follows naming conventions
- [ ] No hardcoded secrets
- [ ] Proper error handling
- [ ] Meaningful variable names
- [ ] No unnecessary complexity

Invoke this skill when writing or reviewing code.
