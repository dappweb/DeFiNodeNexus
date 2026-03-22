"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Wallet, CalendarDays, Coins } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";

export function EarningsPage() {
  const { t } = useLanguage();
  const { earningsHistory, earningsSummary } = MOCK_USER_DATA;
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? earningsHistory
    : earningsHistory.filter(e => {
        if (filter === "nfta") return e.type === "NFTA Yield";
        if (filter === "nftb") return e.type === "NFTB Dividend";
        if (filter === "team") return e.type === "Team Bonus";
        return true;
      });

  const typeColors: Record<string, string> = {
    "NFTA Yield": "bg-primary/15 text-primary border-primary/30",
    "NFTB Dividend": "bg-accent/15 text-accent border-accent/30",
    "Team Bonus": "bg-purple-500/15 text-purple-500 border-purple-500/30",
  };

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('totalEarnings')}</p>
              <p className="text-xl font-bold font-headline">{earningsSummary.totalTot.toLocaleString()} TOT</p>
              <p className="text-[10px] text-muted-foreground">≈ ${earningsSummary.totalUsdt.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-accent/10">
              <Coins className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('todayEarnings')}</p>
              <p className="text-xl font-bold font-headline">{earningsSummary.todayTot.toLocaleString()} TOT</p>
              <p className="text-[10px] text-muted-foreground">≈ ${earningsSummary.todayUsdt.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-500/10">
              <CalendarDays className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('weekEarnings')}</p>
              <p className="text-xl font-bold font-headline">{earningsSummary.weekTot.toLocaleString()} TOT</p>
              <p className="text-[10px] text-muted-foreground">≈ ${earningsSummary.weekUsdt.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Table */}
      <Card className="glass-panel">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('earningsTitle')}
          </CardTitle>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-2 sm:px-3 h-7">{t('allTypes')}</TabsTrigger>
              <TabsTrigger value="nfta" className="text-xs px-2 sm:px-3 h-7">NFTA</TabsTrigger>
              <TabsTrigger value="nftb" className="text-xs px-2 sm:px-3 h-7">NFTB</TabsTrigger>
              <TabsTrigger value="team" className="text-xs px-2 sm:px-3 h-7">{t('teamBonus')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {/* Mobile card layout */}
          <div className="space-y-3 md:hidden">
            {filtered.map((item, i) => (
              <div key={i} className="rounded-lg border border-border/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={typeColors[item.type] || ""}>{item.type === "NFTA Yield" ? t('nftaYield') : item.type === "NFTB Dividend" ? t('nftbDividend') : t('teamBonus')}</Badge>
                  <Badge className={item.status === "claimed" ? "bg-green-500/15 text-green-500 border-green-500/30" : "bg-orange-500/15 text-orange-500 border-orange-500/30"}>
                    {item.status === "claimed" ? t('claimed') : t('pending')}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">{t('earningAmount')}</p>
                    <p className="font-bold">{item.totAmount} <span className="text-xs font-normal">TOT</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">{t('earningUsdt')}</p>
                    <p className="font-medium">${item.usdtEquiv.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">{t('earningNode')}</p>
                    <p className="font-mono text-xs">{item.nodeId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">{t('date')}</p>
                    <p className="text-xs">{item.date}</p>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No records found</p>
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('earningType')}</TableHead>
                  <TableHead>{t('earningNode')}</TableHead>
                  <TableHead>{t('earningAmount')}</TableHead>
                  <TableHead>{t('earningUsdt')}</TableHead>
                  <TableHead>{t('earningStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item, i) => (
                  <TableRow key={i} className="border-border/50">
                    <TableCell className="text-xs">{item.date}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[item.type] || ""}>{item.type === "NFTA Yield" ? t('nftaYield') : item.type === "NFTB Dividend" ? t('nftbDividend') : t('teamBonus')}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.nodeId}</TableCell>
                    <TableCell className="font-medium">{item.totAmount} TOT</TableCell>
                    <TableCell className="text-xs">${item.usdtEquiv.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={item.status === "claimed" ? "bg-green-500/15 text-green-500 border-green-500/30" : "bg-orange-500/15 text-orange-500 border-orange-500/30"}>
                        {item.status === "claimed" ? t('claimed') : t('pending')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
