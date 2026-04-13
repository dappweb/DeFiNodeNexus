import { ethers } from "ethers"

function sanitizeTxErrorMessage(raw: string): string {
  const text = raw.trim()
  if (!text) return "Unknown error"

  if (/user rejected|rejected the request|user denied|ACTION_REJECTED/i.test(text)) {
    return "Transaction rejected by user"
  }

  if (/does not support sending transactions|unsupported operation|missing signer|contract runner/i.test(text)) {
    return "Wallet is not ready to send transactions. Please reconnect and try again"
  }

  if (/unknown custom error/i.test(text)) {
    return "Unknown contract error (often insufficient token allowance or balance)"
  }

  if (/could not coalesce error/i.test(text)) {
    return "RPC returned an unexpected error. Please retry or switch network"
  }

  if (/insufficient funds/i.test(text)) {
    return "Insufficient gas balance. Please top up before retrying"
  }

  const revertedQuoted = text.match(/execution reverted:\s*"([^"]+)"/i)
  if (revertedQuoted?.[1]) {
    return revertedQuoted[1].trim()
  }

  const revertedReason = text.match(/reverted with reason string\s*['"]([^'"]+)['"]/i)
  if (revertedReason?.[1]) {
    return revertedReason[1].trim()
  }

  const revertedPlain = text.match(/execution reverted(?::\s*)?([^,(]+)/i)
  if (revertedPlain?.[1]) {
    const reason = revertedPlain[1].trim().replace(/^[:\-\s]+/, "")
    if (reason) {
      return reason
    }
  }

  const withoutMeta = text
    .replace(/\s*\(action=.*$/i, "")
    .replace(/\s*data=0x[a-fA-F0-9]+.*$/i, "")
    .replace(/\s*version=\w+\/[^\s,]+.*$/i, "")
    .trim()

  if (withoutMeta) {
    return withoutMeta.slice(0, 120)
  }

  return "Unknown error"
}

function extractTxErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Unknown error"
  }

  const e = err as Error & {
    shortMessage?: string
    reason?: string
    info?: { error?: { message?: string } }
    error?: { message?: string; reason?: string }
    data?: { message?: string }
    errors?: unknown[] // ethers.js v6 coalesced error array
  }

  // Check flat candidates first (excluding e.message which may be "could not coalesce error")
  const shallowCandidates = [
    e.shortMessage,
    e.reason,
    e.info?.error?.message,
    e.error?.reason,
    e.error?.message,
    e.data?.message,
  ]

  for (const candidate of shallowCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      const sanitized = sanitizeTxErrorMessage(candidate)
      if (sanitized !== "RPC returned an unexpected error. Please retry or switch network") {
        return sanitized
      }
    }
  }

  // ethers.js v6 "could not coalesce error" wraps real errors in e.errors[]
  // Dig into them to find the actual revert reason
  if (Array.isArray(e.errors) && e.errors.length > 0) {
    for (const nested of e.errors) {
      const nestedMsg = extractTxErrorMessage(nested)
      if (
        nestedMsg &&
        nestedMsg !== "Unknown error" &&
        nestedMsg !== "RPC returned an unexpected error. Please retry or switch network"
      ) {
        return nestedMsg
      }
    }
  }

  // Fall back to e.message (handles "could not coalesce error" and other plain messages)
  if (typeof e.message === "string" && e.message.trim()) {
    return sanitizeTxErrorMessage(e.message)
  }

  return "Unknown error"
}

export async function execTx(
  txRequest:
    | Promise<ethers.ContractTransactionResponse>
    | (() => Promise<ethers.ContractTransactionResponse>)
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const tx = await (typeof txRequest === "function" ? txRequest() : txRequest)
    const receipt = await tx.wait()
    return { success: true, hash: receipt?.hash || tx.hash }
  } catch (err: unknown) {
    const msg = extractTxErrorMessage(err)
    return { success: false, error: msg }
  }
}