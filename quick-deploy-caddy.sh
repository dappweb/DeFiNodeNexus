#!/bin/bash

# Quick start deployment for Caddy
# One-liner to build and deploy

set -e

echo "🚀 Quick Caddy Deployment"
echo "=========================="
echo ""

# Run verification
echo "📋 Running pre-flight checks..."
bash check-caddy-deploy.sh || { echo "Pre-flight check failed!"; exit 1; }

echo ""
echo "✅ Pre-flight checks passed!"
echo ""

# Ask for confirmation
read -p "Ready to deploy? This will build and deploy the application. (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

echo ""
echo "🔄 Starting full deployment..."
echo ""

# Run full deployment
bash ./deploy-caddy.sh

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Application available at: https://t1.test2dapp.xyz"
