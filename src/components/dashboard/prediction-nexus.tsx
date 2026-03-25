"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, ArrowUpRight, Trophy, Target, ExternalLink } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";

const PREDICTION_PLATFORM_URL = "https://deepseamonster.netlify.app/";

export function PredictionNexus() {
  const history = MOCK_USER_DATA.predictionHistory;
  const { t } = useLanguage();

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="text-primary" />
          <CardTitle>{t('predictionNexus')}</CardTitle>
        </div>
        <a
          href={PREDICTION_PLATFORM_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Badge className="bg-accent/20 text-accent hover:bg-accent/30 cursor-pointer transition-colors flex items-center gap-1">
            {t('liveStats')} <ExternalLink size={10} />
          </Badge>
        </a>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border/50 bg-muted/30 flex flex-col items-center justify-center text-center space-y-1">
              <Trophy className="h-6 w-6 text-accent mb-1" />
              <span className="text-2xl font-bold font-headline">$2.4M</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('totalVolume')}</span>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-muted/30 flex flex-col items-center justify-center text-center space-y-1">
              <Target className="h-6 w-6 text-primary mb-1" />
              <span className="text-2xl font-bold font-headline">84%</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('globalWinRate')}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('latestPredictions')}</h4>
            <div className="space-y-2">
              {history.map((p) => (
                <div key={p.predictionId} className="group p-3 rounded-lg border border-border/30 bg-muted/10 hover:border-primary/50 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded flex items-center justify-center ${p.winnings > 0 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
                      {p.winnings > 0 ? <ArrowUpRight size={18} /> : <Target size={18} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{p.platform}</p>
                      <p className="text-[10px] text-muted-foreground">{p.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{p.winnings > 0 ? `+${p.winnings} TOT` : `-${p.stake} TOT`}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{p.outcome}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <a href={PREDICTION_PLATFORM_URL} target="_blank" rel="noopener noreferrer" className="w-full block">
            <Button className="w-full bg-secondary hover:bg-secondary/80 text-foreground border border-border">
              <ExternalLink size={14} className="mr-2" />
              {t('enterPortal')}
            </Button>
          </a>
          <p className="text-center text-[10px] text-muted-foreground break-all">{PREDICTION_PLATFORM_URL}</p>
        </div>
      </CardContent>
    </Card>
  );
}
