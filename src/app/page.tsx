"use client";

import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { 
  Wallet, 
  LayoutDashboard, 
  Coins, 
  Layers, 
  User, 
  Bell,
  Search,
  Plus,
  Database
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { NftaNodeManager } from "@/components/dashboard/nfta-node-manager";
import { NftbDividendTracking } from "@/components/dashboard/nftb-dividend-tracking";
import { PredictionNexus } from "@/components/dashboard/prediction-nexus";
import { TokenomicsDashboard } from "@/components/dashboard/tokenomics-dashboard";
import { AiInsightPanel } from "@/components/dashboard/ai-insight-panel";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarProvider>
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 px-6 backdrop-blur-md">
            <div className="flex items-center gap-2 mr-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground blue-glow">
                <LayoutDashboard size={18} />
              </div>
              <h1 className="text-xl font-headline font-bold text-primary">
                {t('appName')} <span className="text-accent">{t('appNexus')}</span>
              </h1>
            </div>
            
            <div className="hidden md:flex flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t('searchPlaceholder')}
                className="pl-10 bg-muted/30 border-border/50 focus-visible:ring-accent/30"
              />
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-mono text-muted-foreground">{MOCK_USER_DATA.walletAddress}</span>
              </div>
              <Button size="icon" variant="ghost" className="relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
              </Button>
              <Button size="icon" variant="outline" className="rounded-full border-border/50">
                <User size={20} />
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6 md:p-8 space-y-8">
            {/* Asset Overview */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-headline font-semibold flex items-center gap-2">
                  <Wallet className="text-accent h-5 w-5" />
                  {t('assetPerformance')}
                </h2>
                <Button size="sm" className="bg-primary text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('stakeMore')}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                  title={t('totalTotBalance')}
                  value={`${MOCK_USER_DATA.balances.tot.toLocaleString()} TOT`} 
                  icon={Coins}
                  trend={{ value: "12.4%", positive: true }}
                />
                <StatCard 
                  title={t('totalTofBalance')}
                  value={`${MOCK_USER_DATA.balances.tof.toLocaleString()} TOF`} 
                  icon={Database}
                  trend={{ value: "3.1%", positive: false }}
                />
                <StatCard 
                  title={t('nftPortfolioValue')}
                  value={`$${(MOCK_USER_DATA.balances.usdt * 12).toLocaleString()}`} 
                  icon={Layers}
                  description={t('secondaryMarketValue')}
                />
              </div>
            </section>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column - Core Management */}
              <div className="lg:col-span-8 space-y-8">
                <NftaNodeManager />
                <TokenomicsDashboard />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <PredictionNexus />
                   <NftbDividendTracking />
                </div>
              </div>

              {/* Right Column - AI & Intelligence */}
              <div className="lg:col-span-4 space-y-8">
                <div className="sticky top-24">
                  <AiInsightPanel />
                </div>
              </div>
            </div>
          </main>
          
          <footer className="py-6 px-8 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              {t('footer')}
            </p>
          </footer>
        </div>
      </SidebarProvider>
    </div>
  );
}
