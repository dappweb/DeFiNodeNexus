"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Layers, TrendingUp } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/components/language-provider";

export function NftbDividendTracking() {
  const nodes = MOCK_USER_DATA.nftbNodes;
  const { t } = useLanguage();

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center gap-2">
        <Layers className="text-accent" />
        <CardTitle>{t('nftbTracking')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {nodes.map((node) => (
            <div key={node.nodeId} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded border border-white/5">{node.nodeId}</span>
                  <span className="text-xs text-muted-foreground">{t('level')} {node.level} • {t('weight')} {node.weight}x</span>
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
  );
}
