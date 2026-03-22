"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Cpu, Activity, Coins, ShoppingCart, Check, Zap } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
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

export function NftaNodeManager() {
  const nodes = MOCK_USER_DATA.nftaNodes;
  const tiers = MOCK_USER_DATA.nftaTiers;
  const { t } = useLanguage();
  const { isConnected } = useWeb3();
  const { toast } = useToast();

  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleBuyClick = () => {
    if (!isConnected) {
      toast({ title: t('connectWalletFirst'), variant: "destructive" });
      return;
    }
    setSelectedTier(null);
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
        description: t('nftaPurchaseSuccessDesc').replace('{tier}', tiers[selectedTier].tier),
      });
    }, 2000);
  };

  const tierColors = [
    "border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5",
    "border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5",
    "border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5",
  ];
  const tierSelectedColors = [
    "border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30",
    "border-purple-500 bg-purple-500/15 ring-2 ring-purple-500/30",
    "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30",
  ];

  return (
    <>
      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="text-primary" />
            <CardTitle>{t('nftaManager')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="default" className="text-xs bg-primary hover:bg-primary/90" onClick={handleBuyClick}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              {t('buyNftaNode')}
            </Button>
            <Button size="sm" variant="outline" className="text-xs border-primary/20 hover:border-primary">
              <Coins className="mr-2 h-4 w-4" />
              {t('withdrawAll')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>{t('nodeId')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('dailyYield')} (TOT)</TableHead>
                <TableHead>{t('uptime')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node) => (
                <TableRow key={node.nodeId} className="border-border/50 group">
                  <TableCell className="font-mono text-xs">{node.nodeId}</TableCell>
                  <TableCell>
                    <Badge variant={node.status === "Active" ? "default" : "secondary"} className={node.status === "Active" ? "bg-accent/20 text-accent border-accent/30" : ""}>
                      {node.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{node.yieldPerDay} TOT</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Activity size={14} className={node.status === "Active" ? "text-accent" : "text-muted-foreground"} />
                      {node.uptime}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-primary">
                      <Download size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-[10px] text-muted-foreground mt-4 text-center italic">
            {t('withdrawalDisclaimer')}
          </p>
        </CardContent>
      </Card>

      {/* Purchase NFTA Dialog */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              {t('purchaseNftaTitle')}
            </DialogTitle>
            <DialogDescription>{t('purchaseNftaDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
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
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-headline font-bold text-base">{tier.tier}</span>
                    <span className="font-bold text-lg">${tier.price.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{tier.currency}</span></span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{tier.description}</p>
                  <div className="flex items-center gap-1 text-sm text-accent font-medium">
                    <Zap size={14} />
                    <span>{tier.dailyYield} TOT {t('perDay')}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleConfirmPurchase}
              disabled={selectedTier === null || isPurchasing}
              className="bg-primary"
            >
              {isPurchasing ? t('purchasing') : t('confirmPurchase')}
              {selectedTier !== null && !isPurchasing && (
                <span className="ml-2 text-xs opacity-80">
                  ${tiers[selectedTier].price.toLocaleString()}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
