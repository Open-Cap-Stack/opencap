# API Testing Requirements - MANDATORY

**ZERO TOLERANCE: Test the ACTUAL API endpoints that users will call**

## ABSOLUTE RULES - NO EXCEPTIONS

### Rule 1: ALWAYS Test the User-Facing API Endpoint

❌ **FORBIDDEN:**
- Testing provider classes directly (e.g., `MetaLLAMABaseProvider`)
- Testing service layer directly (e.g., `ManagedChatService.execute_completion()`)
- Bypassing the API endpoint "just to verify the logic works"

✅ **REQUIRED:**
- Test the ACTUAL HTTP endpoint users will call
- Use FastAPI TestClient or HTTP client
- Test complete request/response cycle including:
  - Authentication (JWT tokens, API keys)
  - Request validation
  - Response formatting
  - Error handling
  - Credit consumption tracking

### Rule 2: Test Files Must Reflect What They Test

**File naming convention:**
- `test_*_api.py` → MUST test actual API endpoints via HTTP
- `test_*_service.py` → MAY test service layer directly (but not sufficient alone)
- `test_*_provider.py` → MAY test provider layer (but not sufficient alone)

**For managed chat API:**
- ✅ `test_managed_chat_api_all_models.py` → Tests `/api/v1/managed/chat/completions`
- ❌ `test_managed_chat_service_all_models.py` → NOT sufficient (bypasses endpoint)
- ❌ `test_all_models_real_api.py` → NOT sufficient (tests providers, not API)

### Rule 3: Integration Tests MUST Use Real Endpoints

**When writing integration tests:**

```python
# ❌ WRONG - Bypassing the API
from app.services.managed_chat_service import ManagedChatService
service = ManagedChatService(db)
result = await service.execute_completion(...)

# ✅ CORRECT - Testing actual API endpoint
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
response = client.post(
    "/api/v1/managed/chat/completions",  # ACTUAL endpoint users call
    headers=auth_headers,
    json={...}
)
```

### Rule 4: Verify Complete End-to-End Flow

**Integration tests MUST verify:**
- ✅ HTTP request → routing → authentication → service → provider → response
- ✅ Credit consumption tracking in database
- ✅ Error responses (401, 402, 403, 500)
- ✅ Response format matches API spec
- ✅ All middleware executes correctly

**NOT sufficient to verify:**
- ❌ "Provider works" (user doesn't call provider directly)
- ❌ "Service works" (user doesn't call service directly)
- ❌ "Math is correct" (user needs the full API to work)

### Rule 5: Report What Was ACTUALLY Tested

**When reporting test results:**

❌ **MISLEADING:**
- "Tested all 5 models" when you only tested provider layer
- "API works" when you tested service layer
- "Integration tests pass" when you bypassed the endpoint

✅ **HONEST:**
- "Tested LLAMA 8B/70B through `/api/v1/managed/chat/completions` endpoint"
- "Provider-level tests pass, but API endpoint not yet tested"
- "Service layer verified, awaiting API endpoint integration tests"

## Enforcement Checklist

Before claiming "API tests complete," verify:

- [ ] TestClient or HTTP client used (not direct service/provider calls)
- [ ] Actual endpoint path tested (e.g., `/api/v1/managed/chat/completions`)
- [ ] Authentication headers included in requests
- [ ] HTTP status codes verified
- [ ] Response JSON format validated
- [ ] Database changes verified (credit consumption, etc.)
- [ ] Error cases tested (401, 402, 403, 500)
- [ ] Tests run successfully end-to-end

## Why This Matters

**User's perspective:**
- They call `/api/v1/managed/chat/completions` with JWT token
- They don't care if the provider works
- They don't care if the service layer works
- They ONLY care if the ACTUAL endpoint works

**Production readiness:**
- Testing provider ≠ API works
- Testing service ≠ API works
- Testing endpoint = API works ✅

## Examples

### ❌ BAD: Bypassing the API

```python
# This tests the provider, NOT the API endpoint
async def test_llama_8b():
    provider = MetaLLAMABaseProvider(model_id="Llama-3.3-8B-Instruct")
    response = await provider.meta_provider.chat_completion(...)
    assert response is not None  # ❌ User can't call this!
```

### ✅ GOOD: Testing Actual API Endpoint

```python
# This tests the ACTUAL endpoint users will call
async def test_llama_8b_api(client, auth_headers):
    response = client.post(
        "/api/v1/managed/chat/completions",  # ✅ User calls this
        headers=auth_headers,
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "preferred_model": "llama-3.3-8b-instruct"
        }
    )
    assert response.status_code == 200
    assert response.json()["model"] == "llama-3.3-8b-instruct"
```

## When Provider/Service Tests Are OK

**Provider/Service tests are SUPPLEMENTARY, not replacements:**

- ✅ Use provider tests to verify provider logic in isolation
- ✅ Use service tests to verify service logic
- ❌ DO NOT claim "API tested" based on provider/service tests
- ✅ ALWAYS add API endpoint integration tests on top

**Test pyramid:**
1. Unit tests (providers, services) ← Fast, many tests
2. Integration tests (actual API endpoints) ← Slower, fewer tests, REQUIRED
3. E2E tests (full user flow) ← Slowest, minimal tests

## Consequences of Bypassing

**If you bypass the API endpoint:**
- Authentication might be broken → Users get 401
- Request validation might fail → Users get 422
- Response format might be wrong → Users get garbage
- Credit tracking might not work → Users charged incorrectly
- Middleware might fail → Rate limiting broken

**Testing providers proves nothing about the API working.**

## ZERO TOLERANCE RULE

**If you write "API tests" that bypass the API endpoint:**
1. Tests MUST be renamed to accurately reflect what they test
2. Additional integration tests MUST be written for actual API
3. Test reports MUST clarify what was NOT tested

**No excuses. Test the fucking API endpoints.**

---

**Last Updated:** 2026-01-06
**Reason for Creation:** Wasted hours testing providers instead of actual API endpoints
**Enforcement:** MANDATORY for all API development
