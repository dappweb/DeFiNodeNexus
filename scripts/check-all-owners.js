#!/usr/bin/env node
/**
 * Check owner of all deployed contracts
 */
require("../env_conf");
const { ethers } = require("ethers");

const OWNABLE_ABI = [
  "function owner() public view returns (address)",
  "function admin() public view returns (address)",
];

async function main() {
  const rpcUrl = process.env.CNC_RPC_URL;

  const contracts = {
    "TOT_TOKEN_ADDRESS": process.env.TOT_TOKEN_ADDRESS,
    "TOF_TOKEN_ADDRESS": process.env.TOF_TOKEN_ADDRESS,
    "USDT_TOKEN_ADDRESS": process.env.USDT_TOKEN_ADDRESS,
    "NEXUS_ADDRESS": process.env.NEXUS_ADDRESS,
    "SWAP_ADDRESS": process.env.SWAP_ADDRESS,
  };

  console.log("=== Contract Owners Check ===\n");
  console.log("RPC URL:", rpcUrl);
  console.log("Chain ID: 50716 (CNC)\n");

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  console.log("=== Contract Owners ===\n");
  console.log("| 合约 | 地址 | Owner |\n|------|------|-------|\n");

  for (const [name, address] of Object.entries(contracts)) {
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      console.log(`| ${name} | NOT SET | - |`);
      continue;
    }

    try {
      const contract = new ethers.Contract(address, OWNABLE_ABI, provider);
      
      // Try to get owner
      let owner = null;
      try {
        owner = await contract.owner();
      } catch (e1) {
        // Try admin as fallback
        try {
          owner = await contract.admin();
        } catch (e2) {
          // Neither owner nor admin available
        }
      }

      if (owner) {
        console.log(`| ${name} | ${address} | ${owner} |`);
      } else {
        console.log(`| ${name} | ${address} | ❌ No owner found |`);
      }
    } catch (err) {
      console.log(`| ${name} | ${address} | ❌ Error: ${err.message} |`);
    }
  }

  console.log("\n=== Summary ===\n");

  // Collect all data for summary
  const owners = {};
  for (const [name, address] of Object.entries(contracts)) {
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      continue;
    }

    try {
      const contract = new ethers.Contract(address, OWNABLE_ABI, provider);
      let owner = null;
      try {
        owner = await contract.owner();
      } catch (e1) {
        try {
          owner = await contract.admin();
        } catch (e2) {}
      }
      if (owner) {
        if (!owners[owner]) {
          owners[owner] = [];
        }
        owners[owner].push(name);
      }
    } catch {}
  }

  for (const [owner, contracts] of Object.entries(owners)) {
    console.log(`Owner: ${owner}`);
    for (const contract of contracts) {
      console.log(`  ✓ ${contract}`);
    }
    console.log();
  }

  // Show individual owners
  console.log("=== Detailed Owner Information ===\n");
  const uniqueOwners = new Set();
  
  for (const [name, address] of Object.entries(contracts)) {
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      continue;
    }

    try {
      const contract = new ethers.Contract(address, OWNABLE_ABI, provider);
      let owner = null;
      try {
        owner = await contract.owner();
      } catch (e1) {
        try {
          owner = await contract.admin();
        } catch (e2) {}
      }
      if (owner) {
        uniqueOwners.add(owner.toLowerCase());
      }
    } catch {}
  }

  console.log(`Total unique owners: ${uniqueOwners.size}`);
  uniqueOwners.forEach((owner, index) => {
    console.log(`${index + 1}. ${owner}`);
  });
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
