"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownUp, Info } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useWeb3 } from "@/lib/web3-provider";
import { useToast } from "@/hooks/use-toast";
import { CONTRACTS } from "@/lib/contracts";
import { execTx, useERC20Contract, useSwapContract } from "@/hooks/use-contract";

type SwapSide = "BUY" | "SELL";

export function SwapPage() {
  const { t } = useLanguage();
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();

  const swap = useSwapContract();
  const tot = useERC20Contract(CONTRACTS.TOT);
  const usdt = useERC20Contract(CONTRACTS.USDT);

  const [side, setSide] = useState<SwapSide>("BUY");
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("0");
  const [loading, setLoading] = useState(false);

  const [totDecimals, setTotDecimals] = useState(18);
  const [usdtDecimals, setUsdtDecimals] = useState(18);
  const [totBalance, setTotBalance] = useState("0");
  const [usdtBalance, setUsdtBalance] = useState("0");
  const [buyFeeBps, setBuyFeeBps] = useState("100");
  const [sellFeeBps, setSellFeeBps] = useState("500");

  const fromToken = side === "BUY" ? "USDT" : "TOT";
  const toToken = side === "BUY" ? "TOT" : "USDT";

  const parseInput = useCallback(() => {
    try {
      if (!amountIn || Number(amountIn) <= 0) return BigInt(0);
      return ethers.parseUnits(amountIn, side === "BUY" ? usdtDecimals : totDecimals);
    } catch {
      return BigInt(0);
    }
  }, [amountIn, side, usdtDecimals, totDecimals]);

  const refreshBalances = useCallback(async () => {
    if (!address || !tot || !usdt || !swap) return;

    const [totDec, usdtDec, totBal, usdtBal, buyFee, sellFee] = await Promise.all([
      tot.decimals(),
      usdt.decimals(),
      tot.balanceOf(address),
      usdt.balanceOf(address),
      swap.buyFeeBps(),
      swap.sellFeeBps(),
    ]);

    setTotDecimals(Number(totDec));
    setUsdtDecimals(Number(usdtDec));
    setTotBalance(ethers.formatUnits(totBal, Number(totDec)));
    setUsdtBalance(ethers.formatUnits(usdtBal, Number(usdtDec)));
    setBuyFeeBps(buyFee.toString());
    setSellFeeBps(sellFee.toString());
  }, [address, tot, usdt, swap]);

  const refreshQuote = useCallback(async () => {
    if (!swap) return;
    const input = parseInput();
    if (input <= BigInt(0)) {
      setAmountOut("0");
      return;
    }

    try {
      if (side === "BUY") {
        const result = await swap.quoteBuy(input);
        setAmountOut(ethers.formatUnits(result[0], totDecimals));
      } else {
        const result = await swap.quoteSell(input);
        setAmountOut(ethers.formatUnits(result[0], usdtDecimals));
      }
    } catch {
      setAmountOut("0");
    }
  }, [swap, parseInput, side, totDecimals, usdtDecimals]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  useEffect(() => {
    refreshQuote();
  }, [refreshQuote]);

  const handleSwapDirection = () => {
    setSide((prev) => (prev === "BUY" ? "SELL" : "BUY"));
    setAmountIn("");
    setAmountOut("0");
  };

  const handleSwap = async () => {
    if (!isConnected || !address) {
      toast({ title: t("connectWalletFirst"), variant: "destructive" });
      return;
    }
    if (!swap || !tot || !usdt) {
      toast({ title: "合约未配置", description: "请检查 NEXT_PUBLIC 合约地址", variant: "destructive" });
      return;
    }

    const input = parseInput();
    if (input <= BigInt(0)) return;

    setLoading(true);
    try {
      if (side === "BUY") {
        const allowance = await usdt.allowance(address, CONTRACTS.SWAP);
        if (allowance < input) {
          const approveRes = await execTx(usdt.approve(CONTRACTS.SWAP, input));
          if (!approveRes.success) {
            toast({ title: "授权失败", description: approveRes.error, variant: "destructive" });
            setLoading(false);
            return;
          }
        }

        const quote = await swap.quoteBuy(input);
        const minTotOut = (quote[0] * BigInt(9950)) / BigInt(10000);
        const txRes = await execTx(swap.buyTot(input, minTotOut));
        if (!txRes.success) {
          toast({ title: "买入失败", description: txRes.error, variant: "destructive" });
          setLoading(false);
          return;
        }

        toast({ title: "买入成功", description: txRes.hash?.slice(0, 10) + "..." });
      } else {
        const allowance = await tot.allowance(address, CONTRACTS.SWAP);
        if (allowance < input) {
          const approveRes = await execTx(tot.approve(CONTRACTS.SWAP, input));
          if (!approveRes.success) {
            toast({ title: "授权失败", description: approveRes.error, variant: "destructive" });
            setLoading(false);
            return;
          }
        }

        const quote = await swap.quoteSell(input);
        const minUsdtOut = (quote[0] * BigInt(9950)) / BigInt(10000);
        const txRes = await execTx(swap.sellTot(input, minUsdtOut));
        if (!txRes.success) {
          toast({ title: "卖出失败", description: txRes.error, variant: "destructive" });
          setLoading(false);
          return;
        }

        toast({ title: "卖出成功", description: txRes.hash?.slice(0, 10) + "..." });
      }

      setAmountIn("");
      setAmountOut("0");
      await refreshBalances();
    } finally {
      setLoading(false);
    }
  };

  const fromBalance = useMemo(() => (side === "BUY" ? usdtBalance : totBalance), [side, usdtBalance, totBalance]);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            {t("swapTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">实时链上兑换（TOT/USDT）</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t("from")}</span>
              <span className="text-xs text-muted-foreground">{t("balance")}: {Number(fromBalance).toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={t("enterAmount")}
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="flex-1 text-lg font-medium"
                min="0"
              />
              <div className="flex items-center justify-center w-[100px] rounded-md border border-border bg-muted/30 px-3">
                <span className="font-headline font-bold text-sm">{fromToken}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button size="icon" variant="outline" className="rounded-full h-10 w-10 border-primary/30 hover:bg-primary/10" onClick={handleSwapDirection}>
              <ArrowDownUp size={18} className="text-primary" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t("to")}</span>
            </div>
            <div className="flex gap-2">
              <Input type="text" value={amountOut} readOnly className="flex-1 text-lg font-medium bg-muted/30" />
              <div className="flex items-center justify-center w-[100px] rounded-md border border-border bg-muted/30 px-3">
                <span className="font-headline font-bold text-sm">{toToken}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1"><Info size={12} />链上手续费</span>
              <span className="font-medium">{side === "BUY" ? `${Number(buyFeeBps) / 100}%` : `${Number(sellFeeBps) / 100}%`}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">滑点保护</span>
              <span className="font-medium">0.5%</span>
            </div>
          </div>

          <Button className="w-full bg-primary hover:bg-primary/90 text-lg py-6" onClick={handleSwap} disabled={loading || !isConnected || !amountIn || Number(amountIn) <= 0}>
            {loading ? t("swapping") : side === "BUY" ? "买入 TOT" : "卖出 TOT"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
