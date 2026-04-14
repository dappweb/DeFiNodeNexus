require("./env_conf");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("@openzeppelin/hardhat-upgrades");

const cncRpcUrl = process.env.CNC_RPC_URL || "";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "london",
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
    cnc: {
      url: cncRpcUrl,
      chainId: 50716,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    }
  },
  etherscan: {
    apiKey: {
      cnc: "blockscout"
    },
    customChains: [
      {
        network: "cnc",
        chainId: 50716,
        urls: {
          apiURL: "https://cncchainpro.com/api",
          browserURL: "https://cncchainpro.com"
        }
      }
    ]
  }
};
