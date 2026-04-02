import { describe, expect, it } from "vitest"

import { execTx } from "@/lib/tx"

describe("execTx", () => {
  it("captures synchronous transaction factory errors", async () => {
    const result = await execTx(() => {
      throw new Error("contract runner does not support sending transactions")
    })

    expect(result).toEqual({
      success: false,
      error: "Wallet is not ready to send transactions. Please reconnect and try again",
    })
  })

  it("still handles rejected transaction promises", async () => {
    const result = await execTx(Promise.reject(new Error("execution reverted: \"Already bound\"")))

    expect(result).toEqual({
      success: false,
      error: "Already bound",
    })
  })
})