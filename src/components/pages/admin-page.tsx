  // ...existing code...
"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Settings, ShieldCheck, Activity, Wallet } from "lucide-react";
import { useWeb3 } from "@/lib/web3-provider";
import { useNexusContract, useSwapContract, execTx } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";
import { AnnouncementItem, ANNOUNCEMENT_TYPES, AnnouncementType } from "@/lib/announcement";

type OperationLogItem = {
  id: number;
  action: string;
  status: "success" | "error";
  detail: string;
  at: string;
};

type AdminNftaTierSnapshot = {
  id: number;
  price: bigint;
  dailyYield: bigint;
  maxSupply: bigint;
  currentSupply: bigint;
  isActive: boolean;
};

type AdminNftbTierSnapshot = {
  id: number;
  price: bigint;
  weight: bigint;
  maxSupply: bigint;
  usdtMinted: bigint;
  tofMinted: bigint;
  dividendBps: bigint;
  isActive: boolean;
};
  async function handleBulkCardAction(action: 'mint' | 'transfer' | 'claim', type: 'nfta' | 'nftb') {
    setLoading(true);
    if (type === 'nfta') setBulkCardResultNfta("");
    if (type === 'nftb') setBulkCardResultNftb("");
    try {
      const input = type === 'nfta' ? bulkCardInputNfta : bulkCardInputNftb;
      const lines = input.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        if (type === 'nfta') setBulkCardResultNfta("未检测到有效输入");
        if (type === 'nftb') setBulkCardResultNftb("未检测到有效输入");
        setLoading(false);
        return;
      }
      let results: string[] = [];
      for (const line of lines) {
        const [addr, cardId] = line.split(/,|，/).map(s => s.trim());
        if (!ethers.isAddress(addr) || !cardId || isNaN(Number(cardId))) {
          results.push(`${line} => 格式错误`);
          continue;
        }
        try {
          let tx;
          if (type === 'nfta') {
            if (action === 'mint') tx = await execTx(nexus.mintNftaCard(addr, BigInt(cardId)));
            if (action === 'transfer') tx = await execTx(nexus.transferNftaCard(addr, BigInt(cardId)));
            if (action === 'claim') tx = await execTx(nexus.claimNftaYield(addr, BigInt(cardId)));
          } else if (type === 'nftb') {
            if (action === 'mint') tx = await execTx(nexus.mintNftbCard(addr, BigInt(cardId)));
            if (action === 'transfer') tx = await execTx(nexus.transferNftbCard(addr, BigInt(cardId)));
            if (action === 'claim') tx = await execTx(nexus.claimNftbDividend(addr, BigInt(cardId)));
          }
          if (tx?.success) {
            results.push(`${line} => 成功 ${tx.hash ? tx.hash.slice(0, 12) : ''}`);
  const [addLpUsdt, setAddLpUsdt] = useState("");
  const [removeLpTot, setRemoveLpTot] = useState("");
  const [removeLpUsdt, setRemoveLpUsdt] = useState("");
  const [emergencyToken, setEmergencyToken] = useState("");
  const [emergencyAmount, setEmergencyAmount] = useState("");
  const [swapNexusAddr, setSwapNexusAddr] = useState("");
  const [swapCurrentPrice, setSwapCurrentPrice] = useState("-");
  const [swapLastDeflation, setSwapLastDeflation] = useState("-");
  const [swapDeflationCountdown, setSwapDeflationCountdown] = useState("-");
  const [swapNexusDisplay, setSwapNexusDisplay] = useState("-");
  const [swapTotToken, setSwapTotToken] = useState("-");
  const [swapUsdtToken, setSwapUsdtToken] = useState("-");
  const [currentAction, setCurrentAction] = useState("");
  const [operationLogs, setOperationLogs] = useState<OperationLogItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>("update");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementToken, setAnnouncementToken] = useState("");
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);
  const [isAnnouncementLoading, setIsAnnouncementLoading] = useState(false);

  const toUnits = (value: string) => ethers.parseUnits(value || "0", 18);

  const pushOperationLog = (action: string, status: "success" | "error", detail: string) => {
    const now = new Date();
    const at = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    setOperationLogs((prev) => [
      {
        id: Date.now(),
        action,
        status,
        detail,
        at,
      },
      ...prev,
    ].slice(0, 10));
  };

  const isValidAddress = (value: string) => ethers.isAddress(value.trim());

  const validateAddressField = (label: string, value: string) => {
    if (!isValidAddress(value)) {
      toast({ title: "参数无效", description: `${label} 不是有效地址`, variant: "destructive" });
      pushOperationLog(`校验 ${label}`, "error", "地址格式错误");
      return false;
    }
    return true;
  };

  const validateBpsField = (label: string, value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 10000) {
      toast({ title: "参数无效", description: `${label} 必须在 0-10000 之间`, variant: "destructive" });
      pushOperationLog(`校验 ${label}`, "error", "BPS 超出范围");
      return false;
    }
    return true;
  };

  const validatePositiveAmount = (label: string, value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast({ title: "参数无效", description: `${label} 必须大于 0`, variant: "destructive" });
      pushOperationLog(`校验 ${label}`, "error", "数值需大于 0");
      return false;
    }
    return true;
  };

  const runAction = async (action: string, fn: () => Promise<void>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setCurrentAction(action);
    try {
      await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast({ title: "执行失败", description: message.slice(0, 180), variant: "destructive" });
      pushOperationLog(action, "error", message.slice(0, 120));
    } finally {
      setLoading(false);
      setCurrentAction("");
    }
  };

  const notifyTx = (ok: boolean, hash?: string, error?: string, action: string = "管理操作") => {
    if (ok) {
      toast({ title: "交易成功", description: hash ? `${hash.slice(0, 10)}...` : "已上链" });
      pushOperationLog(action, "success", hash ? hash.slice(0, 18) : "已上链");
    } else {
      toast({ title: "交易失败", description: error || "未知错误", variant: "destructive" });
      pushOperationLog(action, "error", (error || "未知错误").slice(0, 120));
    }
  };

  const loadAnnouncements = async () => {
    setIsAnnouncementLoading(true);
    try {
      const response = await fetch("/api/announcements", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        toast({ title: "公告读取失败", description: "无法加载公告列表", variant: "destructive" });
        return;
      }

      const payload = (await response.json()) as { data?: AnnouncementItem[] };
      if (Array.isArray(payload.data)) {
        setAnnouncements(payload.data);
      }
    } catch {
      toast({ title: "公告读取失败", description: "网络异常", variant: "destructive" });
    } finally {
      setIsAnnouncementLoading(false);
    }
  };

  const publishAnnouncement = async () => {
    const title = announcementTitle.trim();
    const content = announcementContent.trim();
    if (!title || !content) {
      toast({ title: "参数无效", description: "标题和正文不能为空", variant: "destructive" });
      return;
    }

    setIsPublishingAnnouncement(true);
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(announcementToken.trim() ? { "x-admin-token": announcementToken.trim() } : {}),
        },
        body: JSON.stringify({
          title,
          type: announcementType,
          content,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast({ title: "发布失败", description: payload.message || "请求失败", variant: "destructive" });
        pushOperationLog("发布公告", "error", payload.message || "请求失败");
        return;
      }

      toast({ title: "发布成功", description: "公告已发布" });
      pushOperationLog("发布公告", "success", title.slice(0, 40));
      setAnnouncementTitle("");
      setAnnouncementContent("");
      await loadAnnouncements();
    } catch {
      toast({ title: "发布失败", description: "网络异常", variant: "destructive" });
      pushOperationLog("发布公告", "error", "网络异常");
    } finally {
      setIsPublishingAnnouncement(false);
    }
  };

  const refreshData = async () => {
    if (!nexus) return;
    try {
      const owner = await nexus.owner();
      const tr = await nexus.treasury();
      const z = await nexus.zeroLineWallet();
      const c = await nexus.communityWallet();
      const f = await nexus.foundationWallet();
      const i = await nexus.institutionWallet();
      const burn = await nexus.tofBurnBps();
      const claim = await nexus.tofClaimFeeBps();

      setOwnerAddress(owner);
      setIsOwner(!!address && address.toLowerCase() === owner.toLowerCase());
      setTreasury(tr);
      setZeroLine(z);
      setCommunity(c);
      setFoundation(f);
      setInstitution(i);
      setTofBurnBps(burn.toString());
      setTofClaimFeeBps(claim.toString());

      try {
        const eventFilter = nexus.filters.DistributorUpdated?.();
        if (!eventFilter) {
          setOperatorManagers([]);
        } else {
          const logs = await nexus.queryFilter(eventFilter, 0, "latest");
          const latestStatus = new Map<string, boolean>();
          logs.forEach((log: ethers.EventLog | ethers.Log) => {
            const args = (log as ethers.EventLog).args;
            const operator = args?.distributor?.toString() ?? args?.[0]?.toString() ?? "";
            const allowed = Boolean(args?.allowed ?? args?.[1]);
            if (operator && ethers.isAddress(operator)) {
              latestStatus.set(operator.toLowerCase(), allowed);
            }
          });
          const active = Array.from(latestStatus.entries())
            .filter(([, allowed]) => allowed)
            .map(([operator]) => ethers.getAddress(operator));
          setOperatorManagers(active);
        }
      } catch {
        setOperatorManagers([]);
      }

      const [nftaRows, nftbRows] = await Promise.all([
        Promise.all(
          EXPECTED_NFTA_TIER_IDS.map(async (id) => {
            const tier = await nexus.nftaTiers(id);
            return {
              id,
              price: tier.price,
              dailyYield: tier.dailyYield,
              maxSupply: tier.maxSupply,
              currentSupply: tier.currentSupply,
              isActive: tier.isActive,
            } as AdminNftaTierSnapshot;
          })
        ),
        Promise.all(
          EXPECTED_NFTB_TIER_IDS.map(async (id) => {
            const tier = await nexus.nftbTiers(id);
            return {
              id,
              price: tier.price,
              weight: tier.weight,
              maxSupply: tier.maxSupply,
              usdtMinted: tier.usdtMinted,
              tofMinted: tier.tofMinted,
              dividendBps: tier.dividendBps,
              isActive: tier.isActive,
            } as AdminNftbTierSnapshot;
          })
        ),
      ]);

      setNftaTierSnapshot(nftaRows);
      setNftbTierSnapshot(nftbRows);

      const missingNfta = nftaRows
        .filter((tier) => tier.price === 0n && tier.maxSupply === 0n && !tier.isActive)
        .map((tier) => tier.id);
      const missingNftb = nftbRows
        .filter((tier) => tier.price === 0n && tier.maxSupply === 0n && !tier.isActive)
        .map((tier) => tier.id);

      if (missingNfta.length === 0 && missingNftb.length === 0) {
        setTierConfigStatus("固定档位完整（NFTA 2档 / NFTB 3档）");
      } else {
        setTierConfigStatus(
          `固定档位缺失：${missingNfta.length > 0 ? `NFTA[${missingNfta.join(",")}]` : ""}${missingNfta.length > 0 && missingNftb.length > 0 ? "，" : ""}${missingNftb.length > 0 ? `NFTB[${missingNftb.join(",")}]` : ""}`
        );
      }

      if (swap) {
        const [totR, usdtR, pool, b, s, p, th, dBuy, mSell, def, price, lastDefl, deflCD, nexAddr, totTk, usdtTk] = await Promise.all([
          swap.totReserve(),
          swap.usdtReserve(),
          swap.nftbDividendPool(),
          swap.buyFeeBps(),
          swap.sellFeeBps(),
          swap.profitTaxBps(),
          swap.distributionThreshold(),
          swap.maxDailyBuy(),
          swap.maxSellBps(),
          swap.deflationBps(),
          swap.getCurrentPrice(),
          swap.lastDeflationTime(),
          swap.timeUntilNextDeflation(),
          swap.nexus(),
          swap.totToken(),
          swap.usdtToken(),
        ]);

        setSwapTotReserve(ethers.formatUnits(totR, 18));
        setSwapUsdtReserve(ethers.formatUnits(usdtR, 18));
        setSwapDividendPool(ethers.formatUnits(pool, 18));
        setSwapBuyFeeBps(b.toString());
        setSwapSellFeeBps(s.toString());
        setSwapProfitTaxBps(p.toString());
        setSwapDistributionThreshold(ethers.formatUnits(th, 18));
        setSwapMaxDailyBuy(ethers.formatUnits(dBuy, 18));
        setSwapMaxSellBps(mSell.toString());
        setSwapDeflationBps(def.toString());
        setSwapCurrentPrice(ethers.formatUnits(price, 18));
        const deflDate = new Date(Number(lastDefl) * 1000);
        setSwapLastDeflation(deflDate.toLocaleString());
        const cdSec = Number(deflCD);
        setSwapDeflationCountdown(cdSec <= 0 ? "可触发" : `${Math.floor(cdSec / 3600)}h ${Math.floor((cdSec % 3600) / 60)}m`);
        setSwapNexusDisplay(nexAddr);
        setSwapTotToken(totTk);
        setSwapUsdtToken(usdtTk);
      }
    } catch {
      toast({ title: "读取失败", description: "请确认已连接钱包并配置合约地址", variant: "destructive" });
    }
  };

  useEffect(() => {
    refreshData();
  }, [nexus, swap, address]);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className="text-xl font-headline font-bold">Truth Oracle 管理员面板</h2>
          <p className="text-xs text-muted-foreground">超级管理员: {ownerAddress ? `${ownerAddress.slice(0, 10)}...${ownerAddress.slice(-6)}` : "-"}</p>
          <p className={`text-xs ${isOwner ? "text-green-500" : "text-yellow-500"}`}>
            {isOwner ? "当前钱包是超级管理员，可执行管理操作" : "当前钱包不是超级管理员，仅可查看"}
          </p>
        </div>
      </div>

      <Card className="glass-panel">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">执行状态</p>
              <p className={`text-sm font-medium ${currentAction ? "text-primary" : "text-muted-foreground"}`}>
                {currentAction || "空闲"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOperationLogs([])} disabled={operationLogs.length === 0 || loading}>
              清空记录
            </Button>
          </div>

          {operationLogs.length > 0 ? (
            <div className="rounded-md border border-border/60 max-h-48 overflow-auto">
              {operationLogs.map((log) => (
                <div key={log.id} className="px-3 py-2 border-b border-border/40 last:border-b-0 text-xs flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-medium">{log.action}</p>
                    <p className="text-muted-foreground">{log.detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={log.status === "success" ? "text-green-500" : "text-destructive"}>
                      {log.status === "success" ? "成功" : "失败"}
                    </p>
                    <p className="text-muted-foreground">{log.at}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">暂无执行记录</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">TOT Reserve</div><div className="text-lg font-semibold">{Number(swapTotReserve).toLocaleString()}</div></CardContent></Card>
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">USDT Reserve</div><div className="text-lg font-semibold">{Number(swapUsdtReserve).toLocaleString()}</div></CardContent></Card>
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">NFT-B 分红池(TOT)</div><div className="text-lg font-semibold">{Number(swapDividendPool).toLocaleString()}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">当前价格 (USDT/TOT)</div><div className="text-lg font-semibold">{Number(swapCurrentPrice).toFixed(6)}</div></CardContent></Card>
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">上次通缩时间</div><div className="text-sm font-semibold">{swapLastDeflation}</div></CardContent></Card>
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">通缩倒计时</div><div className="text-lg font-semibold">{swapDeflationCountdown}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">关联 Truth Oracle</div><div className="text-xs font-mono break-all">{swapNexusDisplay}</div></CardContent></Card>
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">TOT Token</div><div className="text-xs font-mono break-all">{swapTotToken}</div></CardContent></Card>
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">USDT Token</div><div className="text-xs font-mono break-all">{swapUsdtToken}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="nexus" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="nexus" className="text-xs gap-1"><Settings size={14} /><span>基础设置</span></TabsTrigger>
          <TabsTrigger value="tiers" className="text-xs gap-1"><ShieldCheck size={14} /><span>档位</span></TabsTrigger>
          <TabsTrigger value="swap" className="text-xs gap-1"><Wallet size={14} /><span>兑换</span></TabsTrigger>
          <TabsTrigger value="ops" className="text-xs gap-1"><Activity size={14} /><span>运营</span></TabsTrigger>
          <TabsTrigger value="announcement" className="text-xs gap-1"><span>公告</span></TabsTrigger>
        </TabsList>

        <TabsContent value="nexus">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Truth Oracle 基础设置</CardTitle>
              <CardDescription>项目钱包、手续费和管理员权限配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-xs space-y-1">
                <p className="font-medium text-amber-700 dark:text-amber-300">参数说明与风险警示</p>
                <p className="text-muted-foreground">1) 地址类参数（Treasury / 4 钱包 / 运营管理员）修改后立即生效，资金流向会直接变化。</p>
                <p className="text-muted-foreground">2) 费率参数单位为 bps，100 = 1%，请输入整数。配置错误可能导致提现或领取成本异常。</p>
                <p className="text-muted-foreground">3) 建议每次只改一组参数，记录 tx hash，并在前台完成一轮小额验证后再继续。</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={treasury} onChange={(e) => setTreasury(e.target.value)} placeholder="财库地址" aria-label="财库地址" />
                <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("设置 Treasury", async () => {
                  if (!nexus) return;
                  if (!validateAddressField("财库地址", treasury)) return;
                  setLoading(true);
                  const r = await execTx(nexus.setTreasury(treasury));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "设置 Treasury");
                  if (r.success) refreshData();
                }, `确认将 Treasury 更新为\n${treasury} ?`)}>设置 Treasury</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={zeroLine} onChange={(e) => setZeroLine(e.target.value)} placeholder="0号线钱包" aria-label="0号线钱包" />
                <Input value={community} onChange={(e) => setCommunity(e.target.value)} placeholder="社区建设钱包" aria-label="社区建设钱包" />
                <Input value={foundation} onChange={(e) => setFoundation(e.target.value)} placeholder="基金会钱包" aria-label="基金会钱包" />
                <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="机构钱包" aria-label="机构钱包" />
              </div>
              <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("设置 4 钱包", async () => {
                if (!nexus) return;
                if (!validateAddressField("0号线钱包", zeroLine)) return;
                if (!validateAddressField("社区钱包", community)) return;
                if (!validateAddressField("基金会钱包", foundation)) return;
                if (!validateAddressField("机构钱包", institution)) return;
                setLoading(true);
                const r = await execTx(nexus.setWallets(zeroLine, community, foundation, institution));
                setLoading(false);
                notifyTx(r.success, r.hash, r.error, "设置 4 钱包");
                if (r.success) refreshData();
              }, "确认更新 4 个分账钱包地址？")}>设置 4 钱包</Button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={tofBurnBps} onChange={(e) => setTofBurnBps(e.target.value)} placeholder="TOF 销毁比例 (bps)" type="number" aria-label="TOF 销毁比例 (bps)" />
                <Input value={tofClaimFeeBps} onChange={(e) => setTofClaimFeeBps(e.target.value)} placeholder="TOF 领取手续费 (bps)" type="number" aria-label="TOF 领取手续费 (bps)" />
                <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("更新 TOF 参数", async () => {
                  if (!nexus) return;
                  if (!validateBpsField("TOF 销毁比例", tofBurnBps)) return;
                  if (!validateBpsField("TOF 领取手续费", tofClaimFeeBps)) {
                    pushOperationLog("更新 TOF 参数", "error", "TOF 领取手续费无效");
                    return;
                  }
                  setLoading(true);
                  const r1 = await execTx(nexus.setTofBurnBps(BigInt(tofBurnBps || "0")));
                  if (!r1.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r1.error, "更新 TOF 参数");
                    return;
                  }
                  const r2 = await execTx(nexus.setTofClaimFeeBps(BigInt(tofClaimFeeBps || "0")));
                  setLoading(false);
                  notifyTx(r2.success, r2.hash, r2.error, "更新 TOF 参数");
                  if (r2.success) refreshData();
                }, "确认更新 TOF 销毁比例与领取手续费？")}>更新 TOF 参数</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={withdrawLevel} onChange={(e) => setWithdrawLevel(e.target.value)} placeholder="等级 0-5" type="number" aria-label="提现等级 0-5" />
                <Input value={withdrawFeeBps} onChange={(e) => setWithdrawFeeBps(e.target.value)} placeholder="提现费率 (bps)" type="number" aria-label="提现费率 (bps)" />
                <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("设置提现费率", async () => {
                  if (!nexus) return;
                  const level = Number(withdrawLevel || "0");
                  if (!Number.isInteger(level) || level < 0 || level > 5) {
                    toast({ title: "参数无效", description: "level 必须在 0-5", variant: "destructive" });
                    pushOperationLog("设置提现费率", "error", "level 越界");
                    return;
                  }
                  if (!validateBpsField("提现费率", withdrawFeeBps)) return;
                  setLoading(true);
                  const r = await execTx(nexus.setWithdrawFeeBps(level, BigInt(withdrawFeeBps || "0")));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "设置提现费率");
                }, "确认更新对应等级的提现费率？")}>设置提现费率</Button>
              </div>

              <div className="space-y-3 rounded-md border border-border/60 px-3 py-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">超级管理员（Owner）</p>
                  <p className="text-xs font-mono break-all text-muted-foreground">{ownerAddress || "-"}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input value={distributorAddr} onChange={(e) => setDistributorAddr(e.target.value)} placeholder="运营管理员地址" aria-label="运营管理员地址" />
                  <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("添加运营管理员", async () => {
                    if (!nexus) return;
                    if (!validateAddressField("运营管理员地址", distributorAddr)) return;
                    setLoading(true);
                    const r = await execTx(nexus.setDistributor(distributorAddr, true));
                    setLoading(false);
                    notifyTx(r.success, r.hash, r.error, "添加运营管理员");
                    if (r.success) refreshData();
                  }, `确认添加运营管理员\n${distributorAddr} ?`)}>添加运营管理员</Button>
                  <Button variant="outline" disabled={!isOwner || !nexus || loading} onClick={() => runAction("移除运营管理员", async () => {
                    if (!nexus) return;
                    if (!validateAddressField("运营管理员地址", distributorAddr)) return;
                    setLoading(true);
                    const r = await execTx(nexus.setDistributor(distributorAddr, false));
                    setLoading(false);
                    notifyTx(r.success, r.hash, r.error, "移除运营管理员");
                    if (r.success) refreshData();
                  }, `确认移除运营管理员\n${distributorAddr} ?`)}>移除运营管理员</Button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium">当前运营管理员</p>
                  {operatorManagers.length > 0 ? (
                    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 space-y-1">
                      {operatorManagers.map((item) => (
                        <p key={item} className="text-xs font-mono break-all">{item}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">暂无已授权的运营管理员</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>NFT 固定档位（只读）</CardTitle>
              <CardDescription>档位由合约固定管理，后台仅展示链上快照与完整性状态</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border/60 px-3 py-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium">固定档位完整性</p>
                <p className={tierConfigStatus.includes("完整") ? "text-xs text-green-500 font-medium" : "text-xs text-yellow-600 dark:text-yellow-400 font-medium"}>
                  {tierConfigStatus}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">NFTA 固定档位</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {nftaTierSnapshot.map((tier) => (
                    <div key={`nfta-${tier.id}`} className="rounded-md border border-border/60 bg-muted/20 px-3 py-3 text-xs space-y-1">
                      <p className="font-medium">NFTA #{tier.id}</p>
                      <p>状态：{tier.isActive ? "启用" : "停用"}</p>
                      <p>价格：{Number(ethers.formatUnits(tier.price, 18)).toLocaleString()} USDT</p>
                      <p>日产出：{Number(ethers.formatUnits(tier.dailyYield, 18)).toLocaleString()} TOT</p>
                      <p>供应：{tier.currentSupply.toString()} / {tier.maxSupply.toString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">NFTB 固定档位</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {nftbTierSnapshot.map((tier) => (
                    <div key={`nftb-${tier.id}`} className="rounded-md border border-border/60 bg-muted/20 px-3 py-3 text-xs space-y-1">
                      <p className="font-medium">NFTB #{tier.id}</p>
                      <p>状态：{tier.isActive ? "启用" : "停用"}</p>
                      <p>价格：{Number(ethers.formatUnits(tier.price, 18)).toLocaleString()} USDT</p>
                      <p>权重：{tier.weight.toString()}</p>
                      <p>分红：{Number(tier.dividendBps) / 100}%</p>
                      <p>供应：{tier.maxSupply.toString()}</p>
                      <p>已售（USDT/TOF）：{tier.usdtMinted.toString()} / {tier.tofMinted.toString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 极简 NFTA/NFTB 卡牌批量管理区（分开） */}
              {isOwner && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* NFTA 批量管理 */}
                  <div className="p-4 border border-primary/40 rounded-lg bg-primary/5 space-y-3">
                    <div className="font-bold text-primary">NFTA 批量管理</div>
                    <div className="text-xs text-muted-foreground mb-2">仅支持 NFTA（收益型）卡牌，每行“用户地址,卡牌ID”，如 0x...,123。仅超级管理员可见。</div>
                    <Textarea
                      value={bulkCardInputNfta || ""}
                      onChange={e => setBulkCardInputNfta(e.target.value)}
                      placeholder={"0x用户地址,卡牌ID\n0x用户地址2,卡牌ID2"}
                      className="min-h-[80px] font-mono"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={loading || !bulkCardInputNfta?.trim()} onClick={() => handleBulkCardAction('mint','nfta')}>批量发放</Button>
                      <Button size="sm" variant="outline" disabled={loading || !bulkCardInputNfta?.trim()} onClick={() => handleBulkCardAction('transfer','nfta')}>批量转让</Button>
                      <Button size="sm" variant="secondary" disabled={loading || !bulkCardInputNfta?.trim()} onClick={() => handleBulkCardAction('claim','nfta')}>批量结算收益</Button>
                    </div>
                    {bulkCardResultNfta && (
                      <div className="mt-2 text-xs whitespace-pre-wrap bg-muted/30 rounded p-2 border border-border/40">{bulkCardResultNfta}</div>
                    )}
                  </div>
                  {/* NFTB 批量管理 */}
                  <div className="p-4 border border-accent/40 rounded-lg bg-accent/5 space-y-3">
                    <div className="font-bold text-accent">NFTB 批量管理</div>
                    <div className="text-xs text-muted-foreground mb-2">仅支持 NFTB（分红型）卡牌，每行“用户地址,卡牌ID”，如 0x...,10001。仅超级管理员可见。</div>
                    <Textarea
                      value={bulkCardInputNftb || ""}
                      onChange={e => setBulkCardInputNftb(e.target.value)}
                      placeholder={"0x用户地址,卡牌ID\n0x用户地址2,卡牌ID2"}
                      className="min-h-[80px] font-mono"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={loading || !bulkCardInputNftb?.trim()} onClick={() => handleBulkCardAction('mint','nftb')}>批量发放</Button>
                      <Button size="sm" variant="outline" disabled={loading || !bulkCardInputNftb?.trim()} onClick={() => handleBulkCardAction('transfer','nftb')}>批量转让</Button>
                      <Button size="sm" variant="secondary" disabled={loading || !bulkCardInputNftb?.trim()} onClick={() => handleBulkCardAction('claim','nftb')}>批量结算收益</Button>
                    </div>
                    {bulkCardResultNftb && (
                      <div className="mt-2 text-xs whitespace-pre-wrap bg-muted/30 rounded p-2 border border-border/40">{bulkCardResultNftb}</div>
                    )}
                  </div>
                </div>
              )}
              // ...existing code...
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="swap">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>TOTSwap 参数与流动性</CardTitle>
              <CardDescription>手续费、限额、通缩与底池注入</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-xs space-y-1">
                <p className="font-medium text-amber-700 dark:text-amber-300">参数说明与风险警示</p>
                <p className="text-muted-foreground">1) 费率类参数（buy/sell/profitTax/deflation）会直接影响交易成本与用户收益，调整前请先公告。</p>
                <p className="text-muted-foreground">2) 阈值类参数（distributionThreshold / maxDailyBuy / maxSellBps）会影响成交体验与分红节奏。</p>
                <p className="text-muted-foreground">3) 流动性与紧急提取属于高风险操作，错误配置可能导致池子价格波动和资金风险。</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">买入手续费 (buyFeeBps)</p>
                  <p className="text-[11px] text-muted-foreground">单位 bps，100 = 1%</p>
                  <Input value={swapBuyFeeBps} onChange={(e) => setSwapBuyFeeBps(e.target.value)} placeholder="买入手续费 bps" type="number" aria-label="买入手续费 bps" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">卖出手续费 (sellFeeBps)</p>
                  <p className="text-[11px] text-muted-foreground">单位 bps，500 = 5%</p>
                  <Input value={swapSellFeeBps} onChange={(e) => setSwapSellFeeBps(e.target.value)} placeholder="卖出手续费 bps" type="number" aria-label="卖出手续费 bps" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">盈利税 (profitTaxBps)</p>
                  <p className="text-[11px] text-muted-foreground">单位 bps，仅对盈利卖出部分生效</p>
                  <Input value={swapProfitTaxBps} onChange={(e) => setSwapProfitTaxBps(e.target.value)} placeholder="盈利税 bps" type="number" aria-label="盈利税 bps" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">分红触发阈值 (distributionThreshold)</p>
                  <p className="text-[11px] text-muted-foreground">单位 TOT，达到后触发分红流程</p>
                  <Input value={swapDistributionThreshold} onChange={(e) => setSwapDistributionThreshold(e.target.value)} placeholder="分红触发阈值 (TOT)" aria-label="分红触发阈值" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">单地址日买入上限 (maxDailyBuy)</p>
                  <p className="text-[11px] text-muted-foreground">单位 TOT</p>
                  <Input value={swapMaxDailyBuy} onChange={(e) => setSwapMaxDailyBuy(e.target.value)} placeholder="日买入上限 (TOT)" aria-label="日买入上限" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">单次卖出上限 (maxSellBps)</p>
                  <p className="text-[11px] text-muted-foreground">单位 bps，基于用户持仓比例限制</p>
                  <Input value={swapMaxSellBps} onChange={(e) => setSwapMaxSellBps(e.target.value)} placeholder="单次卖出上限 bps" type="number" aria-label="单次卖出上限 bps" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">通缩比例 (deflationBps)</p>
                  <p className="text-[11px] text-muted-foreground">单位 bps，用于定时通缩销毁</p>
                  <Input value={swapDeflationBps} onChange={(e) => setSwapDeflationBps(e.target.value)} placeholder="通缩比例 bps" type="number" aria-label="通缩比例 bps" />
                </div>
                <Button disabled={!isOwner || !swap || loading} onClick={() => runAction("保存 Swap 参数", async () => {
                  if (!swap) return;
                  if (!validateBpsField("买入手续费", swapBuyFeeBps)) return;
                  if (!validateBpsField("卖出手续费", swapSellFeeBps)) return;
                  if (!validateBpsField("盈利税", swapProfitTaxBps)) return;
                  if (!validateBpsField("卖出上限", swapMaxSellBps)) return;
                  if (!validateBpsField("通缩比例", swapDeflationBps)) return;
                  if (!validatePositiveAmount("分红触发阈值", swapDistributionThreshold)) return;
                  if (!validatePositiveAmount("日买入上限", swapMaxDailyBuy)) return;

                  setLoading(true);
                  const r1 = await execTx(swap.setBuyFeeBps(BigInt(swapBuyFeeBps || "0")));
                  if (!r1.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r1.error, "保存 Swap 参数");
                    return;
                  }
                  const r2 = await execTx(swap.setSellFeeBps(BigInt(swapSellFeeBps || "0")));
                  if (!r2.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r2.error, "保存 Swap 参数");
                    return;
                  }
                  const r3 = await execTx(swap.setProfitTaxBps(BigInt(swapProfitTaxBps || "0")));
                  if (!r3.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r3.error, "保存 Swap 参数");
                    return;
                  }
                  const r4 = await execTx(swap.setDistributionThreshold(toUnits(swapDistributionThreshold)));
                  if (!r4.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r4.error, "保存 Swap 参数");
                    return;
                  }
                  const r5 = await execTx(swap.setMaxDailyBuy(toUnits(swapMaxDailyBuy)));
                  if (!r5.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r5.error, "保存 Swap 参数");
                    return;
                  }
                  const r6 = await execTx(swap.setMaxSellBps(BigInt(swapMaxSellBps || "0")));
                  if (!r6.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r6.error, "保存 Swap 参数");
                    return;
                  }
                  const r7 = await execTx(swap.setDeflationBps(BigInt(swapDeflationBps || "0")));
                  setLoading(false);
                  notifyTx(r7.success, r7.hash, r7.error, "保存 Swap 参数");
                  if (r7.success) refreshData();
                }, "确认保存全部 Swap 参数？")}>保存 Swap 参数</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">注入 TOT 数量</p>
                  <p className="text-[11px] text-muted-foreground">与 USDT 一起用于补充流动性</p>
                  <Input value={addLpTot} onChange={(e) => setAddLpTot(e.target.value)} placeholder="注入 TOT 数量" aria-label="注入 TOT 数量" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">注入 USDT 数量</p>
                  <p className="text-[11px] text-muted-foreground">与 TOT 按目标池子比例注入</p>
                  <Input value={addLpUsdt} onChange={(e) => setAddLpUsdt(e.target.value)} placeholder="注入 USDT 数量" aria-label="注入 USDT 数量" />
                </div>
                <Button disabled={!isOwner || !swap || loading} onClick={() => runAction("注入流动性", async () => {
                  if (!swap) return;
                  if (!validatePositiveAmount("TOT 注入量", addLpTot)) return;
                  if (!validatePositiveAmount("USDT 注入量", addLpUsdt)) return;
                  setLoading(true);
                  const r = await execTx(swap.addLiquidity(toUnits(addLpTot), toUnits(addLpUsdt)));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "注入流动性");
                  if (r.success) refreshData();
                }, "确认向 Swap 注入流动性？")}>注入流动性</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">移除 TOT 数量</p>
                  <p className="text-[11px] text-muted-foreground">从池中取出 TOT</p>
                  <Input value={removeLpTot} onChange={(e) => setRemoveLpTot(e.target.value)} placeholder="移除 TOT 数量" aria-label="移除 TOT 数量" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">移除 USDT 数量</p>
                  <p className="text-[11px] text-muted-foreground">从池中取出 USDT</p>
                  <Input value={removeLpUsdt} onChange={(e) => setRemoveLpUsdt(e.target.value)} placeholder="移除 USDT 数量" aria-label="移除 USDT 数量" />
                </div>
                <Button disabled={!isOwner || !swap || loading} variant="destructive" onClick={() => runAction("移除流动性", async () => {
                  if (!swap) return;
                  if (!validatePositiveAmount("TOT 移除量", removeLpTot)) return;
                  if (!validatePositiveAmount("USDT 移除量", removeLpUsdt)) return;
                  setLoading(true);
                  const r = await execTx(swap.removeLiquidity(toUnits(removeLpTot), toUnits(removeLpUsdt)));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "移除流动性");
                  if (r.success) refreshData();
                }, "⚠️ 确认从 Swap 池移除流动性？此操作将影响池深度。")}>移除流动性</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">更新 Truth Oracle 地址</p>
                  <p className="text-[11px] text-muted-foreground">修改 Swap 关联的 Truth Oracle（Nexus）合约</p>
                  <Input value={swapNexusAddr} onChange={(e) => setSwapNexusAddr(e.target.value)} placeholder="Truth Oracle 合约地址" aria-label="Truth Oracle 合约地址" />
                </div>
                <Button disabled={!isOwner || !swap || loading} onClick={() => runAction("设置 Truth Oracle 地址", async () => {
                  if (!swap) return;
                  if (!validateAddressField("Truth Oracle 地址", swapNexusAddr)) return;
                  setLoading(true);
                  const r = await execTx(swap.setNexus(swapNexusAddr));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "设置 Truth Oracle 地址");
                  if (r.success) refreshData();
                }, `确认更新 Truth Oracle 地址为\n${swapNexusAddr} ?`)}>设置 Truth Oracle 地址</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-destructive">紧急提取代币</p>
                  <p className="text-[11px] text-muted-foreground">提取卡在合约中的任意 ERC20 代币</p>
                  <Input value={emergencyToken} onChange={(e) => setEmergencyToken(e.target.value)} placeholder="代币地址" aria-label="紧急提取代币地址" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-destructive">提取数量</p>
                  <p className="text-[11px] text-muted-foreground">18 位精度</p>
                  <Input value={emergencyAmount} onChange={(e) => setEmergencyAmount(e.target.value)} placeholder="数量" aria-label="紧急提取数量" />
                </div>
                <Button disabled={!isOwner || !swap || loading} variant="destructive" onClick={() => runAction("紧急提取", async () => {
                  if (!swap) return;
                  if (!validateAddressField("Token 地址", emergencyToken)) return;
                  if (!validatePositiveAmount("提取数量", emergencyAmount)) return;
                  setLoading(true);
                  const r = await execTx(swap.emergencyWithdraw(emergencyToken, toUnits(emergencyAmount)));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "紧急提取");
                  if (r.success) refreshData();
                }, "⚠️ 紧急提取操作！确认执行？")}>紧急提取</Button>
              </div>

              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                高风险提醒：移除流动性、更新 Truth Oracle 地址、紧急提取都会直接影响线上资金与交易路径，请先在测试环境与小额资金验证。
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ops">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                运营操作
              </CardTitle>
              <CardDescription>
                分红相关操作由 Keeper 自动执行（达到阈值自动分红），后台仅保留非自动化运营动作。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={rewardFundAmount} onChange={(e) => setRewardFundAmount(e.target.value)} placeholder="奖励池注入 TOT 数量" aria-label="奖励池注入 TOT 数量" />
                <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("注入奖励池", async () => {
                  if (!nexus) return;
                  if (!validatePositiveAmount("奖励池注入量", rewardFundAmount)) return;
                  setLoading(true);
                  const r = await execTx(nexus.fundRewardPool(toUnits(rewardFundAmount)));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "注入奖励池");
                }, "确认向奖励池注入 TOT？")}>注入奖励池</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button disabled={!isOwner || !swap || loading} onClick={() => runAction("执行一次通缩", async () => {
                  if (!swap) return;
                  setLoading(true);
                  const r = await execTx(swap.deflate());
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "执行一次通缩");
                  if (r.success) refreshData();
                }, "确认执行一次通缩？")}>执行一次通缩</Button>
                <div className="rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground flex items-center">
                  分红由 Keeper 自动触发，无需手动执行。
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={refreshData} disabled={loading}>刷新链上状态</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcement">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>公告发布</CardTitle>
              <CardDescription>Owner 在后台发布公告，首页将自动读取最新列表</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="公告标题"
                  aria-label="公告标题"
                />
                <Select value={announcementType} onValueChange={(value) => setAnnouncementType(value as AnnouncementType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="公告类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="公告正文"
                className="min-h-[140px]"
                aria-label="公告正文"
              />

              <Input
                value={announcementToken}
                onChange={(e) => setAnnouncementToken(e.target.value)}
                placeholder="后台发布令牌（可选，对应 ANNOUNCEMENT_ADMIN_TOKEN）"
                type="password"
                aria-label="公告发布令牌"
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={isPublishingAnnouncement}
                  onClick={publishAnnouncement}
                >
                  {isPublishingAnnouncement ? "发布中..." : "发布公告"}
                </Button>
                <Button
                  variant="outline"
                  disabled={isAnnouncementLoading}
                  onClick={loadAnnouncements}
                >
                  刷新公告
                </Button>
              </div>

              <div className="rounded-md border border-border/60">
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/60">最近公告</div>
                {announcements.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">暂无公告</p>
                ) : (
                  <div className="max-h-72 overflow-auto">
                    {announcements.map((item) => (
                      <div key={item.id} className="px-3 py-3 border-b border-border/40 last:border-b-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground shrink-0">{item.date}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{item.type}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
}

export function AdminPage(props: any) {
  // ...existing code...
}
