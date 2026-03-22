"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Cpu, Activity, Coins, ShoppingCart, Check, Zap, Layers, TrendingUp, Crown, ClipboardList, DollarSign, BarChart3, Calendar } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";
import { useWeb3 } from "@/lib/web3-provider";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard/stat-card";

export function NodesPage() {
  const { t } = useLanguage();
  const { isConnected } = useWeb3();
  const { toast } = useToast();

  const [selectedNftaTier, setSelectedNftaTier] = useState<number | null>(null);
  const [selectedNftbTier, setSelectedNftbTier] = useState<number | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [recordFilter, setRecordFilter] = useState<"all" | "NFTA" | "NFTB">("all");

  const { nftaNodes, nftbNodes, nftaTiers, nftbTiers, purchaseRecords } = MOCK_USER_DATA;

  // Computed stats
  const totalDailyYield = nftaNodes.reduce((sum, n) => sum + n.yieldPerDay, 0);
  const totalInvested = purchaseRecords.reduce((sum, r) => sum + r.price, 0);
  const filteredRecords = useMemo(() =>
    recordFilter === "all" ? purchaseRecords : purchaseRecords.filter(r => r.type === recordFilter),
    [recordFilter, purchaseRecords]
  );

  const confirmPurchase = (type: "nfta" | "nftb") => {
    if (!isConnected) {
      toast({ title: t('connectWalletFirst'), variant: "destructive" });
      return;
    }
    const tier = type === "nfta" ? selectedNftaTier : selectedNftbTier;
    if (tier === null) return;
    setIsPurchasing(true);
    const tiers = type === "nfta" ? nftaTiers : nftbTiers;
    setTimeout(() => {
      setIsPurchasing(false);
      if (type === "nfta") setSelectedNftaTier(null); else setSelectedNftbTier(null);
      toast({
        title: t('purchaseSuccess'),
        description: (type === "nfta" ? t('nftaPurchaseSuccessDesc') : t('nftbPurchaseSuccessDesc')).replace('{tier}', tiers[tier].tier),
      });
    }, 2000);
  };

  const nftaTierColors = [
    "border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5",
    "border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5",
    "border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5",
  ];
  const nftaTierSelected = [
    "border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30",
    "border-purple-500 bg-purple-500/15 ring-2 ring-purple-500/30",
    "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30",
  ];
  const nftbTierColors = [
    "border-orange-500/30 hover:border-orange-500/60 bg-orange-500/5",
    "border-slate-400/30 hover:border-slate-400/60 bg-slate-400/5",
    "border-yellow-500/30 hover:border-yellow-500/60 bg-yellow-500/5",
  ];
  const nftbTierSelected = [
    "border-orange-500 bg-orange-500/15 ring-2 ring-orange-500/30",
    "border-slate-400 bg-slate-400/15 ring-2 ring-slate-400/30",
    "border-yellow-500 bg-yellow-500/15 ring-2 ring-yellow-500/30",
  ];

  return (
    <div className="space-y-6 overflow-hidden">
      {/* ===== 1. Stats Overview Cards ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard title={t('totalNftaNodes')} value={nftaNodes.length} icon={Cpu} description={`${nftaNodes.filter(n => n.status === "Active").length} active`} />
        <StatCard title={t('totalNftbNodes')} value={nftbNodes.length} icon={Layers} description={`${nftbNodes.reduce((s, n) => s + n.historicalDividends.length, 0)} dividends`} />
        <StatCard title={t('totalDailyYield')} value={`${totalDailyYield.toFixed(1)} TOT`} icon={Zap} trend={{ value: "12.5%", positive: true }} />
        <StatCard title={t('totalInvested')} value={`$${totalInvested.toLocaleString()}`} icon={DollarSign} />
      </div>

      {/* ===== Main Tabs ===== */}
      <Tabs defaultValue="nfta" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="nfta">NFTA</TabsTrigger>
          <TabsTrigger value="nftb">NFTB</TabsTrigger>
          <TabsTrigger value="records">{t('purchaseRecords')}</TabsTrigger>
        </TabsList>

        {/* ===== 2. NFTA Tab — Inline Tier Purchase + Card-based Nodes ===== */}
        <TabsContent value="nfta" className="space-y-6">
          {/* Inline Tier Purchase Cards */}
          <Card className="glass-panel">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t('buyNftaNode')}</CardTitle>
              </div>
              <CardDescription>{t('purchaseNftaDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {nftaTiers.map((tier, idx) => (
                  <button key={tier.tier} onClick={() => setSelectedNftaTier(selectedNftaTier === idx ? null : idx)}
                    className={`relative text-left rounded-xl border p-5 transition-all duration-200 cursor-pointer ${selectedNftaTier === idx ? nftaTierSelected[idx] : nftaTierColors[idx]}`}>
                    {selectedNftaTier === idx && <div className="absolute top-3 right-3"><Check className="h-5 w-5 text-primary" /></div>}
                    <span className="font-headline font-bold text-lg block mb-1">{tier.tier}</span>
                    <p className="text-xs text-muted-foreground mb-3">{tier.description}</p>
                    <div className="font-bold text-xl mb-2">${tier.price.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{tier.currency}</span></div>
                    <div className="flex items-center gap-1 text-sm text-accent font-medium"><Zap size={14} /><span>{tier.dailyYield} TOT {t('perDay')}</span></div>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => confirmPurchase("nfta")} disabled={selectedNftaTier === null || isPurchasing} className="bg-primary px-6">
                  {isPurchasing ? t('purchasing') : t('confirmPurchase')}
                  {selectedNftaTier !== null && !isPurchasing && <span className="ml-2 text-xs opacity-80">${nftaTiers[selectedNftaTier].price.toLocaleString()}</span>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* NFTA Node Cards */}
          <Card className="glass-panel">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="text-primary" />
                <CardTitle>{t('nftaManager')}</CardTitle>
              </div>
              <Button size="sm" variant="outline" className="text-xs border-primary/20 hover:border-primary">
                <Coins className="mr-2 h-4 w-4" />
                {t('withdrawAll')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nftaNodes.map((node) => (
                  <div key={node.nodeId} className="rounded-xl border border-border/50 p-5 bg-muted/10 hover:border-primary/40 transition-all group relative">
                    {/* Status indicator dot */}
                    <div className={`absolute top-4 right-4 h-2.5 w-2.5 rounded-full ${node.status === "Active" ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-sm font-bold">{node.nodeId}</span>
                      <Badge variant="outline" className="text-[10px]">{node.tier}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-medium">{t('status')}</p>
                        <Badge variant={node.status === "Active" ? "default" : "secondary"}
                          className={node.status === "Active" ? "bg-accent/20 text-accent border-accent/30 text-xs" : "text-xs"}>
                          {node.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-medium">{t('dailyYield')}</p>
                        <p className="font-bold text-accent">{node.yieldPerDay} <span className="text-xs font-normal">TOT</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-medium">{t('uptime')}</p>
                        <div className="flex items-center gap-1">
                          <Activity size={12} className={node.status === "Active" ? "text-accent" : "text-muted-foreground"} />
                          <span className="text-sm">{node.uptime}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-medium">{t('startDate')}</p>
                        <p className="text-sm">{node.startDate}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/30 flex justify-end">
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-primary gap-1">
                        <Download size={14} />
                        {t('withdrawAll')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 text-center italic">{t('withdrawalDisclaimer')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 3. NFTB Tab — Inline Tier Purchase + Enhanced Dividends ===== */}
        <TabsContent value="nftb" className="space-y-6">
          {/* Inline Tier Purchase Cards */}
          <Card className="glass-panel">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-accent" />
                <CardTitle className="text-base">{t('buyNftbNode')}</CardTitle>
              </div>
              <CardDescription>{t('purchaseNftbDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {nftbTiers.map((tier, idx) => (
                  <button key={tier.tier} onClick={() => setSelectedNftbTier(selectedNftbTier === idx ? null : idx)}
                    className={`relative text-left rounded-xl border p-5 transition-all duration-200 cursor-pointer ${selectedNftbTier === idx ? nftbTierSelected[idx] : nftbTierColors[idx]}`}>
                    {selectedNftbTier === idx && <div className="absolute top-3 right-3"><Check className="h-5 w-5 text-accent" /></div>}
                    <span className="font-headline font-bold text-lg block mb-1">{tier.tier}</span>
                    <p className="text-xs text-muted-foreground mb-3">{tier.description}</p>
                    <div className="font-bold text-xl mb-2">${tier.price.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{tier.currency}</span></div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground"><Crown size={14} className="text-accent" />{t('tierLevel')}: {tier.level}</span>
                      <span className="text-muted-foreground">{t('tierWeight')}: {tier.weight}x</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => confirmPurchase("nftb")} disabled={selectedNftbTier === null || isPurchasing} className="bg-accent text-accent-foreground hover:bg-accent/90 px-6">
                  {isPurchasing ? t('purchasing') : t('confirmPurchase')}
                  {selectedNftbTier !== null && !isPurchasing && <span className="ml-2 text-xs opacity-80">${nftbTiers[selectedNftbTier].price.toLocaleString()}</span>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* NFTB Nodes with Enhanced Dividends */}
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="text-accent" />
                <CardTitle>{t('nftbTracking')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {nftbNodes.map((node) => {
                  const cumulativeTot = node.historicalDividends.reduce((s, d) => s + d.totAmount, 0);
                  const cumulativeUsdt = node.historicalDividends.reduce((s, d) => s + d.usdtAmount, 0);
                  const latest = node.historicalDividends[0];
                  return (
                    <div key={node.nodeId} className="rounded-xl border border-border/50 p-5 bg-muted/10 space-y-4">
                      {/* Node header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded border border-white/5">{node.nodeId}</span>
                          <Badge variant="outline" className="text-xs">{node.tier}</Badge>
                          <span className="text-xs text-muted-foreground">{t('level')} {node.level} • {t('weight')} {node.weight}x</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-accent">
                          <TrendingUp size={14} />
                          <span>{t('growing')}</span>
                        </div>
                      </div>

                      {/* Cumulative stats + latest dividend highlight */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                          <p className="text-[10px] uppercase text-muted-foreground font-medium">{t('cumulativeDividends')}</p>
                          <p className="font-bold text-lg">{cumulativeTot.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">TOT</span></p>
                          <p className="text-xs text-muted-foreground">${cumulativeUsdt.toFixed(2)}</p>
                        </div>
                        {latest && (
                          <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
                            <p className="text-[10px] uppercase text-muted-foreground font-medium">{t('latestDividend')}</p>
                            <p className="font-bold text-lg text-accent">{latest.totAmount} <span className="text-xs font-normal text-muted-foreground">TOT</span></p>
                            <p className="text-xs text-muted-foreground">{latest.date}</p>
                          </div>
                        )}
                        <div className="rounded-lg bg-muted/30 border border-border/30 p-3">
                          <p className="text-[10px] uppercase text-muted-foreground font-medium">{t('purchaseRecords')}</p>
                          <p className="font-bold text-lg">{node.historicalDividends.length}</p>
                          <p className="text-xs text-muted-foreground">{t('totalDailyYield')}</p>
                        </div>
                      </div>

                      {/* Dividend history table */}
                      <div className="rounded-lg border border-border/30 bg-muted/20 overflow-hidden">
                        <ScrollArea className="h-48">
                          <Table>
                            <TableHeader className="bg-muted/50 sticky top-0">
                              <TableRow className="border-border/30 hover:bg-transparent">
                                <TableHead className="h-8 text-[10px] uppercase font-bold">{t('date')}</TableHead>
                                <TableHead className="h-8 text-[10px] uppercase font-bold">{t('totReward')}</TableHead>
                                <TableHead className="h-8 text-[10px] uppercase font-bold">{t('usdtReward')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {node.historicalDividends.map((div, i) => (
                                <TableRow key={i} className={`border-border/20 ${i === 0 ? "bg-accent/5" : ""}`}>
                                  <TableCell className="py-2 text-xs">{div.date}</TableCell>
                                  <TableCell className={`py-2 text-xs font-medium ${i === 0 ? "text-accent" : ""}`}>{div.totAmount} TOT</TableCell>
                                  <TableCell className="py-2 text-xs font-medium">${div.usdtAmount}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 5. Purchase Records Tab — with Filter ===== */}
        <TabsContent value="records">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="text-primary" />
                <CardTitle>{t('purchaseRecords')}</CardTitle>
              </div>
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                {(["all", "NFTA", "NFTB"] as const).map((f) => (
                  <Button key={f} size="sm" variant={recordFilter === f ? "default" : "ghost"}
                    className={`text-xs h-7 px-3 ${recordFilter === f ? "" : "text-muted-foreground"}`}
                    onClick={() => setRecordFilter(f)}>
                    {f === "all" ? t('filterAll') : f}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile card layout */}
              <div className="space-y-3 md:hidden">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="rounded-lg border border-border/50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={record.type === "NFTA" ? "default" : "secondary"} className={record.type === "NFTA" ? "bg-primary/20 text-primary border-primary/30" : "bg-accent/20 text-accent border-accent/30"}>
                          {record.type}
                        </Badge>
                        <span className="text-sm font-medium">{record.tier}</span>
                      </div>
                      <Badge className="bg-green-500/15 text-green-500 border-green-500/30">{t('completed')}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 text-sm">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">{t('amount')}</p>
                        <p className="font-medium">${record.price.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">{t('nodeId')}</p>
                        <p className="font-mono text-xs">{record.nodeId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">{t('txId')}</p>
                        <p className="font-mono text-xs">{record.id}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">{t('date')}</p>
                        <p className="text-xs">{record.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredRecords.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No records found</p>
                )}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>{t('txId')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('tier')}</TableHead>
                      <TableHead>{t('amount')}</TableHead>
                      <TableHead>{t('nodeId')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id} className="border-border/50">
                        <TableCell className="font-mono text-xs">{record.id}</TableCell>
                        <TableCell>
                          <Badge variant={record.type === "NFTA" ? "default" : "secondary"} className={record.type === "NFTA" ? "bg-primary/20 text-primary border-primary/30" : "bg-accent/20 text-accent border-accent/30"}>
                            {record.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{record.tier}</TableCell>
                        <TableCell className="font-medium">${record.price.toLocaleString()} {record.currency}</TableCell>
                        <TableCell className="font-mono text-xs">{record.nodeId}</TableCell>
                        <TableCell className="text-xs">{record.date}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/15 text-green-500 border-green-500/30">{t('completed')}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
