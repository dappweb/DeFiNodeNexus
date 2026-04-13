#!/bin/bash

# Quick Caddy Deployment Validator
# Checks prerequisites before deploying

set -e

DOMAIN="t1.test2dapp.xyz"
COLORS='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "ok")
            echo -e "${GREEN}✓${COLORS} $message"
            ;;
        "warn")
            echo -e "${YELLOW}⚠${COLORS} $message"
            ;;
        "error")
            echo -e "${RED}✗${COLORS} $message"
            ;;
        "info")
            echo -e "${BLUE}ℹ${COLORS} $message"
            ;;
    esac
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════${COLORS}"
echo -e "${BLUE}DeFiNodeNexus Caddy Deployment Pre-flight Check${COLORS}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${COLORS}"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Node.js
echo "Checking prerequisites..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "ok" "Node.js installed: $NODE_VERSION"
else
    print_status "error" "Node.js not found"
    ((ERRORS++))
fi

# Check 2: npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "ok" "npm installed: $NPM_VERSION"
else
    print_status "error" "npm not found"
    ((ERRORS++))
fi

# Check 3: sudo access
if sudo -n true 2>/dev/null; then
    print_status "ok" "sudo access available"
else
    print_status "warn" "sudo may require password"
    ((WARNINGS++))
fi

# Check 4: Caddy
if command -v caddy &> /dev/null; then
    CADDY_VERSION=$(caddy --version)
    print_status "ok" "Caddy installed: $CADDY_VERSION"
else
    print_status "warn" "Caddy not installed (will be installed automatically)"
    ((WARNINGS++))
fi

# Check 5: Required files
echo ""
echo "Checking project files..."

if [[ -f "package.json" ]]; then
    print_status "ok" "package.json found"
else
    print_status "error" "package.json not found"
    ((ERRORS++))
fi

if [[ -f "Caddyfile" ]]; then
    print_status "ok" "Caddyfile found"
else
    print_status "error" "Caddyfile not found"
    ((ERRORS++))
fi

if [[ -f "deploy-caddy.sh" ]]; then
    print_status "ok" "deploy-caddy.sh found"
else
    print_status "error" "deploy-caddy.sh not found"
    ((ERRORS++))
fi

# Check 6: Environment files
echo ""
echo "Checking environment configuration..."

if [[ -f ".env" ]]; then
    print_status "ok" ".env file found"
    ENV_VARS=$(grep -c "^[^#]" .env || true)
    print_status "info" "Environment variables defined: $ENV_VARS"
else
    print_status "warn" ".env file not found (will need to be created)"
    ((WARNINGS++))
fi

if [[ -f ".env.local" ]]; then
    print_status "ok" ".env.local file found"
else
    print_status "warn" ".env.local not found (optional for local development)"
fi

# Check 7: DNS resolution
echo ""
echo "Checking DNS configuration..."

if nslookup "$DOMAIN" > /dev/null 2>&1; then
    IP=$(nslookup "$DOMAIN" 2>/dev/null | grep -A1 "Name:" | grep "Address:" | tail -1 | awk '{print $2}')
    print_status "ok" "DNS resolves $DOMAIN to $IP"
else
    print_status "warn" "Cannot resolve $DOMAIN (may not be available yet)"
    ((WARNINGS++))
fi

# Check 8: Ports availability
echo ""
echo "Checking port availability..."

if ! sudo lsof -i :80 > /dev/null 2>&1; then
    print_status "ok" "Port 80 is available"
else
    print_status "warn" "Port 80 may be in use"
    ((WARNINGS++))
fi

if ! sudo lsof -i :443 > /dev/null 2>&1; then
    print_status "ok" "Port 443 is available"
else
    print_status "warn" "Port 443 may be in use"
    ((WARNINGS++))
fi

if ! sudo lsof -i :3000 > /dev/null 2>&1; then
    print_status "ok" "Port 3000 is available"
else
    print_status "warn" "Port 3000 may be in use"
    ((WARNINGS++))
fi

# Check 9: Disk space
echo ""
echo "Checking disk space..."

DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ $DISK_USAGE -lt 80 ]]; then
    print_status "ok" "Disk usage: ${DISK_USAGE}% (sufficient)"
else
    print_status "warn" "Disk usage: ${DISK_USAGE}% (may need cleanup)"
    ((WARNINGS++))
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${COLORS}"
echo "Summary:"
echo -e "  Errors:   ${RED}$ERRORS${COLORS}"
echo -e "  Warnings: ${YELLOW}$WARNINGS${COLORS}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${COLORS}"
echo ""

if [[ $ERRORS -gt 0 ]]; then
    echo -e "${RED}❌ Deployment blocked due to errors. Please fix the issues above.${COLORS}"
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Deployment can proceed, but please review warnings above.${COLORS}"
    echo ""
    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
else
    echo -e "${GREEN}✅ All checks passed! Ready for deployment.${COLORS}"
fi

# Deployment recommendation
echo ""
echo "Next steps:"
echo "1. Review Caddyfile configuration in: $(pwd)/Caddyfile"
echo "2. Ensure environment variables are properly set in .env"
echo "3. Run: ./deploy-caddy.sh"
echo ""
echo "After deployment:"
echo "4. Visit: https://$DOMAIN"
echo "5. Check logs: sudo journalctl -u nexus-nextjs.service -f"
echo "6. Check Caddy: sudo journalctl -u caddy.service -f"
