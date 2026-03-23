"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  User,
  Link as LinkIcon,
  Home,
  Cpu,
  ArrowDownUp,
  TrendingUp,
  Users,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/lib/web3-provider";
import { execTx, useNexusContract } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";
import { MOCK_USER_DATA } from "@/lib/mock-data";

import { HomePage } from "@/components/pages/home-page";
import { NodesPage } from "@/components/pages/nodes-page";
import { SwapPage } from "@/components/pages/swap-page";
import { EarningsPage } from "@/components/pages/earnings-page";
import { TeamPage } from "@/components/pages/team-page";
import { AdminPage } from "@/components/pages/admin-page";

type PageTab = "home" | "nodes" | "swap" | "earnings" | "team" | "admin";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<PageTab>("home");
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const { t } = useLanguage();
  const { address, isConnected, isConnecting, connect, chainId } = useWeb3();
  const nexus = useNexusContract();
  const { toast } = useToast();

  // Referral binding state
  const [referrerBound, setReferrerBound] = useState(false);
  const [referrerAddress, setReferrerAddress] = useState("");
  const [isBindingReferrer, setIsBindingReferrer] = useState(false);
  const [referrerError, setReferrerError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check on-chain referrer binding when address changes
  useEffect(() => {
    let cancelled = false;

    const checkBoundStatus = async () => {
      if (!address || !nexus) {
        if (!cancelled) setReferrerBound(false);
        return;
      }

      try {
        const accountInfo = await nexus.accounts(address);
        const referrer = accountInfo.referrer as string;
        if (!cancelled) {
          setReferrerBound(Boolean(referrer) && referrer.toLowerCase() !== ethers.ZeroAddress.toLowerCase());
        }
      } catch {
        if (!cancelled) setReferrerBound(false);
      }
    };

    checkBoundStatus();

    return () => {
      cancelled = true;
    };
  }, [address, nexus]);

  useEffect(() => {
    let cancelled = false;
    const loadOwner = async () => {
      if (!nexus) {
        if (!cancelled) setOwnerAddress(null);
        return;
      }
      try {
        const owner = await nexus.owner();
        if (!cancelled) setOwnerAddress(owner);
      } catch {
        if (!cancelled) setOwnerAddress(null);
      }
    };
    loadOwner();
    return () => {
      cancelled = true;
    };
  }, [nexus]);

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : MOCK_USER_DATA.walletAddress;

  // Owner detection — auto-show admin panel for on-chain contract owner
  const isOwner = isConnected && address
    ? ownerAddress !== null && address.toLowerCase() === ownerAddress.toLowerCase()
    : false;

  // Referral binding required: connected + not owner + not yet bound
  const needsReferralBinding = isConnected && !isOwner && !referrerBound;

  useEffect(() => {
    if (!needsReferralBinding) return;
    if (!ownerAddress) return;
    if (referrerAddress.trim()) return;
    setReferrerAddress(ownerAddress);
  }, [needsReferralBinding, ownerAddress, referrerAddress]);

  if (!mounted) return null;

  const handleBindReferrer = async () => {
    setReferrerError("");
    const trimmed = referrerAddress.trim();
    const fallbackOwner = ownerAddress?.trim() ?? "";
    const finalReferrer = trimmed || fallbackOwner;

    // Validate: must be valid Ethereum address
    if (!finalReferrer || !/^0x[a-fA-F0-9]{40}$/.test(finalReferrer)) {
      setReferrerError(t('referralInvalidAddress'));
      return;
    }
    // Cannot bind self
    if (address && finalReferrer.toLowerCase() === address.toLowerCase()) {
      setReferrerError(t('referralCannotSelf'));
      return;
    }

    if (!nexus || !address) {
      setReferrerError(t('referralInvalidAddress'));
      return;
    }

    setIsBindingReferrer(true);
    try {
      const res = await execTx(nexus.bindReferrer(finalReferrer));
      if (!res.success) {
        setReferrerError(res.error || t('referralInvalidAddress'));
        return;
      }

      setReferrerBound(true);
      toast({
        title: t('referralSuccess'),
        description: t('referralSuccessDesc'),
      });
    } finally {
      setIsBindingReferrer(false);
    }
  };

  const navItems: { key: PageTab; icon: typeof Home; label: string }[] = [
    { key: "home", icon: Home, label: t("navHome") },
    { key: "nodes", icon: Cpu, label: t("navNodes") },
    { key: "swap", icon: ArrowDownUp, label: t("navSwap") },
    { key: "earnings", icon: TrendingUp, label: t("navEarnings") },
    { key: "team", icon: Users, label: t("navTeam") },
    ...(isOwner ? [{ key: "admin" as PageTab, icon: ShieldCheck, label: t("navAdmin") }] : []),
  ];

  const pageContent: Record<PageTab, React.ReactNode> = {
    home: <HomePage />,
    nodes: <NodesPage />,
    swap: <SwapPage />,
    earnings: <EarningsPage />,
    team: <TeamPage />,
    admin: <AdminPage />,
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 md:h-20 items-center gap-4 border-b border-border/50 bg-background/80 px-4 md:px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <img
            src="/truth-oracle-logo-light.svg"
            alt="Truth Oracle"
            className="h-14 md:h-16 w-auto object-contain dark:hidden"
          />
          <img
            src="/truth-oracle-logo-dark.svg"
            alt="Truth Oracle"
            className="hidden dark:block h-14 md:h-16 w-auto object-contain"
          />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          {!isConnected ? (
            <Button
              onClick={connect}
              disabled={isConnecting}
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-4 font-semibold cyan-glow text-xs"
            >
              <LinkIcon size={14} className="mr-1.5" />
              {isConnecting ? t("connecting") : t("connectWallet")}
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 border border-accent/20">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-mono text-accent">{displayAddress}</span>
            </div>
          )}

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
            <div className="flex items-center justify-between md:justify-start md:gap-2">
              <span className="text-muted-foreground">网络</span>
              <span className={chainId === 11155111 ? "text-primary font-medium" : "text-destructive font-medium"}>
                {chainId === 11155111 ? "Sepolia" : "非测试网"}
              </span>
            </div>
            <div className="flex items-center justify-between md:justify-start md:gap-2">
              <span className="text-muted-foreground">钱包</span>
              <span className={isConnected ? "text-primary font-medium" : "text-muted-foreground"}>
                {isConnected ? "已连接" : isConnecting ? "连接中" : "未连接"}
              </span>
            </div>
            <div className="flex items-center justify-between md:justify-start md:gap-2">
              <span className="text-muted-foreground">推荐绑定</span>
              <span className={
                !isConnected || isOwner || referrerBound
                  ? "text-primary font-medium"
                  : "text-amber-600 dark:text-amber-400 font-medium"
              }>
                {!isConnected ? "待连接钱包" : isOwner || referrerBound ? "已完成" : "待绑定"}
              </span>
            </div>
          </div>
        </div>

        {needsReferralBinding ? (
          /* ===== Referral Binding Overlay ===== */
          <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
            <div className="w-full max-w-md mx-auto">
              <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl p-8 shadow-xl space-y-6">
                {/* Icon & Title */}
                <div className="text-center space-y-3">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-headline font-bold">{t('referralBindingTitle')}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t('referralBindingDesc')}</p>
                </div>

                {/* Your Address */}
                <div className="rounded-lg bg-muted/30 border border-border/30 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">{t('connectWallet')}</p>
                  <p className="font-mono text-xs text-accent">{displayAddress}</p>
                </div>

                {/* Referrer Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('referralAddressLabel')}</label>
                  <Input
                    value={referrerAddress}
                    onChange={(e) => { setReferrerAddress(e.target.value); setReferrerError(""); }}
                    placeholder={t('referralAddressPlaceholder')}
                    className="font-mono text-sm"
                  />
                  {referrerError && (
                    <p className="text-xs text-destructive">{referrerError}</p>
                  )}
                </div>

                {/* Confirm Button */}
                <Button
                  onClick={handleBindReferrer}
                  disabled={isBindingReferrer || (!referrerAddress.trim() && !ownerAddress?.trim())}
                  className="w-full bg-primary hover:bg-primary/90 h-11 font-semibold"
                >
                  {isBindingReferrer ? (
                    <>{t('referralBinding')}</>
                  ) : (
                    <>
                      <CheckCircle2 size={16} className="mr-2" />
                      {t('referralConfirmBind')}
                    </>
                  )}
                </Button>

                {/* Skip link */}
                <p className="text-center text-xs text-muted-foreground">
                  {t('referralSkip')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          pageContent[activeTab]
        )}
      </main>

      {/* Footer */}
      <footer className="hidden md:block py-4 px-6 border-t border-border/50 text-center">
        <p className="text-xs text-muted-foreground">{t("footer")}</p>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0 ${
                activeTab === item.key
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
