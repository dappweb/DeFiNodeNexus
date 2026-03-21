"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Database, Info } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";

const data = [
  { name: "Circulating", value: 450, fill: "hsl(var(--primary))" },
  { name: "Liquidity", value: 150, fill: "hsl(var(--accent))" },
  { name: "Ecosystem", value: 200, fill: "hsl(var(--chart-3))" },
  { name: "Staking", value: 200, fill: "hsl(var(--chart-4))" },
];

export function TokenomicsDashboard() {
  const { tot, tof } = MOCK_USER_DATA.tokenomics;

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center gap-2">
        <Database className="text-primary" />
        <CardTitle>Tokenomics Nexus</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-sm font-bold font-headline text-primary uppercase">TOT Distribution</h4>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border border-border p-2 rounded text-[10px]">
                            {`${payload[0].name}: ${payload[0].value}M`}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted/30 rounded border border-white/5">
                <span className="text-[10px] text-muted-foreground block">Burn Rate</span>
                <span className="text-xs font-bold text-accent">{tot.burnRate}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded border border-white/5">
                <span className="text-[10px] text-muted-foreground block">TX Fee</span>
                <span className="text-xs font-bold text-accent">{tot.transactionFee}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold font-headline text-accent uppercase">TOF Utility</h4>
            <div className="space-y-3 mt-6">
              <div className="flex justify-between items-center p-3 rounded-lg bg-accent/5 border border-accent/10">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-accent" />
                  <span className="text-xs">Deflationary Mechanism</span>
                </div>
                <span className="text-xs font-bold">{tof.burnRate}</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-white/5">
                <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                  TOF acts as the primary consumption asset for NFTA yield withdrawals and NFTB node upgrades. Each action permanently removes TOF from the ecosystem.
                </p>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total Supply</span>
                  <span className="text-sm font-bold">{(tof.totalSupply / 1000000).toFixed(1)}M TOF</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">In Circulation</span>
                  <span className="text-sm font-bold">{(tof.circulatingSupply / 1000000).toFixed(1)}M TOF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}