"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Coins, Copy, Link2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";
import { useReadonlyNexusContract } from "@/hooks/use-contract";
import { useWeb3 } from "@/lib/web3-provider";
import { formatAddress, formatBalance } from "@/lib/ui-config";

type TeamMember = {
  address: string;
  totalNodes: bigint;
  pendingTot: bigint;
};

export function TeamPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { address } = useWeb3();
  const nexus = useReadonlyNexusContract();

  const [directReferrals, setDirectReferrals] = useState<bigint>(BigInt(0));
  const [teamMemberCount, setTeamMemberCount] = useState(0);
  const [directDepositTotal, setDirectDepositTotal] = useState<bigint>(BigInt(0));
  const [teamDepositTotal, setTeamDepositTotal] = useState<bigint>(BigInt(0));
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteUrl, setInviteUrl] = useState("");
  const [myReferrer, setMyReferrer] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!nexus || !address) {
      setDirectReferrals(0n);
      setTeamMemberCount(0);
      setDirectDepositTotal(0n);
      setTeamDepositTotal(0n);
      setMembers([]);
      setMyReferrer(null);
      return;
    }

    try {
      const account = await nexus.accounts(address);
      setDirectReferrals(account.directReferrals);
      const referrer = String(account.referrer);
      if (referrer && referrer.toLowerCase() !== ethers.ZeroAddress.toLowerCase()) {
        setMyReferrer(ethers.getAddress(referrer));
      } else {
        setMyReferrer(null);
      }

      const userLower = address.toLowerCase();

      const getDirectChildren = async (referrerAddress: string) => {
        const events = await nexus.queryFilter(nexus.filters.ReferrerBound(null, referrerAddress));
        const set = new Set<string>();
        for (const ev of events as any[]) {
          set.add(String(ev.args.user).toLowerCase());
        }
        return Array.from(set);
      };

      const directAddresses = await getDirectChildren(userLower);
      const directSet = new Set(directAddresses);

      const downlineSet = new Set<string>(directAddresses);
      const queue = [...directAddresses];
      while (queue.length > 0) {
        const current = queue.shift()!;
        const children = await getDirectChildren(current);
        for (const child of children) {
          if (downlineSet.has(child)) continue;
          downlineSet.add(child);
          queue.push(child);
        }
      }
      setTeamMemberCount(downlineSet.size);

      const getUserPurchaseTotal = async (userAddress: string) => {
        const [nftaPurchaseEvents, nftbPurchaseEvents] = await Promise.all([
          nexus.queryFilter(nexus.filters.NftaPurchased(userAddress, null, null)),
          nexus.queryFilter(nexus.filters.NftbPurchased(userAddress, null, null)),
        ]);
        let total = 0n;
        for (const ev of nftaPurchaseEvents as any[]) total += BigInt(ev.args.price);
        for (const ev of nftbPurchaseEvents as any[]) total += BigInt(ev.args.price);
        return total;
      };

      const directTotals = await Promise.allSettled(directAddresses.map((member) => getUserPurchaseTotal(member)));
      let nextDirectDeposit = 0n;
      for (const result of directTotals) {
        if (result.status === "fulfilled") {
          nextDirectDeposit += result.value;
        }
      }

      const downlineAddresses = Array.from(downlineSet);
      const teamTotals = await Promise.allSettled(downlineAddresses.map((member) => getUserPurchaseTotal(member)));
      let nextTeamDeposit = 0n;
      for (const result of teamTotals) {
        if (result.status === "fulfilled") {
          nextTeamDeposit += result.value;
        }
      }

      setDirectDepositTotal(nextDirectDeposit);
      setTeamDepositTotal(nextTeamDeposit);

      const memberCalls = directAddresses.map(async (memberAddr) => {
        const memberAccount = await nexus.accounts(memberAddr);

        return {
          address: ethers.getAddress(memberAddr),
          totalNodes: memberAccount.totalNodes,
          pendingTot: memberAccount.pendingTot,
        } as TeamMember;
      });

      const memberList = await Promise.all(memberCalls);
      setMembers(memberList);
    } catch {
      setDirectReferrals(0n);
      setTeamMemberCount(0);
      setDirectDepositTotal(0n);
      setTeamDepositTotal(0n);
      setMembers([]);
      setMyReferrer(null);
    }
  }, [nexus, address]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!address || typeof window === "undefined") {
      setInviteUrl("");
      return;
    }
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || window.location.origin;
    setInviteUrl(`${appOrigin}/?ref=${address}`);
  }, [address]);

  const copyText = async (text: string) => {
    if (typeof window === "undefined") return false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback below
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      const body = document.body;
      body.appendChild(textarea);

      try {
        textarea.focus();
        textarea.select();
        return document.execCommand("copy");
      } finally {
        if (body.contains(textarea)) {
          body.removeChild(textarea);
        }
      }
    } catch {
      return false;
    }
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) {
      toast({ title: t("contractAddressCopyFailed"), description: t("inviteLinkNotReady") });
      return;
    }

    const copied = await copyText(inviteUrl);
    if (copied) {
      toast({ title: t("linkCopied") });
      return;
    }

    toast({ title: t("contractAddressCopyFailed"), description: t("inviteLinkCopyFailedDesc") });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="glass-panel p-4 text-center">
          <Users className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">{t("directCount")}</p>
          <p className="text-2xl font-bold font-headline">{directReferrals.toString()}</p>
        </Card>
        <Card className="glass-panel p-4 text-center">
          <UserPlus className="h-6 w-6 text-accent mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">{t("teamCount")}</p>
          <p className="text-2xl font-bold font-headline">{teamMemberCount}</p>
        </Card>
        <Card className="glass-panel p-4 text-center">
          <Coins className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">{t("directDepositTotal")}</p>
          <p className="text-xl font-bold font-headline">{Number(ethers.formatUnits(directDepositTotal, 18)).toLocaleString()}</p>
        </Card>
        <Card className="glass-panel p-4 text-center">
          <Coins className="h-6 w-6 text-purple-500 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">{t("teamDepositTotal")}</p>
          <p className="text-xl font-bold font-headline">{Number(ethers.formatUnits(teamDepositTotal, 18)).toLocaleString()}</p>
        </Card>
      </div>

      <Card className="glass-panel border-primary/20">
        <CardContent className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-headline font-bold flex items-center gap-2 mb-1">
                <UserPlus className="h-4 w-4 text-primary" />
                {t("myReferrer")}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">{t("myReferrerDesc")}</p>
              <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                <p className="font-mono text-xs break-all text-foreground">
                  {myReferrer ?? t("noReferrerBound")}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-headline font-bold flex items-center gap-2 mb-1">
                <Link2 className="h-4 w-4 text-primary" />
                {t("inviteLink")}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">{t("onChainBindPermanent")}</p>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="font-mono text-xs bg-muted/30" />
                <Button onClick={handleCopyLink} variant="outline" className="shrink-0 border-primary/30 hover:bg-primary/10">
                  <Copy className="h-4 w-4 mr-2" />
                  {t("copyLink")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-2">
          <Users className="text-primary" />
          <CardTitle>{t("directMembersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("noDirectMembers")}</div>
          ) : (
            members.map((member) => (
              <div key={member.address} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{member.address}</span>
                  <span className="text-xs text-muted-foreground">{t("directMemberLabel")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t("totalNodesLabel")}</p>
                    <p className="font-medium text-sm">{member.totalNodes.toString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t("pendingTotLabel")}</p>
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
