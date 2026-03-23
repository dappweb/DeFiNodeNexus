"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

export function AdminPage() {
  const { address } = useWeb3();
  const nexus = useNexusContract();
  const swap = useSwapContract();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  const [treasury, setTreasury] = useState("");
  const [zeroLine, setZeroLine] = useState("");
  const [community, setCommunity] = useState("");
  const [foundation, setFoundation] = useState("");
  const [institution, setInstitution] = useState("");

  const [tofBurnBps, setTofBurnBps] = useState("");
  const [tofClaimFeeBps, setTofClaimFeeBps] = useState("");
  const [withdrawLevel, setWithdrawLevel] = useState("0");
  const [withdrawFeeBps, setWithdrawFeeBps] = useState("");

  const [nftaTierId, setNftaTierId] = useState("0");
  const [nftaPrice, setNftaPrice] = useState("");
  const [nftaYield, setNftaYield] = useState("");
  const [nftaSupply, setNftaSupply] = useState("");
  const [nftaActive, setNftaActive] = useState(true);

  const [rewardFundAmount, setRewardFundAmount] = useState("");
  const [dividendAmount, setDividendAmount] = useState("");

  const [distributorAddr, setDistributorAddr] = useState("");
  const [distributorStatus, setDistributorStatus] = useState(true);

  const [swapTotReserve, setSwapTotReserve] = useState("-");
  const [swapUsdtReserve, setSwapUsdtReserve] = useState("-");
  const [swapDividendPool, setSwapDividendPool] = useState("-");
  const [swapBuyFeeBps, setSwapBuyFeeBps] = useState("");
  const [swapSellFeeBps, setSwapSellFeeBps] = useState("");
  const [swapProfitTaxBps, setSwapProfitTaxBps] = useState("");
  const [swapDistributionThreshold, setSwapDistributionThreshold] = useState("");
  const [swapMaxDailyBuy, setSwapMaxDailyBuy] = useState("");
  const [swapMaxSellBps, setSwapMaxSellBps] = useState("");
  const [swapDeflationBps, setSwapDeflationBps] = useState("");
  const [addLpTot, setAddLpTot] = useState("");
  const [addLpUsdt, setAddLpUsdt] = useState("");
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
    if (!isOwner) {
      toast({ title: "无权限", description: "仅 Owner 可发布公告", variant: "destructive" });
      return;
    }

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

      if (swap) {
        const [totR, usdtR, pool, b, s, p, th, dBuy, mSell, def] = await Promise.all([
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
          <h2 className="text-xl font-headline font-bold">Owner 管理员面板</h2>
          <p className="text-xs text-muted-foreground">Owner: {ownerAddress ? `${ownerAddress.slice(0, 10)}...${ownerAddress.slice(-6)}` : "-"}</p>
          <p className={`text-xs ${isOwner ? "text-green-500" : "text-yellow-500"}`}>
            {isOwner ? "当前钱包是 Owner，可执行管理操作" : "当前钱包不是 Owner，仅可查看"}
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

      <Tabs defaultValue="nexus" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="nexus" className="text-xs gap-1"><Settings size={14} /><span>Nexus</span></TabsTrigger>
          <TabsTrigger value="tiers" className="text-xs gap-1"><ShieldCheck size={14} /><span>Tiers</span></TabsTrigger>
          <TabsTrigger value="swap" className="text-xs gap-1"><Wallet size={14} /><span>Swap</span></TabsTrigger>
          <TabsTrigger value="ops" className="text-xs gap-1"><Activity size={14} /><span>Ops</span></TabsTrigger>
          <TabsTrigger value="announcement" className="text-xs gap-1"><span>公告</span></TabsTrigger>
        </TabsList>

        <TabsContent value="nexus">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Nexus 基础设置</CardTitle>
              <CardDescription>项目钱包、手续费和授权分发者</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={treasury} onChange={(e) => setTreasury(e.target.value)} placeholder="Treasury address" />
                <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("设置 Treasury", async () => {
                  if (!nexus) return;
                  if (!validateAddressField("Treasury", treasury)) return;
                  setLoading(true);
                  const r = await execTx(nexus.setTreasury(treasury));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "设置 Treasury");
                  if (r.success) refreshData();
                }, `确认将 Treasury 更新为\n${treasury} ?`)}>设置 Treasury</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={zeroLine} onChange={(e) => setZeroLine(e.target.value)} placeholder="0号线钱包" />
                <Input value={community} onChange={(e) => setCommunity(e.target.value)} placeholder="社区建设钱包" />
                <Input value={foundation} onChange={(e) => setFoundation(e.target.value)} placeholder="基金会钱包" />
                <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="机构钱包" />
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
                <Input value={tofBurnBps} onChange={(e) => setTofBurnBps(e.target.value)} placeholder="TOF burn bps" type="number" />
                <Input value={tofClaimFeeBps} onChange={(e) => setTofClaimFeeBps(e.target.value)} placeholder="TOF claim bps" type="number" />
                <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("更新 TOF 参数", async () => {
                  if (!nexus) return;
                  if (!validateBpsField("TOF burn bps", tofBurnBps)) return;
                  if (!validateBpsField("TOF claim bps", tofClaimFeeBps)) return;
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
                }, "确认更新 TOF 销毁比例与领取手续费比例？")}>更新 TOF 参数</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={withdrawLevel} onChange={(e) => setWithdrawLevel(e.target.value)} placeholder="level 0-5" type="number" />
                <Input value={withdrawFeeBps} onChange={(e) => setWithdrawFeeBps(e.target.value)} placeholder="withdraw fee bps" type="number" />
                <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("设置提现费率", async () => {
                  if (!nexus) return;
                  const level = Number(withdrawLevel || "0");
                  if (!Number.isInteger(level) || level < 0 || level > 5) {
                    toast({ title: "参数无效", description: "level 必须在 0-5", variant: "destructive" });
                    pushOperationLog("设置提现费率", "error", "level 越界");
                    return;
                  }
                  if (!validateBpsField("withdraw fee bps", withdrawFeeBps)) return;
                  setLoading(true);
                  const r = await execTx(nexus.setWithdrawFeeBps(level, BigInt(withdrawFeeBps || "0")));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "设置提现费率");
                }, "确认更新对应等级的提现费率？")}>设置提现费率</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={distributorAddr} onChange={(e) => setDistributorAddr(e.target.value)} placeholder="Distributor address" />
                <div className="flex items-center gap-2 px-2"><Switch checked={distributorStatus} onCheckedChange={setDistributorStatus} /><span className="text-sm">{distributorStatus ? "授权" : "取消授权"}</span></div>
                <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("设置 Distributor", async () => {
                  if (!nexus) return;
                  if (!validateAddressField("Distributor", distributorAddr)) return;
                  setLoading(true);
                  const r = await execTx(nexus.setDistributor(distributorAddr, distributorStatus));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "设置 Distributor");
                }, `确认${distributorStatus ? "授权" : "取消授权"} Distributor?`)}>设置 Distributor</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>NFT-A Tier 配置</CardTitle>
              <CardDescription>创建或更新卡牌档位（tierId=0 代表新增）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Input value={nftaTierId} onChange={(e) => setNftaTierId(e.target.value)} placeholder="tierId" type="number" />
                <Input value={nftaPrice} onChange={(e) => setNftaPrice(e.target.value)} placeholder="price (18 decimals)" />
                <Input value={nftaYield} onChange={(e) => setNftaYield(e.target.value)} placeholder="dailyYield (18 decimals)" />
                <Input value={nftaSupply} onChange={(e) => setNftaSupply(e.target.value)} placeholder="maxSupply" type="number" />
                <div className="flex items-center gap-2 px-2"><Switch checked={nftaActive} onCheckedChange={setNftaActive} /><span className="text-sm">{nftaActive ? "启用" : "停用"}</span></div>
              </div>
              <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("保存 NFTA Tier", async () => {
                if (!nexus) return;
                if (!validatePositiveAmount("NFT-A price", nftaPrice)) return;
                if (!validatePositiveAmount("NFT-A dailyYield", nftaYield)) return;
                if (!validatePositiveAmount("NFT-A maxSupply", nftaSupply)) return;
                setLoading(true);
                const r = await execTx(
                  nexus.configureNftaTier(
                    BigInt(nftaTierId || "0"),
                    toUnits(nftaPrice),
                    toUnits(nftaYield),
                    BigInt(nftaSupply || "0"),
                    nftaActive
                  )
                );
                setLoading(false);
                notifyTx(r.success, r.hash, r.error, "保存 NFT-A Tier");
              }, "确认保存 NFT-A 档位配置？")}>保存 NFT-A Tier</Button>

              <div className="rounded-md border border-dashed border-border p-3 space-y-2">
                <p className="text-sm font-medium">NFT-B 档位快速初始化</p>
                <p className="text-xs text-muted-foreground">
                  将按固定参数写入：初级·普通权杖（500）、中级·稀有王冠（1000）、高级·传说神座（2000）；
                  权重 1/2/3、分红 20%/30%/40%、每档 2000 张，状态启用。
                </p>
                <Button
                  variant="secondary"
                  disabled={!isOwner || !nexus || loading}
                  onClick={() => runAction("一键初始化 NFTB 三档", async () => {
                    if (!nexus) return;
                    setLoading(true);

                    const presets = [
                      { tierId: 1n, price: "500", weight: 1n, maxSupply: 2000n, dividendBps: 2000n },
                      { tierId: 2n, price: "1000", weight: 2n, maxSupply: 2000n, dividendBps: 3000n },
                      { tierId: 3n, price: "2000", weight: 3n, maxSupply: 2000n, dividendBps: 4000n },
                    ];

                    for (const preset of presets) {
                      const result = await execTx(
                        nexus.configureNftbTier(
                          preset.tierId,
                          toUnits(preset.price),
                          preset.weight,
                          preset.maxSupply,
                          preset.dividendBps,
                          true
                        )
                      );

                      if (!result.success) {
                        setLoading(false);
                        notifyTx(false, undefined, `Tier ${preset.tierId.toString()} 初始化失败: ${result.error || "未知错误"}`, "一键初始化 NFT-B 三档");
                        return;
                      }
                    }

                    setLoading(false);
                    toast({ title: "初始化成功", description: "NFT-B 三档已完成配置" });
                    pushOperationLog("一键初始化 NFT-B 三档", "success", "Tier 1/2/3 初始化完成");
                    refreshData();
                  }, "确认按预设写入 NFT-B 1/2/3 档位？")}
                >
                  一键初始化 NFT-B 三档
                </Button>
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">买入手续费 (buyFeeBps)</p>
                  <p className="text-[11px] text-muted-foreground">单位 bps，100 = 1%</p>
                  <Input value={swapBuyFeeBps} onChange={(e) => setSwapBuyFeeBps(e.target.value)} placeholder="buyFeeBps" type="number" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">卖出手续费 (sellFeeBps)</p>
                  <p className="text-[11px] text-muted-foreground">单位 bps，500 = 5%</p>
                  <Input value={swapSellFeeBps} onChange={(e) => setSwapSellFeeBps(e.target.value)} placeholder="sellFeeBps" type="number" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">盈利税 (profitTaxBps)</p>
                  <p className="text-[11px] text-muted-foreground">单位 bps，仅对盈利卖出部分生效</p>
                  <Input value={swapProfitTaxBps} onChange={(e) => setSwapProfitTaxBps(e.target.value)} placeholder="profitTaxBps" type="number" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">分红触发阈值 (distributionThreshold)</p>
                  <p className="text-[11px] text-muted-foreground">单位 TOT，达到后触发分红流程</p>
                  <Input value={swapDistributionThreshold} onChange={(e) => setSwapDistributionThreshold(e.target.value)} placeholder="distributionThreshold (TOT)" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">单地址日买入上限 (maxDailyBuy)</p>
                  <p className="text-[11px] text-muted-foreground">单位 TOT</p>
                  <Input value={swapMaxDailyBuy} onChange={(e) => setSwapMaxDailyBuy(e.target.value)} placeholder="maxDailyBuy (TOT)" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">单次卖出上限 (maxSellBps)</p>
                  <p className="text-[11px] text-muted-foreground">单位 bps，基于用户持仓比例限制</p>
                  <Input value={swapMaxSellBps} onChange={(e) => setSwapMaxSellBps(e.target.value)} placeholder="maxSellBps" type="number" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">通缩比例 (deflationBps)</p>
                  <p className="text-[11px] text-muted-foreground">单位 bps，用于定时通缩销毁</p>
                  <Input value={swapDeflationBps} onChange={(e) => setSwapDeflationBps(e.target.value)} placeholder="deflationBps" type="number" />
                </div>
                <Button disabled={!isOwner || !swap || loading} onClick={() => runAction("保存 Swap 参数", async () => {
                  if (!swap) return;
                  if (!validateBpsField("buyFeeBps", swapBuyFeeBps)) return;
                  if (!validateBpsField("sellFeeBps", swapSellFeeBps)) return;
                  if (!validateBpsField("profitTaxBps", swapProfitTaxBps)) return;
                  if (!validateBpsField("maxSellBps", swapMaxSellBps)) return;
                  if (!validateBpsField("deflationBps", swapDeflationBps)) return;
                  if (!validatePositiveAmount("distributionThreshold", swapDistributionThreshold)) return;
                  if (!validatePositiveAmount("maxDailyBuy", swapMaxDailyBuy)) return;

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
                  <Input value={addLpTot} onChange={(e) => setAddLpTot(e.target.value)} placeholder="add TOT amount" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">注入 USDT 数量</p>
                  <p className="text-[11px] text-muted-foreground">与 TOT 按目标池子比例注入</p>
                  <Input value={addLpUsdt} onChange={(e) => setAddLpUsdt(e.target.value)} placeholder="add USDT amount" />
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
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={rewardFundAmount} onChange={(e) => setRewardFundAmount(e.target.value)} placeholder="fundRewardPool TOT amount" />
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
                <Input value={dividendAmount} onChange={(e) => setDividendAmount(e.target.value)} placeholder="distributeNftbDividends TOT amount" />
                <Button disabled={!isOwner || !nexus || loading} onClick={() => runAction("手动分红 NFTB", async () => {
                  if (!nexus) return;
                  if (!validatePositiveAmount("分红金额", dividendAmount)) return;
                  setLoading(true);
                  const r = await execTx(nexus.distributeNftbDividends(toUnits(dividendAmount)));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "手动分红 NFTB");
                }, "确认执行一次 NFTB 分红？")}>手动分红 NFTB</Button>
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
                <Button disabled={!isOwner || !swap || loading} onClick={() => runAction("强制分红（Swap池）", async () => {
                  if (!swap) return;
                  setLoading(true);
                  const r = await execTx(swap.forceDistribute());
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error, "强制分红（Swap池）");
                  if (r.success) refreshData();
                }, "确认强制触发 Swap 池分红？")}>强制分红（Swap池）</Button>
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
              />

              <Input
                value={announcementToken}
                onChange={(e) => setAnnouncementToken(e.target.value)}
                placeholder="后台发布令牌（可选，对应 ANNOUNCEMENT_ADMIN_TOKEN）"
                type="password"
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={!isOwner || isPublishingAnnouncement}
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
    </div>
  );
}
