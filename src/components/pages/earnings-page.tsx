"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, Wallet, CalendarDays, Coins } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useWeb3 } from "@/lib/web3-provider";
import { useToast } from "@/hooks/use-toast";
import { execTx } from "@/hooks/use-contract";
import { useNexusContract } from "@/hooks/use-contract";
import { getNftaTierName, getNftbTierName, formatBalance, formatDatetime } from "@/lib/ui-config";
import { toFriendlyError } from "@/lib/api-common";

type EarningRecord = {
  key: string;
  type: "NFTA Yield" | "NFTB Dividend" | "NFTB USDT Dividend" | "Team Bonus" | "Withdraw";
  unit: "TOT" | "USDT";
  amount: bigint;
  block: number;
  txHash: string;
  timestamp: number;
};

export function EarningsPage() {
  const { t } = useLanguage();
  const { address, provider } = useWeb3();
  const nexus = useNexusContract();
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [range, setRange] = useState<"7d" | "30d" | "all">("7d");
  const [pendingTot, setPendingTot] = useState<bigint>(BigInt(0));
  const [claimedTot, setClaimedTot] = useState<bigint>(BigInt(0));
  const [records, setRecords] = useState<EarningRecord[]>([]);
  const [withdrawing, setWithdrawing] = useState(false);

  const refreshData = useCallback(async () => {
    if (!nexus || !address) return;

    const account = await nexus.accounts(address);
    setPendingTot(account.pendingTot);
    setClaimedTot(account.claimedTot);

    if (!provider) {
      setRecords([]);
      return;
    }

    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 80_000);

    const [yieldEvents, divEvents, usdtDivEvents, teamEvents, wdEvents] = await Promise.all([
      nexus.queryFilter(nexus.filters.NftaYieldClaimed(address), fromBlock, latestBlock),
      nexus.queryFilter(nexus.filters.NftbDividendClaimed(address), fromBlock, latestBlock),
      nexus.queryFilter(nexus.filters.NftbUsdtDividendClaimed(address), fromBlock, latestBlock),
      nexus.queryFilter(nexus.filters.TeamCommissionPaid(address), fromBlock, latestBlock),
      nexus.queryFilter(nexus.filters.TotWithdrawn(address), fromBlock, latestBlock),
    ]);

    const mapped: EarningRecord[] = [];
    const blockTimestamps = new Map<number, number>();

    const getBlockTimestamp = async (blockNumber: number) => {
      if (blockTimestamps.has(blockNumber)) {
        return blockTimestamps.get(blockNumber)!;
      }
      const block = await provider.getBlock(blockNumber);
      const ts = block?.timestamp ?? 0;
      blockTimestamps.set(blockNumber, ts);
      return ts;
    };

    for (const ev of yieldEvents) {
      const args = (ev as any).args;
      const timestamp = await getBlockTimestamp(ev.blockNumber);
      mapped.push({
        key: `${ev.transactionHash}-yield`,
        type: "NFTA Yield",
        unit: "TOT",
        amount: args.totAmount,
        block: ev.blockNumber,
        txHash: ev.transactionHash,
        timestamp,
      });
    }

    for (const ev of divEvents) {
      const args = (ev as any).args;
      const timestamp = await getBlockTimestamp(ev.blockNumber);
      mapped.push({
        key: `${ev.transactionHash}-div`,
        type: "NFTB Dividend",
        unit: "TOT",
        amount: args.amount,
        block: ev.blockNumber,
        txHash: ev.transactionHash,
        timestamp,
      });
    }

    for (const ev of usdtDivEvents) {
      const args = (ev as any).args;
      const timestamp = await getBlockTimestamp(ev.blockNumber);
      mapped.push({
        key: `${ev.transactionHash}-usdt-div`,
        type: "NFTB USDT Dividend",
        unit: "USDT",
        amount: args.amount,
        block: ev.blockNumber,
        txHash: ev.transactionHash,
        timestamp,
      });
    }

    for (const ev of teamEvents) {
      const args = (ev as any).args;
      const timestamp = await getBlockTimestamp(ev.blockNumber);
      mapped.push({
        key: `${ev.transactionHash}-team`,
        type: "Team Bonus",
        unit: "USDT",
        amount: args.amount,
        block: ev.blockNumber,
        txHash: ev.transactionHash,
        timestamp,
      });
    }

    for (const ev of wdEvents) {
      const args = (ev as any).args;
      const timestamp = await getBlockTimestamp(ev.blockNumber);
      mapped.push({
        key: `${ev.transactionHash}-wd`,
        type: "Withdraw",
        unit: "TOT",
        amount: args.totAmount,
        block: ev.blockNumber,
        txHash: ev.transactionHash,
        timestamp,
      });
    }

    mapped.sort((a, b) => b.block - a.block);
    setRecords(mapped.slice(0, 50));
  }, [nexus, address, provider]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const filtered = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const ranged = records.filter((item) => {
      if (range === "all") return true;
      const days = range === "7d" ? 7 : 30;
      return item.timestamp >= now - days * 24 * 60 * 60;
    });

    if (filter === "all") return ranged;
    if (filter === "nfta") return ranged.filter((r) => r.type === "NFTA Yield");
    if (filter === "nftb") return ranged.filter((r) => r.type === "NFTB Dividend" || r.type === "NFTB USDT Dividend");
    if (filter === "team") return ranged.filter((r) => r.type === "Team Bonus");
    return ranged;
  }, [records, filter, range]);

  const todayIncome = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return records
      .filter((item) => item.type !== "Withdraw" && item.unit === "TOT" && item.timestamp >= now - 24 * 60 * 60)
      .reduce((sum, item) => sum + item.amount, BigInt(0));
  }, [records]);

  const cumulativeIncome = useMemo(() => claimedTot, [claimedTot]);
  const withdrawableIncome = useMemo(() => pendingTot, [pendingTot]);

  const handleWithdrawAll = async () => {
    if (!nexus || pendingTot <= 0n) return;

    setWithdrawing(true);
    try {
      const res = await execTx(nexus.withdrawTot(pendingTot));
      if (!res.success) {
        toast({ title: t("toastWithdrawFailed"), description: res.error, variant: "destructive" });
        return;
      }

      toast({ title: t("toastWithdrawSuccess"), description: res.hash?.slice(0, 10) + "..." });
      await refreshData();
    } finally {
      setWithdrawing(false);
    }
  };

  const typeColors: Record<EarningRecord["type"], string> = {
    "NFTA Yield": "bg-primary/15 text-primary border-primary/30",
    "NFTB Dividend": "bg-accent/15 text-accent border-accent/30",
    "NFTB USDT Dividend": "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
    "Team Bonus": "bg-purple-500/15 text-purple-500 border-purple-500/30",
    Withdraw: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  };

  const typeLabels: Record<EarningRecord["type"], string> = {
    "NFTA Yield": t("typeNftaYield"),
    "NFTB Dividend": t("typeNftbDividend"),
    "NFTB USDT Dividend": t("typeNftbUsdtDividend"),
    "Team Bonus": t("typeTeamBonus"),
    Withdraw: t("typeWithdraw"),
  };

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{t("withdrawableEarnings")}</p>
              <p className="text-xl font-bold font-headline">{Number(ethers.formatUnits(withdrawableIncome, 18)).toLocaleString()}</p>
            </div>
            <Button
              size="sm"
              onClick={handleWithdrawAll}
              disabled={withdrawing || withdrawableIncome <= 0n || !nexus || !address}
            >
              {withdrawing ? t("processing") : t("withdrawAll")}
            </Button>
          </div>
        </Card>
        <Card className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-accent/10"><Coins className="h-5 w-5 text-accent" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{t("cumulativeEarnings")}</p>
              <p className="text-xl font-bold font-headline">{Number(ethers.formatUnits(cumulativeIncome, 18)).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-500/10"><CalendarDays className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{t("todayEarningsLabel")}</p>
              <p className="text-xl font-bold font-headline">{Number(ethers.formatUnits(todayIncome, 18)).toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("earningsTitle")}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={range} onValueChange={(value) => setRange(value as "7d" | "30d" | "all")}>
              <TabsList className="h-8">
                <TabsTrigger value="7d" className="text-xs px-2 sm:px-3 h-7">{t("last7Days")}</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs px-2 sm:px-3 h-7">{t("last30Days")}</TabsTrigger>
                <TabsTrigger value="all" className="text-xs px-2 sm:px-3 h-7">{t("allTime")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-2 sm:px-3 h-7">{t("allTypes")}</TabsTrigger>
              <TabsTrigger value="nfta" className="text-xs px-2 sm:px-3 h-7">NFT-A</TabsTrigger>
              <TabsTrigger value="nftb" className="text-xs px-2 sm:px-3 h-7">NFT-B</TabsTrigger>
              <TabsTrigger value="team" className="text-xs px-2 sm:px-3 h-7">{t("teamBonus")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noEarningsRecord")}</p>
          ) : (
            filtered.map((item) => (
              <div key={item.key} className="rounded-lg border border-border/50 p-4 flex items-center justify-between gap-3">
                <div>
                  <Badge className={typeColors[item.type]}>{typeLabels[item.type]}</Badge>
                  <p className="text-xs text-muted-foreground mt-2">Block #{item.block}</p>
                  <p className="text-xs text-muted-foreground">{t("timeLabel")} {item.timestamp ? new Date(item.timestamp * 1000).toLocaleString() : "-"}</p>
                  <p className="text-xs text-muted-foreground">Tx: {item.txHash.slice(0, 10)}...{item.txHash.slice(-6)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{Number(ethers.formatUnits(item.amount, 18)).toLocaleString()} {item.unit}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
