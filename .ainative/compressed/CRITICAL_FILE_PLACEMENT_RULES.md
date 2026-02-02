# 🚨 CRITICAL FILE PLACEMENT RULES

## ABSOLUTE PROHIBITIONS

### FORBIDDEN LOCATIONS:
```
/Users/aideveloper/core/*.md  (except README.md)
/Users/aideveloper/core/src/backend/*.md
/Users/aideveloper/core/AINative-website/*.md (except README.md, CODY.md)
```

### REQUIRED LOCATIONS:
- Backend docs: `/Users/aideveloper/core/docs/{category}/filename.md`
- Frontend docs: `/Users/aideveloper/core/AINative-website/docs/{category}/filename.md`

## SCRIPT & URL RULES

### SCRIPT PLACEMENT:
- ❌ No .sh scripts in backend
- ✅ Scripts only in: `/Users/aideveloper/core/scripts/script_name.sh`

### BASE URL FORMAT:
```bash
# ✅ CORRECT
BASE_URL="https://api.ainative.studio"

# Use full paths
curl "$BASE_URL/api/v1/projects/"
```

## DOCUMENTATION CATEGORIES

### Backend Documentation Categories:

| Pattern | Destination | Example |
|---------|-------------|---------|
| `ISSUE_*`, `BUG_*` | `docs/issues/` | ISSUE_24_SUMMARY.md |
| `*_TEST*`, `QA_*` | `docs/testing/` | QA_TEST_REPORT.md |
| `AGENT_SWARM_*`, `WORKFLOW_*` | `docs/agent-swarm/` | AGENT_SWARM_WORKFLOW.md |
| `API_*`, `*_ENDPOINTS*` | `docs/api/` | API_DOCUMENTATION.md |

## ENFORCEMENT CHECKLIST

1. ✅ Check root directory status
2. ✅ Determine correct category
3. ✅ Create in correct location
4. ✅ Verify no root directory files

## CONSEQUENCES OF VIOLATIONS

- Project becomes disorganized
- Developers waste time cleaning up
- Decreased AI assistant trust
- Slowed development velocity

## VERIFICATION COMMANDS

```bash
ls /Users/aideveloper/core/*.md
ls /Users/aideveloper/core/src/backend/*.md
ls /Users/aideveloper/core/src/backend/*.sh
```

## AI ASSISTANT RESPONSIBILITIES

- Read rules before file creation
- Follow categorization guide
- Create files in correct locations
- Never create files in root directories
- Ask if unsure about categorization

🚨 THESE RULES ARE MANDATORY AND NON-NEGOTIABLE