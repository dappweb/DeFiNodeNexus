"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Trophy, Coins, Copy, Link2, Star, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";
import { useNexusContract } from "@/hooks/use-contract";
import { useWeb3 } from "@/lib/web3-provider";

type TeamMember = {
  address: string;
  level: number;
  totalNodes: bigint;
  pendingTot: bigint;
};

export function TeamPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { address, provider } = useWeb3();
  const nexus = useNexusContract();

  const [level, setLevel] = useState(0);
  const [directReferrals, setDirectReferrals] = useState<bigint>(BigInt(0));
  const [teamCommissionEarned, setTeamCommissionEarned] = useState<bigint>(BigInt(0));
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteUrl, setInviteUrl] = useState("");

  const refreshData = useCallback(async () => {
    if (!nexus || !address) return;

    const [account, lv] = await Promise.all([
      nexus.accounts(address),
      nexus.getUserLevel(address),
    ]);

    setLevel(Number(lv));
    setDirectReferrals(account.directReferrals);
    setTeamCommissionEarned(account.teamCommissionEarned);

    if (!provider) {
      setMembers([]);
      return;
    }

    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 120_000);

    const events = await nexus.queryFilter(nexus.filters.ReferrerBound(null, address), fromBlock, latestBlock);
    const directAddresses = Array.from(new Set(events.map((ev: any) => String(ev.args.user).toLowerCase())));

    const memberCalls = directAddresses.map(async (memberAddr) => {
      const [memberAccount, memberLevel] = await Promise.all([
        nexus.accounts(memberAddr),
        nexus.getUserLevel(memberAddr),
      ]);

      return {
        address: memberAddr,
        level: Number(memberLevel),
        totalNodes: memberAccount.totalNodes,
        pendingTot: memberAccount.pendingTot,
      } as TeamMember;
    });

    const memberList = await Promise.all(memberCalls);
    setMembers(memberList);
  }, [nexus, address, provider]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!address || typeof window === "undefined") return;
    setInviteUrl(`${window.location.origin}/?ref=${address}`);
  }, [address]);

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    toast({ title: t("linkCopied") });
  };

  const totalMembers = useMemo(() => members.length, [members]);
  const levelRules = useMemo(
    () => [
      { layer: 1, minReferrals: 3n },
      { layer: 2, minReferrals: 8n },
      { layer: 3, minReferrals: 15n },
      { layer: 4, minReferrals: 30n },
      { layer: 5, minReferrals: 50n },
    ],
    []
  );

  const predictedLayer = useMemo(() => {
    let current = 0;
    for (const rule of levelRules) {
      if (directReferrals >= rule.minReferrals) {
        current = rule.layer;
      }
    }
    return current;
  }, [directReferrals, levelRules]);

  const nextRule = useMemo(
    () => levelRules.find((rule) => rule.layer === predictedLayer + 1),
    [levelRules, predictedLayer]
  );

  const referralsToNext = useMemo(
    () => (nextRule ? nextRule.minReferrals - directReferrals : 0n),
    [nextRule, directReferrals]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-panel p-4 text-center">
          <Users className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">Direct Members</p>
          <p className="text-2xl font-bold font-headline">{totalMembers}</p>
        </Card>
        <Card className="glass-panel p-4 text-center">
          <UserPlus className="h-6 w-6 text-accent mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">{t("directReferrals")}</p>
          <p className="text-2xl font-bold font-headline">{directReferrals.toString()}</p>
        </Card>
        <Card className="glass-panel p-4 text-center">
          <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">团队层级</p>
          <p className="text-2xl font-bold font-headline">第 {level} 层</p>
        </Card>
        <Card className="glass-panel p-4 text-center col-span-2 md:col-span-1">
          <Trophy className="h-6 w-6 text-purple-500 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">Team Commission (USDT)</p>
          <p className="text-xl font-bold font-headline">{Number(ethers.formatUnits(teamCommissionEarned, 18)).toLocaleString()}</p>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <ShieldCheck className="text-yellow-500" />
          <CardTitle className="text-base">层级规则（链上）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-1">
            <div>预测层级：第 {predictedLayer} 层</div>
            <div className="text-muted-foreground text-xs">
              {nextRule
                ? `距离第${nextRule.layer}层还差 ${referralsToNext.toString()} 个直推`
                : "已达到当前规则最高层级"}
            </div>
            <div className="text-muted-foreground text-xs">链上当前层级：第 {level} 层</div>
          </div>
          <div>第1层：直推≥3</div>
          <div>第2层：直推≥8</div>
          <div>第3层：直推≥15</div>
          <div>第4层：直推≥30</div>
          <div>第5层：直推≥50</div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-primary/20">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-headline font-bold flex items-center gap-2 mb-1">
                <Link2 className="h-4 w-4 text-primary" />
                {t("inviteLink")}
              </h3>
              <p className="text-xs text-muted-foreground">链上绑定推荐关系后永久生效</p>
            </div>
            <div className="flex gap-2 flex-1">
              <Input value={inviteUrl} readOnly className="font-mono text-xs bg-muted/30" />
              <Button onClick={handleCopyLink} variant="outline" className="shrink-0 border-primary/30 hover:bg-primary/10">
                <Copy className="h-4 w-4 mr-2" />
                {t("copyLink")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-2">
          <Users className="text-primary" />
          <CardTitle>Direct Referrals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <div className="text-sm text-muted-foreground">暂无链上直推成员</div>
          ) : (
            members.map((member) => (
              <div key={member.address} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{member.address}</span>
                  <Badge variant="outline" className="text-xs">第{member.level}层</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Nodes</p>
                    <p className="font-medium text-sm">{member.totalNodes.toString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Pending TOT</p>
                    <p className="font-medium text-sm">{Number(ethers.formatUnits(member.pendingTot, 18)).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
