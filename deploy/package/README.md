# DeFiNodeNexus Deployment Package

This package is prepared for Linux + PM2 + Nginx/OpenResty deployment.

## Package Layout

- `config/env_conf.js`: complete parameter configuration file
- `scripts/deploy.sh`: one-click deploy/update script
- `scripts/ecosystem.config.js`: PM2 process config
- `linux/nginx-definode.conf`: reverse proxy config
- `linux/definode-web.service`: systemd service for web app
- `linux/definode-keeper.service`: systemd service for keeper
- `linux/definode-health.service`: systemd service for health check
- `linux/definode-keeper.timer`: timer for keeper service
- `linux/definode-health.timer`: timer for health service

## Quick Start

1. Edit `config/env_conf.js` and fill all required values.
2. Ensure contracts are deployed and address variables are backfilled:
   - `NEXUS_ADDRESS`, `SWAP_ADDRESS`, `TOT_TOKEN_ADDRESS`, `TOF_TOKEN_ADDRESS`, `USDT_TOKEN_ADDRESS`
   - `NEXT_PUBLIC_*` address keys must match the server keys.
3. Run deployment:

```bash
bash scripts/deploy.sh
```

## Optional Verification

Run address binding check before build/deploy:

```bash
npm run check:env:bindings
```

## Security Notes

- Never commit `.env` with real secrets.
- Restrict file permissions for runtime env files (`chmod 600`).
- Use dedicated wallets for deployer and keeper operations.
