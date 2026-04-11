const DEFAULT_CNC_RPC_URL = "https://rpc.cncchainpro.com";

function isPrivateOrLocalHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
}

function expandCandidates(raw: Array<string | undefined | null>): string[] {
  return raw
    .flatMap((value) => (value ?? "").split(","))
    .map((value) => value.trim())
    .filter((value): value is string => Boolean(value));
}

function isAllowedCncRpcUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    const host = parsed.hostname.toLowerCase();

    // Prevent accidental fallback to Ethereum/Sepolia endpoints in CNC UI.
    if (host.includes("sepolia")) return false;
    if (host.includes("ethereum")) return false;

    return host.includes("cnc") || isPrivateOrLocalHost(host);
  } catch {
    return false;
  }
}

export function getCncRpcUrls(
  ...candidates: Array<string | undefined | null>
): string[] {
  const sanitized = Array.from(
    new Set(expandCandidates(candidates).filter((url) => isAllowedCncRpcUrl(url)))
  );

  if (!sanitized.length) return [DEFAULT_CNC_RPC_URL];
  return sanitized;
}

export function getPrimaryCncRpcUrl(
  ...candidates: Array<string | undefined | null>
): string {
  return getCncRpcUrls(...candidates)[0];
}

export { DEFAULT_CNC_RPC_URL };
