# 🚨 CRITICAL FILE PLACEMENT RULES 🚨

## ⛔ ABSOLUTE PROHIBITIONS - ZERO TOLERANCE ⛔

### **YOU MUST READ THIS BEFORE CREATING ANY FILE**

---

## 🔴 RULE #1: NEVER CREATE .MD FILES IN ROOT DIRECTORIES

### ❌ **COMPLETELY FORBIDDEN LOCATIONS:**

```
/Users/aideveloper/core/*.md  (except README.md)
/Users/aideveloper/core/src/backend/*.md
/Users/aideveloper/core/AINative-website/*.md (except README.md, CODY.md)
```

### ✅ **REQUIRED LOCATIONS:**

**ALL backend documentation MUST go in:**
```
/Users/aideveloper/core/docs/{category}/filename.md
```

**ALL frontend documentation MUST go in:**
```
/Users/aideveloper/core/AINative-website/docs/{category}/filename.md
```

---

## 🔴 RULE #2: NEVER CREATE .SH SCRIPTS IN BACKEND

### ❌ **COMPLETELY FORBIDDEN:**
```
/Users/aideveloper/core/src/backend/*.sh (except start.sh)
```

### ✅ **REQUIRED LOCATION:**
```
/Users/aideveloper/core/scripts/script_name.sh
```

---

## 🔴 RULE #3: ALWAYS USE CORRECT BASE URL FORMAT

### ❌ **INCORRECT BASE URL PATTERNS:**

```bash
# ❌ WRONG: Including /api/v1 in the base URL variable
BASE_URL="https://api.ainative.studio/api/v1"
ZERODB_API_URL="https://api.ainative.studio/api/v1"
API_URL="https://api.ainative.studio/api/v1"
base_url = "https://api.ainative.studio/api/v1"
self.base_url = "https://api.ainative.studio/api/v1"

# Then using it like:
curl "$BASE_URL/projects/"  # Results in /api/v1/projects/ ✅ (works but inconsistent)
```

### ✅ **CORRECT BASE URL PATTERN:**

```bash
# ✅ CORRECT: Base URL is domain only
BASE_URL="https://api.ainative.studio"
ZERODB_API_URL="https://api.ainative.studio"
API_URL="https://api.ainative.studio"
base_url = "https://api.ainative.studio"
self.base_url = "https://api.ainative.studio"

# Then use with FULL API paths:
curl "$BASE_URL/api/v1/projects/"  # ✅ Explicit and clear
curl "$BASE_URL/api/v1/videos/showcase"  # ✅ Always shows full path
curl "$BASE_URL/health"  # ✅ Root-level endpoints also clear
```

### 📋 **API ENDPOINT STRUCTURE:**

Based on actual FastAPI codebase verification:

```
Production Base: https://api.ainative.studio

API v1 Endpoints:
  ✅ /api/v1/projects/
  ✅ /api/v1/videos/showcase
  ✅ /api/v1/videos/{video_id}/annotations
  ✅ /api/v1/auth/login
  ✅ /api/v1/public/projects/

Root Endpoints:
  ✅ /health
  ✅ /docs
  ✅ /redoc
```

### 🎯 **WHY THIS MATTERS:**

1. **Clarity**: Full paths are immediately visible in code
2. **Consistency**: Same pattern across all documentation
3. **Maintainability**: Easy to update if API version changes
4. **Developer Experience**: No confusion about URL construction
5. **AI Agent Training**: Clear examples for LLM learning

### 🔍 **VERIFICATION:**

Codebase source of truth:
- `src/backend/app/core/config.py:38`: `API_V1_STR = "/v1"`
- `src/backend/app/main.py:337`: `app.include_router(main_api_router, prefix=settings.API_V1_STR)`
- `src/backend/app/api/v1/endpoints/showcase_videos.py:30`: `router = APIRouter(prefix="/api/v1/videos")`

**Full URL Path**: `https://api.ainative.studio` + `/api/v1/videos/{endpoint}`

### 📝 **CORRECT EXAMPLES IN DOCUMENTATION:**

```python
# Python Example
BASE_URL = "https://api.ainative.studio"
response = requests.get(f"{BASE_URL}/api/v1/projects/")
response = requests.post(f"{BASE_URL}/api/v1/videos/{video_id}/annotations")
health = requests.get(f"{BASE_URL}/health")
```

```bash
# Bash Example
export BASE_URL="https://api.ainative.studio"
curl "$BASE_URL/api/v1/projects/"
curl "$BASE_URL/api/v1/videos/showcase"
curl "$BASE_URL/health"
```

```javascript
// JavaScript Example
const BASE_URL = 'https://api.ainative.studio';
const response = await fetch(`${BASE_URL}/api/v1/projects/`);
const videos = await fetch(`${BASE_URL}/api/v1/videos/showcase`);
const health = await fetch(`${BASE_URL}/health`);
```

---

## 📋 MANDATORY CATEGORIZATION GUIDE

### Backend Documentation Categories

| Filename Pattern | Destination | Examples |
|-----------------|-------------|----------|
| `ISSUE_*.md`, `BUG_*.md` | `docs/issues/` | ISSUE_24_SUMMARY.md |
| `*_TEST*.md`, `QA_*.md` | `docs/testing/` | QA_TEST_REPORT.md |
| `AGENT_SWARM_*.md`, `WORKFLOW_*.md`, `STAGE_*.md`, `MAX_STAGE*.md` | `docs/agent-swarm/` | AGENT_SWARM_WORKFLOW.md |
| `API_*.md`, `*_ENDPOINTS*.md`, `PAGINATION*.md` | `docs/api/` | API_DOCUMENTATION.md |
| `*_IMPLEMENTATION*.md`, `*_SUMMARY.md`, `*_COMPLETE.md` | `docs/reports/` | FEATURE_IMPLEMENTATION_SUMMARY.md |
| `DEPLOYMENT_*.md`, `RAILWAY_*.md` | `docs/deployment/` | DEPLOYMENT_CHECKLIST.md |
| `*_QUICK_*.md`, `*_REFERENCE.md`, `STEPS_*.md` | `docs/quick-reference/` | QUICK_START_GUIDE.md |
| `RLHF_*.md`, `MEMORY_*.md`, `SECURITY_*.md` | `docs/backend/` | RLHF_IMPLEMENTATION.md |
| `CODING_*.md`, `*_GUIDE.md`, `*_INSTRUCTIONS.md` | `docs/development-guides/` | CODING_STANDARDS.md |
| `PRD_*.md`, `BACKLOG*.md`, `*_PLAN.md` | `docs/planning/` | PRD_NEW_FEATURE.md |
| `ROOT_CAUSE_*.md`, `*_ANALYSIS.md` | `docs/issues/` | ROOT_CAUSE_ANALYSIS.md |
| `*_FIXES_*.md`, `CRITICAL_*.md` | `docs/reports/` | CRITICAL_FIXES_SUMMARY.md |

### Frontend Documentation Categories

| Type | Destination |
|------|-------------|
| Features | `AINative-website/docs/features/` |
| Testing | `AINative-website/docs/testing/` |
| Implementation | `AINative-website/docs/implementation/` |
| Issues | `AINative-website/docs/issues/` |
| Deployment | `AINative-website/docs/deployment/` |
| Reports | `AINative-website/docs/reports/` |

---

## 🔒 ENFORCEMENT CHECKLIST

### **BEFORE creating ANY .md or .sh file, you MUST:**

1. ✅ **CHECK:** Am I creating this file in a root directory?
2. ✅ **STOP:** If yes, determine the correct category
3. ✅ **CREATE:** In the correct `docs/{category}/` or `scripts/` location
4. ✅ **VERIFY:** File is NOT in any root directory

### **Example - CORRECT Workflow:**

```bash
# ❌ WRONG:
echo "content" > /Users/aideveloper/core/ISSUE_24_SUMMARY.md

# ✅ CORRECT:
echo "content" > /Users/aideveloper/core/docs/issues/ISSUE_24_SUMMARY.md
```

---

## ⚠️ CONSEQUENCES OF VIOLATIONS

### **What happens when you violate these rules:**

1. **Project becomes cluttered and disorganized**
2. **Human developers waste time cleaning up after you**
3. **Trust in AI assistants decreases**
4. **Development velocity slows down**
5. **Documentation becomes impossible to find**
6. **You will be corrected and files will be moved manually**

### **Impact on Users:**

- 😡 **Frustration:** Users get annoyed finding files in wrong locations
- ⏱️ **Time waste:** 30+ minutes spent reorganizing files
- 📉 **Productivity loss:** Can't find documentation quickly
- 🔄 **Repetitive work:** Same cleanup needed over and over

---

## 🎯 YOUR RESPONSIBILITY

As an AI assistant, you MUST:

- ✅ **READ these rules** before creating ANY file
- ✅ **FOLLOW the categorization guide** for every .md file
- ✅ **CREATE files in correct locations** from the start
- ✅ **NEVER create files in root** directories
- ✅ **ASK if unsure** about categorization

---

## 📝 VERIFICATION COMMANDS

### After creating documentation, verify:

```bash
# Check core root (should only show README.md)
ls /Users/aideveloper/core/*.md

# Check backend (should show NO .md files)
ls /Users/aideveloper/core/src/backend/*.md

# Check backend scripts (should only show start.sh)
ls /Users/aideveloper/core/src/backend/*.sh
```

---

## 🚨 THIS IS NOT A SUGGESTION - IT IS A REQUIREMENT

**These rules are MANDATORY and NON-NEGOTIABLE.**

**Every violation causes real harm to the project and wastes human time.**

**Follow these rules 100% of the time, no exceptions.**

---

Last Updated: December 9, 2025
Status: **CRITICAL - ZERO TOLERANCE**
Enforcement: **IMMEDIATE AND STRICT**
