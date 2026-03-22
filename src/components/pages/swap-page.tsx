"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownUp, Info } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";
import { useWeb3 } from "@/lib/web3-provider";
import { useToast } from "@/hooks/use-toast";

export function SwapPage() {
  const { t } = useLanguage();
  const { isConnected } = useWeb3();
  const { toast } = useToast();

  const tokens = MOCK_USER_DATA.swapTokens;
  // Fixed pair: TOT <-> USDT
  const [fromToken, setFromToken] = useState("USDT");
  const [toToken, setToToken] = useState("TOT");
  const [fromAmount, setFromAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);

  const fromTokenData = tokens.find(tk => tk.symbol === fromToken)!;
  const toTokenData = tokens.find(tk => tk.symbol === toToken)!;

  const rate = fromTokenData.price / toTokenData.price;
  const toAmount = fromAmount ? (parseFloat(fromAmount) * rate).toFixed(6) : "";

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
  };

  const handleSwap = () => {
    if (!isConnected) {
      toast({ title: t('connectWalletFirst'), variant: "destructive" });
      return;
    }
    const amt = parseFloat(fromAmount);
    if (!amt || amt <= 0) return;
    if (amt > fromTokenData.balance) {
      toast({ title: t('insufficientBalance'), variant: "destructive" });
      return;
    }
    setIsSwapping(true);
    setTimeout(() => {
      setIsSwapping(false);
      toast({
        title: t('swapSuccess'),
        description: t('swapSuccessDesc')
          .replace('{fromAmount}', fromAmount)
          .replace('{fromToken}', fromToken)
          .replace('{toAmount}', toAmount)
          .replace('{toToken}', toToken),
      });
      setFromAmount("");
    }, 2000);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            {t('swapTitle')}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t('swapDesc')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t('from')}</span>
              <span className="text-xs text-muted-foreground">{t('balance')}: {fromTokenData.balance.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={t('enterAmount')}
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1 text-lg font-medium"
                min="0"
                step="0.01"
              />
              <div className="flex items-center justify-center w-[100px] rounded-md border border-border bg-muted/30 px-3">
                <span className="font-headline font-bold text-sm">{fromToken}</span>
              </div>
            </div>
            {fromAmount && parseFloat(fromAmount) > fromTokenData.balance && (
              <p className="text-xs text-destructive">{t('insufficientBalance')}</p>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button size="icon" variant="outline" className="rounded-full h-10 w-10 border-primary/30 hover:bg-primary/10" onClick={handleSwapDirection}>
              <ArrowDownUp size={18} className="text-primary" />
            </Button>
          </div>

          {/* To */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t('to')}</span>
              <span className="text-xs text-muted-foreground">{t('balance')}: {toTokenData.balance.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={toAmount}
                readOnly
                placeholder="0.00"
                className="flex-1 text-lg font-medium bg-muted/30"
              />
              <div className="flex items-center justify-center w-[100px] rounded-md border border-border bg-muted/30 px-3">
                <span className="font-headline font-bold text-sm">{toToken}</span>
              </div>
            </div>
          </div>

          {/* Rate Info */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1"><Info size={12} />{t('swapRate')}</span>
              <span className="font-medium">1 {fromToken} = {rate.toFixed(6)} {toToken}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('slippage')}</span>
              <span className="font-medium">0.5%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('swapFee')}</span>
              <span className="font-medium">0.3%</span>
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
            onClick={handleSwap}
            disabled={isSwapping || !fromAmount || parseFloat(fromAmount) <= 0 || parseFloat(fromAmount) > fromTokenData.balance}
          >
            {isSwapping ? t('swapping') : t('swapButton')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
