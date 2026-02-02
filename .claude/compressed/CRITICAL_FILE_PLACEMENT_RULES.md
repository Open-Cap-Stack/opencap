# 🚨 CRITICAL FILE PLACEMENT RULES

## ABSOLUTE PROHIBITIONS

### FORBIDDEN LOCATIONS:
```
/Users/aideveloper/core/*.md  (except README.md)
/Users/aideveloper/core/src/backend/*.md
/Users/aideveloper/core/AINative-website/*.md (except README.md, CLAUDE.md)
```

### REQUIRED LOCATIONS:
- Backend docs: `/Users/aideveloper/core/docs/{category}/filename.md`
- Frontend docs: `/Users/aideveloper/core/AINative-website/docs/{category}/filename.md`

## SCRIPT PLACEMENT RULES
### ❌ FORBIDDEN:
```
/Users/aideveloper/core/src/backend/*.sh (except start.sh)
```

### ✅ REQUIRED:
```
/Users/aideveloper/core/scripts/script_name.sh
```

## BASE URL FORMAT

### ❌ INCORRECT:
```bash
BASE_URL="https://api.ainative.studio/api/v1"
```

### ✅ CORRECT:
```bash
BASE_URL="https://api.ainative.studio"
curl "$BASE_URL/api/v1/projects/"
```

### API ENDPOINT STRUCTURE:
- Base: `https://api.ainative.studio`
- Endpoints: 
  - `/api/v1/projects/`
  - `/api/v1/videos/showcase`
  - `/health`

## DOCUMENTATION CATEGORIZATION

### Backend Documentation Categories:

| Category | Path | Example |
|----------|------|---------|
| Issues | `docs/issues/` | ISSUE_24_SUMMARY.md |
| Testing | `docs/testing/` | QA_TEST_REPORT.md |
| Agent Swarm | `docs/agent-swarm/` | AGENT_SWARM_WORKFLOW.md |
| API | `docs/api/` | API_DOCUMENTATION.md |

### Frontend Documentation Categories:
- Features: `AINative-website/docs/features/`
- Testing: `AINative-website/docs/testing/`
- Implementation: `AINative-website/docs/implementation/`

## ENFORCEMENT CHECKLIST
1. ✅ Check root directory
2. ✅ Determine correct category
3. ✅ Create in correct location
4. ✅ Verify not in root

## CONSEQUENCES OF VIOLATIONS
- Project becomes cluttered
- Wasted developer time
- Decreased AI assistant trust
- Reduced development velocity

## VERIFICATION COMMANDS
```bash
ls /Users/aideveloper/core/*.md
ls /Users/aideveloper/core/src/backend/*.md
ls /Users/aideveloper/core/src/backend/*.sh
```

## RESPONSIBILITY
- Read rules before file creation
- Follow categorization guide
- Create files in correct locations
- Never create files in root directories

🚨 THESE RULES ARE MANDATORY AND NON-NEGOTIABLE

Last Updated: December 9, 2025
Status: CRITICAL - ZERO TOLERANCE