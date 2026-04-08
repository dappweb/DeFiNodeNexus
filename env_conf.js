const path = require("node:path");
const fs = require("node:fs");
const dotenv = require("dotenv");

const rootDir = __dirname;

function loadDotenvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath });
  }
}

loadDotenvFile(".env");
loadDotenvFile(".env.local");

const ENV_CONFIG = {
  NEXT_PUBLIC_SEPOLIA_RPC_URL: "",
  NEXT_PUBLIC_NEXUS_ADDRESS: "",
  NEXT_PUBLIC_SWAP_ADDRESS: "",
  NEXT_PUBLIC_TOT_ADDRESS: "",
  NEXT_PUBLIC_TOF_ADDRESS: "",
  NEXT_PUBLIC_USDT_ADDRESS: "",
  NEXT_PUBLIC_CONTRACT_OWNER: "",

  SEPOLIA_RPC_URL: "",
  NEXUS_ADDRESS: "",
  SWAP_ADDRESS: "",
  TOT_TOKEN_ADDRESS: "",
  TOF_TOKEN_ADDRESS: "",
  USDT_TOKEN_ADDRESS: "",
  CONTRACT_OWNER: "",

  DEPLOYER_PRIVATE_KEY: "",
};

for (const [key, value] of Object.entries(ENV_CONFIG)) {
  const trimmed = String(value || "").trim();
  if (trimmed) {
    process.env[key] = trimmed;
  }
}

const pairs = [
  ["NEXT_PUBLIC_SEPOLIA_RPC_URL", "SEPOLIA_RPC_URL"],
  ["NEXT_PUBLIC_NEXUS_ADDRESS", "NEXUS_ADDRESS"],
  ["NEXT_PUBLIC_SWAP_ADDRESS", "SWAP_ADDRESS"],
  ["NEXT_PUBLIC_TOT_ADDRESS", "TOT_TOKEN_ADDRESS"],
  ["NEXT_PUBLIC_TOF_ADDRESS", "TOF_TOKEN_ADDRESS"],
  ["NEXT_PUBLIC_USDT_ADDRESS", "USDT_TOKEN_ADDRESS"],
  ["NEXT_PUBLIC_CONTRACT_OWNER", "CONTRACT_OWNER"],
];

for (const [publicKey, privateKey] of pairs) {
  const pub = (process.env[publicKey] || "").trim();
  const pri = (process.env[privateKey] || "").trim();

  if (!pub && pri) {
    process.env[publicKey] = pri;
  }

  if (!pri && pub) {
    process.env[privateKey] = pub;
  }
}

module.exports = {
  ENV_CONFIG,
};
