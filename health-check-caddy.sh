#!/bin/bash

# Caddy Deployment Health Check
# Monitor deployed services

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
        "fail")
            echo -e "${RED}✗${COLORS} $message"
            ;;
        "warn")
            echo -e "${YELLOW}⚠${COLORS} $message"
            ;;
    esac
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════${COLORS}"
echo -e "${BLUE}DeFiNodeNexus Deployment Health Check${COLORS}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${COLORS}"
echo ""

ISSUES=0

# Check 1: Next.js service
echo "🔄 Checking services..."
if sudo systemctl is-active --quiet nexus-nextjs.service; then
    print_status "ok" "Next.js service is running"
else
    print_status "fail" "Next.js service is not running"
    ((ISSUES++))
fi

# Check 2: Caddy service
if sudo systemctl is-active --quiet caddy.service; then
    print_status "ok" "Caddy service is running"
else
    print_status "fail" "Caddy service is not running"
    ((ISSUES++))
fi

# Check 3: Port 3001 (Next.js)
echo ""
echo "📡 Checking ports..."
if sudo lsof -i :3001 > /dev/null 2>&1; then
    print_status "ok" "Port 3001 is listening (Next.js)"
else
    print_status "warn" "Port 3001 is not listening (Next.js may not have started)"
    ((ISSUES++))
fi

# Check 4: Port 80 (HTTP)
if sudo lsof -i :80 > /dev/null 2>&1; then
    print_status "ok" "Port 80 is listening (HTTP)"
else
    print_status "fail" "Port 80 is not listening (Caddy issue)"
    ((ISSUES++))
fi

# Check 5: Port 443 (HTTPS)
if sudo lsof -i :443 > /dev/null 2>&1; then
    print_status "ok" "Port 443 is listening (HTTPS)"
else
    print_status "fail" "Port 443 is not listening (Caddy issue)"
    ((ISSUES++))
fi

# Check 6: Local connectivity
echo ""
echo "🔗 Testing connectivity..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    print_status "ok" "Next.js application is responding locally"
else
    print_status "fail" "Cannot connect to Next.js (http://localhost:3001)"
    ((ISSUES++))
fi

# Check 7: Reverse proxy
if curl -s -I https://$DOMAIN 2>/dev/null | grep -q "200\|301\|302"; then
    HTTPS_CODE=$(curl -s -I https://$DOMAIN 2>/dev/null | head -1)
    print_status "ok" "Reverse proxy is responding: $HTTPS_CODE"
else
    print_status "warn" "Cannot connect via reverse proxy (may be DNS/network issue)"
fi

# Check 8: SSL Certificate
echo ""
echo "🔐 Checking SSL Certificate..."
CERT_INFO=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -text 2>/dev/null)
if [[ ! -z "$CERT_INFO" ]]; then
    EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep "notAfter")
    print_status "ok" "SSL certificate is valid"
    echo "  $EXPIRY"
else
    print_status "warn" "Cannot verify SSL certificate"
fi

# Check 9: Resource usage
echo ""
echo "💻 Resource usage..."
NEXTJS_MEM=$(ps aux | grep "node.*standalone/server.js" | grep -v grep | awk '{print $6}' | head -1)
CADDY_MEM=$(ps aux | grep "caddy" | grep -v grep | awk '{print $6}' | head -1)

if [[ ! -z "$NEXTJS_MEM" ]]; then
    echo "  Next.js memory: ${NEXTJS_MEM}KB"
fi

if [[ ! -z "$CADDY_MEM" ]]; then
    echo "  Caddy memory: ${CADDY_MEM}KB"
fi

# Check 10: Disk space
DISK_USAGE=$(df /opt/DeFiNodeNexus 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ ! -z "$DISK_USAGE" ]]; then
    if [[ $DISK_USAGE -lt 90 ]]; then
        print_status "ok" "Disk usage: ${DISK_USAGE}%"
    else
        print_status "warn" "Disk usage: ${DISK_USAGE}% (high)"
    fi
fi

# Recent errors
echo ""
echo "📋 Recent service errors..."
NEXTJS_ERRORS=$(sudo journalctl -u nexus-nextjs.service -p err -n 5 2>&1 | grep -c "error\|Error\|ERROR" || echo "0")
CADDY_ERRORS=$(sudo journalctl -u caddy.service -p err -n 5 2>&1 | grep -c "error\|Error\|ERROR" || echo "0")

if [[ $NEXTJS_ERRORS -eq 0 ]]; then
    print_status "ok" "No recent Next.js errors"
else
    print_status "warn" "Detected $NEXTJS_ERRORS recent Next.js error(s)"
    sudo journalctl -u nexus-nextjs.service -p err -n 3 --no-pager | sed 's/^/    /'
fi

if [[ $CADDY_ERRORS -eq 0 ]]; then
    print_status "ok" "No recent Caddy errors"
else
    print_status "warn" "Detected $CADDY_ERRORS recent Caddy error(s)"
    sudo journalctl -u caddy.service -p err -n 3 --no-pager | sed 's/^/    /'
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${COLORS}"

if [[ $ISSUES -eq 0 ]]; then
    echo -e "${GREEN}✅ All checks passed! Deployment is healthy.${COLORS}"
    echo ""
    echo "🌐 Your application is available at:"
    echo "   https://$DOMAIN"
    echo ""
    mkdir -p /tmp/deployment_check
    echo "$(date)" > /tmp/deployment_check/last_check
    echo "All clear" >> /tmp/deployment_check/last_check
else
    echo -e "${YELLOW}⚠️  Found $ISSUES issue(s). Please review above.${COLORS}"
    echo ""
    echo "Common solutions:"
    echo "1. Check logs: sudo journalctl -u nexus-nextjs.service -f"
    echo "2. Check Caddy: sudo journalctl -u caddy.service -f"
    echo "3. Restart Next.js: sudo systemctl restart nexus-nextjs.service"
    echo "4. Restart Caddy: sudo systemctl reload caddy.service"
fi

echo ""
echo "📝 Useful commands:"
echo "  Tail logs:      sudo journalctl -u nexus-nextjs.service -f"
echo "  Health check:   bash health-check-caddy.sh"
echo "  App location:   https://$DOMAIN"
echo ""
