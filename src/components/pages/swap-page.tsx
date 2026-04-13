"use client";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { execTx, useERC20Contract, useSwapContract } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";
import { CONTRACTS } from "@/lib/contracts";
import { useWeb3 } from "@/lib/web3-provider";
import { ethers } from "ethers";
import { ArrowDownUp, Clock, Info, ShieldAlert, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [txStage, setTxStage] = useState<"idle" | "checking" | "approving" | "submitting" | "done">("idle");
  const [approvalNeeded, setApprovalNeeded] = useState(false);

  const [totDecimals, setTotDecimals] = useState(18);
  const [usdtDecimals, setUsdtDecimals] = useState(18);
  const [totBalance, setTotBalance] = useState("0");
  const [usdtBalance, setUsdtBalance] = useState("0");
  const [buyFeeBps, setBuyFeeBps] = useState("100");
  const [sellFeeBps, setSellFeeBps] = useState("500");

  // Live pool & user info
  const [currentPrice, setCurrentPrice] = useState("0");
  const [avgPrice, setAvgPrice] = useState("0");
  const [dailyBought, setDailyBought] = useState("0");
  const [maxDailyBuy, setMaxDailyBuy] = useState("0");
  const [maxSellAmount, setMaxSellAmount] = useState("0");
  const [profitTaxBps, setProfitTaxBps] = useState("0");
  const [deflationCountdown, setDeflationCountdown] = useState(0);

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

    const [totDec, usdtDec, totBal, usdtBal, buyFee, sellFee, price, avgP, dailyB, maxDB, maxSell, pTax, deflTime] = await Promise.all([
      tot.decimals(),
      usdt.decimals(),
      tot.balanceOf(address),
      usdt.balanceOf(address),
      swap.buyFeeBps(),
      swap.sellFeeBps(),
      swap.getCurrentPrice(),
      swap.getUserAvgPrice(address),
      swap.getDailyBoughtAmount(address),
      swap.maxDailyBuy(),
      swap.getMaxSellAmount(address),
      swap.profitTaxBps(),
      swap.timeUntilNextDeflation(),
    ]);

    const td = Number(totDec);
    const ud = Number(usdtDec);
    setTotDecimals(td);
    setUsdtDecimals(ud);
    setTotBalance(ethers.formatUnits(totBal, td));
    setUsdtBalance(ethers.formatUnits(usdtBal, ud));
    setBuyFeeBps(buyFee.toString());
    setSellFeeBps(sellFee.toString());
    setCurrentPrice(ethers.formatUnits(price, 18));
    setAvgPrice(ethers.formatUnits(avgP, 18));
    setDailyBought(ethers.formatUnits(dailyB, td));
    setMaxDailyBuy(ethers.formatUnits(maxDB, td));
    setMaxSellAmount(ethers.formatUnits(maxSell, td));
    setProfitTaxBps(pTax.toString());
    setDeflationCountdown(Number(deflTime));
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

  useEffect(() => {
    let cancelled = false;

    const checkApproval = async () => {
      if (!isConnected || !address || !swap || !tot || !usdt) {
        if (!cancelled) setApprovalNeeded(false);
        return;
      }

      const input = parseInput();
      if (input <= BigInt(0)) {
        if (!cancelled) setApprovalNeeded(false);
        return;
      }

      try {
        const allowance = side === "BUY"
          ? await usdt.allowance(address, CONTRACTS.SWAP)
          : await tot.allowance(address, CONTRACTS.SWAP);
        if (!cancelled) {
          setApprovalNeeded(allowance < input);
        }
      } catch {
        if (!cancelled) setApprovalNeeded(false);
      }
    };

    checkApproval();

    return () => {
      cancelled = true;
    };
  }, [isConnected, address, side, parseInput, swap, tot, usdt]);

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
      toast({ title: t("toastContractMissing"), description: t("toastContractMissingDesc"), variant: "destructive" });
      return;
    }

    const input = parseInput();
    if (input <= BigInt(0)) return;

    setLoading(true);
    setTxStage("checking");
    let success = false;
    try {
      if (side === "BUY") {
        const allowance = await usdt.allowance(address, CONTRACTS.SWAP);
        if (allowance < input) {
          setTxStage("approving");
          const approveRes = await execTx(() => usdt.approve(CONTRACTS.SWAP, input, { gasLimit: 200_000 }));
          if (!approveRes.success) {
            toast({ title: t("toastApproveFailed"), description: approveRes.error, variant: "destructive" });
            setLoading(false);
            setTxStage("idle");
            return;
          }
        }

        const quote = await swap.quoteBuy(input);
        const minTotOut = (quote[0] * BigInt(9950)) / BigInt(10000);
        setTxStage("submitting");
        const txRes = await execTx(() => swap.buyTot(input, minTotOut, { gasLimit: 500_000 }));
        if (!txRes.success) {
          toast({ title: t("toastBuyFailed"), description: txRes.error, variant: "destructive" });
          setLoading(false);
          setTxStage("idle");
          return;
        }

        toast({ title: t("toastBuySuccess"), description: txRes.hash?.slice(0, 10) + "..." });
      } else {
        const allowance = await tot.allowance(address, CONTRACTS.SWAP);
        if (allowance < input) {
          setTxStage("approving");
          const approveRes = await execTx(() => tot.approve(CONTRACTS.SWAP, input, { gasLimit: 200_000 }));
          if (!approveRes.success) {
            toast({ title: t("toastApproveFailed"), description: approveRes.error, variant: "destructive" });
            setLoading(false);
            setTxStage("idle");
            return;
          }
        }

        const quote = await swap.quoteSell(input);
        const minUsdtOut = (quote[0] * BigInt(9950)) / BigInt(10000);
        setTxStage("submitting");
        const txRes = await execTx(() => swap.sellTot(input, minUsdtOut, { gasLimit: 500_000 }));
        if (!txRes.success) {
          toast({ title: t("toastSellFailed"), description: txRes.error, variant: "destructive" });
          setLoading(false);
          setTxStage("idle");
          return;
        }

        toast({ title: t("toastSellSuccess"), description: txRes.hash?.slice(0, 10) + "..." });
      }

      setAmountIn("");
      setAmountOut("0");
      setTxStage("done");
      success = true;
      await refreshBalances();
    } finally {
      setLoading(false);
      if (!success) {
        setTxStage("idle");
      }
    }
  };

  const fromBalance = useMemo(() => (side === "BUY" ? usdtBalance : totBalance), [side, usdtBalance, totBalance]);
  const disableReason = useMemo(() => {
    if (!isConnected) return t("connectWalletFirst");
    if (!amountIn || Number(amountIn) <= 0) return t("enterAmount");

    if (side === "BUY" && Number(amountIn) > Number(usdtBalance)) {
      return t("insufficientUsdtBalance");
    }
    if (side === "SELL" && Number(amountIn) > Number(totBalance)) {
      return t("insufficientTotBalance");
    }
    if (side === "SELL" && Number(maxSellAmount) > 0 && Number(amountIn) > Number(maxSellAmount)) {
      return t("exceedsMaxSellAmount");
    }

    return "";
  }, [isConnected, amountIn, side, usdtBalance, totBalance, maxSellAmount, t]);

  const txStageLabel = useMemo(() => {
    switch (txStage) {
      case "checking":
        return t("swapStageChecking");
      case "approving":
        return t("swapStageApproving");
      case "submitting":
        return t("swapStageSubmitting");
      case "done":
        return t("swapStageDone");
      default:
        return t("swapStageIdle");
    }
  }, [txStage, t]);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return t("canTrigger");
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* ── Price & Pool Info Card ── */}
      <Card className="glass-panel">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{t("marketInfo")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-lg bg-muted/20 border border-border/30">
              <p className="text-[10px] text-muted-foreground">{t("currentPriceLabel")}</p>
              <p className="text-sm font-bold">{Number(currentPrice).toFixed(6)} USDT</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 border border-border/30">
              <p className="text-[10px] text-muted-foreground">{t("myAvgPrice")}</p>
              <p className="text-sm font-bold">{Number(avgPrice) > 0 ? `${Number(avgPrice).toFixed(6)} USDT` : "-"}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 border border-border/30">
              <p className="text-[10px] text-muted-foreground">{t("dailyBoughtLimit")}</p>
              <p className="text-sm font-bold">{Number(dailyBought).toLocaleString()} / {Number(maxDailyBuy).toLocaleString()} TOT</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 border border-border/30">
              <p className="text-[10px] text-muted-foreground">{t("maxSellPerTx")}</p>
              <p className="text-sm font-bold">{Number(maxSellAmount).toLocaleString()} TOT</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 px-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock size={11} />{t("deflationCountdownLabel")} {formatCountdown(deflationCountdown)}</span>
            <span className="flex items-center gap-1"><ShieldAlert size={11} />{t("profitTaxLabel")} {Number(profitTaxBps) / 100}%</span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            {t("swapTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("liveSwapDesc")}</p>
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
              <span className="text-muted-foreground">{t("swapReviewReceive")}</span>
              <span className="font-medium">{Number(amountOut).toLocaleString()} {toToken}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1"><Info size={12} />{t("onChainFee")}</span>
              <span className="font-medium">{side === "BUY" ? `${Number(buyFeeBps) / 100}%` : `${Number(sellFeeBps) / 100}%`}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("slippageProtection")}</span>
              <span className="font-medium">0.5%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("swapReviewApproval")}</span>
              <span className="font-medium">{approvalNeeded ? t("swapReviewApprovalNeeded") : t("swapReviewApprovalReady")}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("swapReviewStatus")}</span>
              <span className="font-medium">{txStageLabel}</span>
            </div>
            {disableReason ? <p className="text-[11px] text-amber-600 dark:text-amber-400">{disableReason}</p> : null}
          </div>

          <Button className="w-full bg-primary hover:bg-primary/90 text-lg py-6" onClick={handleSwap} disabled={loading || Boolean(disableReason)}>
            {loading ? t("swapping") : side === "BUY" ? t("buyTot") : t("sellTot")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
