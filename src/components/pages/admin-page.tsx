"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWeb3 } from "@/lib/web3-provider";
import { useNexusContract, useSwapContract, execTx } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";

function parseNodeId(value: string): bigint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  return BigInt(trimmed);
}

export function AdminPage() {
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();
  const nexus = useNexusContract();
  const swap = useSwapContract();

  const [loading, setLoading] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState("");
  const [transferNodeId, setTransferNodeId] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [claimNodeId, setClaimNodeId] = useState("");
  const [bulkTransferInput, setBulkTransferInput] = useState("");
  const [bulkClaimInput, setBulkClaimInput] = useState("");
  const [bulkResult, setBulkResult] = useState("");
  const [tofClaimFeeBps, setTofClaimFeeBps] = useState("");
  const [rewardFundAmount, setRewardFundAmount] = useState("");
  const [nftbTotDividendAmount, setNftbTotDividendAmount] = useState("");
  const [nftbUsdtDividendAmount, setNftbUsdtDividendAmount] = useState("");
  const [predictionFlowAmount, setPredictionFlowAmount] = useState("");
  const [predictionRateTier1, setPredictionRateTier1] = useState("40");
  const [predictionRateTier2, setPredictionRateTier2] = useState("50");
  const [predictionRateTier3, setPredictionRateTier3] = useState("60");

  const isOwner = useMemo(() => {
    if (!address || !ownerAddress) return false;
    return address.toLowerCase() === ownerAddress.toLowerCase();
  }, [address, ownerAddress]);

  const refresh = async () => {
    if (!nexus) return;
    try {
      const [owner, claimFee, flowRate1, flowRate2, flowRate3] = await Promise.all([
        nexus.owner(),
        nexus.tofClaimFeeBps(),
        nexus.predictionFlowBpsByTier(1),
        nexus.predictionFlowBpsByTier(2),
        nexus.predictionFlowBpsByTier(3),
      ]);
      setOwnerAddress(owner);
      setTofClaimFeeBps(claimFee.toString());
      setPredictionRateTier1(flowRate1.toString());
      setPredictionRateTier2(flowRate2.toString());
      setPredictionRateTier3(flowRate3.toString());
    } catch {
      toast({ title: "读取失败", description: "请检查合约连接状态", variant: "destructive" });
    }
  };

  useEffect(() => {
    refresh();
  }, [nexus, address]);

  const runTx = async (action: string, txPromise: Promise<any>) => {
    setLoading(true);
    try {
      const result = await execTx(txPromise);
      if (!result.success) {
        toast({ title: `${action}失败`, description: result.error || "未知错误", variant: "destructive" });
        return false;
      }
      toast({ title: `${action}成功`, description: result.hash?.slice(0, 12) || "已上链" });
      await refresh();
      return true;
    } finally {
      setLoading(false);
    }
  };

  const onTransferNfta = async () => {
    if (!nexus) return;
    const nodeId = parseNodeId(transferNodeId);
    if (nodeId === null) {
      toast({ title: "参数错误", description: "节点ID必须是正整数", variant: "destructive" });
      return;
    }
    if (!ethers.isAddress(transferTo.trim())) {
      toast({ title: "参数错误", description: "接收地址无效", variant: "destructive" });
      return;
    }
    await runTx("NFTA转卡", nexus.transferNftaCard(transferTo.trim(), nodeId));
  };

  const onClaimNfta = async () => {
    if (!nexus) return;
    const nodeId = parseNodeId(claimNodeId);
    if (nodeId === null) {
      toast({ title: "参数错误", description: "节点ID必须是正整数", variant: "destructive" });
      return;
    }
    await runTx("NFTA领取", nexus.claimNftaYield(nodeId));
  };

  const onBulkTransfer = async () => {
    if (!nexus) return;
    const lines = bulkTransferInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast({ title: "参数错误", description: "请输入批量转卡数据", variant: "destructive" });
      return;
    }

    setLoading(true);
    const results: string[] = [];
    try {
      for (const line of lines) {
        const [addr, nodeText] = line.split(/,|，/).map((s) => s.trim());
        const nodeId = parseNodeId(nodeText || "");
        if (!ethers.isAddress(addr) || nodeId === null) {
          results.push(`${line} => 格式错误`);
          continue;
        }

        const tx = await execTx(nexus.transferNftaCard(addr, nodeId));
        if (tx.success) {
          results.push(`${line} => 成功 ${tx.hash?.slice(0, 12) || ""}`);
        } else {
          results.push(`${line} => 失败 ${(tx.error || "未知错误").slice(0, 40)}`);
        }
      }
      setBulkResult(results.join("\n"));
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const onBulkClaim = async () => {
    if (!nexus) return;
    const lines = bulkClaimInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast({ title: "参数错误", description: "请输入批量领取节点ID", variant: "destructive" });
      return;
    }

    setLoading(true);
    const results: string[] = [];
    try {
      for (const line of lines) {
        const nodeId = parseNodeId(line);
        if (nodeId === null) {
          results.push(`${line} => 格式错误`);
          continue;
        }

        const tx = await execTx(nexus.claimNftaYield(nodeId));
        if (tx.success) {
          results.push(`${line} => 成功 ${tx.hash?.slice(0, 12) || ""}`);
        } else {
          results.push(`${line} => 失败 ${(tx.error || "未知错误").slice(0, 40)}`);
        }
      }
      setBulkResult(results.join("\n"));
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const onSetTofClaimFee = async () => {
    if (!nexus) return;
    const numeric = Number(tofClaimFeeBps);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 10000) {
      toast({ title: "参数错误", description: "TOF领取费率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("更新TOF领取费率", nexus.setTofClaimFeeBps(BigInt(Math.trunc(numeric))));
  };

  const onFundRewardPool = async () => {
    if (!nexus) return;
    const numeric = Number(rewardFundAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast({ title: "参数错误", description: "注资数量必须大于0", variant: "destructive" });
      return;
    }
    await runTx("注资奖励池", nexus.fundRewardPool(ethers.parseUnits(rewardFundAmount, 18)));
  };

  const onDeflate = async () => {
    if (!swap) return;
    await runTx("执行通缩", swap.deflate());
  };

  const parsePositiveAmount = (value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return ethers.parseUnits(value, 18);
  };

  const parseBps = (value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 10000) return null;
    return BigInt(Math.trunc(numeric));
  };

  const onDistributeNftbTot = async () => {
    if (!nexus) return;
    const amount = parsePositiveAmount(nftbTotDividendAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "NFTB TOT分红金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("发放NFTB TOT分红", nexus.distributeNftbDividends(amount));
  };

  const onDistributeNftbUsdt = async () => {
    if (!nexus) return;
    const amount = parsePositiveAmount(nftbUsdtDividendAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "NFTB USDT分红金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("发放NFTB USDT分红", nexus.distributeNftbUsdtDividends(amount));
  };

  const onDistributePredictionFlow = async () => {
    if (!nexus) return;
    const amount = parsePositiveAmount(predictionFlowAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "预测流水金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("发放预测流水分红", nexus.distributePredictionFlowUsdt(amount));
  };

  const onSetPredictionFlowRates = async () => {
    if (!nexus) return;

    const r1 = parseBps(predictionRateTier1);
    const r2 = parseBps(predictionRateTier2);
    const r3 = parseBps(predictionRateTier3);
    if (r1 === null || r2 === null || r3 === null) {
      toast({ title: "参数错误", description: "费率必须在0-10000之间", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const tx1 = await execTx(nexus.setPredictionFlowRateBps(1, r1));
      if (!tx1.success) {
        toast({ title: "设置费率失败", description: tx1.error || "Tier1失败", variant: "destructive" });
        return;
      }
      const tx2 = await execTx(nexus.setPredictionFlowRateBps(2, r2));
      if (!tx2.success) {
        toast({ title: "设置费率失败", description: tx2.error || "Tier2失败", variant: "destructive" });
        return;
      }
      const tx3 = await execTx(nexus.setPredictionFlowRateBps(3, r3));
      if (!tx3.success) {
        toast({ title: "设置费率失败", description: tx3.error || "Tier3失败", variant: "destructive" });
        return;
      }
      toast({ title: "设置预测流水费率成功", description: tx3.hash?.slice(0, 12) || "已上链" });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 overflow-hidden">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>管理员面板</CardTitle>
          <CardDescription>
            Owner: {ownerAddress ? `${ownerAddress.slice(0, 10)}...${ownerAddress.slice(-6)}` : "-"} ｜ 当前钱包: {isOwner ? "管理员" : "只读"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {!isConnected ? "请先连接钱包。" : "基于最新合约接口（含NFTA转卡与最高级收益规则）"}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>NFTA 单笔操作</CardTitle>
          <CardDescription>转卡与单节点领取</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={transferNodeId} onChange={(e) => setTransferNodeId(e.target.value)} placeholder="节点ID" />
            <Input value={transferTo} onChange={(e) => setTransferTo(e.target.value)} placeholder="接收地址" />
            <Button disabled={!isOwner || loading || !nexus} onClick={onTransferNfta}>转让NFTA</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={claimNodeId} onChange={(e) => setClaimNodeId(e.target.value)} placeholder="节点ID" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onClaimNfta}>领取NFTA收益</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>NFTA 批量操作</CardTitle>
          <CardDescription>转卡格式：地址,节点ID；领取格式：每行一个节点ID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Textarea value={bulkTransferInput} onChange={(e) => setBulkTransferInput(e.target.value)} className="min-h-[120px]" placeholder="0xabc...,123" />
              <Button disabled={!isOwner || loading || !nexus} onClick={onBulkTransfer}>批量转卡</Button>
            </div>
            <div className="space-y-2">
              <Textarea value={bulkClaimInput} onChange={(e) => setBulkClaimInput(e.target.value)} className="min-h-[120px]" placeholder="123" />
              <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onBulkClaim}>批量领取</Button>
            </div>
          </div>
          {bulkResult ? (
            <div className="text-xs whitespace-pre-wrap rounded border border-border/60 bg-muted/30 p-2">{bulkResult}</div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>参数与运营</CardTitle>
          <CardDescription>TOF 领取费率、奖励池注资、Swap通缩</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={tofClaimFeeBps} onChange={(e) => setTofClaimFeeBps(e.target.value)} placeholder="TOF领取费率 bps" />
            <div />
            <Button disabled={!isOwner || loading || !nexus} onClick={onSetTofClaimFee}>更新TOF领取费率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={rewardFundAmount} onChange={(e) => setRewardFundAmount(e.target.value)} placeholder="奖励池注资 TOT 数量" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onFundRewardPool}>注资奖励池</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="text-xs text-muted-foreground flex items-center">触发一次 4h 通缩逻辑</div>
            <div />
            <Button variant="secondary" disabled={!isOwner || loading || !swap} onClick={onDeflate}>执行通缩</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>NFTB 专项运维</CardTitle>
          <CardDescription>TOT/USDT 分红发放、预测流水分红、预测流水费率设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={nftbTotDividendAmount} onChange={(e) => setNftbTotDividendAmount(e.target.value)} placeholder="NFTB TOT分红金额" />
            <div />
            <Button disabled={!isOwner || loading || !nexus} onClick={onDistributeNftbTot}>发放NFTB TOT分红</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={nftbUsdtDividendAmount} onChange={(e) => setNftbUsdtDividendAmount(e.target.value)} placeholder="NFTB USDT分红金额" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onDistributeNftbUsdt}>发放NFTB USDT分红</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={predictionFlowAmount} onChange={(e) => setPredictionFlowAmount(e.target.value)} placeholder="预测流水分红金额(USDT)" />
            <div />
            <Button variant="secondary" disabled={!isOwner || loading || !nexus} onClick={onDistributePredictionFlow}>发放预测流水分红</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input value={predictionRateTier1} onChange={(e) => setPredictionRateTier1(e.target.value)} placeholder="初级费率 bps" />
            <Input value={predictionRateTier2} onChange={(e) => setPredictionRateTier2(e.target.value)} placeholder="中级费率 bps" />
            <Input value={predictionRateTier3} onChange={(e) => setPredictionRateTier3(e.target.value)} placeholder="高级费率 bps" />
            <Button disabled={!isOwner || loading || !nexus} onClick={onSetPredictionFlowRates}>更新预测流水费率</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
