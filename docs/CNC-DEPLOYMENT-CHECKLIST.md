# CNC Chain Deployment Checklist

## Pre-Deployment
- [ ] Verify deployer account has CNC native tokens for gas
- [ ] Verify token addresses are correct on CNC chain explorer:
  - [ ] TOT: 0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
  - [ ] TOF: 0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
  - [ ] USDT: 0xf54cC0F6CE272125c39C45A8141b84989A8765f4
- [ ] Run configuration verification: `node scripts/verify-cnc-config.js`
- [ ] Review hardhat config includes CNC network
- [ ] Review environment variables are correctly set

## Deployment
- [ ] Run deployment: `npm run deploy:cnc`
- [ ] Monitor deployment for errors
- [ ] Verify all contracts deployed successfully

## Post-Deployment
- [ ] Update `.env` with deployed addresses:
  - [ ] NEXUS_ADDRESS
  - [ ] SWAP_ADDRESS
- [ ] Test contract interactions on CNC testnet/mainnet
- [ ] Verify contract ownership is set correctly
- [ ] Verify NFTA and NFTB tiers are configured

## Frontend Integration
- [ ] Add CNC RPC URL to frontend environment if needed
- [ ] Update frontend to support CNC chain
- [ ] Test contract calls from frontend
- [ ] Verify user interactions work as expected

## Documentation
- [ ] Update deployment record
- [ ] Document deployed addresses
- [ ] Test all supporting scripts on CNC network
