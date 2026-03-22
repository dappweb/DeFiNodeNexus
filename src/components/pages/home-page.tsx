"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, TrendingUp, TrendingDown, Coins, Database, Layers } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";
import { StatCard } from "@/components/dashboard/stat-card";

export function HomePage() {
  const { t } = useLanguage();
  const { announcements, prices, balances } = MOCK_USER_DATA;

  const typeColors: Record<string, string> = {
    update: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    news: "bg-green-500/15 text-green-500 border-green-500/30",
    maintenance: "bg-orange-500/15 text-orange-500 border-orange-500/30",
    event: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  };

  const typeLabels: Record<string, () => string> = {
    update: () => t('update'),
    news: () => t('news'),
    maintenance: () => t('maintenance'),
    event: () => t('event'),
  };

  return (
    <div className="space-y-6">
      {/* Announcements */}
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-5 w-5 text-primary" />
            {t('announcements')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {announcements.map((item) => (
              <div key={item.id} className="p-4 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className={typeColors[item.type]}>{typeLabels[item.type]()}</Badge>
                      <span className="text-[10px] text-muted-foreground">{item.date}</span>
                    </div>
                    <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Asset Overview */}
      <section>
        <h2 className="text-lg font-headline font-semibold mb-4 flex items-center gap-2">
          <Coins className="text-accent h-5 w-5" />
          {t('assetOverview')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title={t('totalTotBalance')}
            value={`${balances.tot.toLocaleString()} TOT`}
            icon={Coins}
            trend={{ value: "12.4%", positive: true }}
          />
          <StatCard
            title={t('totalTofBalance')}
            value={`${balances.tof.toLocaleString()} TOF`}
            icon={Database}
            trend={{ value: "3.1%", positive: false }}
          />
          <StatCard
            title={t('nftPortfolioValue')}
            value={`$${(balances.usdt * 12).toLocaleString()}`}
            icon={Layers}
            description={t('secondaryMarketValue')}
          />
        </div>
      </section>

      {/* Live Prices */}
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-accent" />
            {t('livePrice')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {prices.map((token) => (
              <div key={token.symbol} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-headline font-bold text-sm">{token.symbol}</span>
                  <div className={`flex items-center gap-1 text-xs font-medium ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {token.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {token.change24h >= 0 ? '+' : ''}{token.change24h}%
                  </div>
                </div>
                <p className="text-lg font-bold">${token.price.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t('volume')}: ${token.volume}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
