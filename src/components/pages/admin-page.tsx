"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings, ShieldCheck, Activity, Wallet } from "lucide-react";
import { useWeb3 } from "@/lib/web3-provider";
import { useNexusContract, useSwapContract, execTx } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";

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

  const toUnits = (value: string) => ethers.parseUnits(value || "0", 18);

  const notifyTx = (ok: boolean, hash?: string, error?: string) => {
    if (ok) {
      toast({ title: "交易成功", description: hash ? `${hash.slice(0, 10)}...` : "已上链" });
    } else {
      toast({ title: "交易失败", description: error || "未知错误", variant: "destructive" });
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">TOT Reserve</div><div className="text-lg font-semibold">{Number(swapTotReserve).toLocaleString()}</div></CardContent></Card>
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">USDT Reserve</div><div className="text-lg font-semibold">{Number(swapUsdtReserve).toLocaleString()}</div></CardContent></Card>
        <Card className="glass-panel"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">NFTB 分红池(TOT)</div><div className="text-lg font-semibold">{Number(swapDividendPool).toLocaleString()}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="nexus" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="nexus" className="text-xs gap-1"><Settings size={14} /><span>Nexus</span></TabsTrigger>
          <TabsTrigger value="tiers" className="text-xs gap-1"><ShieldCheck size={14} /><span>Tiers</span></TabsTrigger>
          <TabsTrigger value="swap" className="text-xs gap-1"><Wallet size={14} /><span>Swap</span></TabsTrigger>
          <TabsTrigger value="ops" className="text-xs gap-1"><Activity size={14} /><span>Ops</span></TabsTrigger>
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
                <Button disabled={!isOwner || !nexus || loading} onClick={async () => {
                  if (!nexus) return;
                  setLoading(true);
                  const r = await execTx(nexus.setTreasury(treasury));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error);
                  refreshData();
                }}>设置 Treasury</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={zeroLine} onChange={(e) => setZeroLine(e.target.value)} placeholder="0号线钱包" />
                <Input value={community} onChange={(e) => setCommunity(e.target.value)} placeholder="社区建设钱包" />
                <Input value={foundation} onChange={(e) => setFoundation(e.target.value)} placeholder="基金会钱包" />
                <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="机构钱包" />
              </div>
              <Button disabled={!isOwner || !nexus || loading} onClick={async () => {
                if (!nexus) return;
                setLoading(true);
                const r = await execTx(nexus.setWallets(zeroLine, community, foundation, institution));
                setLoading(false);
                notifyTx(r.success, r.hash, r.error);
                refreshData();
              }}>设置 4 钱包</Button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={tofBurnBps} onChange={(e) => setTofBurnBps(e.target.value)} placeholder="TOF burn bps" type="number" />
                <Input value={tofClaimFeeBps} onChange={(e) => setTofClaimFeeBps(e.target.value)} placeholder="TOF claim bps" type="number" />
                <Button disabled={!isOwner || !nexus || loading} onClick={async () => {
                  if (!nexus) return;
                  setLoading(true);
                  const r1 = await execTx(nexus.setTofBurnBps(BigInt(tofBurnBps || "0")));
                  if (!r1.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r1.error);
                    return;
                  }
                  const r2 = await execTx(nexus.setTofClaimFeeBps(BigInt(tofClaimFeeBps || "0")));
                  setLoading(false);
                  notifyTx(r2.success, r2.hash, r2.error);
                  refreshData();
                }}>更新 TOF 参数</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={withdrawLevel} onChange={(e) => setWithdrawLevel(e.target.value)} placeholder="level 0-5" type="number" />
                <Input value={withdrawFeeBps} onChange={(e) => setWithdrawFeeBps(e.target.value)} placeholder="withdraw fee bps" type="number" />
                <Button disabled={!isOwner || !nexus || loading} onClick={async () => {
                  if (!nexus) return;
                  setLoading(true);
                  const r = await execTx(nexus.setWithdrawFeeBps(Number(withdrawLevel || "0"), BigInt(withdrawFeeBps || "0")));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error);
                }}>设置提现费率</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={distributorAddr} onChange={(e) => setDistributorAddr(e.target.value)} placeholder="Distributor address" />
                <div className="flex items-center gap-2 px-2"><Switch checked={distributorStatus} onCheckedChange={setDistributorStatus} /><span className="text-sm">{distributorStatus ? "授权" : "取消授权"}</span></div>
                <Button disabled={!isOwner || !nexus || loading} onClick={async () => {
                  if (!nexus) return;
                  setLoading(true);
                  const r = await execTx(nexus.setDistributor(distributorAddr, distributorStatus));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error);
                }}>设置 Distributor</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>NFTA Tier 配置</CardTitle>
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
              <Button disabled={!isOwner || !nexus || loading} onClick={async () => {
                if (!nexus) return;
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
                notifyTx(r.success, r.hash, r.error);
              }}>保存 NFTA Tier</Button>
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
                <Input value={swapBuyFeeBps} onChange={(e) => setSwapBuyFeeBps(e.target.value)} placeholder="buyFeeBps" type="number" />
                <Input value={swapSellFeeBps} onChange={(e) => setSwapSellFeeBps(e.target.value)} placeholder="sellFeeBps" type="number" />
                <Input value={swapProfitTaxBps} onChange={(e) => setSwapProfitTaxBps(e.target.value)} placeholder="profitTaxBps" type="number" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={swapDistributionThreshold} onChange={(e) => setSwapDistributionThreshold(e.target.value)} placeholder="distributionThreshold (TOT)" />
                <Input value={swapMaxDailyBuy} onChange={(e) => setSwapMaxDailyBuy(e.target.value)} placeholder="maxDailyBuy (TOT)" />
                <Input value={swapMaxSellBps} onChange={(e) => setSwapMaxSellBps(e.target.value)} placeholder="maxSellBps" type="number" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={swapDeflationBps} onChange={(e) => setSwapDeflationBps(e.target.value)} placeholder="deflationBps" type="number" />
                <Button disabled={!isOwner || !swap || loading} onClick={async () => {
                  if (!swap) return;
                  setLoading(true);
                  const r1 = await execTx(swap.setBuyFeeBps(BigInt(swapBuyFeeBps || "0")));
                  if (!r1.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r1.error);
                    return;
                  }
                  const r2 = await execTx(swap.setSellFeeBps(BigInt(swapSellFeeBps || "0")));
                  if (!r2.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r2.error);
                    return;
                  }
                  const r3 = await execTx(swap.setProfitTaxBps(BigInt(swapProfitTaxBps || "0")));
                  if (!r3.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r3.error);
                    return;
                  }
                  const r4 = await execTx(swap.setDistributionThreshold(toUnits(swapDistributionThreshold)));
                  if (!r4.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r4.error);
                    return;
                  }
                  const r5 = await execTx(swap.setMaxDailyBuy(toUnits(swapMaxDailyBuy)));
                  if (!r5.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r5.error);
                    return;
                  }
                  const r6 = await execTx(swap.setMaxSellBps(BigInt(swapMaxSellBps || "0")));
                  if (!r6.success) {
                    setLoading(false);
                    notifyTx(false, undefined, r6.error);
                    return;
                  }
                  const r7 = await execTx(swap.setDeflationBps(BigInt(swapDeflationBps || "0")));
                  setLoading(false);
                  notifyTx(r7.success, r7.hash, r7.error);
                  refreshData();
                }}>保存 Swap 参数</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={addLpTot} onChange={(e) => setAddLpTot(e.target.value)} placeholder="add TOT amount" />
                <Input value={addLpUsdt} onChange={(e) => setAddLpUsdt(e.target.value)} placeholder="add USDT amount" />
                <Button disabled={!isOwner || !swap || loading} onClick={async () => {
                  if (!swap) return;
                  setLoading(true);
                  const r = await execTx(swap.addLiquidity(toUnits(addLpTot), toUnits(addLpUsdt)));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error);
                  refreshData();
                }}>注入流动性</Button>
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
                <Button disabled={!isOwner || !nexus || loading} onClick={async () => {
                  if (!nexus) return;
                  setLoading(true);
                  const r = await execTx(nexus.fundRewardPool(toUnits(rewardFundAmount)));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error);
                }}>注入奖励池</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={dividendAmount} onChange={(e) => setDividendAmount(e.target.value)} placeholder="distributeNftbDividends TOT amount" />
                <Button disabled={!isOwner || !nexus || loading} onClick={async () => {
                  if (!nexus) return;
                  setLoading(true);
                  const r = await execTx(nexus.distributeNftbDividends(toUnits(dividendAmount)));
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error);
                }}>手动分红 NFTB</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button disabled={!isOwner || !swap || loading} onClick={async () => {
                  if (!swap) return;
                  setLoading(true);
                  const r = await execTx(swap.deflate());
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error);
                  refreshData();
                }}>执行一次通缩</Button>
                <Button disabled={!isOwner || !swap || loading} onClick={async () => {
                  if (!swap) return;
                  setLoading(true);
                  const r = await execTx(swap.forceDistribute());
                  setLoading(false);
                  notifyTx(r.success, r.hash, r.error);
                  refreshData();
                }}>强制分红（Swap池）</Button>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={refreshData} disabled={loading}>刷新链上状态</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
