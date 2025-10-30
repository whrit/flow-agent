#!/usr/bin/env bash

# Codex Workspace Access Validation Script
# Tests that Codex has proper workspace and platform access

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Symbols
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
WARN="${YELLOW}⚠${NC}"

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  Codex Workspace Access Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

ERRORS=0
WARNINGS=0

# 1. Check if Codex CLI is installed
echo -n "1. Checking Codex CLI installation... "
if command -v codex &> /dev/null; then
    echo -e "${CHECK}"
    CODEX_VERSION=$(codex --version 2>&1 | head -1 || echo "unknown")
    echo -e "   Version: ${CODEX_VERSION}"
else
    echo -e "${CROSS}"
    echo -e "   ${RED}Codex CLI not found${NC}"
    echo -e "   Install: ${YELLOW}brew install codex${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 2. Check Codex config directory
echo -n "2. Checking Codex config directory... "
CODEX_CONFIG_DIR="$HOME/.codex"
if [ -d "$CODEX_CONFIG_DIR" ]; then
    echo -e "${CHECK}"
    echo -e "   Location: ${CODEX_CONFIG_DIR}"
else
    echo -e "${WARN}"
    echo -e "   ${YELLOW}Config directory not found${NC}"
    echo -e "   Run 'codex --help' to create it"
    WARNINGS=$((WARNINGS + 1))
fi

# 3. Check Codex config file
echo -n "3. Checking Codex config file... "
CODEX_CONFIG_FILE="$CODEX_CONFIG_DIR/config.toml"
if [ -f "$CODEX_CONFIG_FILE" ]; then
    echo -e "${CHECK}"

    # Check for model configuration
    if grep -q "^model" "$CODEX_CONFIG_FILE" 2>/dev/null; then
        MODEL=$(grep "^model" "$CODEX_CONFIG_FILE" | head -1 | cut -d'=' -f2 | tr -d ' "')
        echo -e "   Model: ${MODEL}"
    fi
else
    echo -e "${WARN}"
    echo -e "   ${YELLOW}Config file not found${NC}"
    echo -e "   Run 'codex --help' to create default config"
    WARNINGS=$((WARNINGS + 1))
fi

# 4. Check if current project is trusted
echo -n "4. Checking current project trust status... "
CURRENT_DIR=$(pwd)
if [ -f "$CODEX_CONFIG_FILE" ]; then
    if grep -q "\[projects.\"$CURRENT_DIR\"\]" "$CODEX_CONFIG_FILE" 2>/dev/null; then
        echo -e "${CHECK}"
        echo -e "   ${GREEN}Project is trusted${NC}"
        TRUST_LEVEL=$(grep -A1 "\[projects.\"$CURRENT_DIR\"\]" "$CODEX_CONFIG_FILE" | grep "trust_level" | cut -d'=' -f2 | tr -d ' "')
        echo -e "   Trust level: ${TRUST_LEVEL}"
    else
        echo -e "${WARN}"
        echo -e "   ${YELLOW}Project not trusted${NC}"
        echo -e "   To trust: ${BLUE}cd $CURRENT_DIR && codex${NC}"
        echo -e "   (Accept trust prompt when asked)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${WARN}"
    echo -e "   ${YELLOW}Cannot verify (config file missing)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 5. Check for MCP servers
echo -n "5. Checking MCP server configuration... "
if [ -f "$CODEX_CONFIG_FILE" ]; then
    MCP_COUNT=$(grep -c "^\[mcp_servers\." "$CODEX_CONFIG_FILE" 2>/dev/null || echo "0")
    if [ "$MCP_COUNT" -gt 0 ]; then
        echo -e "${CHECK}"
        echo -e "   MCP servers configured: ${MCP_COUNT}"
        echo -e "   Servers:"
        grep "^\[mcp_servers\." "$CODEX_CONFIG_FILE" | sed 's/\[mcp_servers\.//g' | sed 's/\]//g' | while read -r server; do
            echo -e "     - ${server}"
        done
    else
        echo -e "${WARN}"
        echo -e "   ${YELLOW}No MCP servers configured${NC}"
        echo -e "   Add servers to: ${CODEX_CONFIG_FILE}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${WARN}"
    echo -e "   ${YELLOW}Cannot verify (config file missing)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 6. Check Claude Flow installation
echo -n "6. Checking Claude Flow installation... "
if command -v claude-flow &> /dev/null; then
    echo -e "${CHECK}"
    FLOW_VERSION=$(claude-flow --version 2>&1 | head -1 || echo "unknown")
    echo -e "   Version: ${FLOW_VERSION}"
else
    # Try npx
    if npx claude-flow@alpha --version &> /dev/null; then
        echo -e "${CHECK}"
        echo -e "   Available via npx"
    else
        echo -e "${CROSS}"
        echo -e "   ${RED}Claude Flow not found${NC}"
        echo -e "   Install: ${YELLOW}npm install -g claude-flow@alpha${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi

# 7. Check hive-mind session directory
echo -n "7. Checking hive-mind session directory... "
HIVE_MIND_DIR=".hive-mind/sessions"
if [ -d "$HIVE_MIND_DIR" ]; then
    echo -e "${CHECK}"
    SESSION_COUNT=$(find "$HIVE_MIND_DIR" -type f -name "*.db" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "   Active sessions: ${SESSION_COUNT}"
else
    echo -e "${WARN}"
    echo -e "   ${YELLOW}No session directory (will be created on first run)${NC}"
fi

# 8. Test Codex help command
echo -n "8. Testing Codex CLI access... "
if codex --help &> /dev/null; then
    echo -e "${CHECK}"
else
    echo -e "${CROSS}"
    echo -e "   ${RED}Cannot run 'codex --help'${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 9. Check file permissions
echo -n "9. Checking workspace write permissions... "
TEST_FILE=".codex-test-$$"
if touch "$TEST_FILE" 2>/dev/null; then
    rm -f "$TEST_FILE"
    echo -e "${CHECK}"
    echo -e "   Can write to current directory"
else
    echo -e "${CROSS}"
    echo -e "   ${RED}Cannot write to current directory${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 10. Check environment variables
echo -n "10. Checking environment... "
if [ -n "$HOME" ]; then
    echo -e "${CHECK}"
    echo -e "   HOME: $HOME"
    echo -e "   CWD: $CURRENT_DIR"
else
    echo -e "${WARN}"
    echo -e "   ${YELLOW}HOME not set${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  Validation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo -e "${GREEN}You're ready to use Codex with Hive Mind:${NC}"
    echo -e "  ${BLUE}npx claude-flow hive-mind start \"Your task\" --codex --full-auto${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation passed with warnings${NC}"
    echo -e "  Errors: ${ERRORS}"
    echo -e "  Warnings: ${WARNINGS}"
    echo ""
    echo -e "${YELLOW}You can proceed, but consider addressing warnings:${NC}"
    echo -e "  ${BLUE}npx claude-flow hive-mind start \"Your task\" --codex --full-auto${NC}"
else
    echo -e "${RED}✗ Validation failed${NC}"
    echo -e "  Errors: ${ERRORS}"
    echo -e "  Warnings: ${WARNINGS}"
    echo ""
    echo -e "${RED}Please fix errors before using Codex${NC}"
    echo -e "  See: ${BLUE}docs/codex-workspace-access.md${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Exit with error code if there are errors
if [ $ERRORS -gt 0 ]; then
    exit 1
fi

exit 0
