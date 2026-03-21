"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, ArrowUpRight, Trophy, Target } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";

export function PredictionNexus() {
  const history = MOCK_USER_DATA.predictionHistory;

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="text-primary" />
          <CardTitle>Prediction Nexus</CardTitle>
        </div>
        <Badge className="bg-accent/20 text-accent hover:bg-accent/30 cursor-pointer transition-colors">
          LIVE STATS
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border/50 bg-black/20 flex flex-col items-center justify-center text-center space-y-1">
              <Trophy className="h-6 w-6 text-accent mb-1" />
              <span className="text-2xl font-bold font-headline">$2.4M</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Volume</span>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-black/20 flex flex-col items-center justify-center text-center space-y-1">
              <Target className="h-6 w-6 text-primary mb-1" />
              <span className="text-2xl font-bold font-headline">84%</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Global Win Rate</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Latest Predictions</h4>
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

          <Button className="w-full bg-secondary hover:bg-secondary/80 text-foreground border border-border">
            Enter Prediction Portal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}