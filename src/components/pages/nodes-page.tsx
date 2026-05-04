"use client";

import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { execTx, useERC20Contract, useNexusContract, useReadonlyNexusContract } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";
import { CONTRACTS } from "@/lib/contracts";
import { createDefaultSerializedNftaTiers, createDefaultSerializedNftbTiers } from "@/lib/node-tier-config";
import { getNftaTierName, getNftbTierName } from "@/lib/ui-config";
import { useWeb3 } from "@/lib/web3-provider";
import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { erc20Abi, type Hex } from "viem";

type NftaTier = {
  id: number;
  price: bigint;
  dailyYield: bigint;
  maxSupply: bigint;
  currentSupply: bigint;
  isActive: boolean;
  remaining: bigint;
};

type NftbTier = {
  id: number;
  price: bigint;
  weight: bigint;
  maxSupply: bigint;
  usdtMinted: bigint;
  tofMinted: bigint;
  dividendBps: bigint;
  isActive: boolean;
  usdtRemaining: bigint;
  tofRemaining: bigint;
};

type NodeAItem = {
  nodeId: bigint;
  tierId: bigint;
  dailyYield: bigint;
  lastClaimDay: bigint;
  isActive: boolean;
  pending: bigint;
};

type NodeBItem = {
  nodeId: bigint;
  tierId: bigint;
  weight: bigint;
  isActive: boolean;
  pending: bigint;
};

const toTierId = (id: number | bigint) => Number(id);
const WAD = 10n ** 18n;
const DEFAULT_TOF_PER_USDT = 200n * WAD;
const DEFAULT_NFTA_TIERS: NftaTier[] = createDefaultSerializedNftaTiers().map((tier) => ({
  id: tier.id,
  price: BigInt(tier.price),
  dailyYield: BigInt(tier.dailyYield),
  maxSupply: BigInt(tier.maxSupply),
  currentSupply: BigInt(tier.currentSupply),
  isActive: tier.isActive,
  remaining: BigInt(tier.remaining),
}));
const DEFAULT_NFTB_TIERS: NftbTier[] = createDefaultSerializedNftbTiers().map((tier) => ({
  id: tier.id,
  price: BigInt(tier.price),
  weight: BigInt(tier.weight),
  maxSupply: BigInt(tier.maxSupply),
  usdtMinted: BigInt(tier.usdtMinted),
  tofMinted: BigInt(tier.tofMinted),
  dividendBps: BigInt(tier.dividendBps),
  isActive: tier.isActive,
  usdtRemaining: BigInt(tier.usdtRemaining),
  tofRemaining: BigInt(tier.tofRemaining),
}));

export function NodesPage() {
  const { t } = useLanguage();
  const { address, isConnected, walletClient } = useWeb3();
  const { toast } = useToast();
  const nexus = useNexusContract();
  const readonlyNexus = useReadonlyNexusContract();
  const usdt = useERC20Contract(CONTRACTS.USDT);
  const tof = useERC20Contract(CONTRACTS.TOF);

  const [loading, setLoading] = useState(false);
  const [nftaTiers, setNftaTiers] = useState<NftaTier[]>(DEFAULT_NFTA_TIERS);
  const [nftbTiers, setNftbTiers] = useState<NftbTier[]>(DEFAULT_NFTB_TIERS);
  const [nftaNodes, setNftaNodes] = useState<NodeAItem[]>([]);
  const [nftbNodes, setNftbNodes] = useState<NodeBItem[]>([]);
  const [selectedNftaTier, setSelectedNftaTier] = useState<number | null>(null);
  const [selectedNftbTier, setSelectedNftbTier] = useState<number | null>(null);
  const [nftbPayToken, setNftbPayToken] = useState<"USDT" | "TOF">("USDT");
  const [referrer, setReferrer] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [nftaStage, setNftaStage] = useState<"idle" | "checking" | "approving" | "purchasing" | "confirming">("idle");
  const [nftbStage, setNftbStage] = useState<"idle" | "checking" | "approving" | "purchasing" | "confirming">("idle");
  const [nftaTransferToByNode, setNftaTransferToByNode] = useState<Record<string, string>>({});
  const [nftbTransferToByNode, setNftbTransferToByNode] = useState<Record<string, string>>({});
  const [nftaClaimFeeBps, setNftaClaimFeeBps] = useState<bigint>(0n);
  const [tofPerUsdt, setTofPerUsdt] = useState<bigint>(DEFAULT_TOF_PER_USDT);
  const [withdrawableTot, setWithdrawableTot] = useState<bigint>(0n);
  const zeroValue = ethers.parseUnits("0", 0);
  const NODES_SUMMARY_TIMEOUT_MS = 12_000;
  const NODES_SUMMARY_MAX_RETRIES = 2;

  const refreshData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsRefreshing(true);
    }
    setLoadError("");

    if (!CONTRACTS.NEXUS || !readonlyNexus) {
      setNftaTiers(DEFAULT_NFTA_TIERS);
      setNftbTiers(DEFAULT_NFTB_TIERS);
      setNftaNodes([]);
      setNftbNodes([]);
      setNftaClaimFeeBps(0n);
      setWithdrawableTot(0n);
      setLoadError(t("toastContractMissingDesc"));
      if (showLoading) setIsRefreshing(false);
      setInitialLoaded(true);
      return;
    }

    try {
      // ── 1. Tier data (no wallet needed, all public view calls) ──────────
      const nftaTierIds = createDefaultSerializedNftaTiers().map((t) => t.id);
      const nftbTierIds = createDefaultSerializedNftbTiers().map((t) => t.id);

      const [nftaTierResults, nftbTierResults] = await Promise.all([
        Promise.allSettled(
          nftaTierIds.map(async (id) => {
            const [tier, remaining] = await Promise.all([
              readonlyNexus.nftaTiers(id),
              readonlyNexus.getNftaTierRemaining(id),
            ]);
            return { id, tier, remaining };
          })
        ),
        Promise.allSettled(
          nftbTierIds.map(async (id) => {
            const [tier, remaining] = await Promise.all([
              readonlyNexus.nftbTiers(id),
              readonlyNexus.getNftbTierRemaining(id),
            ]);
            return { id, tier, remaining };
          })
        ),
      ]);

      const resolvedNftaTiers: NftaTier[] = DEFAULT_NFTA_TIERS.map((def) => {
        const hit = nftaTierResults.find(
          (r): r is PromiseFulfilledResult<{ id: number; tier: any; remaining: any }> =>
            r.status === "fulfilled" && r.value.id === def.id
        );
        if (!hit) return def;
        const { tier, remaining } = hit.value;
        return {
          id: def.id,
          price: BigInt(tier.price),
          dailyYield: BigInt(tier.dailyYield),
          maxSupply: BigInt(tier.maxSupply),
          currentSupply: BigInt(tier.currentSupply),
          isActive: Boolean(tier.isActive),
          remaining: BigInt(remaining),
        };
      });

      const resolvedNftbTiers: NftbTier[] = DEFAULT_NFTB_TIERS.map((def) => {
        const hit = nftbTierResults.find(
          (r): r is PromiseFulfilledResult<{ id: number; tier: any; remaining: any }> =>
            r.status === "fulfilled" && r.value.id === def.id
        );
        if (!hit) return def;
        const { tier, remaining } = hit.value;
        return {
          id: def.id,
          price: BigInt(tier.price),
          weight: BigInt(tier.weight),
          maxSupply: BigInt(tier.maxSupply),
          usdtMinted: BigInt(tier.usdtMinted),
          tofMinted: BigInt(tier.tofMinted),
          dividendBps: BigInt(tier.dividendBps),
          isActive: Boolean(tier.isActive),
          usdtRemaining: BigInt(remaining[0]),
          tofRemaining: BigInt(remaining[1]),
        };
      });

      setNftaTiers(resolvedNftaTiers);
      setNftbTiers(resolvedNftbTiers);

      // ── 2. User node data (requires connected wallet / address) ─────────
      if (address && readonlyNexus) {
        const [nftaIds, nftbIds] = await Promise.all([
          readonlyNexus.getUserNftaNodes(address),
          readonlyNexus.getUserNftbNodes(address),
        ]);

        // Read node structs in parallel
        const [nftaNodeStructs, nftbNodeStructs] = await Promise.all([
          Promise.allSettled((nftaIds as bigint[]).map((id) => readonlyNexus.nftaNodes(id))),
          Promise.allSettled((nftbIds as bigint[]).map((id) => readonlyNexus.nftbNodes(id))),
        ]);

        // NFTA: only the highest-dailyYield active node has pending populated
        const rawNftaNodes = nftaNodeStructs
          .map((r, i) =>
            r.status === "fulfilled"
              ? { nodeId: (nftaIds as bigint[])[i], node: r.value as any }
              : null
          )
          .filter((x): x is NonNullable<typeof x> => x !== null);

        let highestPendingNodeId: bigint | null = null;
        let highestDailyYield = 0n;
        for (const { node, nodeId } of rawNftaNodes) {
          if (!node.isActive) continue;
          const dy = BigInt(node.dailyYield);
          if (dy > highestDailyYield) { highestDailyYield = dy; highestPendingNodeId = nodeId; }
        }

        let highestPending = 0n;
        if (highestPendingNodeId !== null) {
          try { highestPending = BigInt(await readonlyNexus.pendingNftaYield(highestPendingNodeId)); } catch { /* keep 0 */ }
        }

        setNftaNodes(
          rawNftaNodes.map(({ nodeId, node }) => ({
            nodeId,
            tierId: BigInt(node.tierId),
            dailyYield: BigInt(node.dailyYield),
            lastClaimDay: BigInt(node.lastClaimDay),
            isActive: Boolean(node.isActive),
            pending: highestPendingNodeId !== null && nodeId === highestPendingNodeId ? highestPending : 0n,
          }))
        );

        // NFTB: read pending for all nodes in parallel
        const rawNftbNodes = nftbNodeStructs
          .map((r, i) =>
            r.status === "fulfilled"
              ? { nodeId: (nftbIds as bigint[])[i], node: r.value as any }
              : null
          )
          .filter((x): x is NonNullable<typeof x> => x !== null);

        const nftbPendingResults = await Promise.allSettled(
          rawNftbNodes.map(({ nodeId }) => readonlyNexus.pendingNftbDividend(nodeId))
        );

        setNftbNodes(
          rawNftbNodes.map(({ nodeId, node }, i) => ({
            nodeId,
            tierId: BigInt(node.tierId),
            weight: BigInt(node.weight),
            isActive: Boolean(node.isActive),
            pending:
              nftbPendingResults[i].status === "fulfilled"
                ? BigInt((nftbPendingResults[i] as PromiseFulfilledResult<any>).value)
                : 0n,
          }))
        );

        // Account balance for TOT withdrawal
        try {
          const account = await readonlyNexus.accounts(address);
          setWithdrawableTot(BigInt(account.pendingTot));
        } catch { setWithdrawableTot(0n); }
      } else {
        setNftaNodes([]);
        setNftbNodes([]);
        setWithdrawableTot(0n);
      }

      // ── 3. Fee parameters ───────────────────────────────────────────────
      try {
        const [feeBpsRaw, tofPerUsdtRaw] = await Promise.all([
          readonlyNexus.tofClaimFeeBps(),
          readonlyNexus.tofPerUsdt(),
        ]);
        const feeBps = BigInt(feeBpsRaw);
        const tofRate = BigInt(tofPerUsdtRaw);
        setNftaClaimFeeBps(feeBps);
        setTofPerUsdt(tofRate > 0n ? tofRate : DEFAULT_TOF_PER_USDT);
      } catch { /* keep defaults */ }

    } catch (error) {
      console.error("Failed to load node data", error);
      setLoadError(t("nodesLoadFailed"));
    } finally {
      if (showLoading) setIsRefreshing(false);
      setInitialLoaded(true);
    }
  }, [address, t, readonlyNexus]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const getWithdrawTofFee = useCallback(async (amount: bigint) => {
    if (!nexus || !address || amount <= 0n) return 0n;

    try {
      const feeBps = BigInt(await nexus.withdrawFeeBps());
      return (amount * feeBps) / 10000n;
    } catch (err) {
      console.warn("[getWithdrawTofFee] failed, defaulting to 0:", (err as Error)?.message?.slice(0, 100));
      return 0n;
    }
  }, [address, nexus]);

  /**
   * Send any transaction via window.ethereum.request (bypasses ethers completely).
   * Receipt polling uses raw fetch + JSON-RPC to avoid ethers RPC parsing issues on CNC chain.
   */
  const rawSendViaWallet = useCallback(async (
    to: string,
    data: string,
    from: string,
    gasLimit = 220_000,
  ): Promise<{ success: boolean; hash?: string; error?: string }> => {
    const ethereum = (window as Window & { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!ethereum) return { success: false, error: "wallet unavailable" };

    try {
      console.log("[rawSend] to:", to, "from:", from, "gas:", gasLimit, "data:", data.slice(0, 10));
      const txHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from,
          to: to.toLowerCase(),
          data,
          gas: "0x" + gasLimit.toString(16),
        }],
      }) as string;

      console.log("[rawSend] txHash:", txHash);
      if (!txHash) return { success: false, error: "no tx hash returned" };

      const rpcUrl = "https://rpc.cncchainpro.com";
      const pollReceipt = async (hash: string, attempts = 40, intervalMs = 3000): Promise<number | null> => {
        for (let i = 0; i < attempts; i++) {
          try {
            const res = await fetch(rpcUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionReceipt", params: [hash], id: 1 }),
            });
            const json = await res.json() as { result?: { status?: string } | null };
            if (json.result?.status) return parseInt(json.result.status, 16);
          } catch { /* retry */ }
          await new Promise(r => setTimeout(r, intervalMs));
        }
        return null;
      };

      const status = await pollReceipt(txHash);
      console.log("[rawSend] receipt status:", status);
      if (status === 1) return { success: true, hash: txHash };
      if (status === 0) return { success: false, hash: txHash, error: "交易已上链但被回滚(reverted)" };
      return { success: false, hash: txHash, error: "等待交易确认超时，请查询 " + txHash.slice(0, 10) + "..." };
    } catch (err: unknown) {
      const e = err as { message?: string; shortMessage?: string; code?: number };
      console.error("[rawSend] error:", e.code, e.message);
      if (e.code === 4001 || /user rejected|user denied|ACTION_REJECTED/i.test(e.message || "")) {
        return { success: false, error: "用户取消了操作" };
      }
      return { success: false, error: e.shortMessage || e.message || "钱包发送交易失败" };
    }
  }, []);

  /**
   * Approve ERC-20 token via multiple methods:
   * 1. viem walletClient.writeContract (best compatibility with wagmi wallet)
   * 2. raw eth_sendTransaction (bypasses all libraries)
   * 3. ethers with explicit gasLimit (last resort)
   * Approves maxUint256 so user only needs to approve once.
   */
  const viemApprove = useCallback(async (
    tokenAddress: string,
    spenderAddress: string,
    from: string,
  ): Promise<{ success: boolean; hash?: string; error?: string }> => {
    const maxApproval = 2n ** 256n - 1n;

    const rpcUrl = "https://rpc.cncchainpro.com";
    const pollReceipt = async (hash: string, attempts = 40, intervalMs = 3000): Promise<number | null> => {
      for (let i = 0; i < attempts; i++) {
        try {
          const res = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionReceipt", params: [hash], id: 1 }),
          });
          const json = await res.json() as { result?: { status?: string } | null };
          if (json.result?.status) return parseInt(json.result.status, 16);
        } catch { /* retry */ }
        await new Promise(r => setTimeout(r, intervalMs));
      }
      return null;
    };

    // Method 1: viem walletClient.writeContract
    if (walletClient) {
      try {
        console.log("[viemApprove] using walletClient.writeContract, token:", tokenAddress, "spender:", spenderAddress);
        const hash = await walletClient.writeContract({
          account: from as Hex,
          address: tokenAddress as Hex,
          abi: erc20Abi,
          functionName: "approve",
          args: [spenderAddress as Hex, maxApproval],
          chain: walletClient.chain ?? null,
          gas: 220_000n,
        });
        console.log("[viemApprove] txHash:", hash);
        const status = await pollReceipt(hash);
        console.log("[viemApprove] receipt status:", status);
        if (status === 1) return { success: true, hash };
        if (status === 0) return { success: false, hash, error: "approve交易被回滚" };
        return { success: false, hash, error: "等待确认超时" };
      } catch (err: unknown) {
        const e = err as { message?: string; shortMessage?: string; code?: number; name?: string };
        console.error("[viemApprove] walletClient error:", e.code, e.name, e.message?.slice(0, 200));
        if (e.code === 4001 || /user rejected|user denied|ACTION_REJECTED/i.test(e.message || "")) {
          return { success: false, error: "用户取消了授权" };
        }
        // Fall through to raw method
      }
    }

    // Method 2: raw eth_sendTransaction
    console.log("[viemApprove] fallback to rawSendViaWallet");
    const spenderHex = spenderAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const amtHex = maxApproval.toString(16).padStart(64, "0");
    const data = "0x095ea7b3" + spenderHex + amtHex;
    return rawSendViaWallet(tokenAddress, data, from);
  }, [walletClient, rawSendViaWallet]);

  const ensureTofReady = useCallback(async (
    requiredTof: bigint,
    failTitle: string,
    insufficientDescription: string,
    stage: "idle" | "checking" | "approving" | "purchasing" | "confirming" = "approving",
  ) => {
    if (requiredTof <= 0n) return true;

    if (!tof || !address) {
      toast({ title: failTitle, description: t("toastTofTokenUnavailable"), variant: "destructive" });
      return false;
    }

    const [tofBalance, allowance] = await Promise.all([
      tof.balanceOf(address),
      tof.allowance(address, CONTRACTS.NEXUS),
    ]);

    if (tofBalance < requiredTof) {
      toast({ title: failTitle, description: insufficientDescription, variant: "destructive" });
      return false;
    }

    if (allowance < requiredTof) {
      setNftaStage(stage);

      // Primary: viem walletClient.writeContract (maxUint256 approve)
      const tofAddr = await tof.getAddress();
      console.log("[ensureTofReady] approve needed, tofAddr:", tofAddr, "required:", requiredTof.toString());
      const approveRes = await viemApprove(tofAddr, CONTRACTS.NEXUS, address);

      if (/用户取消/i.test(approveRes.error || "")) {
        toast({ title: failTitle, description: approveRes.error, variant: "destructive" });
        return false;
      }

      // Always verify allowance on-chain regardless of reported success
      const newAllowance = await tof.allowance(address, CONTRACTS.NEXUS);
      console.log("[ensureTofReady] post-approve allowance:", newAllowance.toString());
      if (newAllowance >= requiredTof) return true;

      // Last resort: ethers with explicit gasLimit
      const ethersRes = await execTx(() => tof.approve(CONTRACTS.NEXUS, requiredTof, { gasLimit: 200_000n }));
      if (ethersRes.success) {
        const verifiedAllowance = await tof.allowance(address, CONTRACTS.NEXUS);
        if (verifiedAllowance >= requiredTof) return true;
      }

      toast({ title: failTitle, description: approveRes.error || "TOF授权失败，请打开浏览器控制台查看详情后联系客服", variant: "destructive" });
      return false;
    }

    return true;
  }, [address, viemApprove, t, toast, tof]);

  const buyNfta = async () => {
    if (!isConnected || !address || !nexus || selectedNftaTier === null) return;

    const runnerProvider = (nexus.runner as { provider?: ethers.Provider } | undefined)?.provider;
    if (runnerProvider) {
      try {
        const nativeBalance = await runnerProvider.getBalance(address);
        if (nativeBalance <= 0n) {
          toast({ title: t("toastBuyNftaFailed"), description: "Gas不足：请先充值主网币后再购买", variant: "destructive" });
          return;
        }
      } catch {
        // Ignore balance precheck failures and let the tx flow handle errors.
      }
    }

    const tier = nftaTiers.find((t) => t.id === selectedNftaTier);
    if (!tier || !usdt) return;
    if (!tier.isActive || tier.remaining <= 0n) {
      toast({ title: t("toastBuyNftaFailed"), description: t("toastTierInactiveOrSoldOut"), variant: "destructive" });
      return;
    }

    setLoading(true);
    setNftaStage("checking");
    try {
      const ensureAllowance = async (token: ethers.Contract, required: bigint, failTitle: string) => {
        const allowance = await token.allowance(address, CONTRACTS.NEXUS);
        if (allowance >= required) return true;

        const tokenAddr = await token.getAddress();
        setNftaStage("approving");

        const approveRes = await viemApprove(tokenAddr, CONTRACTS.NEXUS, address!);
        if (/用户取消/i.test(approveRes.error || "")) { toast({ title: failTitle, description: approveRes.error, variant: "destructive" }); return false; }

        const verified = await token.allowance(address, CONTRACTS.NEXUS);
        if (verified >= required) return true;

        // Last resort: ethers
        const ethersRes = await execTx(() => token.approve(CONTRACTS.NEXUS, required, { gasLimit: 200_000n }));
        if (ethersRes.success) {
          const v2 = await token.allowance(address, CONTRACTS.NEXUS);
          if (v2 >= required) return true;
        }

        toast({ title: failTitle, description: approveRes.error || "授权失败，请打开控制台查看详情", variant: "destructive" });
        return false;
      };

      if (!(await ensureAllowance(usdt, tier.price, t("toastUsdtApproveFailed")))) {
        return;
      }

      setNftaStage("purchasing");
      const parsedReferrer = referrer.trim();
      const finalReferrer = ethers.isAddress(parsedReferrer) ? parsedReferrer : ethers.ZeroAddress;
      const res = await execTx(() => nexus.buyNfta(BigInt(tier.id), finalReferrer, { gasLimit: 900_000n }));
      if (!res.success) {
        toast({ title: t("toastBuyNftaFailed"), description: toFriendlyTxError(res.error), variant: "destructive" });
        return;
      }

      setNftaStage("confirming");

      toast({ title: t("toastBuyNftaSuccess"), description: res.hash?.slice(0, 10) + "..." });
      await refreshData(false);
    } finally {
      setNftaStage("idle");
      setLoading(false);
    }
  };

  const buyNftb = async () => {
    if (!isConnected || !address || !nexus || selectedNftbTier === null) return;

    const runnerProvider = (nexus.runner as { provider?: ethers.Provider } | undefined)?.provider;
    if (runnerProvider) {
      try {
        const nativeBalance = await runnerProvider.getBalance(address);
        if (nativeBalance <= 0n) {
          toast({ title: t("toastBuyNftbFailed"), description: "Gas不足：请先充值主网币后再购买", variant: "destructive" });
          return;
        }
      } catch {
        // Ignore balance precheck failures and let the tx flow handle errors.
      }
    }

    const tier = nftbTiers.find((t) => t.id === selectedNftbTier);
    if (!tier) return;
    if (!tier.isActive) {
      toast({ title: t("toastBuyNftbFailed"), description: t("toastTierInactive"), variant: "destructive" });
      return;
    }

    setLoading(true);
    setNftbStage("checking");
    try {
      const ensureAllowance = async (token: ethers.Contract, required: bigint, failTitle: string) => {
        const allowance = await token.allowance(address, CONTRACTS.NEXUS);
        if (allowance >= required) return true;

        const tokenAddr = await token.getAddress();
        setNftbStage("approving");

        const approveRes = await viemApprove(tokenAddr, CONTRACTS.NEXUS, address!);
        if (/用户取消/i.test(approveRes.error || "")) { toast({ title: failTitle, description: approveRes.error, variant: "destructive" }); return false; }

        const verified = await token.allowance(address, CONTRACTS.NEXUS);
        if (verified >= required) return true;

        // Last resort: ethers
        const ethersRes = await execTx(() => token.approve(CONTRACTS.NEXUS, required, { gasLimit: 200_000n }));
        if (ethersRes.success) {
          const v2 = await token.allowance(address, CONTRACTS.NEXUS);
          if (v2 >= required) return true;
        }

        toast({ title: failTitle, description: approveRes.error || "授权失败，请打开控制台查看详情", variant: "destructive" });
        return false;
      };

      const parsedReferrer = referrer.trim();
      const finalReferrer = ethers.isAddress(parsedReferrer) ? parsedReferrer : ethers.ZeroAddress;
      if (nftbPayToken === "USDT") {
        if (tier.usdtRemaining <= 0n) {
          toast({ title: t("toastBuyNftbFailed"), description: t("toastUsdtQuotaSoldOut"), variant: "destructive" });
          return;
        }
        if (!usdt) return;
        if (!(await ensureAllowance(usdt, tier.price, t("toastUsdtApproveFailed")))) {
          return;
        }
        setNftbStage("purchasing");
        const res = await execTx(() => nexus.buyNftbWithUsdt(BigInt(tier.id), finalReferrer, { gasLimit: 900_000n }));
        if (!res.success) {
          toast({ title: t("toastBuyNftbFailed"), description: toFriendlyTxError(res.error), variant: "destructive" });
          return;
        }
        setNftbStage("confirming");
        toast({ title: t("toastBuyNftbSuccess"), description: res.hash?.slice(0, 10) + "..." });
      } else {
        if (tier.tofRemaining <= 0n) {
          toast({ title: t("toastBuyNftbFailed"), description: t("toastTofQuotaSoldOut"), variant: "destructive" });
          return;
        }
        if (!tof) return;

        let tofRate = tofPerUsdt;
        if (tofRate <= 0n) {
          tofRate = BigInt(await nexus.tofPerUsdt());
          setTofPerUsdt(tofRate);
          if (tofRate <= 0n) {
            toast({ title: t("toastBuyNftbFailed"), description: t("toastTofRateNotInitialized"), variant: "destructive" });
            return;
          }
        }

        const tofCost = (tier.price * tofRate) / WAD;
        if (tofCost <= 0n) {
          toast({ title: t("toastBuyNftbFailed"), description: t("toastTofRateNotInitialized"), variant: "destructive" });
          return;
        }

        const tofBalance = await tof.balanceOf(address);
        if (tofBalance < tofCost) {
          toast({ title: t("toastBuyNftbFailed"), description: t("toastTofBalanceInsufficient"), variant: "destructive" });
          return;
        }

        // TOF is non-transferable by default; either user or Nexus must be whitelisted.
        try {
          const tofWhitelistView = new ethers.Contract(
            CONTRACTS.TOF,
            ["function transferWhitelist(address) view returns (bool)"],
            tof.runner
          );
          const [isUserWhitelisted, isNexusWhitelisted] = await Promise.all([
            tofWhitelistView.transferWhitelist(address),
            tofWhitelistView.transferWhitelist(CONTRACTS.NEXUS),
          ]);
          if (!isUserWhitelisted && !isNexusWhitelisted) {
            toast({
              title: t("toastBuyNftbFailed"),
              description: "TOF不可转账：当前钱包与Nexus均未加入白名单，请联系管理员处理",
              variant: "destructive",
            });
            return;
          }
        } catch {
          // Ignore whitelist-read failures; tx execution path will provide final error.
        }

        if (!(await ensureAllowance(tof, tofCost, t("toastTofApproveFailed")))) {
          return;
        }
        setNftbStage("purchasing");
        const res = await execTx(() => nexus.buyNftbWithTof(BigInt(tier.id), finalReferrer, { gasLimit: 900_000n }));
        if (!res.success) {
          toast({ title: t("toastBuyNftbFailed"), description: toFriendlyTxError(res.error), variant: "destructive" });
          return;
        }
        setNftbStage("confirming");
        toast({ title: t("toastBuyNftbSuccess"), description: res.hash?.slice(0, 10) + "..." });
      }

      await refreshData(false);
    } finally {
      setNftbStage("idle");
      setLoading(false);
    }
  };

  const nftaStageText = useMemo(() => {
    if (nftaStage === "checking") return t("stageChecking");
    if (nftaStage === "approving") return t("stageApproving");
    if (nftaStage === "purchasing") return t("stagePurchasing");
    if (nftaStage === "confirming") return t("stageConfirming");
    return "";
  }, [nftaStage, t]);

  const nftbStageText = useMemo(() => {
    if (nftbStage === "checking") return t("stageChecking");
    if (nftbStage === "approving") return t("stageApproving");
    if (nftbStage === "purchasing") return t("stagePurchasing");
    if (nftbStage === "confirming") return t("stageConfirming");
    return "";
  }, [nftbStage, t]);

  const claimAllNfta = async () => {
    if (!isConnected || !address) {
      toast({ title: t("toastClaimFailed"), description: t("disabledConnectWallet"), variant: "destructive" });
      return;
    }
    if (!nexus) {
      toast({ title: t("toastClaimFailed"), description: t("toastContractMissingDesc"), variant: "destructive" });
      return;
    }
    const claimAmount = totalNftaPending;
    if (claimAmount <= 0n) {
      toast({ title: t("toastClaimFailed"), description: t("toastNoClaimableRewards"), variant: "destructive" });
      return;
    }
    setLoading(true);
    setNftaStage("checking");
    try {
      const claimFeeBps = BigInt(await nexus.tofClaimFeeBps());
      const claimTofFee = (claimAmount * claimFeeBps) / 10000n;

      const tofReady = await ensureTofReady(
        claimTofFee,
        t("toastClaimFailed"),
        t("toastTofBalanceInsufficient")
      );
      if (!tofReady) return;

      setNftaStage("confirming");
      let claimRes = await execTx(() => nexus.claimAllNftaYield());
      if (!claimRes.success) {
        // Fallback: raw wallet send
        const nexusAddr = await nexus.getAddress();
        const rawClaim = await rawSendViaWallet(nexusAddr, "0x9a291bf2", address, 900_000);
        if (!rawClaim.success) {
          toast({ title: t("toastClaimFailed"), description: toFriendlyTxError(claimRes.error) || rawClaim.error, variant: "destructive" });
          return;
        }
        claimRes = rawClaim;
      }

      toast({ title: t("toastNftaClaimed"), description: t("toastNftaClaimOnlyDesc") });
      await refreshData(false);
    } finally {
      setNftaStage("idle");
      setLoading(false);
    }
  };

  const claimAllNftb = async () => {
    if (!isConnected || !address) {
      toast({ title: t("toastClaimFailed"), description: t("disabledConnectWallet"), variant: "destructive" });
      return;
    }
    if (!nexus) {
      toast({ title: t("toastClaimFailed"), description: t("toastContractMissingDesc"), variant: "destructive" });
      return;
    }
    const claimAmount = totalNftbPending;
    if (claimAmount <= 0n) {
      toast({ title: t("toastClaimFailed"), description: t("toastNoClaimableRewards"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let claimRes = await execTx(() => nexus.claimAllNftbDividends());
      if (!claimRes.success) {
        const nexusAddr = await nexus.getAddress();
        const rawClaim = await rawSendViaWallet(nexusAddr, "0x43f61cd8", address, 900_000);
        if (!rawClaim.success) {
          toast({ title: t("toastClaimFailed"), description: toFriendlyTxError(claimRes.error) || rawClaim.error, variant: "destructive" });
          return;
        }
        claimRes = rawClaim;
      }

      toast({ title: t("toastNftbClaimed"), description: t("toastNftbClaimOnlyDesc") });
      await refreshData(false);
    } finally {
      setLoading(false);
    }
  };

  const transferNfta = async (nodeId: bigint) => {
    if (!nexus) return;
    const target = (nftaTransferToByNode[nodeId.toString()] || "").trim();
    if (!ethers.isAddress(target)) {
      toast({ title: t("toastTransferFailed"), description: t("toastTransferInvalidAddress"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await execTx(() => nexus.transferNftaCard(target, nodeId));
      if (!res.success) {
        toast({ title: t("toastTransferFailed"), description: toFriendlyTxError(res.error), variant: "destructive" });
        return;
      }
      toast({ title: t("toastTransferSuccess"), description: res.hash?.slice(0, 10) + "..." });
      setNftaTransferToByNode((prev) => ({ ...prev, [nodeId.toString()]: "" }));
      await refreshData(false);
    } finally {
      setLoading(false);
    }
  };

  const transferNftb = async (nodeId: bigint) => {
    if (!nexus) return;
    const target = (nftbTransferToByNode[nodeId.toString()] || "").trim();
    if (!ethers.isAddress(target)) {
      toast({ title: t("toastTransferFailed"), description: t("toastTransferInvalidAddress"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await execTx(() => nexus.transferNftbCard(target, nodeId));
      if (!res.success) {
        toast({ title: t("toastTransferFailed"), description: toFriendlyTxError(res.error), variant: "destructive" });
        return;
      }
      toast({ title: t("toastTransferSuccess"), description: res.hash?.slice(0, 10) + "..." });
      setNftbTransferToByNode((prev) => ({ ...prev, [nodeId.toString()]: "" }));
      await refreshData(false);
    } finally {
      setLoading(false);
    }
  };

  const totalNftaPending = useMemo(() => nftaNodes.reduce((s, n) => s + n.pending, zeroValue), [nftaNodes, zeroValue]);
  const totalNftbPending = useMemo(() => nftbNodes.reduce((s, n) => s + n.pending, zeroValue), [nftbNodes, zeroValue]);
  const estimatedNftaTofFee = useMemo(
    () => (totalNftaPending * nftaClaimFeeBps) / 10000n,
    [totalNftaPending, nftaClaimFeeBps]
  );
  const nftaClaimFeeRatePct = useMemo(() => (Number(nftaClaimFeeBps) / 100).toFixed(2), [nftaClaimFeeBps]);
  const selectedNftaTierData = useMemo(
    () => nftaTiers.find((tier) => tier.id === selectedNftaTier) || null,
    [nftaTiers, selectedNftaTier]
  );
  const selectedNftbTierData = useMemo(
    () => nftbTiers.find((tier) => tier.id === selectedNftbTier) || null,
    [nftbTiers, selectedNftbTier]
  );
  const canBuySelectedNfta = Boolean(
    selectedNftaTierData && selectedNftaTierData.isActive && selectedNftaTierData.remaining > 0n
  );
  const canBuySelectedNftb = useMemo(() => {
    if (!selectedNftbTierData || !selectedNftbTierData.isActive) return false;
    const remaining = nftbPayToken === "USDT"
      ? selectedNftbTierData.usdtRemaining
      : selectedNftbTierData.tofRemaining;
    return remaining > 0n;
  }, [selectedNftbTierData, nftbPayToken]);

  const nftaDisabledReason = useMemo(() => {
    if (loading) return t("disabledTxProcessing");
    if (!isConnected) return t("disabledConnectWallet");
    if (selectedNftaTier === null) return t("disabledSelectNftaTier");
    if (!selectedNftaTierData?.isActive) return t("disabledTierInactive");
    if ((selectedNftaTierData?.remaining ?? 0n) <= 0n) return t("disabledTierSoldOut");
    return "";
  }, [loading, isConnected, selectedNftaTier, selectedNftaTierData, t]);

  const nftbDisabledReason = useMemo(() => {
    if (loading) return t("disabledTxProcessing");
    if (!nexus) return t("toastContractMissingDesc");
    if (!isConnected) return t("disabledConnectWallet");
    if (selectedNftbTier === null) return t("disabledSelectNftbTier");
    if (!selectedNftbTierData?.isActive) return t("disabledTierInactive");
    const remaining = nftbPayToken === "USDT"
      ? (selectedNftbTierData?.usdtRemaining ?? 0n)
      : (selectedNftbTierData?.tofRemaining ?? 0n);
    if (remaining <= 0n) return `${nftbPayToken} ${t("disabledQuotaSoldOut")}`;
    return "";
  }, [loading, nexus, isConnected, selectedNftbTier, selectedNftbTierData, nftbPayToken, t]);

  const showEmptyActionHint = totalNftaPending === 0n && totalNftbPending === 0n && nftaNodes.length === 0 && nftbNodes.length === 0;
  const toFriendlyTxError = useCallback((message?: string) => {
    const raw = (message || "").trim();
    if (!raw) return t("toastUnknownTxError");

    if (/Only one NFTA allowed/i.test(raw)) return t("toastOnlyOneNftaAllowed");
    if (/Tier inactive/i.test(raw)) return t("toastTierInactive");
    if (/Tier sold out/i.test(raw)) return t("disabledTierSoldOut");
    if (/USDT quota sold out/i.test(raw)) return t("toastUsdtQuotaSoldOut");
    if (/TOF quota sold out/i.test(raw)) return t("toastTofQuotaSoldOut");
    if (/No dividend/i.test(raw)) return t("toastNoClaimableRewards");
    if (/No NFTB nodes/i.test(raw)) return t("noNftbHint");
    if (/No NFTA nodes/i.test(raw)) return t("noNftaHint");
    if (/Not owner/i.test(raw)) return t("toastNotNodeOwner");
    if (/Already claimed today/i.test(raw)) return t("toastAlreadyClaimedToday");
    if (/Transaction rejected by user/i.test(raw)) return t("toastTxRejectedByUser");
    if (/could not coalesce error/i.test(raw)) return "RPC返回异常，请重试或切换网络后再试";
    if (/insufficient funds/i.test(raw)) return "主网Gas不足，请先充值后再试";
    if (/TOF non-transferable/i.test(raw)) return "TOF不可转账：当前钱包与Nexus需至少一方在白名单";
    if (/unknown custom error/i.test(raw)) return t("toastTofAllowanceOrBalanceHint");
    if (/ERC20InsufficientAllowance/i.test(raw)) return t("toastTofApproveRequired");
    if (/ERC20InsufficientBalance/i.test(raw)) return t("toastTofBalanceInsufficient");

    return raw;
  }, [t]);

  const formatTot = (value: bigint) => Number(ethers.formatUnits(value, 18)).toFixed(4);

  return (
    <div className="space-y-5 overflow-hidden">
      {/* ── 顶部概览卡 ── */}
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("nodesOnChainTitle")}</CardTitle>
          <CardDescription>{t("nodesOnChainDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border-l-4 border-l-primary border border-border bg-primary/5 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t("nftaPendingLabel")}</p>
              <p className="text-lg font-semibold text-primary">{formatTot(totalNftaPending)}</p>
              <p className="text-xs text-muted-foreground">TOT</p>
            </div>
            <div className="rounded-lg border-l-4 border-l-blue-500 border border-border bg-blue-500/5 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t("nftbPendingLabel")}</p>
              <p className="text-lg font-semibold text-blue-500">{formatTot(totalNftbPending)}</p>
              <p className="text-xs text-muted-foreground">TOT</p>
            </div>
            <div className="rounded-lg border-l-4 border-l-amber-500 border border-border bg-amber-500/5 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t("withdrawableEarnings")}</p>
              <p className="text-lg font-semibold text-amber-500">{formatTot(withdrawableTot)}</p>
              <p className="text-xs text-muted-foreground">TOT</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("referrerOptional")}</p>
            <Input
              value={referrer}
              onChange={(e) => setReferrer(e.target.value)}
              placeholder={t("referrerPlaceholder")}
              className="h-9 text-sm"
            />
          </div>
        </CardContent>
        {showEmptyActionHint && (
          <CardContent className="pt-0">
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {t("emptyNodeHint")}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── 主 Tab 区 ── */}
      <Tabs defaultValue="nfta" className="space-y-5">
        {!initialLoaded && isRefreshing && (
          <Card className="glass-panel">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("nodesLoading")}
            </CardContent>
          </Card>
        )}

        {loadError && (
          <Card className="glass-panel border-destructive/40">
            <CardContent className="py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-destructive">{loadError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refreshData()}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? t("processing") : t("retry")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="nfta">NFT-A</TabsTrigger>
          <TabsTrigger value="nftb">NFT-B</TabsTrigger>
          <TabsTrigger value="my">{t("tabMyNodes")}</TabsTrigger>
        </TabsList>

        {/* ── NFT-A 购买 ── */}
        <TabsContent value="nfta" className="space-y-4">
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("nftaAdminOnlyTitle")}</CardTitle>
              <CardDescription>{t("nftaAdminOnlyDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nftaTiers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("nftaNoTiers")}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {nftaTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="rounded-xl border-2 p-4 text-left border-border bg-card"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-sm">{getNftaTierName(tier.id)}</span>
                        <Badge variant={tier.isActive ? "default" : "secondary"} className="text-xs">
                          {tier.isActive ? t("tierEnabled") : t("tierDisabled")}
                        </Badge>
                      </div>
                      <Separator className="mb-3" />
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("labelPrice")}</span>
                          <span className="font-medium">{ethers.formatUnits(tier.price, 18)} USDT</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("labelDailyOutput")}</span>
                          <span className="font-medium text-primary">{ethers.formatUnits(tier.dailyYield, 18)} TOT</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("labelRemaining")}</span>
                          <span className="font-medium">{tier.remaining.toString()} / {tier.maxSupply.toString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {t("nftaAdminOnlyNotice")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NFT-B 购买 ── */}
        <TabsContent value="nftb" className="space-y-4">
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("buyNftbTitle")}</CardTitle>
              <CardDescription>{t("buyNftbDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1 w-fit">
                <button
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                    nftbPayToken === "USDT"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setNftbPayToken("USDT")}
                >
                  {t("payUsdt")}
                </button>
                <button
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                    nftbPayToken === "TOF"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setNftbPayToken("TOF")}
                >
                  {t("payTof")}
                </button>
              </div>
              {nftbTiers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("nftbNoTiers")}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {nftbTiers.map((tier) => {
                    const displayPrice = nftbPayToken === "TOF"
                      ? (tier.price * tofPerUsdt) / WAD
                      : tier.price;

                    return (
                    <button
                      key={tier.id}
                      className={`rounded-xl border-2 p-4 text-left transition-colors hover:bg-muted/30 ${
                        selectedNftbTier === tier.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card"
                      }`}
                      onClick={() => setSelectedNftbTier(tier.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-sm">{getNftbTierName(tier.id)}</span>
                        <Badge variant={tier.isActive ? "default" : "secondary"} className="text-xs">
                          {tier.isActive ? t("tierEnabled") : t("tierDisabled")}
                        </Badge>
                      </div>
                      <Separator className="mb-3" />
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("labelPrice")}</span>
                          <span className="font-medium whitespace-nowrap notranslate" translate="no">{ethers.formatUnits(displayPrice, 18)} {nftbPayToken}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("labelWeight")}</span>
                          <span className="font-medium">{tier.weight.toString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("labelDividendRatio")}</span>
                          <span className="font-medium text-blue-500">{Number(tier.dividendBps) / 100}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 pt-1 text-xs text-muted-foreground">
                          <span className="whitespace-nowrap notranslate" translate="no">{t("usdtRemainingShort")} <span className="text-foreground">{tier.usdtRemaining.toString()}</span></span>
                          <span className="whitespace-nowrap notranslate" translate="no">{t("tofRemainingShort")} <span className="text-foreground">{tier.tofRemaining.toString()}</span></span>
                        </div>
                      </div>
                    </button>
                  )})}
                </div>
              )}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={buyNftb}
                  disabled={!isConnected || !nexus || loading || selectedNftbTier === null || !canBuySelectedNftb}
                  className="w-full"
                >
                  {loading ? (nftbStageText || t("processing")) : `${t("buyNftbBtn")} (${nftbPayToken})`}
                </Button>
                {loading && nftbStageText && (
                  <p className="text-xs text-primary text-center">{nftbStageText}</p>
                )}
                {(!canBuySelectedNftb || !isConnected || selectedNftbTier === null) && !loading && (
                  <p className="text-xs text-muted-foreground text-center">{nftbDisabledReason}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 我的节点 ── */}
        <TabsContent value="my" className="space-y-4">
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t("myNftaTitle")}</CardTitle>
                  {nftaNodes.length > 0 && (
                    <CardDescription className="mt-0.5">
                        {t("myNodeSummary")
                          .replace("{count}", String(nftaNodes.length))
                          .replace("{amount}", formatTot(totalNftaPending))}
                    </CardDescription>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={claimAllNfta}
                  disabled={!isConnected || !nexus || loading || nftaNodes.length === 0 || totalNftaPending <= 0n}
                >
                  {t("claimNftaBtn")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("nftaClaimFeeEstimate")
                  .replace("{rate}", nftaClaimFeeRatePct)
                  .replace("{amount}", formatTot(estimatedNftaTofFee))}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {nftaNodes.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("noNftaHint")}<br />
                  <span className="text-xs">{t("noNftaSubHint")}</span>
                </div>
              ) : (
                nftaNodes.map((node) => (
                  <div key={node.nodeId.toString()} className="rounded-xl border border-border hover:bg-muted/20 transition-colors p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{t("nodeLabel")} #{node.nodeId.toString()} · {getNftaTierName(node.tierId)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${node.isActive ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                        {node.isActive ? t("nodeRunning") : t("nodePaused")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">{t("labelDailyOutputShort")} </span>
                        <span className="font-medium">{formatTot(node.dailyYield)} TOT</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("labelPendingShort")} </span>
                        <span className="font-medium text-primary">{formatTot(node.pending)} TOT</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                      <Input
                        value={nftaTransferToByNode[node.nodeId.toString()] || ""}
                        onChange={(e) =>
                          setNftaTransferToByNode((prev) => ({
                            ...prev,
                            [node.nodeId.toString()]: e.target.value,
                          }))
                        }
                        placeholder={t("transferAddressPlaceholder")}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => transferNfta(node.nodeId)}
                        disabled={!isConnected || loading}
                      >
                        {t("transferBtn")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t("myNftbTitle")}</CardTitle>
                  {nftbNodes.length > 0 && (
                    <CardDescription className="mt-0.5">
                        {t("myNodeSummary")
                          .replace("{count}", String(nftbNodes.length))
                          .replace("{amount}", formatTot(totalNftbPending))}
                    </CardDescription>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={claimAllNftb}
                  disabled={!isConnected || !nexus || loading || nftbNodes.length === 0 || totalNftbPending <= 0n}
                >
                  {t("claimNftbBtn")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {nftbNodes.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("noNftbHint")}<br />
                  <span className="text-xs">{t("noNftbSubHint")}</span>
                </div>
              ) : (
                nftbNodes.map((node) => (
                  <div key={node.nodeId.toString()} className="rounded-xl border border-border hover:bg-muted/20 transition-colors p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{t("nodeLabel")} #{node.nodeId.toString()} · {getNftbTierName(node.tierId)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${node.isActive ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                        {node.isActive ? t("nodeRunning") : t("nodePaused")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">{t("labelWeightShort")} </span>
                        <span className="font-medium">{node.weight.toString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("labelPendingShort")} </span>
                        <span className="font-medium text-blue-500">{formatTot(node.pending)} TOT</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                      <Input
                        value={nftbTransferToByNode[node.nodeId.toString()] || ""}
                        onChange={(e) =>
                          setNftbTransferToByNode((prev) => ({
                            ...prev,
                            [node.nodeId.toString()]: e.target.value,
                          }))
                        }
                        placeholder={t("transferAddressPlaceholder")}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => transferNftb(node.nodeId)}
                        disabled={!isConnected || loading}
                      >
                        {t("transferBtn")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
