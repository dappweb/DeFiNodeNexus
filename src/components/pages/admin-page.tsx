"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useWeb3 } from "@/lib/web3-provider";
import { useNexusContract, useSwapContract, useTofTokenContract, execTx } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";
import { formatAddress, STAGE_LABELS, UI_PARAMS } from "@/lib/ui-config";
import { ChevronDown } from "lucide-react";

function parseNodeId(value: string): bigint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  return BigInt(trimmed);
}

function parsePositiveInteger(value: string): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isInteger(numeric)) return null;
  return numeric;
}

function parseBps(value: string): bigint | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 10000) return null;
  return BigInt(Math.trunc(numeric));
}

export function AdminPage() {
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();
  const nexus = useNexusContract();
  const swap = useSwapContract();
  const tof = useTofTokenContract();

  const [loading, setLoading] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState("");
  
  // NFTA 单笔/批量
  const [transferNodeId, setTransferNodeId] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [claimNodeId, setClaimNodeId] = useState("");
  const [bulkTransferInput, setBulkTransferInput] = useState("");
  const [bulkClaimInput, setBulkClaimInput] = useState("");
  const [bulkResult, setBulkResult] = useState("");

  // 基础参数
  const [tofClaimFeeBps, setTofClaimFeeBps] = useState("");
  const [tofBurnBps, setTofBurnBps] = useState("");

  // 奖励池与分红
  const [rewardFundAmount, setRewardFundAmount] = useState("");
  const [nftbTotDividendAmount, setNftbTotDividendAmount] = useState("");
  const [nftbUsdtDividendAmount, setNftbUsdtDividendAmount] = useState("");
  const [predictionFlowAmount, setPredictionFlowAmount] = useState("");
  const [predictionRateTier1, setPredictionRateTier1] = useState("40");
  const [predictionRateTier2, setPredictionRateTier2] = useState("50");
  const [predictionRateTier3, setPredictionRateTier3] = useState("60");

  // 提现费率按等级
  const [withdrawLevel, setWithdrawLevel] = useState("0");
  const [withdrawFeeBps, setWithdrawFeeBps] = useState("");

  // Tier 配置
  const [nftaTierId, setNftaTierId] = useState("0");
  const [nftaPrice, setNftaPrice] = useState("");
  const [nftaDailyYield, setNftaDailyYield] = useState("");
  const [nftaMaxSupply, setNftaMaxSupply] = useState("");
  const [nftaActive, setNftaActive] = useState("true");

  const [nftbTierId, setNftbTierId] = useState("0");
  const [nftbPrice, setNftbPrice] = useState("");
  const [nftbWeight, setNftbWeight] = useState("");
  const [nftbMaxSupply, setNftbMaxSupply] = useState("");
  const [nftbDividendBps, setNftbDividendBps] = useState("");
  const [nftbActive, setNftbActive] = useState("true");

  // 钱包管理
  const [treasuryAddr, setTreasuryAddr] = useState("");
  const [zeroLineAddr, setZeroLineAddr] = useState("");
  const [communityAddr, setCommunityAddr] = useState("");
  const [foundationAddr, setFoundationAddr] = useState("");
  const [institutionAddr, setInstitutionAddr] = useState("");
  const [projectAddr, setProjectAddr] = useState("");

  // 分发器管理
  const [distributorAddr, setDistributorAddr] = useState("");
  const [distributorStatus, setDistributorStatus] = useState("true");

  // TOF 白名单
  const [tofWhitelistAddr, setTofWhitelistAddr] = useState("");
  const [tofWhitelistStatus, setTofWhitelistStatus] = useState("true");
  const [tofWhitelistResult, setTofWhitelistResult] = useState<Record<string, boolean | null>>({});

  // 直接注册购买
  const [registerUserAddr, setRegisterUserAddr] = useState("");
  const [registerTierId, setRegisterTierId] = useState("");
  const [registerReferrerAddr, setRegisterReferrerAddr] = useState("");
  const [registerType, setRegisterType] = useState("nfta");

  const isOwner = useMemo(() => {
    if (!address || !ownerAddress) return false;
    return address.toLowerCase() === ownerAddress.toLowerCase();
  }, [address, ownerAddress]);

  const NEXUS_ADDR = process.env.NEXT_PUBLIC_NEXUS_ADDRESS || "";
  const SWAP_ADDR  = process.env.NEXT_PUBLIC_SWAP_ADDRESS  || "";

  const checkTofWhitelist = async () => {
    if (!tof) return;
    const addrs = [NEXUS_ADDR, SWAP_ADDR, tofWhitelistAddr.trim()].filter(Boolean);
    const results: Record<string, boolean | null> = {};
    await Promise.all(addrs.map(async (a) => {
      try { results[a] = Boolean(await tof.transferWhitelist(a)); }
      catch { results[a] = null; }
    }));
    setTofWhitelistResult(results);
  };

  const onSetTofWhitelist = async () => {
    if (!tof) return;
    const addr = tofWhitelistAddr.trim();
    if (!ethers.isAddress(addr)) {
      toast({ title: "地址格式错误", variant: "destructive" }); return;
    }
    await runTx(`TOF白名单 ${addr.slice(0,8)}... ${tofWhitelistStatus === 'true' ? '加入' : '移除'}`,
      () => tof.setTransferWhitelist(addr, tofWhitelistStatus === "true"));
    checkTofWhitelist();
  };

  const onWhitelistNexusAndSwap = async () => {
    if (!tof) return;
    for (const addr of [NEXUS_ADDR, SWAP_ADDR].filter(Boolean)) {
      await runTx(`TOF白名单加入 ${addr.slice(0,8)}...`, () => tof.setTransferWhitelist(addr, true));
    }
    checkTofWhitelist();
  };

  const refresh = async () => {
    if (!nexus) return;
    try {
      const [owner, claimFee, burnBps, flowRate1, flowRate2, flowRate3, treasury, zLine, comm, found, inst, proj] = await Promise.all([
        nexus.owner(),
        nexus.tofClaimFeeBps(),
        nexus.tofBurnBps(),
        nexus.predictionFlowBpsByTier(1),
        nexus.predictionFlowBpsByTier(2),
        nexus.predictionFlowBpsByTier(3),
        nexus.treasury(),
        nexus.zeroLineWallet(),
        nexus.communityWallet(),
        nexus.foundationWallet(),
        nexus.institutionWallet(),
        nexus.projectWallet(),
      ]);
      setOwnerAddress(owner);
      setTofClaimFeeBps(claimFee.toString());
      setTofBurnBps(burnBps.toString());
      setPredictionRateTier1(flowRate1.toString());
      setPredictionRateTier2(flowRate2.toString());
      setPredictionRateTier3(flowRate3.toString());
      setTreasuryAddr(treasury);
      setZeroLineAddr(zLine);
      setCommunityAddr(comm);
      setFoundationAddr(found);
      setInstitutionAddr(inst);
      setProjectAddr(proj);
    } catch {
      toast({ title: "读取失败", description: "请检查合约连接状态", variant: "destructive" });
    }
  };

  useEffect(() => {
    refresh();
  }, [nexus, address]);

  const runTx = async (action: string, txRequest: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await execTx(txRequest);
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
    await runTx("NFTA转卡", () => nexus.transferNftaCard(transferTo.trim(), nodeId));
  };

  const onClaimNfta = async () => {
    if (!nexus) return;
    const nodeId = parseNodeId(claimNodeId);
    if (nodeId === null) {
      toast({ title: "参数错误", description: "节点ID必须是正整数", variant: "destructive" });
      return;
    }
    await runTx("NFTA领取", () => nexus.claimNftaYield(nodeId));
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

        const tx = await execTx(() => nexus.transferNftaCard(addr, nodeId));
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

        const tx = await execTx(() => nexus.claimNftaYield(nodeId));
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
    await runTx("更新TOF领取费率", () => nexus.setTofClaimFeeBps(BigInt(Math.trunc(numeric))));
  };

  const onFundRewardPool = async () => {
    if (!nexus) return;
    const numeric = Number(rewardFundAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast({ title: "参数错误", description: "注资数量必须大于0", variant: "destructive" });
      return;
    }
    await runTx("注资奖励池", () => nexus.fundRewardPool(ethers.parseUnits(rewardFundAmount, 18)));
  };

  const onDeflate = async () => {
    if (!swap) return;
    await runTx("执行通缩", () => swap.deflate());
  };

  const parsePositiveAmount = (value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return ethers.parseUnits(value, 18);
  };

  const onDistributeNftbTot = async () => {
    if (!nexus) return;
    const amount = parsePositiveAmount(nftbTotDividendAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "NFTB TOT分红金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("发放NFTB TOT分红", () => nexus.distributeNftbDividends(amount));
  };

  const onDistributeNftbUsdt = async () => {
    if (!nexus) return;
    const amount = parsePositiveAmount(nftbUsdtDividendAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "NFTB USDT分红金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("发放NFTB USDT分红", () => nexus.distributeNftbUsdtDividends(amount));
  };

  const onDistributePredictionFlow = async () => {
    if (!nexus) return;
    const amount = parsePositiveAmount(predictionFlowAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "预测流水金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("发放预测流水分红", () => nexus.distributePredictionFlowUsdt(amount));
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
      const tx1 = await execTx(() => nexus.setPredictionFlowRateBps(1, r1));
      if (!tx1.success) {
        toast({ title: "设置费率失败", description: tx1.error || "Tier1失败", variant: "destructive" });
        return;
      }
      const tx2 = await execTx(() => nexus.setPredictionFlowRateBps(2, r2));
      if (!tx2.success) {
        toast({ title: "设置费率失败", description: tx2.error || "Tier2失败", variant: "destructive" });
        return;
      }
      const tx3 = await execTx(() => nexus.setPredictionFlowRateBps(3, r3));
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

  // ===== NFTA Tier 配置 =====
  const onConfigureNftaTier = async () => {
    if (!nexus) return;
    const tierId = parsePositiveInteger(nftaTierId);
    const price = parsePositiveAmount(nftaPrice);
    const yield_ = parsePositiveAmount(nftaDailyYield);
    const maxSup = parsePositiveInteger(nftaMaxSupply);
    if (tierId === null || price === null || yield_ === null || maxSup === null) {
      toast({ title: "参数错误", description: "所有字段必须有效", variant: "destructive" });
      return;
    }
    await runTx(
      "配置NFTA Tier",
      () => nexus.configureNftaTier(BigInt(tierId), price, yield_, BigInt(maxSup), nftaActive === "true")
    );
  };

  // ===== NFTB Tier 配置 =====
  const onConfigureNftbTier = async () => {
    if (!nexus) return;
    const tierId = parsePositiveInteger(nftbTierId);
    const price = parsePositiveAmount(nftbPrice);
    const weight = parsePositiveInteger(nftbWeight);
    const maxSup = parsePositiveInteger(nftbMaxSupply);
    const divBps = parseBps(nftbDividendBps);
    if (tierId === null || price === null || weight === null || maxSup === null || divBps === null) {
      toast({ title: "参数错误", description: "所有字段必须有效", variant: "destructive" });
      return;
    }
    await runTx(
      "配置NFTB Tier",
      () => nexus.configureNftbTier(BigInt(tierId), price, BigInt(weight), BigInt(maxSup), divBps, nftbActive === "true")
    );
  };

  // ===== 注册购买 =====
  const onRegisterPurchase = async () => {
    if (!nexus) return;
    if (!ethers.isAddress(registerUserAddr.trim())) {
      toast({ title: "参数错误", description: "用户地址无效", variant: "destructive" });
      return;
    }
    const tierId = parsePositiveInteger(registerTierId);
    if (tierId === null) {
      toast({ title: "参数错误", description: "Tier ID 必须是正整数", variant: "destructive" });
      return;
    }
    const referrer = registerReferrerAddr.trim() ? registerReferrerAddr.trim() : ethers.ZeroAddress;
    if (!ethers.isAddress(referrer)) {
      toast({ title: "参数错误", description: "推荐人地址无效", variant: "destructive" });
      return;
    }
    
    if (registerType === "nfta") {
      await runTx(
        "注册NFTA购买",
        () => nexus.registerNftaPurchase(registerUserAddr.trim(), BigInt(tierId), referrer)
      );
    } else {
      await runTx(
        "注册NFTB购买",
        () => nexus.registerNftbPurchase(registerUserAddr.trim(), BigInt(tierId), referrer)
      );
    }
  };

  // ===== 提现费率 =====
  const onSetWithdrawFee = async () => {
    if (!nexus) return;
    const level = Number(withdrawLevel);
    if (!Number.isFinite(level) || level < 0 || level > 5) {
      toast({ title: "参数错误", description: "等级必须在0-5之间", variant: "destructive" });
      return;
    }
    const bps = parseBps(withdrawFeeBps);
    if (bps === null) {
      toast({ title: "参数错误", description: "费率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("设置提现费率", () => nexus.setWithdrawFeeBps(level, bps));
  };

  // ===== TOF 燃烧比率 =====
  const onSetTofBurnBps = async () => {
    if (!nexus) return;
    const bps = parseBps(tofBurnBps);
    if (bps === null) {
      toast({ title: "参数错误", description: "费率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("设置TOF燃烧比率", () => nexus.setTofBurnBps(bps));
  };

  // ===== Treasury =====
  const onSetTreasury = async () => {
    if (!nexus) return;
    if (!ethers.isAddress(treasuryAddr.trim())) {
      toast({ title: "参数错误", description: "地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置Treasury", () => nexus.setTreasury(treasuryAddr.trim()));
  };

  // ===== 钱包地址 =====
  const onSetWallets = async () => {
    if (!nexus) return;
    const addrs = [zeroLineAddr, communityAddr, foundationAddr, institutionAddr].map((a) => a.trim());
    if (!addrs.every((a) => ethers.isAddress(a))) {
      toast({ title: "参数错误", description: "所有地址都必须有效", variant: "destructive" });
      return;
    }
    await runTx("设置钱包地址", () => nexus.setWallets(...addrs.map((a) => a) as Parameters<typeof nexus.setWallets>));
  };

  // ===== 项目方钱包 =====
  const onSetProjectWallet = async () => {
    if (!nexus) return;
    if (!ethers.isAddress(projectAddr.trim())) {
      toast({ title: "参数错误", description: "地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置项目方钱包", () => nexus.setProjectWallet(projectAddr.trim()));
  };

  // ===== 分发器管理 =====
  const onSetDistributor = async () => {
    if (!nexus) return;
    if (!ethers.isAddress(distributorAddr.trim())) {
      toast({ title: "参数错误", description: "地址无效", variant: "destructive" });
      return;
    }
    await runTx(
      "设置分发器",
      () => nexus.setDistributor(distributorAddr.trim(), distributorStatus === "true")
    );
  };

  return (
    <div className="space-y-6 overflow-hidden">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>管理员面板</CardTitle>
          <CardDescription>
            Owner: {formatAddress(ownerAddress)} ｜ 当前钱包: {isOwner ? "✅ 管理员" : "👁️ 只读"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {!isConnected ? "请先连接钱包。" : "完整功能覆盖 - 所有 onlyOwner 操作已支持"}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>NFTA 单笔操作</CardTitle>
          <CardDescription>转卡与单节点领取</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看操作举例
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-1">
                  <div><strong>举例1：转让节点</strong></div>
                  <div>• 节点ID：<code className="bg-black/20 px-1 rounded">12345</code></div>
                  <div>• 接收地址：<code className="bg-black/20 px-1 rounded">0x742d35Cc6634C0532925a3b844Bc87e9f88aEd39</code></div>
                  <div className="mt-1"><strong>举例2：领取单个节点收益</strong></div>
                  <div>• 节点ID：<code className="bg-black/20 px-1 rounded">12345</code></div>
                  <div className="text-zinc-400 mt-1">✓ 节点ID为数字，接收地址需要有效的以太坊地址格式</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
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
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看批量操作示例
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3 space-y-2">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>批量转卡示例</strong>（每行一条，地址和节点ID用逗号分隔）：</div>
                  <div className="bg-black/30 p-2 rounded font-mono text-xs whitespace-pre-wrap overflow-x-auto">
{`0x742d35Cc6634C0532925a3b844Bc87e9f88aEd39,12345
0x8fd379246834a3cDa7c1C2EACD957b5747539ca42,12346
0xAbFD8f7d3b214b3B74dd6fA6C80dFe2f59C1c6ea,12347`}
                  </div>
                  <div className="mt-2"><strong>批量领取示例</strong>（每行一个节点ID）：</div>
                  <div className="bg-black/30 p-2 rounded font-mono text-xs whitespace-pre-wrap">
{`12345
12346
12347
12348`}
                  </div>
                  <div className="text-zinc-400 mt-2">💡 提示：操作完成后会显示每笔交易的结果（成功/失败）</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
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
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看参数说明与示例
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-1">
                  <div><strong>参数解释：</strong></div>
                  <div>• <strong>TOF 领取费率</strong>：用户领取TOT时收取的手续费（bps单位，1 bps = 0.01%）</div>
                  <div>• <strong>奖励池注资</strong>：向奖励池添加TOT代币，单位为TOT</div>
                  <div>• <strong>执行通缩</strong>：触发Swap合约的4小时通缩逻辑（自动焚烧部分代币）</div>
                  <div className="mt-2"><strong>常见配置示例：</strong></div>
                  <div className="bg-black/30 p-2 rounded">
                    • TOF费率: 500 (0.5%的手续费)<br/>
                    • 奖励池注资: 10000 (增加1万TOT)<br/>
                    • 通缩频率: 手动触发或定时触发
                  </div>
                  <div className="text-zinc-400 mt-1">✓ 费率范围：0-10000 bps（即0%-100%）</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
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
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看 NFTB 分红管理指南
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>分红类型说明：</strong></div>
                  <div>• <strong>TOT分红</strong>：定期向NFTB持有人分配TOT代币</div>
                  <div>• <strong>USDT分红</strong>：定期向NFTB持有人分配USDT稳定币</div>
                  <div>• <strong>预测流水分红</strong>：根据用户预测活动的流水情况分配USDT</div>
                  <div className="mt-2"><strong>预测流水费率说明：</strong></div>
                  <div>• 3个Tier级别对应不同的流水转化率</div>
                  <div>• 初级(Tier1): 40 bps、中级(Tier2): 50 bps、高级(Tier3): 60 bps</div>
                  <div className="mt-2"><strong>操作示例：</strong></div>
                  <div className="bg-black/30 p-2 rounded">
                    • TOT分红: 输入1000表示向所有NFTB持有人分配1000个TOT<br/>
                    • USDT分红: 输入5000表示分配5000个USDT<br/>
                    • 预测流水: 输入2000表示分配2000个USDT作为预测奖励
                  </div>
                  <div className="text-zinc-400 mt-1">💡 分红会按照用户的权重自动分配</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
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

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Tier 配置</CardTitle>
          <CardDescription>配置NFTA/NFTB等级参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-3">
              <ChevronDown className="h-4 w-4" /> 查看 Tier 配置说明与举例
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3 space-y-2">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>NFTA Tier 配置参数说明：</strong></div>
                  <div>• Tier ID：等级编号（0表示新建），如1、2、3等</div>
                  <div>• 价格：购买价格（USDT，如100、500、1000）</div>
                  <div>• 日收益：每天获得的TOT收益</div>
                  <div>• 最大供应：该等级最多可发行多少个NFT</div>
                  <div>• 激活状态：是否启用该等级</div>
                  <div className="mt-2"><strong>举例</strong>：创建一个高级NFTA</div>
                  <div className="bg-black/30 p-2 rounded text-xs">
                    Tier ID: 3 | 价格: 1000 | 日收益: 10 | 最大供应: 100 | 激活: ✓
                  </div>
                  <div className="mt-2"><strong>NFTB Tier 配置参数说明：</strong></div>
                  <div>• 权重：在分红中的权重系数</div>
                  <div>• 分红bps：该等级的分红比率（0-10000，1 bps = 0.01%）</div>
                  <div className="text-zinc-400 mt-1">💡 建议：分红bps对应Tier级别提升而增加，如Tier1:1000, Tier2:1500, Tier3:2000</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div>
            <div className="text-sm font-semibold mb-2">NFTA Tier 配置</div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <Input value={nftaTierId} onChange={(e) => setNftaTierId(e.target.value)} placeholder="Tier ID (0=新建)" />
              <Input value={nftaPrice} onChange={(e) => setNftaPrice(e.target.value)} placeholder="价格 (USDT)" />
              <Input value={nftaDailyYield} onChange={(e) => setNftaDailyYield(e.target.value)} placeholder="日收益 (TOT)" />
              <Input value={nftaMaxSupply} onChange={(e) => setNftaMaxSupply(e.target.value)} placeholder="最大供应" />
              <Select value={nftaActive} onValueChange={setNftaActive}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">激活</SelectItem>
                  <SelectItem value="false">禁用</SelectItem>
                </SelectContent>
              </Select>
              <Button disabled={!isOwner || loading || !nexus} onClick={onConfigureNftaTier} variant="outline">保存</Button>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">NFTB Tier 配置</div>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              <Input value={nftbTierId} onChange={(e) => setNftbTierId(e.target.value)} placeholder="Tier ID (0=新建)" />
              <Input value={nftbPrice} onChange={(e) => setNftbPrice(e.target.value)} placeholder="价格 (USDT)" />
              <Input value={nftbWeight} onChange={(e) => setNftbWeight(e.target.value)} placeholder="权重" />
              <Input value={nftbMaxSupply} onChange={(e) => setNftbMaxSupply(e.target.value)} placeholder="最大供应" />
              <Input value={nftbDividendBps} onChange={(e) => setNftbDividendBps(e.target.value)} placeholder="分红 bps" />
              <Select value={nftbActive} onValueChange={setNftbActive}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">激活</SelectItem>
                  <SelectItem value="false">禁用</SelectItem>
                </SelectContent>
              </Select>
              <Button disabled={!isOwner || loading || !nexus} onClick={onConfigureNftbTier} variant="outline">保存</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>直接注册购买</CardTitle>
          <CardDescription>为用户直接注册节点购买（无链下支付）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看注册流程与示例
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>操作流程：</strong></div>
                  <div>1️⃣ 选择注册类型（NFTA 或 NFTB）</div>
                  <div>2️⃣ 输入用户钱包地址（要为其开户的用户）</div>
                  <div>3️⃣ 输入 Tier ID（等级号，如1、2、3）</div>
                  <div>4️⃣ 可选：输入推荐人地址（若无推荐人留空）</div>
                  <div>5️⃣ 点击"注册"按钮完成注册</div>
                  <div className="mt-2"><strong>实际示例</strong>：</div>
                  <div className="bg-black/30 p-2 rounded">
                    用户地址: 0x742d35Cc6634C0532925a3b844Bc87e9f88aEd39<br/>
                    Tier ID: 1<br/>
                    推荐人: 0x8fd379246834a3cDa7c1C2EACD957b5747539ca42<br/>
                    类型: NFTA
                  </div>
                  <div className="text-zinc-400 mt-1">✓ 注册后该用户即可开始使用系统中的对应功能</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input value={registerUserAddr} onChange={(e) => setRegisterUserAddr(e.target.value)} placeholder="用户地址" />
              <Input value={registerTierId} onChange={(e) => setRegisterTierId(e.target.value)} placeholder="Tier ID" />
              <Input value={registerReferrerAddr} onChange={(e) => setRegisterReferrerAddr(e.target.value)} placeholder="推荐人(可选)" />
              <Select value={registerType} onValueChange={setRegisterType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nfta">NFTA</SelectItem>
                  <SelectItem value="nftb">NFTB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button disabled={!isOwner || loading || !nexus} onClick={onRegisterPurchase} className="flex-1">
                注册 {registerType === "nfta" ? "NFTA" : "NFTB"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>费率管理</CardTitle>
          <CardDescription>设置 TOF 费率和提现等级费用</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看费率配置详解
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>TOF 燃烧比率</strong></div>
                  <div>• 用户领取收益时 TOF 代币被销毁的比例</div>
                  <div>• 单位为 bps（基点），1 bps = 0.01%，10000 bps = 100%</div>
                  <div className="mt-2"><strong>提现费率等级</strong></div>
                  <div>• 6个等级（0-5），不同等级对应不同的提现手续费</div>
                  <div>• 等级越高，提现费率可能越低或越高（根据业务规则）</div>
                  <div className="mt-2"><strong>费率配置示例</strong>：</div>
                  <div className="bg-black/30 p-2 rounded">
                    • TOF燃烧比率: 1000 (1%的TOF会被销毁)<br/>
                    • Lv0 提现费率: 500 (0.5%)<br/>
                    • Lv1 提现费率: 400 (0.4%)<br/>
                    • Lv2 提现费率: 300 (0.3%)
                  </div>
                  <div className="text-zinc-400 mt-1">✓ 费率值范围：0-10000 bps</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={tofBurnBps} onChange={(e) => setTofBurnBps(e.target.value)} placeholder="TOF 燃烧比率 bps" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetTofBurnBps}>设置TOF燃烧比率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={withdrawLevel} onValueChange={setWithdrawLevel}>
              <SelectTrigger><SelectValue placeholder="等级" /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((l) => <SelectItem key={l} value={l.toString()}>{`Lv${l}`}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={withdrawFeeBps} onChange={(e) => setWithdrawFeeBps(e.target.value)} placeholder="提现费率 bps" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetWithdrawFee}>设置提现费率</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>钱包与治理</CardTitle>
          <CardDescription>管理Treasury、分布钱包、分发器</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看钱包用途说明
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-1">
                  <div><strong>各钱包用途：</strong></div>
                  <div>• <strong>Treasury</strong>：项目金库，管理流动性和储备金</div>
                  <div>• <strong>0号线</strong>：零号线分配钱包，用于特定渠道分配</div>
                  <div>• <strong>社区建设</strong>：社区发展基金钱包</div>
                  <div>• <strong>基金会</strong>：基金会管理钱包</div>
                  <div>• <strong>机构</strong>：合作机构钱包</div>
                  <div>• <strong>项目方</strong>：项目开发团队钱包</div>
                  <div>• <strong>分发器</strong>：代理分发代币的合约/钱包，需单独授权</div>
                  <div className="text-zinc-400 mt-2">💡 填入真实的以太坊地址，不要使用测试地址</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={treasuryAddr} onChange={(e) => setTreasuryAddr(e.target.value)} placeholder="Treasury 地址" />
            <div />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetTreasury}>设置</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input value={zeroLineAddr} onChange={(e) => setZeroLineAddr(e.target.value)} placeholder="0号线" />
            <Input value={communityAddr} onChange={(e) => setCommunityAddr(e.target.value)} placeholder="社区建设" />
            <Input value={foundationAddr} onChange={(e) => setFoundationAddr(e.target.value)} placeholder="基金会" />
            <Input value={institutionAddr} onChange={(e) => setInstitutionAddr(e.target.value)} placeholder="机构" />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetWallets}>批量设置</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={projectAddr} onChange={(e) => setProjectAddr(e.target.value)} placeholder="项目方钱包" />
            <div />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetProjectWallet}>设置</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={distributorAddr} onChange={(e) => setDistributorAddr(e.target.value)} placeholder="分发器地址" />
            <Select value={distributorStatus} onValueChange={setDistributorStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">授权</SelectItem>
                <SelectItem value="false">撤销</SelectItem>
              </SelectContent>
            </Select>
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetDistributor}>设置</Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== TOF 白名单管理 ===== */}
      <Card className="border-red-500/40">
        <CardHeader>
          <CardTitle className="text-red-500">TOF 转账白名单</CardTitle>
          <CardDescription>
            提现/领取手续费需要 Nexus 合约和 Swap 合约在 TOF 白名单中。若提现报 &quot;TOF non-transferable&quot; 请先点「一键修复」。
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mb-2">
                        <ChevronDown className="h-4 w-4" /> 常见问题与快速解决
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mb-3">
                        <Alert className="border-red-500/50 bg-red-500/5 text-xs">
                          <AlertDescription className="space-y-2">
                            <div><strong>❌ 问题：提现时出现 "TOF non-transferable" 错误</strong></div>
                            <div>原因：Nexus 或 Swap 合约不在 TOF 白名单中</div>
                            <div><strong>✅ 快速解决：</strong>点击「一键修复：将 Nexus + Swap 加入白名单」按钮</div>
                            <div className="mt-2"><strong>⚙️ 手动操作流程：</strong></div>
                            <div>1️⃣ 点击「查询白名单状态」查看当前状态</div>
                            <div>2️⃣ 若显示 ❌ 则需要加入白名单</div>
                            <div>3️⃣ 输入合约地址（如 Nexus 或自定义合约）</div>
                            <div>4️⃣ 选择「加入白名单」并点「设置」</div>
                            <div className="mt-2"><strong>💡 提示：</strong>激活新的合约时记得加入白名单，否则无法进行转账操作</div>
                          </AlertDescription>
                        </Alert>
                      </CollapsibleContent>
                    </Collapsible>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 一键修复按钮 */}
          <div className="flex gap-2 flex-wrap">
            <Button
              disabled={!isOwner || loading || !tof}
              onClick={onWhitelistNexusAndSwap}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              一键修复：将 Nexus + Swap 加入白名单
            </Button>
            <Button variant="outline" disabled={!tof} onClick={checkTofWhitelist}>查询白名单状态</Button>
          </div>

          {/* 白名单状态展示 */}
          {Object.keys(tofWhitelistResult).length > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs font-mono space-y-1">
              {Object.entries(tofWhitelistResult).map(([addr, ok]) => (
                <div key={addr} className="flex items-center gap-2">
                  <span className={ok ? "text-green-400" : ok === false ? "text-red-400" : "text-zinc-400"}>
                    {ok === null ? "❓" : ok ? "✅" : "❌"}
                  </span>
                  <span className="truncate">{addr}</span>
                  <span className="text-muted-foreground">{ok === null ? "查询失败" : ok ? "已授权" : "未授权"}</span>
                </div>
              ))}
            </div>
          )}

          {/* 手动设置单个地址 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              value={tofWhitelistAddr}
              onChange={(e) => setTofWhitelistAddr(e.target.value)}
              placeholder="合约地址 0x..."
              className="md:col-span-2"
            />
            <Select value={tofWhitelistStatus} onValueChange={setTofWhitelistStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">加入白名单</SelectItem>
                <SelectItem value="false">移除白名单</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" disabled={!isOwner || loading || !tof} onClick={onSetTofWhitelist}>设置</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
