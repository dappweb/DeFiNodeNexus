(() => {
  const addresses = {
    user: "0x1111111111111111111111111111111111111111",
    owner: "0x9999999999999999999999999999999999999999",
    referrer: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    nexus: "0x1111111111111111111111111111111111111111",
    swap: "0x2222222222222222222222222222222222222222",
    tot: "0x3333333333333333333333333333333333333333",
    tof: "0x4444444444444444444444444444444444444444",
    usdt: "0x5555555555555555555555555555555555555555"
  }

  const nowTs = () => Math.floor(Date.now() / 1000)
  const ownerMode = window.localStorage.getItem("e2e_owner_mode")
  const referrerBoundMode = window.localStorage.getItem("e2e_referrer_bound")
  const isOwnerMode = ownerMode === "1"
  const hasReferrer = referrerBoundMode !== "0"
  const zeroAddress = "0x0000000000000000000000000000000000000000"

  const state = {
    chainId: "0xc61c",
    blockNumber: 1n,
    txNonce: 0n,
    failNextTx: false,
    rejectNextConnect: false,
    accounts: [addresses.user],
    listeners: new Map(),
    txReceipts: new Map(),
    blocks: new Map([[1n, nowTs()]]),
    events: [],
    ownerAddress: isOwnerMode ? addresses.user : addresses.owner,
    nexusConfig: {
      treasury: addresses.owner,
      zeroLine: "0x1010101010101010101010101010101010101010",
      community: "0x2020202020202020202020202020202020202020",
      foundation: "0x3030303030303030303030303030303030303030",
      institution: "0x4040404040404040404040404040404040404040",
      tofBurnBps: 500n,
      tofClaimFeeBps: 7000n,
      tofClaimFeeFlat: 1n * 10n ** 18n,
      predictionFlowBpsByTier: new Map([[1, 40n], [2, 50n], [3, 60n]]),
      withdrawFeeBpsByLevel: new Map([[0, 0n], [1, 500n], [2, 800n], [3, 1000n], [4, 1200n], [5, 1500n]])
    },
    swapConfig: {
      totReserve: 2_000_000n * 10n ** 18n,
      usdtReserve: 2_000_000n * 10n ** 18n,
      nftbDividendPool: 10_000n * 10n ** 18n,
      buyFeeBps: 100n,
      sellFeeBps: 500n,
      profitTaxBps: 1200n,
      distributionThreshold: 100n * 10n ** 18n,
      maxDailyBuy: 1_000_000n * 10n ** 18n,
      maxSellBps: 5000n,
      deflationBps: 80n,
      lastDeflationTime: BigInt(nowTs() - 7200)
    },
    account: {
      referrer: hasReferrer ? addresses.referrer : zeroAddress,
      pendingTot: 0n,
      claimedTot: 0n,
      withdrawnTot: 0n,
      totalNodes: 0n,
      directReferrals: 0n,
      teamNodes: 0n,
      teamCommissionEarned: 0n
    },
    nextNodeId: 1n,
    nftaTiers: new Map([
      [1n, { id: 1n, price: 500n * 10n ** 18n, dailyYield: 20n * 10n ** 18n, maxSupply: 10n, currentSupply: 0n, isActive: true }],
      [2n, { id: 2n, price: 1000n * 10n ** 18n, dailyYield: 45n * 10n ** 18n, maxSupply: 5n, currentSupply: 0n, isActive: true }]
    ]),
    nftbTiers: new Map([
      [1n, { id: 1n, price: 500n * 10n ** 18n, tofPrice: 100000n * 10n ** 18n, weight: 1n, maxSupply: 10n, usdtMinted: 0n, tofMinted: 0n, dividendBps: 2000n, isActive: true }],
      [2n, { id: 2n, price: 1000n * 10n ** 18n, tofPrice: 200000n * 10n ** 18n, weight: 2n, maxSupply: 8n, usdtMinted: 0n, tofMinted: 0n, dividendBps: 3000n, isActive: true }]
    ]),
    nftaNodes: [],
    nftbNodes: [],
    approvals: new Map(),
    balances: new Map([
      [addresses.tot, 1_000_000n * 10n ** 18n],
      [addresses.tof, 1_000_000n * 10n ** 18n],
      [addresses.usdt, 1_000_000n * 10n ** 18n]
    ])
  }

  const on = (event, handler) => {
    const arr = state.listeners.get(event) || []
    arr.push(handler)
    state.listeners.set(event, arr)
  }

  const removeListener = (event, handler) => {
    const arr = state.listeners.get(event) || []
    state.listeners.set(event, arr.filter((item) => item !== handler))
  }

  const emit = (event, payload) => {
    const arr = state.listeners.get(event) || []
    for (const handler of arr) handler(payload)
  }

  const toHex = (value) => `0x${BigInt(value).toString(16)}`
  const toPaddedHex = (value) => `0x${BigInt(value).toString(16).padStart(64, "0")}`
  const encodeAddress = (address) => `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`
  const encodeTuple = (parts) => `0x${parts.map((part) => part.replace(/^0x/, "")).join("")}`
  const approvalKey = (token, owner, spender) => `${token}:${owner.toLowerCase()}:${spender.toLowerCase()}`

  const pushEvent = (eventName, args, txHash, blockNumber, timestamp) => {
    state.events.push({
      eventName,
      args,
      transactionHash: txHash,
      blockNumber: Number(blockNumber),
      timestamp
    })
  }

  const createTx = (onWait) => {
    if (state.failNextTx) {
      state.failNextTx = false
      return Promise.reject(new Error("execution reverted: mock failure"))
    }

    state.txNonce += 1n
    const hash = `0x${state.txNonce.toString(16).padStart(64, "0")}`

    return Promise.resolve({
      hash,
      wait: async () => {
        state.blockNumber += 1n
        const timestamp = nowTs() + Number(state.txNonce)
        state.blocks.set(state.blockNumber, timestamp)
        await onWait?.({ hash, blockNumber: state.blockNumber, timestamp })
        state.txReceipts.set(hash, {
          blockHash: `0x${state.blockNumber.toString(16).padStart(64, "0")}`,
          blockNumber: toHex(state.blockNumber),
          contractAddress: null,
          cumulativeGasUsed: "0x5208",
          effectiveGasPrice: "0x3b9aca00",
          from: state.accounts[0],
          gasUsed: "0x5208",
          logs: [],
          logsBloom: `0x${"0".repeat(512)}`,
          status: "0x1",
          to: zeroAddress,
          transactionHash: hash,
          transactionIndex: "0x0",
          type: "0x2"
        })
        return { hash, status: 1, blockNumber: Number(state.blockNumber) }
      }
    })
  }

  const getNftaTier = (id) => state.nftaTiers.get(BigInt(id)) || { id: BigInt(id), price: 0n, dailyYield: 0n, maxSupply: 0n, currentSupply: 0n, isActive: false }
  const getNftbTier = (id) => state.nftbTiers.get(BigInt(id)) || { id: BigInt(id), price: 0n, tofPrice: 0n, weight: 0n, maxSupply: 0n, usdtMinted: 0n, tofMinted: 0n, dividendBps: 0n, isActive: false }

  const nexusFilters = {
    NftaYieldClaimed: (user) => ({ eventName: "NftaYieldClaimed", user: user?.toLowerCase() }),
    NftbDividendClaimed: (user) => ({ eventName: "NftbDividendClaimed", user: user?.toLowerCase() }),
    TeamCommissionPaid: (user) => ({ eventName: "TeamCommissionPaid", user: user?.toLowerCase() }),
    TotWithdrawn: (user) => ({ eventName: "TotWithdrawn", user: user?.toLowerCase() })
  }

  const nexusMock = {
    __isE2EMock: true,
    filters: nexusFilters,
    owner: async () => state.ownerAddress,
    treasury: async () => state.nexusConfig.treasury,
    zeroLineWallet: async () => state.nexusConfig.zeroLine,
    communityWallet: async () => state.nexusConfig.community,
    foundationWallet: async () => state.nexusConfig.foundation,
    institutionWallet: async () => state.nexusConfig.institution,
    tofBurnBps: async () => state.nexusConfig.tofBurnBps,
    tofClaimFeeBps: async () => state.nexusConfig.tofClaimFeeBps,
    predictionFlowBpsByTier: async (tierId) => state.nexusConfig.predictionFlowBpsByTier.get(Number(tierId)) ?? 0n,
    tofClaimFeeFlat: async () => state.nexusConfig.tofClaimFeeFlat,
    withdrawFeeBpsByLevel: async (level) => state.nexusConfig.withdrawFeeBpsByLevel.get(Number(level)) ?? 0n,
    setTreasury: async (addr) => createTx(async () => {
      state.nexusConfig.treasury = addr
    }),
    setWallets: async (zeroLine, community, foundation, institution) => createTx(async () => {
      state.nexusConfig.zeroLine = zeroLine
      state.nexusConfig.community = community
      state.nexusConfig.foundation = foundation
      state.nexusConfig.institution = institution
    }),
    setTofBurnBps: async (value) => createTx(async () => {
      state.nexusConfig.tofBurnBps = BigInt(value)
    }),
    setTofClaimFeeBps: async (value) => createTx(async () => {
      state.nexusConfig.tofClaimFeeBps = BigInt(value)
    }),
    setPredictionFlowRateBps: async (tierId, value) => createTx(async () => {
      state.nexusConfig.predictionFlowBpsByTier.set(Number(tierId), BigInt(value))
    }),
    setTofClaimFeeFlat: async (value) => createTx(async () => {
      state.nexusConfig.tofClaimFeeFlat = BigInt(value)
    }),
    setWithdrawFeeBps: async (level, value) => createTx(async () => {
      state.nexusConfig.withdrawFeeBpsByLevel.set(Number(level), BigInt(value))
    }),
    setDistributor: async () => createTx(),
    bindReferrer: async (referrer) => createTx(async () => {
      state.account.referrer = referrer
      window.localStorage.setItem("e2e_referrer_bound", "1")
    }),
    accounts: async () => ({ ...state.account }),
    nextNftaTierId: async () => 3n,
    nextNftbTierId: async () => 3n,
    nftaTiers: async (id) => ({ ...getNftaTier(id) }),
    nftbTiers: async (id) => ({ ...getNftbTier(id) }),
    getNftaTierRemaining: async (id) => {
      const tier = getNftaTier(id)
      return tier.maxSupply > tier.currentSupply ? tier.maxSupply - tier.currentSupply : 0n
    },
    getNftbTierRemaining: async (id) => {
      const tier = getNftbTier(id)
      return [
        tier.maxSupply > tier.usdtMinted ? tier.maxSupply - tier.usdtMinted : 0n,
        tier.maxSupply > tier.tofMinted ? tier.maxSupply - tier.tofMinted : 0n
      ]
    },
    getUserNftaNodes: async () => state.nftaNodes.map((node) => node.nodeId),
    getUserNftbNodes: async () => state.nftbNodes.map((node) => node.nodeId),
    nftaNodes: async (nodeId) => {
      const node = state.nftaNodes.find((item) => item.nodeId === BigInt(nodeId))
      return node ? { owner: addresses.user, tierId: node.tierId, dailyYield: node.dailyYield, lastClaimDay: 0n, isActive: true } : { owner: zeroAddress, tierId: 0n, dailyYield: 0n, lastClaimDay: 0n, isActive: false }
    },
    nftbNodes: async (nodeId) => {
      const node = state.nftbNodes.find((item) => item.nodeId === BigInt(nodeId))
      return node ? { owner: addresses.user, tierId: node.tierId, weight: node.weight, rewardDebt: 0n, isActive: true } : { owner: zeroAddress, tierId: 0n, weight: 0n, rewardDebt: 0n, isActive: false }
    },
    pendingNftaYield: async (nodeId) => state.nftaNodes.find((item) => item.nodeId === BigInt(nodeId))?.pending ?? 0n,
    pendingNftbDividend: async (nodeId) => state.nftbNodes.find((item) => item.nodeId === BigInt(nodeId))?.pending ?? 0n,
    buyNfta: async (tierId) => createTx(async ({ hash, blockNumber, timestamp }) => {
      const tier = getNftaTier(tierId)
      tier.currentSupply += 1n
      const node = {
        nodeId: state.nextNodeId++,
        tierId: BigInt(tierId),
        dailyYield: tier.dailyYield,
        pending: tier.dailyYield
      }
      state.nftaNodes.push(node)
      state.account.totalNodes += 1n
      pushEvent("NftaPurchased", { user: addresses.user, tierId: BigInt(tierId), price: tier.price }, hash, blockNumber, timestamp)
    }),
    buyNftbWithUsdt: async (tierId) => createTx(async ({ hash, blockNumber, timestamp }) => {
      const tier = getNftbTier(tierId)
      tier.usdtMinted += 1n
      const node = {
        nodeId: state.nextNodeId++,
        tierId: BigInt(tierId),
        weight: tier.weight,
        pending: 15n * 10n ** 18n
      }
      state.nftbNodes.push(node)
      state.account.totalNodes += 1n
      pushEvent("NftbPurchased", { user: addresses.user, tierId: BigInt(tierId), price: tier.price }, hash, blockNumber, timestamp)
    }),
    buyNftbWithTof: async (tierId) => createTx(async ({ hash, blockNumber, timestamp }) => {
      const tier = getNftbTier(tierId)
      tier.tofMinted += 1n
      const node = {
        nodeId: state.nextNodeId++,
        tierId: BigInt(tierId),
        weight: tier.weight,
        pending: 18n * 10n ** 18n
      }
      state.nftbNodes.push(node)
      state.account.totalNodes += 1n
      pushEvent("NftbPurchased", { user: addresses.user, tierId: BigInt(tierId), price: tier.tofPrice }, hash, blockNumber, timestamp)
    }),
    claimAllNftaYield: async () => createTx(async ({ hash, blockNumber, timestamp }) => {
      for (const node of state.nftaNodes) {
        if (node.pending > 0n) {
          const amount = node.pending
          node.pending = 0n
          state.account.pendingTot += amount
          state.account.claimedTot += amount
          pushEvent("NftaYieldClaimed", { user: addresses.user, nodeId: node.nodeId, totAmount: amount, tofConsumed: 0n }, hash, blockNumber, timestamp)
        }
      }
    }),
    claimAllNftbDividends: async () => createTx(async ({ hash, blockNumber, timestamp }) => {
      for (const node of state.nftbNodes) {
        if (node.pending > 0n) {
          const amount = node.pending
          node.pending = 0n
          state.account.pendingTot += amount
          state.account.claimedTot += amount
          pushEvent("NftbDividendClaimed", { user: addresses.user, nodeId: node.nodeId, amount }, hash, blockNumber, timestamp)
        }
      }
    }),
    withdrawTot: async (amount) => {
      const value = BigInt(amount)
      if (value <= 0n) return Promise.reject(new Error("Amount must be greater than 0"))
      if (value > state.account.pendingTot) return Promise.reject(new Error("Insufficient pending balance"))
      return createTx(async ({ hash, blockNumber, timestamp }) => {
        state.account.pendingTot -= value
        state.account.withdrawnTot += value
        pushEvent("TotWithdrawn", { user: addresses.user, totAmount: value, tofFee: 0n, burnedTof: 0n }, hash, blockNumber, timestamp)
      })
    },
    queryFilter: async (filter, fromBlock = 0, toBlock = Number(state.blockNumber)) => state.events
      .filter((item) => item.eventName === filter.eventName)
      .filter((item) => !filter.user || item.args.user?.toLowerCase() === filter.user)
      .filter((item) => item.blockNumber >= Number(fromBlock) && item.blockNumber <= Number(toBlock))
      .map((item) => ({
        blockNumber: item.blockNumber,
        transactionHash: item.transactionHash,
        args: item.args
      }))
  }

  const swapMock = {
    totReserve: async () => state.swapConfig.totReserve,
    usdtReserve: async () => state.swapConfig.usdtReserve,
    nftbDividendPool: async () => state.swapConfig.nftbDividendPool,
    buyFeeBps: async () => state.swapConfig.buyFeeBps,
    sellFeeBps: async () => state.swapConfig.sellFeeBps,
    profitTaxBps: async () => state.swapConfig.profitTaxBps,
    distributionThreshold: async () => state.swapConfig.distributionThreshold,
    maxDailyBuy: async () => state.swapConfig.maxDailyBuy,
    maxSellBps: async () => state.swapConfig.maxSellBps,
    deflationBps: async () => state.swapConfig.deflationBps,
    lastDeflationTime: async () => state.swapConfig.lastDeflationTime,
    nexus: async () => addresses.nexus,
    totToken: async () => addresses.tot,
    usdtToken: async () => addresses.usdt,
    getCurrentPrice: async () => 10n ** 18n,
    getUserAvgPrice: async () => 9n * 10n ** 17n,
    getDailyBoughtAmount: async () => 100n * 10n ** 18n,
    getMaxSellAmount: async () => 50_000n * 10n ** 18n,
    timeUntilNextDeflation: async () => 0n,
    quoteBuy: async () => [95n * 10n ** 18n, 5n * 10n ** 17n],
    quoteSell: async () => [95n * 10n ** 18n, 5n * 10n ** 17n],
    setBuyFeeBps: async (value) => createTx(async () => {
      state.swapConfig.buyFeeBps = BigInt(value)
    }),
    setSellFeeBps: async (value) => createTx(async () => {
      state.swapConfig.sellFeeBps = BigInt(value)
    }),
    setProfitTaxBps: async (value) => createTx(async () => {
      state.swapConfig.profitTaxBps = BigInt(value)
    }),
    setDistributionThreshold: async (value) => createTx(async () => {
      state.swapConfig.distributionThreshold = BigInt(value)
    }),
    setMaxDailyBuy: async (value) => createTx(async () => {
      state.swapConfig.maxDailyBuy = BigInt(value)
    }),
    setMaxSellBps: async (value) => createTx(async () => {
      state.swapConfig.maxSellBps = BigInt(value)
    }),
    setDeflationBps: async (value) => createTx(async () => {
      state.swapConfig.deflationBps = BigInt(value)
    }),
    buyTot: async () => createTx(),
    sellTot: async () => createTx()
  }

  const createErc20Mock = (tokenAddress) => ({
    decimals: async () => 18,
    balanceOf: async () => state.balances.get(tokenAddress) ?? 0n,
    allowance: async (owner, spender) => state.approvals.get(approvalKey(tokenAddress, owner, spender)) ?? ((2n ** 255n) - 1n),
    approve: async (spender, amount) => {
      state.approvals.set(approvalKey(tokenAddress, state.accounts[0], spender), BigInt(amount))
      return createTx()
    }
  })

  const getCallResult = (data) => {
    const selector = (data || "").slice(0, 10).toLowerCase()
    switch (selector) {
      case "0x8da5cb5b":
        return encodeAddress(state.ownerAddress)
      case "0x5e5c06e2":
        return encodeTuple([
          encodeAddress(state.account.referrer),
          toPaddedHex(state.account.pendingTot),
          toPaddedHex(state.account.claimedTot),
          toPaddedHex(state.account.withdrawnTot),
          toPaddedHex(state.account.totalNodes),
          toPaddedHex(state.account.directReferrals),
          toPaddedHex(state.account.teamNodes),
          toPaddedHex(state.account.teamCommissionEarned)
        ])
      case "0x313ce567":
        return toPaddedHex(18n)
      case "0x70a08231":
        return toPaddedHex(1_000_000n * 10n ** 18n)
      case "0xdd62ed3e":
        return toPaddedHex((2n ** 255n) - 1n)
      case "0x77d2300e":
        return toPaddedHex(state.swapConfig.buyFeeBps)
      case "0x23cbe1f3":
        return toPaddedHex(state.swapConfig.sellFeeBps)
      case "0xeb91d37e":
        return toPaddedHex(10n ** 18n)
      case "0xb8b2c7ed":
        return toPaddedHex(9n * 10n ** 17n)
      case "0x817d675b":
        return toPaddedHex(100n * 10n ** 18n)
      case "0xdb82f7b5":
        return toPaddedHex(state.swapConfig.maxDailyBuy)
      case "0x9d702226":
        return toPaddedHex(50_000n * 10n ** 18n)
      case "0xd894b831":
        return toPaddedHex(state.swapConfig.profitTaxBps)
      case "0x722ae951":
        return toPaddedHex(0n)
      case "0x4beb394c":
      case "0xa64190c4":
        return encodeTuple([toPaddedHex(95n * 10n ** 18n), toPaddedHex(5n * 10n ** 17n)])
      default:
        return toPaddedHex(1n)
    }
  }

  const ethereum = {
    isMetaMask: true,
    on,
    removeListener,
    request: async ({ method, params }) => {
      switch (method) {
        case "wallet_switchEthereumChain": {
          const next = params?.[0]?.chainId
          if (typeof next === "string") {
            state.chainId = next
            emit("chainChanged", state.chainId)
          }
          return null
        }
        case "wallet_addEthereumChain":
          return null
        case "wallet_watchAsset":
          return true
        case "eth_chainId":
          return state.chainId
        case "net_version":
          return "50716"
        case "eth_accounts":
          return [...state.accounts]
        case "eth_requestAccounts": {
          if (state.rejectNextConnect) {
            state.rejectNextConnect = false
            throw { code: 4001, message: "User rejected request" }
          }
          emit("accountsChanged", [...state.accounts])
          return [...state.accounts]
        }
        case "eth_getBalance":
          return toPaddedHex(10n * 10n ** 18n)
        case "eth_blockNumber":
          return toHex(state.blockNumber)
        case "eth_getBlockByNumber": {
          const blockTag = params?.[0]
          const blockNumber = blockTag === "latest" ? state.blockNumber : BigInt(blockTag)
          const timestamp = state.blocks.get(blockNumber) ?? nowTs()
          return {
            number: toHex(blockNumber),
            hash: `0x${blockNumber.toString(16).padStart(64, "0")}`,
            parentHash: `0x${(blockNumber > 1n ? blockNumber - 1n : 0n).toString(16).padStart(64, "0")}`,
            timestamp: toHex(timestamp),
            nonce: "0x0000000000000000",
            difficulty: "0x0",
            gasLimit: "0x1c9c380",
            gasUsed: "0x5208",
            miner: addresses.owner,
            transactions: []
          }
        }
        case "eth_getTransactionCount":
          return toHex(state.txNonce)
        case "eth_gasPrice":
        case "eth_maxPriorityFeePerGas":
          return "0x3b9aca00"
        case "eth_estimateGas":
          return "0x5208"
        case "eth_call": {
          const tx = params?.[0] || {}
          return getCallResult(tx.data)
        }
        case "eth_sendTransaction": {
          if (state.failNextTx) {
            state.failNextTx = false
            throw { code: -32000, message: "execution reverted: mock failure" }
          }
          state.txNonce += 1n
          const hash = `0x${state.txNonce.toString(16).padStart(64, "0")}`
          state.txReceipts.set(hash, {
            blockHash: `0x${state.blockNumber.toString(16).padStart(64, "0")}`,
            blockNumber: toHex(state.blockNumber),
            contractAddress: null,
            cumulativeGasUsed: "0x5208",
            effectiveGasPrice: "0x3b9aca00",
            from: state.accounts[0],
            gasUsed: "0x5208",
            logs: [],
            logsBloom: `0x${"0".repeat(512)}`,
            status: "0x1",
            to: zeroAddress,
            transactionHash: hash,
            transactionIndex: "0x0",
            type: "0x2"
          })
          return hash
        }
        case "eth_getTransactionByHash": {
          const hash = params?.[0]
          if (!hash) return null
          return {
            hash,
            from: state.accounts[0],
            to: zeroAddress,
            nonce: "0x0",
            gas: "0x5208",
            value: "0x0",
            input: "0x",
            blockHash: `0x${state.blockNumber.toString(16).padStart(64, "0")}`,
            blockNumber: toHex(state.blockNumber),
            transactionIndex: "0x0",
            type: "0x2",
            chainId: state.chainId
          }
        }
        case "eth_getTransactionReceipt": {
          const hash = params?.[0]
          return state.txReceipts.get(hash) || null
        }
        default:
          return null
      }
    }
  }

  Object.defineProperty(window, "ethereum", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: ethereum
  })

  window.__E2E_WALLET__ = {
    setNextTxFail(value = true) {
      state.failNextTx = Boolean(value)
    },
    setRejectNextConnect(value = true) {
      state.rejectNextConnect = Boolean(value)
    },
    setOwnerAsCurrent(value = true) {
      state.ownerAddress = value ? state.accounts[0] : addresses.owner
      window.localStorage.setItem("e2e_owner_mode", value ? "1" : "0")
    },
    setReferrerBound(value = true) {
      state.account.referrer = value ? addresses.referrer : zeroAddress
      window.localStorage.setItem("e2e_referrer_bound", value ? "1" : "0")
    }
  }

  window.__E2E_CONTRACT_MOCK__ = {
    getContract(address) {
      const normalized = address.toLowerCase()
      if (normalized === addresses.nexus) return nexusMock
      if (normalized === addresses.swap) return swapMock
      if (normalized === addresses.tot) return createErc20Mock(addresses.tot)
      if (normalized === addresses.tof) return createErc20Mock(addresses.tof)
      if (normalized === addresses.usdt) return createErc20Mock(addresses.usdt)
      return null
    }
  }
})()
