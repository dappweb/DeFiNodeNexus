"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Wallet, CalendarDays, Coins } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useWeb3 } from "@/lib/web3-provider";
import { useNexusContract } from "@/hooks/use-contract";

type EarningRecord = {
  key: string;
  type: "NFTA Yield" | "NFTB Dividend" | "Team Bonus" | "Withdraw";
  amount: bigint;
  block: number;
  txHash: string;
};

export function EarningsPage() {
  const { t } = useLanguage();
  const { address, provider } = useWeb3();
  const nexus = useNexusContract();

  const [filter, setFilter] = useState("all");
  const [pendingTot, setPendingTot] = useState<bigint>(BigInt(0));
  const [claimedTot, setClaimedTot] = useState<bigint>(BigInt(0));
  const [withdrawnTot, setWithdrawnTot] = useState<bigint>(BigInt(0));
  const [todayEstimate, setTodayEstimate] = useState<bigint>(BigInt(0));
  const [records, setRecords] = useState<EarningRecord[]>([]);

  const refreshData = useCallback(async () => {
    if (!nexus || !address) return;

    const account = await nexus.accounts(address);
    setPendingTot(account.pendingTot);
    setClaimedTot(account.claimedTot);
    setWithdrawnTot(account.withdrawnTot);

    const nftaIds = await nexus.getUserNftaNodes(address);
    const todayPendings = await Promise.all(nftaIds.map((id: bigint) => nexus.pendingNftaYield(id)));
    setTodayEstimate(todayPendings.reduce((s: bigint, x: bigint) => s + x, BigInt(0)));

    if (!provider) {
      setRecords([]);
      return;
    }

    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 80_000);

    const [yieldEvents, divEvents, teamEvents, wdEvents] = await Promise.all([
      nexus.queryFilter(nexus.filters.NftaYieldClaimed(address), fromBlock, latestBlock),
      nexus.queryFilter(nexus.filters.NftbDividendClaimed(address), fromBlock, latestBlock),
      nexus.queryFilter(nexus.filters.TeamCommissionPaid(address), fromBlock, latestBlock),
      nexus.queryFilter(nexus.filters.TotWithdrawn(address), fromBlock, latestBlock),
    ]);

    const mapped: EarningRecord[] = [];

    for (const ev of yieldEvents) {
      const args = (ev as any).args;
      mapped.push({
        key: `${ev.transactionHash}-yield`,
        type: "NFTA Yield",
        amount: args.totAmount,
        block: ev.blockNumber,
        txHash: ev.transactionHash,
      });
    }

    for (const ev of divEvents) {
      const args = (ev as any).args;
      mapped.push({
        key: `${ev.transactionHash}-div`,
        type: "NFTB Dividend",
        amount: args.amount,
        block: ev.blockNumber,
        txHash: ev.transactionHash,
      });
    }

    for (const ev of teamEvents) {
      const args = (ev as any).args;
      mapped.push({
        key: `${ev.transactionHash}-team`,
        type: "Team Bonus",
        amount: args.amount,
        block: ev.blockNumber,
        txHash: ev.transactionHash,
      });
    }

    for (const ev of wdEvents) {
      const args = (ev as any).args;
      mapped.push({
        key: `${ev.transactionHash}-wd`,
        type: "Withdraw",
        amount: args.totAmount,
        block: ev.blockNumber,
        txHash: ev.transactionHash,
      });
    }

    mapped.sort((a, b) => b.block - a.block);
    setRecords(mapped.slice(0, 50));
  }, [nexus, address, provider]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const filtered = useMemo(() => {
    if (filter === "all") return records;
    if (filter === "nfta") return records.filter((r) => r.type === "NFTA Yield");
    if (filter === "nftb") return records.filter((r) => r.type === "NFTB Dividend");
    if (filter === "team") return records.filter((r) => r.type === "Team Bonus");
    return records;
  }, [records, filter]);

  const typeColors: Record<EarningRecord["type"], string> = {
    "NFTA Yield": "bg-primary/15 text-primary border-primary/30",
    "NFTB Dividend": "bg-accent/15 text-accent border-accent/30",
    "Team Bonus": "bg-purple-500/15 text-purple-500 border-purple-500/30",
    Withdraw: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  };

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Pending TOT</p>
              <p className="text-xl font-bold font-headline">{Number(ethers.formatUnits(pendingTot, 18)).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-accent/10"><Coins className="h-5 w-5 text-accent" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Claimed TOT</p>
              <p className="text-xl font-bold font-headline">{Number(ethers.formatUnits(claimedTot, 18)).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-500/10"><CalendarDays className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Withdrawn TOT</p>
              <p className="text-xl font-bold font-headline">{Number(ethers.formatUnits(withdrawnTot, 18)).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10"><TrendingUp className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Today Estimate</p>
              <p className="text-xl font-bold font-headline">{Number(ethers.formatUnits(todayEstimate, 18)).toLocaleString()}</p>
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
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-2 sm:px-3 h-7">{t("allTypes")}</TabsTrigger>
              <TabsTrigger value="nfta" className="text-xs px-2 sm:px-3 h-7">NFTA</TabsTrigger>
              <TabsTrigger value="nftb" className="text-xs px-2 sm:px-3 h-7">NFTB</TabsTrigger>
              <TabsTrigger value="team" className="text-xs px-2 sm:px-3 h-7">{t("teamBonus")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无链上收益记录</p>
          ) : (
            filtered.map((item) => (
              <div key={item.key} className="rounded-lg border border-border/50 p-4 flex items-center justify-between gap-3">
                <div>
                  <Badge className={typeColors[item.type]}>{item.type}</Badge>
                  <p className="text-xs text-muted-foreground mt-2">Block #{item.block}</p>
                  <p className="text-xs text-muted-foreground">Tx: {item.txHash.slice(0, 10)}...{item.txHash.slice(-6)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{Number(ethers.formatUnits(item.amount, 18)).toLocaleString()} TOT</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
