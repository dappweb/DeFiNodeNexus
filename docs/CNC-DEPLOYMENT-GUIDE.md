# CNC Chain Deployment Guide

## Configuration

CNC Chain deployment has been configured with the following parameters:

### Network Information
- **Chain ID**: 50716
- **RPC URL**: https://rpc.cncchainpro.com

### Token Addresses
- **TOT Token**: 0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
- **TOF Token**: 0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
- **USDT Token**: 0x01EDa43B6f88Fb93D48441758B32d26E501F57e0

### Configuration Files Updated
1. `.env` - Added CNC token addresses and RPC URL
2. `env_conf.js` - Added CNC environment variable support
3. `hardhat.config.js` - Added CNC network configuration (chainId: 50716)
4. `package.json` - Added `deploy:cnc` npm script

## Deployment Steps

### 1. Verify Configuration
Before deploying, verify that all configuration is correct:

```bash
node scripts/verify-cnc-config.js
```

### 2. Deploy Contracts to CNC Chain

Deploy the DeFiNodeNexus and TOTSwap contracts:

```bash
npm run deploy:cnc
```

This will:
- Deploy DeFiNodeNexus (UUPS proxy)
- Configure NFTA and NFTB tiers
- Deploy TOTSwap (UUPS proxy)
- Link contracts and set up whitelists
- Output deployed addresses

### 3. Update Deployment Addresses

After successful deployment, update `.env` with the new addresses:

```env
CNC_NEXUS_ADDRESS=<deployed address from step 2>
CNC_SWAP_ADDRESS=<deployed address from step 2>
```

### 4. Add Liquidity (Optional)

If you need to seed liquidity for TOTSwap, use:

```bash
# Coming soon: deploy-tot-cnc.js script
npx hardhat run scripts/deploy-tot-cnc.js --network cnc
```

## Important Notes

1. **Private Key Security**: The `DEPLOYER_PRIVATE_KEY` should be kept secure. Never commit this to version control.

2. **TOF Whitelist**: The deployment script automatically adds the Nexus and Swap contracts to the TOF token whitelist.

3. **Liquidity Seeding**: After deployment, the contract owner must call `swap.addLiquidity()` to seed the initial 6% TOT + USDT into the liquidity pool.

4. **Wallet Configuration**: Optional wallet addresses can be set via environment variables:
   - `ZERO_LINE_WALLET`
   - `COMMUNITY_WALLET`
   - `FOUNDATION_WALLET`
   - `INSTITUTION_WALLET`

## Hardhat Network Configuration

The CNC network is now configured in `hardhat.config.js`. You can use it with:

```bash
# Run scripts on CNC network
npx hardhat run scripts/your-script.js --network cnc

# Access CNC provider from your scripts
const network = await hre.ethers.provider.getNetwork();
```

## Troubleshooting

If deployment fails:

1. Check RPC connectivity: `curl https://rpc.cncchainpro.com`
2. Verify token addresses are correct: Check they exist on CNC chain explorer
3. Verify deployer account has sufficient gas: Need CNC native tokens
4. Check private key format: Should be 66 characters starting with `0x`

## Example Deployment Output

```
Deploying to CNC Chain with account: 0x...
Network: Network { name: 'unknown', chainId: 50716, ... }
TOT token: 0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
TOF token: 0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
USDT token: 0x01EDa43B6f88Fb93D48441758B32d26E501F57e0

--- Deploying DeFiNodeNexus ---
DeFiNodeNexus deployed to: 0x...

--- Deploying TOTSwap ---
TOTSwap deployed to: 0x...

=== DEPLOYMENT SUMMARY ===
Network:       CNC Chain (50716)
DeFiNodeNexus: 0x...
TOTSwap:       0x...
```
