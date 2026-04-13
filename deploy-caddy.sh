#!/bin/bash

# DeFiNodeNexus Caddy Deployment Script
# Deploy to t1.test2dapp.xyz

set -e

PROJECT_PATH="/home/ubuntu/DeFiNodeNexus"
DEPLOYMENT_PATH="/opt/DeFiNodeNexus"
PORT=3001  # Changed from 3000 to avoid Docker port conflicts
DOMAIN="t1.test2dapp.xyz"

echo "🚀 Starting DeFiNodeNexus deployment to $DOMAIN..."

# Step 1: Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or later."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
cd "$PROJECT_PATH"
npm install

# Step 3: Build the project
echo "🔨 Building Next.js project..."
npm run build

# Step 4: Create deployment directory
echo "📁 Setting up deployment directory..."
sudo mkdir -p "$DEPLOYMENT_PATH"
sudo chown -R $USER:$USER "$DEPLOYMENT_PATH"

# Step 5: Copy built project to deployment directory
echo "📤 Copying built application..."
cp -r "$PROJECT_PATH/.next" "$DEPLOYMENT_PATH/"
cp -r "$PROJECT_PATH/public" "$DEPLOYMENT_PATH/"
cp "$PROJECT_PATH/package.json" "$DEPLOYMENT_PATH/"
cp "$PROJECT_PATH/package-lock.json" "$DEPLOYMENT_PATH/" 2>/dev/null || true
cp "$PROJECT_PATH/.env" "$DEPLOYMENT_PATH/.env" 2>/dev/null || true
cp "$PROJECT_PATH/.env.local" "$DEPLOYMENT_PATH/.env.local" 2>/dev/null || true

# Step 6: Install production dependencies
echo "📥 Installing production dependencies..."
cd "$DEPLOYMENT_PATH"
npm install --omit=dev --legacy-peer-deps

# Step 7: Create systemd service for Next.js
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/nexus-nextjs.service > /dev/null <<EOF
[Unit]
Description=DeFiNodeNexus Next.js Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DEPLOYMENT_PATH
Environment="NODE_ENV=production"
Environment="PORT=$PORT"
ExecStart=/usr/bin/npm run start -- --port $PORT
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Step 8: Enable and start the service
echo "🔄 Enabling and starting Next.js service..."
sudo systemctl daemon-reload
sudo systemctl enable nexus-nextjs.service
sudo systemctl restart nexus-nextjs.service

# Step 9: Check if Caddy is installed
if ! command -v caddy &> /dev/null; then
    echo "⚠️  Caddy is not installed. Installing Caddy..."
    curl https://getcaddy.com | bash -s personal
fi

echo "✓ Caddy version: $(caddy --version)"

# Step 10: Setup Caddy configuration
echo "⚙️  Setting up Caddy configuration..."
sudo mkdir -p /etc/caddy
sudo cp "$PROJECT_PATH/Caddyfile" /etc/caddy/Caddyfile

# Step 11: Create systemd service for Caddy
echo "⚙️  Creating Caddy systemd service..."
sudo tee /etc/systemd/system/caddy.service > /dev/null <<EOF
[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
Requires=network-online.target
After=network-online.target
Condition=FileNotEmpty=/etc/caddy/Caddyfile

[Service]
Type=notify
User=caddy
Group=caddy
ProtectSystem=full
ProtectHome=yes
NoNewPrivileges=yes
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=yes
PrivateDevices=yes
SecureBits=keep-caps
AmbientCapabilities=CAP_NET_BIND_SERVICE
StandardOutput=journal
StandardError=journal
ExecStart=/usr/bin/caddy run --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile
TimeoutStopSec=5s
KillMode=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Step 12: Create caddy user if it doesn't exist
if ! id -u caddy > /dev/null 2>&1; then
    echo "👤 Creating caddy system user..."
    sudo useradd --system --group --no-create-home --shell /bin/false caddy
fi

# Step 13: Enable and start Caddy
echo "🔄 Enabling and starting Caddy service..."
sudo systemctl daemon-reload
sudo systemctl enable caddy.service
sudo systemctl restart caddy.service

# Step 14: Verify services are running
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
sudo systemctl status nexus-nextjs.service --no-pager
echo ""
sudo systemctl status caddy.service --no-pager
echo ""
echo "🌐 Application available at: https://$DOMAIN"
echo ""
echo "📝 Useful commands:"
echo "  View Next.js logs:  sudo journalctl -u nexus-nextjs.service -f"
echo "  View Caddy logs:    sudo journalctl -u caddy.service -f"
echo "  Restart Next.js:    sudo systemctl restart nexus-nextjs.service"
echo "  Restart Caddy:      sudo systemctl restart caddy.service"
echo "  Update Caddyfile:   sudo cp Caddyfile /etc/caddy/ && sudo systemctl reload caddy.service"
