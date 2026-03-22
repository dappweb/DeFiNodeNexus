"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Layers, TrendingUp, ShoppingCart, Check, Crown } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/components/language-provider";
import { useWeb3 } from "@/lib/web3-provider";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function NftbDividendTracking() {
  const nodes = MOCK_USER_DATA.nftbNodes;
  const tiers = MOCK_USER_DATA.nftbTiers;
  const { t } = useLanguage();
  const { isConnected } = useWeb3();
  const { toast } = useToast();

  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"USDT" | "TOF">("USDT");
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleBuyClick = () => {
    if (!isConnected) {
      toast({ title: t('connectWalletFirst'), variant: "destructive" });
      return;
    }
    setSelectedTier(null);
    setPaymentMethod("USDT");
    setBuyDialogOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (selectedTier === null) return;
    setIsPurchasing(true);
    setTimeout(() => {
      setIsPurchasing(false);
      setBuyDialogOpen(false);
      toast({
        title: t('purchaseSuccess'),
        description: t('nftbPurchaseSuccessDesc').replace('{tier}', tiers[selectedTier].tier),
      });
    }, 2000);
  };

  const tierColors = [
    "border-orange-500/30 hover:border-orange-500/60 bg-orange-500/5",
    "border-slate-400/30 hover:border-slate-400/60 bg-slate-400/5",
    "border-yellow-500/30 hover:border-yellow-500/60 bg-yellow-500/5",
  ];
  const tierSelectedColors = [
    "border-orange-500 bg-orange-500/15 ring-2 ring-orange-500/30",
    "border-slate-400 bg-slate-400/15 ring-2 ring-slate-400/30",
    "border-yellow-500 bg-yellow-500/15 ring-2 ring-yellow-500/30",
  ];

  return (
    <>
      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-accent" />
            <CardTitle>{t('nftbTracking')}</CardTitle>
          </div>
          <Button size="sm" variant="default" className="text-xs bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleBuyClick}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t('buyNftbNode')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {nodes.map((node) => (
              <div key={node.nodeId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded border border-white/5">{node.nodeId}</span>
                    <span className="text-xs text-muted-foreground">{t('level')} {node.level} • {t('weight')} {node.weight}x • {t('dividendShare')} {node.dividendShare}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-accent">
                    <TrendingUp size={14} />
                    <span>{t('growing')}</span>
                  </div>
                </div>
                
                <div className="rounded-lg border border-border/30 bg-muted/20 overflow-hidden">
                  <ScrollArea className="h-32">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="border-border/30 hover:bg-transparent">
                          <TableHead className="h-8 text-[10px] uppercase font-bold">{t('date')}</TableHead>
                          <TableHead className="h-8 text-[10px] uppercase font-bold">{t('totReward')}</TableHead>
                          <TableHead className="h-8 text-[10px] uppercase font-bold">{t('usdtReward')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {node.historicalDividends.map((div, i) => (
                          <TableRow key={i} className="border-border/20">
                            <TableCell className="py-2 text-xs">{div.date}</TableCell>
                            <TableCell className="py-2 text-xs font-medium">{div.totAmount} TOT</TableCell>
                            <TableCell className="py-2 text-xs font-medium">${div.usdtAmount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Purchase NFTB Dialog */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent" />
              {t('purchaseNftbTitle')}
            </DialogTitle>
            <DialogDescription>{t('purchaseNftbDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">{t('dividendSource')}</p>
              <p className="text-xs text-muted-foreground">• {t('projectWalletShare')}</p>
              <p className="text-xs text-muted-foreground">• {t('allDividendsInTot')}</p>
              <p className="text-xs text-muted-foreground">• {t('distributionThreshold')}</p>
            </div>

            <p className="text-sm font-medium text-muted-foreground">{t('selectTier')}</p>
            <div className="grid gap-3">
              {tiers.map((tier, idx) => (
                <button
                  key={tier.tier}
                  onClick={() => setSelectedTier(idx)}
                  className={`relative w-full text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                    selectedTier === idx ? tierSelectedColors[idx] : tierColors[idx]
                  }`}
                >
                  {selectedTier === idx && (
                    <div className="absolute top-3 right-3">
                      <Check className="h-5 w-5 text-accent" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-headline font-bold text-base">{tier.tier} <span className="text-xs font-normal text-muted-foreground">({tier.nameZh})</span></span>
                    <span className="font-bold text-lg">${tier.price.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{tier.currency}</span></span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{tier.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Crown size={14} className="text-accent" />
                      {t('tierLevel')}: {tier.level}
                    </span>
                    <span>{t('tierWeight')}: {tier.weight}x</span>
                    <span>{t('maxSupply')}: {tier.maxSupply}</span>
                    <span>{t('dividendShare')}: {tier.dividendShare}%</span>
                    <span>{t('usdtQuotaRemaining')}: {tier.usdtQuota}</span>
                    <span>{t('tofQuotaRemaining')}: {tier.tofQuota}</span>
                    <span>{t('predictionFlow')}: {tier.predictionFlow}%</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('selectPayment')}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === "USDT" ? "default" : "outline"}
                  className={paymentMethod === "USDT" ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
                  onClick={() => setPaymentMethod("USDT")}
                >
                  {t('payWithUsdt')}
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "TOF" ? "default" : "outline"}
                  className={paymentMethod === "TOF" ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
                  onClick={() => setPaymentMethod("TOF")}
                >
                  {t('payWithTof')}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">{t('feesDividend')}: L1 20% / L2 30% / L3 40%</p>
              <p className="text-xs text-muted-foreground">{t('profitTaxDividend')}: L1 20% / L2 30% / L3 40%</p>
              <p className="text-xs text-muted-foreground">{t('predictionDividend')}: 0.4% / 0.5% / 0.6%</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleConfirmPurchase}
              disabled={selectedTier === null || isPurchasing}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isPurchasing ? t('purchasing') : t('confirmPurchase')}
              {selectedTier !== null && !isPurchasing && (
                <span className="ml-2 text-xs opacity-80">
                  ${tiers[selectedTier].price.toLocaleString()} • {paymentMethod}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
