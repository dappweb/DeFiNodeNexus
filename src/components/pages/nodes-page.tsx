"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/components/language-provider";
import { useWeb3 } from "@/lib/web3-provider";
import { useToast } from "@/hooks/use-toast";
import { CONTRACTS } from "@/lib/contracts";
import { execTx, useERC20Contract, useNexusContract } from "@/hooks/use-contract";
import { createDefaultSerializedNftaTiers, createDefaultSerializedNftbTiers } from "@/lib/node-tier-config";
import { getNftaTierName, getNftbTierName, formatAddress, formatBalance } from "@/lib/ui-config";

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

type NodesSummaryResponse = {
  nftaTiers: Array<{
    id: number;
    price: string;
    dailyYield: string;
    maxSupply: string;
    currentSupply: string;
    isActive: boolean;
    remaining: string;
  }>;
  nftbTiers: Array<{
    id: number;
    price: string;
    weight: string;
    maxSupply: string;
    usdtMinted: string;
    tofMinted: string;
    dividendBps: string;
    isActive: boolean;
    usdtRemaining: string;
    tofRemaining: string;
  }>;
  nftaNodes: Array<{
    nodeId: string;
    tierId: string;
    dailyYield: string;
    lastClaimDay: string;
    isActive: boolean;
    pending: string;
  }>;
  nftbNodes: Array<{
    nodeId: string;
    tierId: string;
    weight: string;
    isActive: boolean;
    pending: string;
  }>;
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
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();
  const nexus = useNexusContract();
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
  const [nftaClaimFeeBps, setNftaClaimFeeBps] = useState<bigint>(0n);
  const [tofPerUsdt, setTofPerUsdt] = useState<bigint>(DEFAULT_TOF_PER_USDT);
  const [withdrawableTot, setWithdrawableTot] = useState<bigint>(0n);
  const zeroValue = ethers.parseUnits("0", 0);
  const NODES_SUMMARY_TIMEOUT_MS = 12_000;
  const NODES_SUMMARY_MAX_RETRIES = 2;

  const toBigInt = (value: string) => BigInt(value);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchNodesSummaryWithRetry = useCallback(async (query: string) => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= NODES_SUMMARY_MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), NODES_SUMMARY_TIMEOUT_MS);
      try {
        const response = await fetch(`/api/nodes/summary${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.detail || payload?.message || "Failed to load node summary");
        }

        return payload as NodesSummaryResponse;
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === NODES_SUMMARY_MAX_RETRIES;
        if (!isLastAttempt) {
          const backoffMs = 300 * 2 ** attempt + Math.floor(Math.random() * 200);
          await sleep(backoffMs);
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Failed to load node summary");
  }, []);

  const refreshData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsRefreshing(true);
    }
    setLoadError("");

    if (!CONTRACTS.NEXUS) {
      setNftaTiers(DEFAULT_NFTA_TIERS);
      setNftbTiers(DEFAULT_NFTB_TIERS);
      setNftaNodes([]);
      setNftbNodes([]);
      setNftaClaimFeeBps(0n);
      setWithdrawableTot(0n);
      setLoadError(t("toastContractMissingDesc"));
      if (showLoading) {
        setIsRefreshing(false);
      }
      setInitialLoaded(true);
      return;
    }

    try {
      const query = address ? `?address=${encodeURIComponent(address)}` : "";
      const data = await fetchNodesSummaryWithRetry(query);

      setNftaTiers(
        data.nftaTiers.map((tier) => ({
          id: tier.id,
          price: toBigInt(tier.price),
          dailyYield: toBigInt(tier.dailyYield),
          maxSupply: toBigInt(tier.maxSupply),
          currentSupply: toBigInt(tier.currentSupply),
          isActive: tier.isActive,
          remaining: toBigInt(tier.remaining),
        }))
      );

      setNftbTiers(
        data.nftbTiers.map((tier) => ({
          id: tier.id,
          price: toBigInt(tier.price),
          weight: toBigInt(tier.weight),
          maxSupply: toBigInt(tier.maxSupply),
          usdtMinted: toBigInt(tier.usdtMinted),
          tofMinted: toBigInt(tier.tofMinted),
          dividendBps: toBigInt(tier.dividendBps),
          isActive: tier.isActive,
          usdtRemaining: toBigInt(tier.usdtRemaining),
          tofRemaining: toBigInt(tier.tofRemaining),
        }))
      );

      setNftaNodes(
        data.nftaNodes.map((node) => ({
          nodeId: toBigInt(node.nodeId),
          tierId: toBigInt(node.tierId),
          dailyYield: toBigInt(node.dailyYield),
          lastClaimDay: toBigInt(node.lastClaimDay),
          isActive: node.isActive,
          pending: toBigInt(node.pending),
        }))
      );

      setNftbNodes(
        data.nftbNodes.map((node) => ({
          nodeId: toBigInt(node.nodeId),
          tierId: toBigInt(node.tierId),
          weight: toBigInt(node.weight),
          isActive: node.isActive,
          pending: toBigInt(node.pending),
        }))
      );

      if (nexus && address) {
        const account = await nexus.accounts(address);
        setWithdrawableTot(account.pendingTot);
      } else {
        setWithdrawableTot(0n);
      }

      if (nexus) {
        const [feeBpsRaw, tofPerUsdtRaw] = await Promise.all([
          nexus.tofClaimFeeBps(),
          nexus.tofPerUsdt(),
        ]);
        const feeBps = BigInt(feeBpsRaw);
        const tofRate = BigInt(tofPerUsdtRaw);
        setNftaClaimFeeBps(feeBps);
        setTofPerUsdt(tofRate > 0n ? tofRate : DEFAULT_TOF_PER_USDT);
      }
    } catch (error) {
      console.error("Failed to load node data", error);
      setLoadError(t("nodesLoadFailed"));
    } finally {
      if (showLoading) {
        setIsRefreshing(false);
      }
      setInitialLoaded(true);
    }
  }, [address, t, nexus, fetchNodesSummaryWithRetry]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const getWithdrawTofFee = useCallback(async (amount: bigint) => {
    if (!nexus || !address || amount <= 0n) return 0n;

    const level = Number(await nexus.getUserLevel(address));
    const withdrawFeeBps = BigInt(await nexus.withdrawFeeBpsByLevel(level));
    return (amount * withdrawFeeBps) / 10000n;
  }, [address, nexus]);

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
      const approveRes = await execTx(() => tof.approve(CONTRACTS.NEXUS, requiredTof));
      if (!approveRes.success) {
        toast({ title: t("toastTofApproveFailed"), description: approveRes.error || t("toastUnknownTxError"), variant: "destructive" });
        return false;
      }
    }

    return true;
  }, [address, t, toast, tof]);

  const buyNfta = async () => {
    if (!isConnected || !address || !nexus || selectedNftaTier === null) return;

    const tier = nftaTiers.find((t) => t.id === selectedNftaTier);
    if (!tier || !usdt) return;
    if (!tier.isActive || tier.remaining <= 0n) {
      toast({ title: t("toastBuyNftaFailed"), description: t("toastTierInactiveOrSoldOut"), variant: "destructive" });
      return;
    }

    setLoading(true);
    setNftaStage("checking");
    try {
      const allowance = await usdt.allowance(address, CONTRACTS.NEXUS);
      if (allowance < tier.price) {
        setNftaStage("approving");
        const approveRes = await execTx(() => usdt.approve(CONTRACTS.NEXUS, tier.price));
        if (!approveRes.success) {
          toast({ title: t("toastUsdtApproveFailed"), description: toFriendlyTxError(approveRes.error), variant: "destructive" });
          return;
        }
      }

      setNftaStage("purchasing");
      const parsedReferrer = referrer.trim();
      const finalReferrer = ethers.isAddress(parsedReferrer) ? parsedReferrer : ethers.ZeroAddress;
      const res = await execTx(() => nexus.buyNfta(BigInt(tier.id), finalReferrer));
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

    const tier = nftbTiers.find((t) => t.id === selectedNftbTier);
    if (!tier) return;
    if (!tier.isActive) {
      toast({ title: t("toastBuyNftbFailed"), description: t("toastTierInactive"), variant: "destructive" });
      return;
    }

    setLoading(true);
    setNftbStage("checking");
    try {
      const parsedReferrer = referrer.trim();
      const finalReferrer = ethers.isAddress(parsedReferrer) ? parsedReferrer : ethers.ZeroAddress;
      if (nftbPayToken === "USDT") {
        if (tier.usdtRemaining <= 0n) {
          toast({ title: t("toastBuyNftbFailed"), description: t("toastUsdtQuotaSoldOut"), variant: "destructive" });
          return;
        }
        if (!usdt) return;
        const allowance = await usdt.allowance(address, CONTRACTS.NEXUS);
        if (allowance < tier.price) {
          setNftbStage("approving");
          const approveRes = await execTx(() => usdt.approve(CONTRACTS.NEXUS, tier.price));
          if (!approveRes.success) {
            toast({ title: t("toastUsdtApproveFailed"), description: toFriendlyTxError(approveRes.error), variant: "destructive" });
            return;
          }
        }
        setNftbStage("purchasing");
        const res = await execTx(() => nexus.buyNftbWithUsdt(BigInt(tier.id), finalReferrer));
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

        const allowance = await tof.allowance(address, CONTRACTS.NEXUS);
        if (allowance < tofCost) {
          setNftbStage("approving");
          const approveRes = await execTx(() => tof.approve(CONTRACTS.NEXUS, tofCost));
          if (!approveRes.success) {
            toast({ title: t("toastTofApproveFailed"), description: toFriendlyTxError(approveRes.error), variant: "destructive" });
            return;
          }
        }
        setNftbStage("purchasing");
        const res = await execTx(() => nexus.buyNftbWithTof(BigInt(tier.id), finalReferrer));
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
      const withdrawTofFee = await getWithdrawTofFee(claimAmount);
      const totalRequiredTof = claimTofFee + withdrawTofFee;

      const tofReady = await ensureTofReady(
        totalRequiredTof,
        t("toastClaimFailed"),
        t("toastNeedMoreTofForClaimAndWithdraw")
      );
      if (!tofReady) return;

      setNftaStage("confirming");
      const claimRes = await execTx(() => nexus.claimAllNftaYield());
      if (!claimRes.success) {
        toast({ title: t("toastClaimFailed"), description: toFriendlyTxError(claimRes.error), variant: "destructive" });
        return;
      }

      setNftaStage("confirming");
      const withdrawRes = await execTx(() => nexus.withdrawTot(claimAmount));
      if (!withdrawRes.success) {
        toast({ title: t("toastNftaClaimed"), description: t("toastClaimedAutoWithdrawFailed"), variant: "destructive" });
        await refreshData(false);
        return;
      }

      toast({ title: t("toastClaimWithdrawSuccess"), description: withdrawRes.hash?.slice(0, 10) + "..." });
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
      const withdrawTofFee = await getWithdrawTofFee(claimAmount);
      const tofReady = await ensureTofReady(
        withdrawTofFee,
        t("toastClaimFailed"),
        t("toastTofBalanceInsufficientForWithdraw")
      );
      if (!tofReady) return;

      const claimRes = await execTx(() => nexus.claimAllNftbDividends());
      if (!claimRes.success) {
        toast({ title: t("toastClaimFailed"), description: toFriendlyTxError(claimRes.error), variant: "destructive" });
        return;
      }

      const withdrawRes = await execTx(() => nexus.withdrawTot(claimAmount));
      if (!withdrawRes.success) {
        toast({ title: t("toastNftbClaimed"), description: t("toastClaimedAutoWithdrawFailed"), variant: "destructive" });
        await refreshData(false);
        return;
      }

      toast({ title: t("toastClaimWithdrawSuccess"), description: withdrawRes.hash?.slice(0, 10) + "..." });
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
