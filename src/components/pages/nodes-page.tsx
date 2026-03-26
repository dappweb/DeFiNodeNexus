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

const NFTA_TIER_NAME_MAP: Record<number, string> = {
  1: "初级 · 创世荣耀",
  2: "高级 · 创世王者",
};

const NFTB_TIER_NAME_MAP: Record<number, string> = {
  1: "初级 · 普通权杖",
  2: "中级 · 稀有王冠",
  3: "高级 · 传说神座",
};

const toTierId = (id: number | bigint) => Number(id);

const getNftaTierName = (id: number | bigint) => {
  const tierId = toTierId(id);
  return NFTA_TIER_NAME_MAP[tierId] || `NFTA #${tierId}`;
};

const getNftbTierName = (id: number | bigint) => {
  const tierId = toTierId(id);
  return NFTB_TIER_NAME_MAP[tierId] || `NFTB #${tierId}`;
};

export function NodesPage() {
  const { t } = useLanguage();
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();
  const nexus = useNexusContract();
  const usdt = useERC20Contract(CONTRACTS.USDT);
  const tof = useERC20Contract(CONTRACTS.TOF);

  const [loading, setLoading] = useState(false);
  const [nftaTiers, setNftaTiers] = useState<NftaTier[]>([]);
  const [nftbTiers, setNftbTiers] = useState<NftbTier[]>([]);
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
  const zeroValue = ethers.parseUnits("0", 0);
  const MAX_TIER_SCAN = 20;

  const refreshData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsRefreshing(true);
    }
    setLoadError("");

    if (!nexus) {
      setNftaTiers([]);
      setNftbTiers([]);
      setNftaNodes([]);
      setNftbNodes([]);
      // nexus is only null when CONTRACTS.NEXUS address is not configured
      setLoadError(t("toastContractMissingDesc"));
      if (showLoading) {
        setIsRefreshing(false);
      }
      setInitialLoaded(true);
      return;
    }

    try {

      const nextNftaTierId = Number(await nexus.nextNftaTierId());
      const nextNftbTierId = Number(await nexus.nextNftbTierId());

      const nftaCandidateIds = Array.from(
        new Set([
          ...Array.from({ length: Math.max(0, nextNftaTierId - 1) }, (_, i) => i + 1),
          ...Array.from({ length: MAX_TIER_SCAN }, (_, i) => i + 1),
        ])
      );

      const nftbCandidateIds = Array.from(
        new Set([
          ...Array.from({ length: Math.max(0, nextNftbTierId - 1) }, (_, i) => i + 1),
          ...Array.from({ length: MAX_TIER_SCAN }, (_, i) => i + 1),
        ])
      );

      const nftaTierCalls = nftaCandidateIds.map(async (id) => {
        const tier = await nexus.nftaTiers(id);
        const remaining = await nexus.getNftaTierRemaining(id);
        if (!tier.isActive && tier.price === 0n && tier.maxSupply === 0n && tier.currentSupply === 0n) {
          return null;
        }
        return {
          id,
          price: tier.price,
          dailyYield: tier.dailyYield,
          maxSupply: tier.maxSupply,
          currentSupply: tier.currentSupply,
          isActive: tier.isActive,
          remaining,
        } as NftaTier;
      });

      const nftbTierCalls = nftbCandidateIds.map(async (id) => {
        const tier = await nexus.nftbTiers(id);
        const remaining = await nexus.getNftbTierRemaining(id);
        if (!tier.isActive && tier.price === 0n && tier.maxSupply === 0n && tier.usdtMinted === 0n && tier.tofMinted === 0n) {
          return null;
        }
        return {
          id,
          price: tier.price,
          weight: tier.weight,
          maxSupply: tier.maxSupply,
          usdtMinted: tier.usdtMinted,
          tofMinted: tier.tofMinted,
          dividendBps: tier.dividendBps,
          isActive: tier.isActive,
          usdtRemaining: remaining[0],
          tofRemaining: remaining[1],
        } as NftbTier;
      });

      const [nftaTierList, nftbTierList] = await Promise.all([
        Promise.all(nftaTierCalls),
        Promise.all(nftbTierCalls),
      ]);

      setNftaTiers(nftaTierList.filter((tier): tier is NftaTier => tier !== null));
      setNftbTiers(nftbTierList.filter((tier): tier is NftbTier => tier !== null));

      if (!address) {
        setNftaNodes([]);
        setNftbNodes([]);
        return;
      }

      const [nftaIds, nftbIds] = await Promise.all([
        nexus.getUserNftaNodes(address),
        nexus.getUserNftbNodes(address),
      ]);

      const nftaNodeCalls = nftaIds.map(async (id: bigint) => {
        const node = await nexus.nftaNodes(id);
        const pending = await nexus.pendingNftaYield(id);
        return {
          nodeId: id,
          tierId: node.tierId,
          dailyYield: node.dailyYield,
          lastClaimDay: node.lastClaimDay,
          isActive: node.isActive,
          pending,
        } as NodeAItem;
      });

      const nftbNodeCalls = nftbIds.map(async (id: bigint) => {
        const node = await nexus.nftbNodes(id);
        const pending = await nexus.pendingNftbDividend(id);
        return {
          nodeId: id,
          tierId: node.tierId,
          weight: node.weight,
          isActive: node.isActive,
          pending,
        } as NodeBItem;
      });

      const [nftaNodeList, nftbNodeList] = await Promise.all([
        Promise.all(nftaNodeCalls),
        Promise.all(nftbNodeCalls),
      ]);

      setNftaNodes(nftaNodeList);
      setNftbNodes(nftbNodeList);
    } catch {
      setLoadError(t("nodesLoadFailed"));
    } finally {
      if (showLoading) {
        setIsRefreshing(false);
      }
      setInitialLoaded(true);
    }
  }, [nexus, address, t]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

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
        const approveRes = await execTx(usdt.approve(CONTRACTS.NEXUS, tier.price));
        if (!approveRes.success) {
          toast({ title: t("toastUsdtApproveFailed"), description: approveRes.error, variant: "destructive" });
          return;
        }
      }

      setNftaStage("purchasing");
      const parsedReferrer = referrer.trim();
      const finalReferrer = ethers.isAddress(parsedReferrer) ? parsedReferrer : ethers.ZeroAddress;
      const res = await execTx(nexus.buyNfta(BigInt(tier.id), finalReferrer));
      if (!res.success) {
        toast({ title: t("toastBuyNftaFailed"), description: res.error, variant: "destructive" });
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
          const approveRes = await execTx(usdt.approve(CONTRACTS.NEXUS, tier.price));
          if (!approveRes.success) {
            toast({ title: t("toastUsdtApproveFailed"), description: approveRes.error, variant: "destructive" });
            return;
          }
        }
        setNftbStage("purchasing");
        const res = await execTx(nexus.buyNftbWithUsdt(BigInt(tier.id), finalReferrer));
        if (!res.success) {
          toast({ title: t("toastBuyNftbFailed"), description: res.error, variant: "destructive" });
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
        const allowance = await tof.allowance(address, CONTRACTS.NEXUS);
        if (allowance < tier.price) {
          setNftbStage("approving");
          const approveRes = await execTx(tof.approve(CONTRACTS.NEXUS, tier.price));
          if (!approveRes.success) {
            toast({ title: t("toastTofApproveFailed"), description: approveRes.error, variant: "destructive" });
            return;
          }
        }
        setNftbStage("purchasing");
        const res = await execTx(nexus.buyNftbWithTof(BigInt(tier.id), finalReferrer));
        if (!res.success) {
          toast({ title: t("toastBuyNftbFailed"), description: res.error, variant: "destructive" });
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
    if (!nexus) return;
    setLoading(true);
    try {
      const res = await execTx(nexus.claimAllNftaYield());
      if (!res.success) {
        toast({ title: t("toastClaimFailed"), description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: t("toastNftaClaimed"), description: res.hash?.slice(0, 10) + "..." });
      await refreshData(false);
    } finally {
      setLoading(false);
    }
  };

  const claimAllNftb = async () => {
    if (!nexus) return;
    setLoading(true);
    try {
      const res = await execTx(nexus.claimAllNftbDividends());
      if (!res.success) {
        toast({ title: t("toastClaimFailed"), description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: t("toastNftbClaimed"), description: res.hash?.slice(0, 10) + "..." });
      await refreshData(false);
    } finally {
      setLoading(false);
    }
  };

  const totalNftaPending = useMemo(() => nftaNodes.reduce((s, n) => s + n.pending, zeroValue), [nftaNodes, zeroValue]);
  const totalNftbPending = useMemo(() => nftbNodes.reduce((s, n) => s + n.pending, zeroValue), [nftbNodes, zeroValue]);
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
    if (!isConnected) return t("disabledConnectWallet");
    if (selectedNftbTier === null) return t("disabledSelectNftbTier");
    if (!selectedNftbTierData?.isActive) return t("disabledTierInactive");
    const remaining = nftbPayToken === "USDT"
      ? (selectedNftbTierData?.usdtRemaining ?? 0n)
      : (selectedNftbTierData?.tofRemaining ?? 0n);
    if (remaining <= 0n) return `${nftbPayToken} ${t("disabledQuotaSoldOut")}`;
    return "";
  }, [loading, isConnected, selectedNftbTier, selectedNftbTierData, nftbPayToken, t]);

  const showEmptyActionHint = totalNftaPending === 0n && totalNftbPending === 0n && nftaNodes.length === 0 && nftbNodes.length === 0;
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
          <div className="grid grid-cols-2 gap-3">
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
              <CardTitle className="text-base">{t("buyNftaTitle")}</CardTitle>
              <CardDescription>{t("buyNftaDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nftaTiers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("nftaNoTiers")}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {nftaTiers.map((tier) => (
                    <button
                      key={tier.id}
                      className={`rounded-xl border-2 p-4 text-left transition-colors hover:bg-muted/30 ${
                        selectedNftaTier === tier.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card"
                      }`}
                      onClick={() => setSelectedNftaTier(tier.id)}
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
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={buyNfta}
                  disabled={!isConnected || loading || selectedNftaTier === null || !canBuySelectedNfta}
                  className="w-full"
                >
                  {loading ? (nftaStageText || t("processing")) : t("buyNftaBtn")}
                </Button>
                {loading && nftaStageText && (
                  <p className="text-xs text-primary text-center">{nftaStageText}</p>
                )}
                {(!canBuySelectedNfta || !isConnected || selectedNftaTier === null) && !loading && (
                  <p className="text-xs text-muted-foreground text-center">{nftaDisabledReason}</p>
                )}
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
                  {nftbTiers.map((tier) => (
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
                          <span className="font-medium">{ethers.formatUnits(tier.price, 18)} {nftbPayToken}</span>
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
                          <span>{t("usdtRemainingShort")} <span className="text-foreground">{tier.usdtRemaining.toString()}</span></span>
                          <span>{t("tofRemainingShort")} <span className="text-foreground">{tier.tofRemaining.toString()}</span></span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={buyNftb}
                  disabled={!isConnected || loading || selectedNftbTier === null || !canBuySelectedNftb}
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
                      共 {nftaNodes.length} 张 · 待领取 <span className="text-primary font-medium">{formatTot(totalNftaPending)} TOT</span>
                    </CardDescription>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={claimAllNfta}
                  disabled={!isConnected || loading || nftaNodes.length === 0}
                >
                  {t("claimNftaBtn")}
                </Button>
              </div>
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
                      <span className="font-medium text-sm">节点 #{node.nodeId.toString()} · {getNftaTierName(node.tierId)}</span>
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
                      共 {nftbNodes.length} 张 · 待领取 <span className="text-blue-500 font-medium">{formatTot(totalNftbPending)} TOT</span>
                    </CardDescription>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={claimAllNftb}
                  disabled={!isConnected || loading || nftbNodes.length === 0}
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
                      <span className="font-medium text-sm">节点 #{node.nodeId.toString()} · {getNftbTierName(node.tierId)}</span>
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
