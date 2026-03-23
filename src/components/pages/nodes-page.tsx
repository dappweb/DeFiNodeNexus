"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  return NFTA_TIER_NAME_MAP[tierId] || `NFTA Tier #${tierId}`;
};

const getNftbTierName = (id: number | bigint) => {
  const tierId = toTierId(id);
  return NFTB_TIER_NAME_MAP[tierId] || `NFTB Tier #${tierId}`;
};

export function NodesPage() {
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
  const [nftaStage, setNftaStage] = useState<"idle" | "checking" | "approving" | "purchasing" | "confirming">("idle");
  const [nftbStage, setNftbStage] = useState<"idle" | "checking" | "approving" | "purchasing" | "confirming">("idle");
  const zeroValue = ethers.parseUnits("0", 0);
  const MAX_TIER_SCAN = 20;

  const refreshData = useCallback(async () => {
    if (!nexus) return;

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
  }, [nexus, address]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const buyNfta = async () => {
    if (!isConnected || !address || !nexus || selectedNftaTier === null) return;

    const tier = nftaTiers.find((t) => t.id === selectedNftaTier);
    if (!tier || !usdt) return;
    if (!tier.isActive || tier.remaining <= 0n) {
      toast({ title: "购买 NFTA 失败", description: "该层级未激活或已售罄", variant: "destructive" });
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
          toast({ title: "USDT 授权失败", description: approveRes.error, variant: "destructive" });
          return;
        }
      }

      setNftaStage("purchasing");
      const parsedReferrer = referrer.trim();
      const finalReferrer = ethers.isAddress(parsedReferrer) ? parsedReferrer : ethers.ZeroAddress;
      const res = await execTx(nexus.buyNfta(BigInt(tier.id), finalReferrer));
      if (!res.success) {
        toast({ title: "购买 NFTA 失败", description: res.error, variant: "destructive" });
        return;
      }

      setNftaStage("confirming");

      toast({ title: "购买 NFTA 成功", description: res.hash?.slice(0, 10) + "..." });
      await refreshData();
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
      toast({ title: "购买 NFTB 失败", description: "该层级未激活", variant: "destructive" });
      return;
    }

    setLoading(true);
    setNftbStage("checking");
    try {
      const parsedReferrer = referrer.trim();
      const finalReferrer = ethers.isAddress(parsedReferrer) ? parsedReferrer : ethers.ZeroAddress;
      if (nftbPayToken === "USDT") {
        if (tier.usdtRemaining <= 0n) {
          toast({ title: "购买 NFTB 失败", description: "USDT 配额已售罄", variant: "destructive" });
          return;
        }
        if (!usdt) return;
        const allowance = await usdt.allowance(address, CONTRACTS.NEXUS);
        if (allowance < tier.price) {
          setNftbStage("approving");
          const approveRes = await execTx(usdt.approve(CONTRACTS.NEXUS, tier.price));
          if (!approveRes.success) {
            toast({ title: "USDT 授权失败", description: approveRes.error, variant: "destructive" });
            return;
          }
        }
        setNftbStage("purchasing");
        const res = await execTx(nexus.buyNftbWithUsdt(BigInt(tier.id), finalReferrer));
        if (!res.success) {
          toast({ title: "购买 NFTB 失败", description: res.error, variant: "destructive" });
          return;
        }
        setNftbStage("confirming");
        toast({ title: "购买 NFTB 成功", description: res.hash?.slice(0, 10) + "..." });
      } else {
        if (tier.tofRemaining <= 0n) {
          toast({ title: "购买 NFTB 失败", description: "TOF 配额已售罄", variant: "destructive" });
          return;
        }
        if (!tof) return;
        const allowance = await tof.allowance(address, CONTRACTS.NEXUS);
        if (allowance < tier.price) {
          setNftbStage("approving");
          const approveRes = await execTx(tof.approve(CONTRACTS.NEXUS, tier.price));
          if (!approveRes.success) {
            toast({ title: "TOF 授权失败", description: approveRes.error, variant: "destructive" });
            return;
          }
        }
        setNftbStage("purchasing");
        const res = await execTx(nexus.buyNftbWithTof(BigInt(tier.id), finalReferrer));
        if (!res.success) {
          toast({ title: "购买 NFTB 失败", description: res.error, variant: "destructive" });
          return;
        }
        setNftbStage("confirming");
        toast({ title: "购买 NFTB 成功", description: res.hash?.slice(0, 10) + "..." });
      }

      await refreshData();
    } finally {
      setNftbStage("idle");
      setLoading(false);
    }
  };

  const nftaStageText = useMemo(() => {
    if (nftaStage === "checking") return "校验授权中...";
    if (nftaStage === "approving") return "授权中，请在钱包确认...";
    if (nftaStage === "purchasing") return "购买提交中，请在钱包确认...";
    if (nftaStage === "confirming") return "链上确认中...";
    return "";
  }, [nftaStage]);

  const nftbStageText = useMemo(() => {
    if (nftbStage === "checking") return "校验授权中...";
    if (nftbStage === "approving") return "授权中，请在钱包确认...";
    if (nftbStage === "purchasing") return "购买提交中，请在钱包确认...";
    if (nftbStage === "confirming") return "链上确认中...";
    return "";
  }, [nftbStage]);

  const claimAllNfta = async () => {
    if (!nexus) return;
    setLoading(true);
    try {
      const res = await execTx(nexus.claimAllNftaYield());
      if (!res.success) {
        toast({ title: "领取失败", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "NFTA 收益已领取", description: res.hash?.slice(0, 10) + "..." });
      await refreshData();
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
        toast({ title: "领取失败", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "NFTB 分红已领取", description: res.hash?.slice(0, 10) + "..." });
      await refreshData();
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
    if (loading) return "交易处理中，请稍候";
    if (!isConnected) return "请先连接钱包";
    if (selectedNftaTier === null) return "请先选择 NFTA 档位";
    if (!selectedNftaTierData?.isActive) return "该档位未激活";
    if ((selectedNftaTierData?.remaining ?? 0n) <= 0n) return "该档位已售罄";
    return "";
  }, [loading, isConnected, selectedNftaTier, selectedNftaTierData]);

  const nftbDisabledReason = useMemo(() => {
    if (loading) return "交易处理中，请稍候";
    if (!isConnected) return "请先连接钱包";
    if (selectedNftbTier === null) return "请先选择 NFTB 档位";
    if (!selectedNftbTierData?.isActive) return "该档位未激活";
    const remaining = nftbPayToken === "USDT"
      ? (selectedNftbTierData?.usdtRemaining ?? 0n)
      : (selectedNftbTierData?.tofRemaining ?? 0n);
    if (remaining <= 0n) return `${nftbPayToken} 配额已售罄`;
    return "";
  }, [loading, isConnected, selectedNftbTier, selectedNftbTierData, nftbPayToken]);

  const showEmptyActionHint = totalNftaPending === 0n && totalNftbPending === 0n && nftaNodes.length === 0 && nftbNodes.length === 0;
  const formatTot = (value: bigint) => Number(ethers.formatUnits(value, 18)).toFixed(4);

  return (
    <div className="space-y-5 overflow-hidden">
      {/* ── 顶部概览卡 ── */}
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">NFT 链上节点</CardTitle>
          <CardDescription>链上数据实时同步，可在此完成购买与收益查看</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border-l-4 border-l-primary border border-border bg-primary/5 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">NFT-A 收益待领</p>
              <p className="text-lg font-semibold text-primary">{formatTot(totalNftaPending)}</p>
              <p className="text-xs text-muted-foreground">TOT</p>
            </div>
            <div className="rounded-lg border-l-4 border-l-blue-500 border border-border bg-blue-500/5 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">NFT-B 分红待领</p>
              <p className="text-lg font-semibold text-blue-500">{formatTot(totalNftbPending)}</p>
              <p className="text-xs text-muted-foreground">TOT</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">推荐人地址（选填）</p>
            <Input
              value={referrer}
              onChange={(e) => setReferrer(e.target.value)}
              placeholder="0x... 不填则按系统默认"
              className="h-9 text-sm"
            />
          </div>
        </CardContent>
        {showEmptyActionHint && (
          <CardContent className="pt-0">
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              当前暂无可领取收益。请先在 NFT-A 或 NFT-B 标签页选择档位完成购买，购买后即可在「我的节点」中查看并领取。
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── 主 Tab 区 ── */}
      <Tabs defaultValue="nfta" className="space-y-5">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="nfta">NFT-A</TabsTrigger>
          <TabsTrigger value="nftb">NFT-B</TabsTrigger>
          <TabsTrigger value="my">我的节点</TabsTrigger>
        </TabsList>

        {/* ── NFT-A 购买 ── */}
        <TabsContent value="nfta" className="space-y-4">
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">购买 NFT-A</CardTitle>
              <CardDescription>收益型节点，每日产出 TOT · 每个地址限持 1 张</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nftaTiers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">链上暂无 NFT-A 档位，请联系管理员配置。</p>
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
                          {tier.isActive ? "已启用" : "未启用"}
                        </Badge>
                      </div>
                      <Separator className="mb-3" />
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">价格</span>
                          <span className="font-medium">{ethers.formatUnits(tier.price, 18)} USDT</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">日产出</span>
                          <span className="font-medium text-primary">{ethers.formatUnits(tier.dailyYield, 18)} TOT</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">剩余名额</span>
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
                  {loading ? (nftaStageText || "处理中...") : "购买 NFT-A"}
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
              <CardTitle className="text-base">购买 NFT-B</CardTitle>
              <CardDescription>分红型节点，按权重分享节点收益池</CardDescription>
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
                  USDT 支付
                </button>
                <button
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                    nftbPayToken === "TOF"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setNftbPayToken("TOF")}
                >
                  TOF 支付
                </button>
              </div>
              {nftbTiers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">链上暂无 NFT-B 档位，请联系管理员配置。</p>
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
                          {tier.isActive ? "已启用" : "未启用"}
                        </Badge>
                      </div>
                      <Separator className="mb-3" />
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">价格</span>
                          <span className="font-medium">{ethers.formatUnits(tier.price, 18)} {nftbPayToken}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">权重</span>
                          <span className="font-medium">{tier.weight.toString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">分红比例</span>
                          <span className="font-medium text-blue-500">{Number(tier.dividendBps) / 100}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 pt-1 text-xs text-muted-foreground">
                          <span>USDT 剩余: <span className="text-foreground">{tier.usdtRemaining.toString()}</span></span>
                          <span>TOF 剩余: <span className="text-foreground">{tier.tofRemaining.toString()}</span></span>
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
                  {loading ? (nftbStageText || "处理中...") : `购买 NFT-B (${nftbPayToken})`}
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
                  <CardTitle className="text-base">我的 NFT-A</CardTitle>
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
                  领取 NFT-A 收益
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {nftaNodes.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  暂未持有 NFT-A 节点<br />
                  <span className="text-xs">请前往「NFT-A」标签页选择档位购买</span>
                </div>
              ) : (
                nftaNodes.map((node) => (
                  <div key={node.nodeId.toString()} className="rounded-xl border border-border hover:bg-muted/20 transition-colors p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">节点 #{node.nodeId.toString()} · {getNftaTierName(node.tierId)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${node.isActive ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                        {node.isActive ? "运行中" : "已暂停"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">日产出 </span>
                        <span className="font-medium">{formatTot(node.dailyYield)} TOT</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">待领取 </span>
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
                  <CardTitle className="text-base">我的 NFT-B</CardTitle>
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
                  领取 NFT-B 分红
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {nftbNodes.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  暂未持有 NFT-B 节点<br />
                  <span className="text-xs">请前往「NFT-B」标签页选择档位与支付方式完成购买</span>
                </div>
              ) : (
                nftbNodes.map((node) => (
                  <div key={node.nodeId.toString()} className="rounded-xl border border-border hover:bg-muted/20 transition-colors p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">节点 #{node.nodeId.toString()} · {getNftbTierName(node.tierId)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${node.isActive ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                        {node.isActive ? "运行中" : "已暂停"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">权重 </span>
                        <span className="font-medium">{node.weight.toString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">待领取 </span>
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
