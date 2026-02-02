#!/bin/bash
# Claude Rules Enforcement Script
# Validates against .claude skills and standards

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🤖 Claude Rules Enforcement Check"
echo "===================================="

ERRORS=0
WARNINGS=0

# Function to check mandatory TDD requirements
check_tdd_requirements() {
    echo -e "\n${YELLOW}Checking TDD requirements (mandatory-tdd skill)...${NC}"

    CODE_FILES=$(git diff --cached --name-only --diff-filter=AM | grep -E '\.(js|ts|jsx|tsx|py)$' || true)

    if [ -n "$CODE_FILES" ]; then
        TEST_FILES=$(git diff --cached --name-only | grep -E '(test|spec)\.(js|ts|jsx|tsx|py)$' || true)

        if [ -z "$TEST_FILES" ]; then
            echo -e "${RED}❌ VIOLATION: Code without tests${NC}"
            echo "   TDD requires tests to be written FIRST"
            echo "   See: .claude/skills/mandatory-tdd/"
            ((ERRORS++))
        else
            echo -e "${GREEN}✓ Tests included${NC}"
        fi
    fi
}

# Function to check git workflow compliance
check_git_workflow() {
    echo -e "\n${YELLOW}Checking git workflow (git-workflow skill)...${NC}"

    COMMIT_MSG=$(git log -1 --pretty=%B)

    # Zero-tolerance AI attribution check
    if echo "$COMMIT_MSG" | grep -iE "(🤖|claude|anthropic|chatgpt|openai|copilot|co-authored-by: (claude|chatgpt))" > /dev/null 2>&1; then
        echo -e "${RED}❌ ZERO-TOLERANCE VIOLATION: AI attribution in commit${NC}"
        echo "   Remove ALL references to third-party AI tools"
        echo "   Use AINative branding or no attribution"
        echo "   See: .claude/skills/git-workflow/SKILL.md"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ No forbidden AI attributions${NC}"
    fi

    # Check branch naming
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if ! echo "$BRANCH" | grep -qE "^(feature|bugfix|chore)/[0-9]+-"; then
        if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
            echo -e "${YELLOW}⚠️  WARNING: Branch naming doesn't follow convention${NC}"
            echo "   Expected: feature/ID-slug, bugfix/ID-slug, chore/ID-slug"
            ((WARNINGS++))
        fi
    else
        echo -e "${GREEN}✓ Branch naming follows convention${NC}"
    fi
}

# Function to check file placement rules
check_file_placement() {
    echo -e "\n${YELLOW}Checking file placement (file-placement skill)...${NC}"

    # Check for documentation in wrong places
    ROOT_DOCS=$(git diff --cached --name-only --diff-filter=A | grep -E '^[^/]+\.(md|MD)$' | grep -vE "^(README|CODY)\.md$" || true)
    if [ -n "$ROOT_DOCS" ]; then
        echo -e "${RED}❌ VIOLATION: Documentation files in root${NC}"
        echo "   Files: $ROOT_DOCS"
        echo "   Move to docs/ subdirectory"
        echo "   See: .claude/skills/file-placement/"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ Documentation properly placed${NC}"
    fi
}

# Function to check database schema changes
check_database_schema() {
    echo -e "\n${YELLOW}Checking database schema changes (database-schema-sync skill)...${NC}"

    # Check if migration files are being added
    ALEMBIC_MIGRATIONS=$(git diff --cached --name-only | grep -E "alembic/versions/.*\.py$" || true)

    if [ -n "$ALEMBIC_MIGRATIONS" ]; then
        echo -e "${YELLOW}⚠️  WARNING: Direct Alembic migration detected${NC}"
        echo "   Prefer using scripts/sync-production-schema.py"
        echo "   See: .claude/skills/database-schema-sync/"
        ((WARNINGS++))
    fi

    # Check if schema sync script is updated when models change
    MODEL_CHANGES=$(git diff --cached --name-only | grep -E "models/.*\.py$" || true)
    SCHEMA_SYNC_CHANGES=$(git diff --cached --name-only | grep "sync-production-schema.py" || true)

    if [ -n "$MODEL_CHANGES" ] && [ -z "$SCHEMA_SYNC_CHANGES" ]; then
        echo -e "${YELLOW}⚠️  WARNING: Model changes without schema sync update${NC}"
        echo "   Consider updating scripts/sync-production-schema.py"
        ((WARNINGS++))
    fi
}

# Function to check code quality standards
check_code_quality() {
    echo -e "\n${YELLOW}Checking code quality (code-quality skill)...${NC}"

    # Check for console.log or print statements (basic check)
    DEBUG_STATEMENTS=$(git diff --cached | grep -E "^\\+.*(console\\.log|print\\()" || true)

    if [ -n "$DEBUG_STATEMENTS" ]; then
        echo -e "${YELLOW}⚠️  WARNING: Debug statements detected${NC}"
        echo "   Remove or replace with proper logging"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓ No debug statements found${NC}"
    fi
}

# Function to validate skills are accessible
check_skills_available() {
    echo -e "\n${BLUE}Checking .claude skills availability...${NC}"

    SKILLS_DIR=".claude/skills"
    if [ -d "$SKILLS_DIR" ]; then
        SKILL_COUNT=$(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
        echo -e "${GREEN}✓ $SKILL_COUNT skills available in $SKILLS_DIR${NC}"
    else
        echo -e "${YELLOW}⚠️  Skills directory not found${NC}"
    fi
}

# Run all checks
check_tdd_requirements
check_git_workflow
check_file_placement
check_database_schema
check_code_quality
check_skills_available

# Summary
echo -e "\n===================================="
echo "Summary:"
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}❌ ENFORCEMENT FAILED: Fix errors before committing${NC}"
    echo -e "\n${BLUE}Quick fixes:${NC}"
    echo "  • Remove AI attributions from commit message"
    echo "  • Add tests for code changes"
    echo "  • Move files to correct directories"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  WARNINGS DETECTED: Review before proceeding${NC}"
    exit 0
else
    echo -e "\n${GREEN}✅ ALL CHECKS PASSED${NC}"
    exit 0
fi
