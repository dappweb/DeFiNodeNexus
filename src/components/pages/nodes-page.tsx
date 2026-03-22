"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  const [referrer, setReferrer] = useState(ethers.ZeroAddress);
  const zeroValue = ethers.parseUnits("0", 0);

  const refreshData = useCallback(async () => {
    if (!nexus) return;

    const nextNftaTierId = Number(await nexus.nextNftaTierId());
    const nextNftbTierId = Number(await nexus.nextNftbTierId());

    const nftaTierCalls = Array.from({ length: Math.max(0, nextNftaTierId - 1) }, (_, i) => i + 1).map(async (id) => {
      const tier = await nexus.nftaTiers(id);
      const remaining = await nexus.getNftaTierRemaining(id);
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

    const nftbTierCalls = Array.from({ length: Math.max(0, nextNftbTierId - 1) }, (_, i) => i + 1).map(async (id) => {
      const tier = await nexus.nftbTiers(id);
      const remaining = await nexus.getNftbTierRemaining(id);
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

    setNftaTiers(nftaTierList);
    setNftbTiers(nftbTierList);

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

    setLoading(true);
    try {
      const allowance = await usdt.allowance(address, CONTRACTS.NEXUS);
      if (allowance < tier.price) {
        const approveRes = await execTx(usdt.approve(CONTRACTS.NEXUS, tier.price));
        if (!approveRes.success) {
          toast({ title: "USDT 授权失败", description: approveRes.error, variant: "destructive" });
          return;
        }
      }

      const res = await execTx(nexus.buyNfta(BigInt(tier.id), referrer || ethers.ZeroAddress));
      if (!res.success) {
        toast({ title: "购买 NFTA 失败", description: res.error, variant: "destructive" });
        return;
      }

      toast({ title: "购买 NFTA 成功", description: res.hash?.slice(0, 10) + "..." });
      await refreshData();
    } finally {
      setLoading(false);
    }
  };

  const buyNftb = async () => {
    if (!isConnected || !address || !nexus || selectedNftbTier === null) return;

    const tier = nftbTiers.find((t) => t.id === selectedNftbTier);
    if (!tier) return;

    setLoading(true);
    try {
      if (nftbPayToken === "USDT") {
        if (!usdt) return;
        const allowance = await usdt.allowance(address, CONTRACTS.NEXUS);
        if (allowance < tier.price) {
          const approveRes = await execTx(usdt.approve(CONTRACTS.NEXUS, tier.price));
          if (!approveRes.success) {
            toast({ title: "USDT 授权失败", description: approveRes.error, variant: "destructive" });
            return;
          }
        }
        const res = await execTx(nexus.buyNftbWithUsdt(BigInt(tier.id), referrer || ethers.ZeroAddress));
        if (!res.success) {
          toast({ title: "购买 NFTB 失败", description: res.error, variant: "destructive" });
          return;
        }
        toast({ title: "购买 NFTB 成功", description: res.hash?.slice(0, 10) + "..." });
      } else {
        if (!tof) return;
        const allowance = await tof.allowance(address, CONTRACTS.NEXUS);
        if (allowance < tier.price) {
          const approveRes = await execTx(tof.approve(CONTRACTS.NEXUS, tier.price));
          if (!approveRes.success) {
            toast({ title: "TOF 授权失败", description: approveRes.error, variant: "destructive" });
            return;
          }
        }
        const res = await execTx(nexus.buyNftbWithTof(BigInt(tier.id), referrer || ethers.ZeroAddress));
        if (!res.success) {
          toast({ title: "购买 NFTB 失败", description: res.error, variant: "destructive" });
          return;
        }
        toast({ title: "购买 NFTB 成功", description: res.hash?.slice(0, 10) + "..." });
      }

      await refreshData();
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6 overflow-hidden">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>NFTA / NFTB 链上节点</CardTitle>
          <CardDescription>已接入合约实时读写</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input value={referrer} onChange={(e) => setReferrer(e.target.value || ethers.ZeroAddress)} placeholder="推荐人地址(可选)" />
          <div className="text-sm rounded-md border border-border px-3 py-2">NFTA 待领取: {ethers.formatUnits(totalNftaPending, 18)} TOT</div>
          <div className="text-sm rounded-md border border-border px-3 py-2">NFTB 待领取: {ethers.formatUnits(totalNftbPending, 18)} TOT</div>
        </CardContent>
      </Card>

      <Tabs defaultValue="nfta" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="nfta">NFTA</TabsTrigger>
          <TabsTrigger value="nftb">NFTB</TabsTrigger>
          <TabsTrigger value="my">我的节点</TabsTrigger>
        </TabsList>

        <TabsContent value="nfta" className="space-y-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>购买 NFTA</CardTitle>
              <CardDescription>单地址仅允许 1 张 NFTA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nftaTiers.map((tier) => (
                  <button
                    key={tier.id}
                    className={`rounded-lg border p-3 text-left ${selectedNftaTier === tier.id ? "border-primary bg-primary/10" : "border-border"}`}
                    onClick={() => setSelectedNftaTier(tier.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Tier #{tier.id}</span>
                      <Badge variant={tier.isActive ? "default" : "secondary"}>{tier.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">价格: {ethers.formatUnits(tier.price, 18)} USDT</div>
                    <div className="text-xs text-muted-foreground">日产出: {ethers.formatUnits(tier.dailyYield, 18)} TOT</div>
                    <div className="text-xs text-muted-foreground">剩余: {tier.remaining.toString()} / {tier.maxSupply.toString()}</div>
                  </button>
                ))}
              </div>
              <Button onClick={buyNfta} disabled={!isConnected || loading || selectedNftaTier === null}>
                {loading ? "处理中..." : "购买 NFTA"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nftb" className="space-y-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>购买 NFTB</CardTitle>
              <CardDescription>可用 USDT 或 TOF 支付</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button variant={nftbPayToken === "USDT" ? "default" : "outline"} onClick={() => setNftbPayToken("USDT")}>USDT 支付</Button>
                <Button variant={nftbPayToken === "TOF" ? "default" : "outline"} onClick={() => setNftbPayToken("TOF")}>TOF 支付</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nftbTiers.map((tier) => (
                  <button
                    key={tier.id}
                    className={`rounded-lg border p-3 text-left ${selectedNftbTier === tier.id ? "border-primary bg-primary/10" : "border-border"}`}
                    onClick={() => setSelectedNftbTier(tier.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Tier #{tier.id}</span>
                      <Badge variant={tier.isActive ? "default" : "secondary"}>{tier.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">价格: {ethers.formatUnits(tier.price, 18)} {nftbPayToken}</div>
                    <div className="text-xs text-muted-foreground">权重: {tier.weight.toString()}</div>
                    <div className="text-xs text-muted-foreground">分红比例: {Number(tier.dividendBps) / 100}%</div>
                    <div className="text-xs text-muted-foreground">USDT剩余: {tier.usdtRemaining.toString()} | TOF剩余: {tier.tofRemaining.toString()}</div>
                  </button>
                ))}
              </div>

              <Button onClick={buyNftb} disabled={!isConnected || loading || selectedNftbTier === null}>
                {loading ? "处理中..." : `购买 NFTB (${nftbPayToken})`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my" className="space-y-4">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>我的 NFTA 节点</CardTitle>
              <Button onClick={claimAllNfta} disabled={!isConnected || loading || nftaNodes.length === 0}>领取全部 NFTA</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {nftaNodes.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无 NFTA 节点</div>
              ) : (
                nftaNodes.map((node) => (
                  <div key={node.nodeId.toString()} className="rounded-lg border p-3">
                    <div className="font-medium">Node #{node.nodeId.toString()} (Tier {node.tierId.toString()})</div>
                    <div className="text-xs text-muted-foreground">日产出: {ethers.formatUnits(node.dailyYield, 18)} TOT</div>
                    <div className="text-xs text-muted-foreground">待领取: {ethers.formatUnits(node.pending, 18)} TOT</div>
                    <div className="text-xs text-muted-foreground">状态: {node.isActive ? "Active" : "Inactive"}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>我的 NFTB 节点</CardTitle>
              <Button onClick={claimAllNftb} disabled={!isConnected || loading || nftbNodes.length === 0}>领取全部 NFTB</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {nftbNodes.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无 NFTB 节点</div>
              ) : (
                nftbNodes.map((node) => (
                  <div key={node.nodeId.toString()} className="rounded-lg border p-3">
                    <div className="font-medium">Node #{node.nodeId.toString()} (Tier {node.tierId.toString()})</div>
                    <div className="text-xs text-muted-foreground">权重: {node.weight.toString()}</div>
                    <div className="text-xs text-muted-foreground">待领取: {ethers.formatUnits(node.pending, 18)} TOT</div>
                    <div className="text-xs text-muted-foreground">状态: {node.isActive ? "Active" : "Inactive"}</div>
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
