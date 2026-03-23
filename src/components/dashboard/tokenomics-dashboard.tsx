"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Database, Info } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";
import { useSwapContract } from "@/hooks/use-contract";

export function TokenomicsDashboard() {
  const { tot, tof } = MOCK_USER_DATA.tokenomics;
  const { t } = useLanguage();
  const swap = useSwapContract();

  const [totReserve, setTotReserve] = useState(0);
  const [usdtReserve, setUsdtReserve] = useState(0);
  const [currentPrice, setCurrentPrice] = useState("0");
  const [dividendPool, setDividendPool] = useState(0);

  const refreshPoolData = useCallback(async () => {
    if (!swap) return;
    try {
      const [totR, usdtR, price, pool] = await Promise.all([
        swap.totReserve(),
        swap.usdtReserve(),
        swap.getCurrentPrice(),
        swap.nftbDividendPool(),
      ]);
      setTotReserve(Number(ethers.formatUnits(totR, 18)));
      setUsdtReserve(Number(ethers.formatUnits(usdtR, 18)));
      setCurrentPrice(Number(ethers.formatUnits(price, 18)).toFixed(6));
      setDividendPool(Number(ethers.formatUnits(pool, 18)));
    } catch {
      // contract not available, keep defaults
    }
  }, [swap]);

  useEffect(() => {
    refreshPoolData();
  }, [refreshPoolData]);

  const circulating = tot.circulatingSupply / 1e6;
  const liquidity = totReserve > 0 ? totReserve / 1e6 : 150;
  const ecosystem = 200;
  const staking = 200;

  const data = [
    { name: t("chartCirculating"), value: Math.round(circulating), fill: "hsl(var(--primary))" },
    { name: t("chartLiquidity"), value: Math.round(liquidity), fill: "hsl(var(--accent))" },
    { name: t("chartEcosystem"), value: ecosystem, fill: "hsl(var(--chart-3))" },
    { name: t("chartStaking"), value: staking, fill: "hsl(var(--chart-4))" },
  ];

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center gap-2">
        <Database className="text-primary" />
        <CardTitle>{t('tokenomicsNexus')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-sm font-bold font-headline text-primary uppercase">{t('totDistribution')}</h4>
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
                <span className="text-[10px] text-muted-foreground block">{t('burnRate')}</span>
                <span className="text-xs font-bold text-accent">{tot.burnRate}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded border border-white/5">
                <span className="text-[10px] text-muted-foreground block">{t('txFee')}</span>
                <span className="text-xs font-bold text-accent">{tot.transactionFee}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded border border-white/5">
                <span className="text-[10px] text-muted-foreground block">{t("totUsdtPrice")}</span>
                <span className="text-xs font-bold text-primary">{currentPrice}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded border border-white/5">
                <span className="text-[10px] text-muted-foreground block">{t("dividendPoolTot")}</span>
                <span className="text-xs font-bold text-primary">{dividendPool.toLocaleString()}</span>
              </div>
            </div>
            {totReserve > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-muted/30 rounded border border-white/5">
                  <span className="text-[10px] text-muted-foreground block">{t("poolTotReserve")}</span>
                  <span className="text-xs font-bold">{totReserve.toLocaleString()}</span>
                </div>
                <div className="p-2 bg-muted/30 rounded border border-white/5">
                  <span className="text-[10px] text-muted-foreground block">{t("poolUsdtReserve")}</span>
                  <span className="text-xs font-bold">{usdtReserve.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold font-headline text-accent uppercase">{t('tofUtility')}</h4>
            <div className="space-y-3 mt-6">
              <div className="flex justify-between items-center p-3 rounded-lg bg-accent/5 border border-accent/10">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-accent" />
                  <span className="text-xs">{t('deflationaryMechanism')}</span>
                </div>
                <span className="text-xs font-bold">{tof.burnRate}</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-white/5">
                <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                  {t('tofDisclaimer')}
                </p>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[10px] text-muted-foreground block">{t('totalSupply')}</span>
                  <span className="text-sm font-bold">{(tof.totalSupply / 1000000).toFixed(1)}M TOF</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">{t('inCirculation')}</span>
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
