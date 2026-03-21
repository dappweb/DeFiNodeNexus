"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Cpu, Activity, Coins } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";

export function NftaNodeManager() {
  const nodes = MOCK_USER_DATA.nftaNodes;
  const { t } = useLanguage();

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center justify-between">
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
  );
}
