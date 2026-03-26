import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const root = process.cwd();
const envPath = path.join(root, ".env");
const envLocalPath = path.join(root, ".env.local");
const isCi =
  process.env.CI === "true" ||
  process.env.CF_PAGES === "1" ||
  process.env.CLOUDFLARE_PAGES === "1";

const requiredPairs = [
  ["NEXT_PUBLIC_NEXUS_ADDRESS", "NEXUS_ADDRESS"],
  ["NEXT_PUBLIC_SWAP_ADDRESS", "SWAP_ADDRESS"],
  ["NEXT_PUBLIC_TOT_ADDRESS", "TOT_TOKEN_ADDRESS"],
  ["NEXT_PUBLIC_TOF_ADDRESS", "TOF_TOKEN_ADDRESS"],
  ["NEXT_PUBLIC_USDT_ADDRESS", "USDT_TOKEN_ADDRESS"],
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  return dotenv.parse(content);
}

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test((value || "").trim());
}

function maskAddress(value) {
  if (!value) return "(empty)";
  const trimmed = value.trim();
  if (trimmed.length < 10) return trimmed;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

const env = loadEnvFile(envPath);
const envLocal = loadEnvFile(envLocalPath);

function getEnvValue(primaryMap, key, fallbackMap) {
  return (primaryMap[key] || fallbackMap[key] || process.env[key] || "").trim();
}

const errors = [];
const warnings = [];

for (const [pubKey, privateKey] of requiredPairs) {
  const pub = getEnvValue(envLocal, pubKey, env);
  const pri = getEnvValue(env, privateKey, envLocal);

  if (!isCi) {
    if (!pub) {
      errors.push(`${pubKey} is missing in .env.local (or process env)`);
    }
    if (!pri) {
      errors.push(`${privateKey} is missing in .env (or process env)`);
    }
  } else {
    if (pub && !pri) {
      warnings.push(`${privateKey} is missing while ${pubKey} is set (CI mode)`);
    }
    if (!pub && pri) {
      warnings.push(`${pubKey} is missing while ${privateKey} is set (CI mode)`);
    }
  }

  if (pub && !isAddress(pub)) {
    errors.push(`${pubKey} is not a valid EVM address`);
  }
  if (pri && !isAddress(pri)) {
    errors.push(`${privateKey} is not a valid EVM address`);
  }

  if (pub && pri && normalize(pub) !== normalize(pri)) {
    errors.push(
      `${pubKey} and ${privateKey} mismatch (${maskAddress(pub)} != ${maskAddress(pri)})`
    );
  }
}

const deployerKey = (env.DEPLOYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || "").trim();
if (deployerKey && !/^0x[a-fA-F0-9]{64}$/.test(deployerKey)) {
  warnings.push("DEPLOYER_PRIVATE_KEY in .env is not 0x-prefixed 64-hex format");
}

if (errors.length > 0) {
  console.error("\n[env-check] Contract address binding check failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }

  if (warnings.length > 0) {
    console.error("\n[env-check] Additional warnings:");
    for (const warning of warnings) {
      console.error(`- ${warning}`);
    }
  }

  console.error("\nFix: keep NEXT_PUBLIC_* equal to deployed addresses (from .env/.env.local/process env).\n");
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("\n[env-check] Address binding passed with warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

console.log("[env-check] Address binding check passed.");