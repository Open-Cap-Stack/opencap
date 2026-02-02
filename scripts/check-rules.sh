#!/bin/bash
# Unified Rules Checker
# Run this manually to validate compliance with .ainative and .claude rules

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                        ║${NC}"
echo -e "${CYAN}║        OpenCapStack Rules Compliance Checker           ║${NC}"
echo -e "${CYAN}║                                                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL_ERRORS=0
TOTAL_WARNINGS=0

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not a git repository${NC}"
    exit 1
fi

echo -e "${BLUE}Repository:${NC} $(basename "$(git rev-parse --show-toplevel)")"
echo -e "${BLUE}Branch:${NC} $(git rev-parse --abbrev-ref HEAD)"
echo -e "${BLUE}Last Commit:${NC} $(git log -1 --pretty=format:'%h - %s' 2>/dev/null || echo 'No commits yet')"
echo ""

# Function to run a checker and collect results
run_checker() {
    local name=$1
    local script=$2
    local icon=$3

    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$icon $name${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if [ -f "$script" ]; then
        if bash "$script"; then
            echo -e "${GREEN}✅ $name checks passed${NC}"
        else
            EXIT_CODE=$?
            if [ $EXIT_CODE -eq 1 ]; then
                echo -e "${RED}❌ $name checks failed${NC}"
                ((TOTAL_ERRORS++))
            else
                echo -e "${YELLOW}⚠️  $name checks had warnings${NC}"
                ((TOTAL_WARNINGS++))
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  $script not found - skipping${NC}"
        ((TOTAL_WARNINGS++))
    fi
}

# Run all checkers
run_checker "AINative Rules" ".ainative/enforce-rules.sh" "🏗️ "
run_checker "Claude Rules" ".claude/enforce-rules.sh" "🤖"

# Additional checks
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 Project Statistics${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Count various file types
JS_FILES=$(find . -name "*.js" -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l | tr -d ' ')
TS_FILES=$(find . -name "*.ts" -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l | tr -d ' ')
TEST_FILES=$(find . -name "*.test.*" -o -name "*.spec.*" -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l | tr -d ' ')
DOC_FILES=$(find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l | tr -d ' ')

echo "JavaScript files: $JS_FILES"
echo "TypeScript files: $TS_FILES"
echo "Test files: $TEST_FILES"
echo "Documentation files: $DOC_FILES"

# Check test coverage (if available)
if [ -f "package.json" ] && grep -q "\"test:coverage\"" package.json; then
    echo -e "\n${BLUE}Running test coverage check...${NC}"
    npm run test:coverage --silent 2>/dev/null || echo "Test coverage unavailable"
fi

# Final summary
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 Final Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\nTotal Errors:   ${RED}$TOTAL_ERRORS${NC}"
echo -e "Total Warnings: ${YELLOW}$TOTAL_WARNINGS${NC}"

if [ $TOTAL_ERRORS -gt 0 ]; then
    echo -e "\n${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ COMPLIANCE CHECK FAILED                            ║${NC}"
    echo -e "${RED}║                                                        ║${NC}"
    echo -e "${RED}║  Fix all errors before committing or deploying.       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    exit 1
elif [ $TOTAL_WARNINGS -gt 0 ]; then
    echo -e "\n${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  COMPLIANCE CHECK PASSED WITH WARNINGS            ║${NC}"
    echo -e "${YELLOW}║                                                        ║${NC}"
    echo -e "${YELLOW}║  Review warnings before proceeding.                   ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ COMPLIANCE CHECK PASSED                            ║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║  All rules enforced successfully!                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    exit 0
fi
