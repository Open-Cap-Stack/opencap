#!/bin/bash
# AINative Rules Enforcement Script
# Validates code against .ainative/RULES.MD requirements

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 AINative Rules Enforcement Check"
echo "===================================="

ERRORS=0
WARNINGS=0

# Function to check for forbidden patterns
check_forbidden_patterns() {
    echo -e "\n${YELLOW}Checking for forbidden AI attributions...${NC}"

    # Check git commits for forbidden patterns
    if git log -1 --pretty=%B | grep -iE "(claude|chatgpt|copilot|anthropic|openai)" > /dev/null 2>&1; then
        echo -e "${RED}❌ VIOLATION: Third-party AI attribution found in commit message${NC}"
        echo "   Remove references to Claude, ChatGPT, Copilot, Anthropic, OpenAI"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ No forbidden AI attributions in commit${NC}"
    fi
}

# Function to check file placement
check_file_placement() {
    echo -e "\n${YELLOW}Checking file placement rules...${NC}"

    # Check for .md files in root (except README.md)
    ROOT_MDS=$(git diff --cached --name-only --diff-filter=A | grep -E '^[^/]+\.md$' | grep -v "^README.md$" || true)
    if [ -n "$ROOT_MDS" ]; then
        echo -e "${RED}❌ VIOLATION: .md files not allowed in root directory${NC}"
        echo "   Files: $ROOT_MDS"
        echo "   Move to docs/ subdirectory"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ No .md files in root${NC}"
    fi

    # Check for .sh scripts in backend (except start.sh)
    BACKEND_SCRIPTS=$(git diff --cached --name-only --diff-filter=A | grep -E '^backend/[^/]+\.sh$' | grep -v "start.sh" || true)
    if [ -n "$BACKEND_SCRIPTS" ]; then
        echo -e "${RED}❌ VIOLATION: .sh scripts not allowed in backend root${NC}"
        echo "   Files: $BACKEND_SCRIPTS"
        echo "   Move to scripts/ directory"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ No .sh scripts in backend root${NC}"
    fi
}

# Function to check test requirements
check_test_requirements() {
    echo -e "\n${YELLOW}Checking test requirements...${NC}"

    # Check if any code files are being committed
    CODE_FILES=$(git diff --cached --name-only --diff-filter=AM | grep -E '\.(js|ts|jsx|tsx|py)$' || true)

    if [ -n "$CODE_FILES" ]; then
        echo "Code files detected in commit"

        # Check if tests exist
        TEST_FILES=$(git diff --cached --name-only | grep -E '(test|spec)\.(js|ts|jsx|tsx|py)$' || true)

        if [ -z "$TEST_FILES" ]; then
            echo -e "${YELLOW}⚠️  WARNING: Code changes without test file updates${NC}"
            echo "   Consider adding tests for new functionality"
            ((WARNINGS++))
        else
            echo -e "${GREEN}✓ Test files included in commit${NC}"
        fi
    fi
}

# Function to check commit message format
check_commit_format() {
    echo -e "\n${YELLOW}Checking commit message format...${NC}"

    COMMIT_MSG=$(git log -1 --pretty=%B)

    # Check for WIP/READY/MERGE prefix for appropriate branches
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$BRANCH" =~ ^(feature|bugfix|chore)/ ]]; then
        if ! echo "$COMMIT_MSG" | grep -qE "^(WIP|READY|MERGE):" && ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|chore|docs|test|refactor):"; then
            echo -e "${YELLOW}⚠️  WARNING: Consider using WIP:/READY:/MERGE: or conventional commit prefix${NC}"
            ((WARNINGS++))
        else
            echo -e "${GREEN}✓ Commit message follows convention${NC}"
        fi
    fi
}

# Function to check for secrets
check_secrets() {
    echo -e "\n${YELLOW}Checking for secrets and PII...${NC}"

    # Check for common secret patterns
    SECRETS=$(git diff --cached -U0 | grep -iE "(password|secret|api[_-]?key|token|credentials|private[_-]?key)" | grep -vE "^(---|\\+\\+\\+)" || true)

    if [ -n "$SECRETS" ]; then
        echo -e "${YELLOW}⚠️  WARNING: Possible secrets detected in diff${NC}"
        echo "   Review carefully before committing"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓ No obvious secrets detected${NC}"
    fi
}

# Run all checks
check_forbidden_patterns
check_file_placement
check_test_requirements
check_commit_format
check_secrets

# Summary
echo -e "\n===================================="
echo "Summary:"
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}❌ ENFORCEMENT FAILED: Fix errors before committing${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  WARNINGS DETECTED: Review before proceeding${NC}"
    exit 0
else
    echo -e "\n${GREEN}✅ ALL CHECKS PASSED${NC}"
    exit 0
fi
