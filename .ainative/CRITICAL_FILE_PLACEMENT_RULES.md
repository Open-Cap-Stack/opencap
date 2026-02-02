# CRITICAL FILE PLACEMENT RULES

## ABSOLUTE PROHIBITIONS - ZERO TOLERANCE

### **YOU MUST READ THIS BEFORE CREATING ANY FILE**

**Project**: OpenCap Stack
**Path**: `/Users/juweriya/Desktop/opencapstack`

---

## RULE #1: NEVER CREATE .MD FILES IN ROOT DIRECTORIES

### COMPLETELY FORBIDDEN LOCATIONS:

```
/Users/juweriya/Desktop/opencapstack/*.md  (except README.md, CLAUDE.md)
/Users/juweriya/Desktop/opencapstack/controllers/*.md
/Users/juweriya/Desktop/opencapstack/models/*.md
/Users/juweriya/Desktop/opencapstack/routes/*.md
/Users/juweriya/Desktop/opencapstack/services/*.md
/Users/juweriya/Desktop/opencapstack/middleware/*.md
```

### REQUIRED LOCATIONS:

**ALL documentation MUST go in:**
```
/Users/juweriya/Desktop/opencapstack/docs/{category}/filename.md
```

---

## RULE #2: NEVER CREATE .SH SCRIPTS IN ROOT OR CODE DIRECTORIES

### COMPLETELY FORBIDDEN:
```
/Users/juweriya/Desktop/opencapstack/*.sh
/Users/juweriya/Desktop/opencapstack/controllers/*.sh
/Users/juweriya/Desktop/opencapstack/models/*.sh
/Users/juweriya/Desktop/opencapstack/routes/*.sh
```

### REQUIRED LOCATION:
```
/Users/juweriya/Desktop/opencapstack/scripts/script_name.sh
```

---

## RULE #3: ALWAYS USE CORRECT API BASE URL FORMAT

### INCORRECT BASE URL PATTERNS:

```bash
# WRONG: Including /api/v1 in the base URL variable
BASE_URL="http://localhost:5000/api/v1"

# Then using it like:
curl "$BASE_URL/stakeholders"  # Results in /api/v1/stakeholders
```

### CORRECT BASE URL PATTERN:

```bash
# CORRECT: Base URL is domain only
BASE_URL="http://localhost:5000"

# Then use with FULL API paths:
curl "$BASE_URL/api/v1/stakeholders"  # Explicit and clear
curl "$BASE_URL/api/v1/share-classes"  # Always shows full path
curl "$BASE_URL/health"  # Root-level endpoints also clear
```

### API ENDPOINT STRUCTURE:

```
Local Base: http://localhost:5000
Production Base: https://api.opencapstack.com (if applicable)

API v1 Endpoints:
  /api/v1/stakeholders
  /api/v1/share-classes
  /api/v1/documents
  /api/v1/activities
  /api/v1/notifications

Root Endpoints:
  /health
  /api-docs
```

---

## MANDATORY CATEGORIZATION GUIDE

### Documentation Categories

| Filename Pattern | Destination | Examples |
|-----------------|-------------|----------|
| `ISSUE_*.md`, `BUG_*.md` | `docs/issues/` | ISSUE_24_SUMMARY.md |
| `*_TEST*.md`, `QA_*.md` | `docs/testing/` | QA_TEST_REPORT.md |
| `API_*.md`, `*_ENDPOINTS*.md` | `docs/api/` | API_DOCUMENTATION.md |
| `*_IMPLEMENTATION*.md`, `*_SUMMARY.md` | `docs/reports/` | FEATURE_IMPLEMENTATION_SUMMARY.md |
| `DEPLOYMENT_*.md`, `DOCKER_*.md` | `docs/deployment/` | DEPLOYMENT_CHECKLIST.md |
| `*_GUIDE.md`, `*_INSTRUCTIONS.md` | `docs/development-guides/` | CODING_STANDARDS.md |
| `PRD_*.md`, `BACKLOG*.md`, `SPRINT_*.md` | `docs/planning/` | PRD_NEW_FEATURE.md |
| `ROOT_CAUSE_*.md`, `*_ANALYSIS.md` | `docs/issues/` | ROOT_CAUSE_ANALYSIS.md |
| `OCAE-*.md`, `OCDI-*.md`, `OCSIS-*.md` | `docs/issues/` or `docs/reports/` | OCAE-206-fix-summary.md |
| `DataModels*.md` | `docs/` | DataModels.md |

### Script Categories

| Script Type | Destination | Examples |
|------------|-------------|----------|
| Test scripts | `scripts/test_*.sh` | test_api.sh |
| Setup scripts | `scripts/setup_*.sh` | setup_dev.sh |
| Deploy scripts | `scripts/deploy_*.sh` | deploy_prod.sh |
| Migration scripts | `scripts/migrate_*.sh` | migrate_db.sh |
| Utility JS scripts | `scripts/*.js` | initZeroDB.js |

---

## ENFORCEMENT CHECKLIST

### **BEFORE creating ANY .md or .sh file, you MUST:**

1. **CHECK:** Am I creating this file in a root or code directory?
2. **STOP:** If yes, determine the correct category
3. **CREATE:** In the correct `docs/{category}/` or `scripts/` location
4. **VERIFY:** File is NOT in any forbidden directory

### **Example - CORRECT Workflow:**

```bash
# WRONG:
echo "content" > /Users/juweriya/Desktop/opencapstack/ISSUE_24_SUMMARY.md

# CORRECT:
mkdir -p /Users/juweriya/Desktop/opencapstack/docs/issues
echo "content" > /Users/juweriya/Desktop/opencapstack/docs/issues/ISSUE_24_SUMMARY.md
```

---

## CONSEQUENCES OF VIOLATIONS

### **What happens when you violate these rules:**

1. **Project becomes cluttered and disorganized**
2. **Human developers waste time cleaning up after you**
3. **Trust in AI assistants decreases**
4. **Development velocity slows down**
5. **Documentation becomes impossible to find**
6. **You will be corrected and files will be moved manually**

### **Impact on Users:**

- **Frustration:** Users get annoyed finding files in wrong locations
- **Time waste:** 30+ minutes spent reorganizing files
- **Productivity loss:** Can't find documentation quickly
- **Repetitive work:** Same cleanup needed over and over

---

## YOUR RESPONSIBILITY

As an AI assistant, you MUST:

- **READ these rules** before creating ANY file
- **FOLLOW the categorization guide** for every .md file
- **CREATE files in correct locations** from the start
- **NEVER create files in root** directories
- **ASK if unsure** about categorization

---

## VERIFICATION COMMANDS

### After creating documentation, verify:

```bash
# Check project root (should only show README.md, CLAUDE.md)
ls /Users/juweriya/Desktop/opencapstack/*.md

# Check controllers (should show NO .md files)
ls /Users/juweriya/Desktop/opencapstack/controllers/*.md

# Check scripts folder (should have all scripts)
ls /Users/juweriya/Desktop/opencapstack/scripts/
```

---

## QUICK REFERENCE

### Allowed Root Files:
- `README.md` - Project overview
- `CLAUDE.md` - Claude Code context
- `LICENSE` - License file
- `package.json` - Node.js manifest
- `app.js` - Application entry
- `db.js` - Database connection
- Configuration files (`.eslintrc`, `.prettierrc`)
- Docker files

### Everything Else:
- Documentation → `docs/{category}/`
- Scripts → `scripts/`
- Tests → `tests/`
- E2E Tests → `e2e/`

---

## THIS IS NOT A SUGGESTION - IT IS A REQUIREMENT

**These rules are MANDATORY and NON-NEGOTIABLE.**

**Every violation causes real harm to the project and wastes human time.**

**Follow these rules 100% of the time, no exceptions.**

---

Last Updated: 2026-02-02
Status: **CRITICAL - ZERO TOLERANCE**
Enforcement: **IMMEDIATE AND STRICT**
