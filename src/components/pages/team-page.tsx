"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Trophy, Coins, Copy, Link2, Star, ShieldCheck, ChevronRight } from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";

export function TeamPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { teamInfo, teamMembers } = MOCK_USER_DATA;

  const inviteUrl = "https://definodenexus.app/ref/0x71C4f32";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast({ title: t('linkCopied') });
  };

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass-panel p-4 text-center">
          <Users className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">{t('totalMembers')}</p>
          <p className="text-2xl font-bold font-headline">{teamInfo.totalMembers}</p>
        </Card>
        <Card className="glass-panel p-4 text-center">
          <UserPlus className="h-6 w-6 text-accent mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">{t('directReferrals')}</p>
          <p className="text-2xl font-bold font-headline">{teamInfo.directReferrals}</p>
        </Card>
        <Card className="glass-panel p-4 text-center">
          <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">{t('teamLevel')}</p>
          <p className="text-2xl font-bold font-headline">Lv.{teamInfo.teamLevel}</p>
        </Card>
        <Card className="glass-panel p-4 text-center">
          <Coins className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">{t('teamBonusLabel')}</p>
          <p className="text-2xl font-bold font-headline">{teamInfo.teamBonus} TOT</p>
        </Card>
        <Card className="glass-panel p-4 text-center col-span-2 md:col-span-1">
          <Trophy className="h-6 w-6 text-purple-500 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">{t('totalTeamEarnings')}</p>
          <p className="text-2xl font-bold font-headline">{teamInfo.totalTeamEarnings.toLocaleString()} TOT</p>
        </Card>
      </div>

      {/* Level Guide */}
      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <ShieldCheck className="text-yellow-500" />
          <CardTitle className="text-base">{t('levelGuide')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">{t('levelGuideDesc')}</p>
          <div className="space-y-2">
            {[
              { lv: 1, name: t('levelLv1Name'), req: t('levelLv1Req'), bonus: t('levelLv1Bonus'), color: 'blue' },
              { lv: 2, name: t('levelLv2Name'), req: t('levelLv2Req'), bonus: t('levelLv2Bonus'), color: 'green' },
              { lv: 3, name: t('levelLv3Name'), req: t('levelLv3Req'), bonus: t('levelLv3Bonus'), color: 'yellow' },
              { lv: 4, name: t('levelLv4Name'), req: t('levelLv4Req'), bonus: t('levelLv4Bonus'), color: 'purple' },
              { lv: 5, name: t('levelLv5Name'), req: t('levelLv5Req'), bonus: t('levelLv5Bonus'), color: 'amber' },
            ].map((item) => {
              const isCurrent = item.lv === teamInfo.teamLevel;
              const colorMap: Record<string, string> = {
                blue: 'border-blue-500/30 bg-blue-500/5',
                green: 'border-green-500/30 bg-green-500/5',
                yellow: 'border-yellow-500/30 bg-yellow-500/5',
                purple: 'border-purple-500/30 bg-purple-500/5',
                amber: 'border-amber-500/30 bg-amber-500/5',
              };
              const activeMap: Record<string, string> = {
                blue: 'border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30',
                green: 'border-green-500 bg-green-500/15 ring-2 ring-green-500/30',
                yellow: 'border-yellow-500 bg-yellow-500/15 ring-2 ring-yellow-500/30',
                purple: 'border-purple-500 bg-purple-500/15 ring-2 ring-purple-500/30',
                amber: 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30',
              };
              return (
                <div
                  key={item.lv}
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                    isCurrent ? activeMap[item.color] : colorMap[item.color]
                  }`}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted/50 font-headline font-bold text-sm shrink-0">
                    Lv.{item.lv}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{item.name}</span>
                      {isCurrent && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0">{t('currentLevel')}</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('levelRequirements')}: {item.req}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">{t('levelBonusRate')}</p>
                    <p className="font-bold text-accent text-lg">{item.bonus}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invite Card */}
      <Card className="glass-panel border-primary/20">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-headline font-bold flex items-center gap-2 mb-1">
                <Link2 className="h-4 w-4 text-primary" />
                {t('inviteLink')}
              </h3>
              <p className="text-xs text-muted-foreground">{t('inviteDesc')}</p>
            </div>
            <div className="flex gap-2 flex-1">
              <Input value={inviteUrl} readOnly className="font-mono text-xs bg-muted/30" />
              <Button onClick={handleCopyLink} variant="outline" className="shrink-0 border-primary/30 hover:bg-primary/10">
                <Copy className="h-4 w-4 mr-2" />
                {t('copyLink')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="glass-panel overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-2">
          <Users className="text-primary" />
          <CardTitle>{t('teamMemberList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>{t('memberAddress')}</TableHead>
                  <TableHead>{t('memberLevel')}</TableHead>
                  <TableHead>{t('memberNodes')}</TableHead>
                  <TableHead>{t('memberContribution')}</TableHead>
                  <TableHead>{t('memberJoinDate')}</TableHead>
                  <TableHead>{t('memberStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member, i) => (
                  <TableRow key={i} className="border-border/50">
                    <TableCell className="font-mono text-xs">{member.address}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">Lv.{member.level}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{member.nodesCount}</TableCell>
                    <TableCell className="font-medium">{member.contribution} TOT</TableCell>
                    <TableCell className="text-xs">{member.joinDate}</TableCell>
                    <TableCell>
                      <Badge className={member.status === "active" ? "bg-green-500/15 text-green-500 border-green-500/30" : "bg-red-500/15 text-red-500 border-red-500/30"}>
                        {member.status === "active" ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {teamMembers.map((member, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{member.address}</span>
                  <Badge className={member.status === "active" ? "bg-green-500/15 text-green-500 border-green-500/30" : "bg-red-500/15 text-red-500 border-red-500/30"}>
                    {member.status === "active" ? t('active') : t('inactive')}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('memberLevel')}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">Lv.{member.level}</Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('memberNodes')}</p>
                    <p className="font-medium text-sm">{member.nodesCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('memberContribution')}</p>
                    <p className="font-medium text-sm">{member.contribution}</p>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground text-right">{t('memberJoinDate')}: {member.joinDate}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
