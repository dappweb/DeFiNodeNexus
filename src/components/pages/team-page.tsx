"use client";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useReadonlyNexusContract } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";
import { formatAddress } from "@/lib/ui-config";
import { useWeb3 } from "@/lib/web3-provider";
import { ethers } from "ethers";
import { Coins, Copy, Link2, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type TeamMember = {
  address: string;
  totalNodes: bigint;
  pendingTot: bigint;
};

const MEMBER_QUERY_BATCH = 8;

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

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
      // Step 1: Read caller's account — covers directReferrals, teamNodes, referrer
      const account = await nexus.accounts(address);
      setDirectReferrals(account.directReferrals);
      // teamNodes is stored on-chain; no BFS needed
      setTeamMemberCount(Number(account.teamNodes));

      const referrer = String(account.referrer);
      if (referrer && referrer.toLowerCase() !== ethers.ZeroAddress.toLowerCase()) {
        setMyReferrer(ethers.getAddress(referrer));
      } else {
        setMyReferrer(null);
      }

      // teamDepositTotal: use on-chain teamCommissionEarned as proxy
      setTeamDepositTotal(account.teamCommissionEarned);

      // Early exit if no direct members
      if (account.directReferrals === 0n) {
        setDirectDepositTotal(0n);
        setMembers([]);
        return;
      }

      // Step 2: Resolve direct children directly from contract storage
      const getDirectAddresses = async (): Promise<string[]> => {
        const direct = (await nexus.getDirectChildren(address)) as string[];
        return direct
          .filter((item) => typeof item === "string" && ethers.isAddress(item))
          .map((item) => ethers.getAddress(item));
      };

      const directAddresses = await getDirectAddresses();

      // Step 4: Compute each direct member's investment from contract state
      // getUserNftaNodes/getUserNftbNodes + tier price — NO event scan
      const nftaTierCache = new Map<string, bigint>();
      const nftbTierCache = new Map<string, bigint>();
      const getUserInvestment = async (userAddress: string): Promise<bigint> => {
        const [nftaIds, nftbIds] = await Promise.all([
          nexus.getUserNftaNodes(userAddress),
          nexus.getUserNftbNodes(userAddress),
        ]);

        const nftaNodes = await Promise.all(nftaIds.map((id: bigint) => nexus.nftaNodes(id)));
        const nftbNodes = await Promise.all(nftbIds.map((id: bigint) => nexus.nftbNodes(id)));

        const uniqueNftaTiers = [...new Set(nftaNodes.map((n: any) => String(n.tierId)))];
        const uniqueNftbTiers = [...new Set(nftbNodes.map((n: any) => String(n.tierId)))];

        await Promise.all([
          ...uniqueNftaTiers.map(async (tid) => {
            if (nftaTierCache.has(tid)) return;
            const tier = await nexus.nftaTiers(BigInt(tid));
            nftaTierCache.set(tid, BigInt(tier.price));
          }),
          ...uniqueNftbTiers.map(async (tid) => {
            if (nftbTierCache.has(tid)) return;
            const tier = await nexus.nftbTiers(BigInt(tid));
            nftbTierCache.set(tid, BigInt(tier.price));
          }),
        ]);

        let total = 0n;
        for (const n of nftaNodes) total += nftaTierCache.get(String(n.tierId)) ?? 0n;
        for (const n of nftbNodes) total += nftbTierCache.get(String(n.tierId)) ?? 0n;
        return total;
      };

      // Step 5: Fetch member details + investment in batched parallel mode
      const memberResults: Array<PromiseSettledResult<(TeamMember & { investment: bigint })>> = [];
      for (const batch of chunkArray(directAddresses, MEMBER_QUERY_BATCH)) {
        const settled = await Promise.allSettled(
          batch.map(async (memberAddr) => {
            const [memberAccount, investment] = await Promise.all([
              nexus.accounts(memberAddr),
              getUserInvestment(memberAddr),
            ]);
            return {
              address: ethers.getAddress(memberAddr),
              totalNodes: memberAccount.totalNodes,
              pendingTot: memberAccount.pendingTot,
              investment,
            } as TeamMember & { investment: bigint };
          })
        );
        memberResults.push(...settled);
      }

      let nextDirectDeposit = 0n;
      const memberList: TeamMember[] = [];
      for (const r of memberResults) {
        if (r.status === "fulfilled") {
          nextDirectDeposit += r.value.investment;
          memberList.push({ address: r.value.address, totalNodes: r.value.totalNodes, pendingTot: r.value.pendingTot });
        }
      }

      setDirectDepositTotal(nextDirectDeposit);
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
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-mono text-xs text-muted-foreground truncate cursor-pointer hover:text-foreground transition-colors"
                    title={member.address}
                    onClick={() => { copyText(member.address).then((ok) => ok && toast({ title: t("contractAddressCopied") })); }}
                  >
                    {formatAddress(member.address)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{t("directMemberLabel")}</span>
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
