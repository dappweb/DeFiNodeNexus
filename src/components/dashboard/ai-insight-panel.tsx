"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle2, Zap, ArrowRight, TrendingUp } from "lucide-react";
import { aiPoweredYieldInsight, type AiPoweredYieldInsightOutput } from "@/ai/flows/ai-powered-yield-insight";
import { MOCK_USER_DATA } from "@/lib/mock-data";

export function AiInsightPanel() {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<AiPoweredYieldInsightOutput | null>(null);

  const generateInsight = async () => {
    setLoading(true);
    try {
      // Transforming mock data to fit the schema exactly
      const result = await aiPoweredYieldInsight({
        walletAddress: MOCK_USER_DATA.walletAddress,
        totBalance: MOCK_USER_DATA.balances.tot,
        tofBalance: MOCK_USER_DATA.balances.tof,
        usdtBalance: MOCK_USER_DATA.balances.usdt,
        nftaHoldings: MOCK_USER_DATA.nftaNodes.map(n => ({
          nodeId: n.nodeId,
          yieldPerDay: n.yieldPerDay
        })),
        nftbHoldings: MOCK_USER_DATA.nftbNodes.map(n => ({
          nodeId: n.nodeId,
          level: n.level,
          weight: n.weight,
          historicalDividends: n.historicalDividends
        })),
        predictionMarketHistory: MOCK_USER_DATA.predictionHistory
      });
      setInsight(result);
    } catch (error) {
      console.error("Failed to generate insight", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-panel border-accent/20 cyan-glow overflow-hidden h-full">
      <CardHeader className="bg-accent/5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="text-accent h-5 w-5" />
          <CardTitle className="text-xl">AI Yield Nexus</CardTitle>
        </div>
        <CardDescription>
          Optimize your portfolio using advanced blockchain behavioral analytics.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {!insight ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="p-4 rounded-full bg-accent/10">
              <Zap className="h-10 w-10 text-accent animate-pulse" />
            </div>
            <div className="space-y-2">
              <h4 className="font-headline font-semibold">Ready for Analysis</h4>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Connect your history and let our AI suggest the best yield optimization strategies for your NFT holdings.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-accent text-sm font-semibold uppercase tracking-wider">
                <Activity className="h-4 w-4" />
                <span>Overall Summary</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {insight.overallSummary}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-[10px] font-bold text-primary uppercase">TOT Strategy</span>
                <p className="text-[11px] leading-snug mt-1">{insight.totYieldStrategy}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                <span className="text-[10px] font-bold text-accent uppercase">TOF Strategy</span>
                <p className="text-[11px] leading-snug mt-1">{insight.tofYieldStrategy}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-accent text-sm font-semibold uppercase tracking-wider">
                <ArrowRight className="h-4 w-4" />
                <span>Actionable Steps</span>
              </div>
              <ul className="space-y-2">
                {insight.actionableInsights.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-accent shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/30 border-t border-border/50 p-6">
        <Button 
          onClick={generateInsight} 
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-white font-headline"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Blockchain History...
            </>
          ) : (
            <>
              {insight ? "Refresh Strategy" : "Generate Optimized Strategy"}
              <Sparkles className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}