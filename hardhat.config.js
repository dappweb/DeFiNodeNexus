require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || "";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  paths: {
    sources: "./contracts"
  },
  networks: {
    sepolia: {
      url: sepoliaRpcUrl,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    }
  }
};
