"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, TrendingUp, TrendingDown, Coins, Database, Layers } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { AnnouncementItem } from "@/lib/announcement";
import { useWeb3 } from "@/lib/web3-provider";
import { useToast } from "@/hooks/use-toast";
import { CONTRACTS } from "@/lib/contracts";
import { useERC20Contract, useNexusContract, useSwapContract } from "@/hooks/use-contract";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function HomePage() {
  const { t } = useLanguage();
  const { address, isConnected, addProjectTokens } = useWeb3();
  const { toast } = useToast();
  const nexus = useNexusContract();
  const swap = useSwapContract();
  const tot = useERC20Contract(CONTRACTS.TOT);
  const tof = useERC20Contract(CONTRACTS.TOF);
  const predictionPlatformUrl = process.env.NEXT_PUBLIC_PREDICTION_PLATFORM_URL;
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(MOCK_USER_DATA.announcements);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | number | null>(null);
  const [totBalance, setTotBalance] = useState("0");
  const [tofBalance, setTofBalance] = useState("0");
  const [nftaCount, setNftaCount] = useState(0);
  const [nftbCount, setNftbCount] = useState(0);
  const [totPrice, setTotPrice] = useState("0");
  const [tofPrice, setTofPrice] = useState("0");
  const [isAddingTokens, setIsAddingTokens] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    const loadAnnouncements = async () => {
      try {
        const response = await fetch("/api/announcements", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as { data?: AnnouncementItem[] };
        if (!cancelled && Array.isArray(payload.data) && payload.data.length > 0) {
          setAnnouncements(payload.data);
        }
      } catch {
        // fallback to mock data
      }
    };

    loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOnChainOverview = async () => {
      if (!tot || !tof || !nexus || !swap) {
        if (!cancelled) {
          setTotBalance("0");
          setTofBalance("0");
          setNftaCount(0);
          setNftbCount(0);
          setTotPrice("0");
          setTofPrice("0");
        }
        return;
      }

      try {
        const [totDec, tofDec, currentPrice, tofPerUsdt] = await Promise.all([
          tot.decimals(),
          tof.decimals(),
          swap.getCurrentPrice(),
          nexus.tofPerUsdt(),
        ]);

        const hasWallet = isConnected && Boolean(address);
        const [totBal, tofBal, nftaNodes, nftbNodes] = hasWallet
          ? await Promise.all([
              tot.balanceOf(address as string),
              tof.balanceOf(address as string),
              nexus.getUserNftaNodes(address as string),
              nexus.getUserNftbNodes(address as string),
            ])
          : [0n, 0n, [], []];

        if (cancelled) return;

        setTotBalance(ethers.formatUnits(totBal, Number(totDec)));
        setTofBalance(ethers.formatUnits(tofBal, Number(tofDec)));
        setNftaCount(nftaNodes.length);
        setNftbCount(nftbNodes.length);
        setTotPrice(ethers.formatUnits(currentPrice, 18));

        const tofPerUsdtNum = Number(ethers.formatUnits(tofPerUsdt, 18));
        const usdtPerTof = tofPerUsdtNum > 0 ? (1 / tofPerUsdtNum) : 0;
        setTofPrice(String(usdtPerTof));
      } catch {
        if (!cancelled) {
          setTotBalance("0");
          setTofBalance("0");
          setNftaCount(0);
          setNftbCount(0);
          setTotPrice("0");
          setTofPrice("0");
        }
      }
    };

    loadOnChainOverview();

    return () => {
      cancelled = true;
    };
  }, [isConnected, address, tot, tof, nexus, swap]);

  const selectedAnnouncement = announcements.find((item) => item.id === selectedAnnouncementId) ?? null;

  const handleAddProjectTokens = async () => {
    if (!isConnected) {
      toast({
        title: t("connectWallet"),
        description: t("connectWalletFirst"),
      });
      return;
    }

    setIsAddingTokens(true);
    try {
      await addProjectTokens();
      toast({
        title: t("addTokenToWallet"),
        description: t("addTokenToWalletDesc"),
      });
    } finally {
      setIsAddingTokens(false);
    }
  };

  const priceCards = [
    { symbol: "TOT", price: Number(totPrice), change24h: 0, volume: "-" },
    { symbol: "TOF", price: Number(tofPrice), change24h: 0, volume: "-" },
    { symbol: "USDT", price: 1, change24h: 0, volume: "-" },
  ];

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
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedAnnouncementId(item.id)}
                className="w-full text-left p-4 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors"
              >
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
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedAnnouncement)} onOpenChange={(open) => !open && setSelectedAnnouncementId(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge className={typeColors[selectedAnnouncement.type]}>{typeLabels[selectedAnnouncement.type]()}</Badge>
                  <span className="text-sm font-semibold">{selectedAnnouncement.title}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">{selectedAnnouncement.date}</DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-6 text-foreground whitespace-pre-wrap">
                {selectedAnnouncement.content}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("predictionEntryTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("predictionEntryDesc")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!predictionPlatformUrl}
              onClick={() => {
                if (!predictionPlatformUrl) return;
                window.open(predictionPlatformUrl, "_blank", "noopener,noreferrer");
              }}
            >
              {t("predictionEntryButton")}
            </Button>
            <Button
              variant="outline"
              onClick={handleAddProjectTokens}
              disabled={isAddingTokens}
            >
              {isAddingTokens ? t("processing") : t("addTokenToWallet")}
            </Button>
            {!predictionPlatformUrl ? (
              <p className="w-full text-xs text-muted-foreground">{t("predictionEntryMissing")}</p>
            ) : null}
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
            value={`${Number(totBalance).toLocaleString()} TOT`}
            icon={Coins}
          />
          <StatCard
            title={t('totalTofBalance')}
            value={`${Number(tofBalance).toLocaleString()} TOF`}
            icon={Database}
          />
          <StatCard
            title={t('nftPortfolioValue')}
            value={`${nftaCount + nftbCount}`}
            icon={Layers}
            description={`${t('totalNftaNodes')}: ${nftaCount} · ${t('totalNftbNodes')}: ${nftbCount}`}
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
            {priceCards.map((token) => (
              <div key={token.symbol} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-headline font-bold text-sm">{token.symbol}</span>
                  <div className={`flex items-center gap-1 text-xs font-medium ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {token.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                  </div>
                </div>
                <p className="text-lg font-bold">${token.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t('volume')}: ${token.volume}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
