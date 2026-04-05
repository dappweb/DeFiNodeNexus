"use client";

import { useLanguage } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { execTx, useNexusContract } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useWeb3 } from "@/lib/web3-provider";
import { ethers } from "ethers";
import {
    ArrowDownUp,
    CheckCircle2,
    Cpu,
    Home,
    Link as LinkIcon,
    LogOut,
    ShieldCheck,
    TrendingUp,
    UserPlus,
    Users
} from "lucide-react";
import { useEffect, useState } from "react";

import { WalletConnectButton } from "@/components/wallet-connect-button";
import { HomePage } from "@/components/pages/home-page";
import { NodesPage } from "@/components/pages/nodes-page";
import { SwapPage } from "@/components/pages/swap-page";
import { EarningsPage } from "@/components/pages/earnings-page";
import { TeamPage } from "@/components/pages/team-page";
import { AdminPage } from "@/components/pages/admin-page";

type PageTab = "home" | "nodes" | "swap" | "earnings" | "team" | "admin";

function sanitizeAddressInput(value: string) {
  return value.replace(/[\s\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "");
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<PageTab>("home");
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const { t } = useLanguage();
  const { address, isConnected, isConnecting, connect, disconnect, chainId } = useWeb3();
  const nexus = useNexusContract();
  const { toast } = useToast();

  // Referral binding state
  const [referrerBound, setReferrerBound] = useState(false);
  const [referrerStatusLoaded, setReferrerStatusLoaded] = useState(false);
  const [referrerAddress, setReferrerAddress] = useState("");
  const [referrerFromUrl, setReferrerFromUrl] = useState<string | null>(null);
  const [isBindingReferrer, setIsBindingReferrer] = useState(false);
  const [referrerError, setReferrerError] = useState("");
  const [referralPromptDismissed, setReferralPromptDismissed] = useState(false);
  const [ownerStatusLoaded, setOwnerStatusLoaded] = useState(false);
  const [isOperatorManager, setIsOperatorManager] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const search = new URLSearchParams(window.location.search);
    const candidate = sanitizeAddressInput(search.get("ref") || search.get("referrer") || search.get("invite") || "");

    if (!candidate) {
      setReferrerFromUrl(null);
      return;
    }

    if (ethers.isAddress(candidate)) {
      setReferrerFromUrl(candidate);
      return;
    }

    setReferrerFromUrl(null);
  }, []);

  // Check on-chain referrer binding when address changes
  useEffect(() => {
    let cancelled = false;

    const checkBoundStatus = async () => {
      if (!cancelled) setReferrerStatusLoaded(false);

      if (!address || !nexus) {
        if (!cancelled) {
          setReferrerBound(false);
          setReferrerStatusLoaded(false);
        }
        return;
      }

      try {
        const accountInfo = await nexus.accounts(address);
        const referrer = accountInfo.referrer as string;
        if (!cancelled) {
          setReferrerBound(Boolean(referrer) && referrer.toLowerCase() !== ethers.ZeroAddress.toLowerCase());
          setReferrerStatusLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setReferrerBound(false);
          setReferrerStatusLoaded(true);
        }
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
      if (!cancelled) setOwnerStatusLoaded(false);

      if (!nexus) {
        if (!cancelled) {
          setOwnerAddress(null);
          setOwnerStatusLoaded(false);
        }
        return;
      }
      try {
        const owner = await nexus.owner();
        if (!cancelled) {
          setOwnerAddress(owner);
          setOwnerStatusLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setOwnerAddress(null);
          setOwnerStatusLoaded(true);
        }
      }
    };
    loadOwner();
    return () => {
      cancelled = true;
    };
  }, [nexus]);

  useEffect(() => {
    let cancelled = false;
    const checkOperator = async () => {
      if (!nexus || !address) {
        if (!cancelled) setIsOperatorManager(false);
        return;
      }
      try {
        const result = await nexus.isDistributor(address);
        if (!cancelled) setIsOperatorManager(Boolean(result));
      } catch {
        if (!cancelled) setIsOperatorManager(false);
      }
    };
    checkOperator();
    return () => { cancelled = true; };
  }, [nexus, address]);

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : MOCK_USER_DATA.walletAddress;

  // Owner detection — auto-show admin panel for on-chain contract owner
  const isOwner = isConnected && address && ownerAddress !== null
    ? address.toLowerCase() === ownerAddress.toLowerCase()
    : false;

  const shouldShowAdmin = isOwner || isOperatorManager;

  // Referral binding required: connected + not owner + not yet bound
  // Root node (owner) never needs referral binding
  const needsReferralBinding = isConnected && ownerStatusLoaded && referrerStatusLoaded && !isOwner && !referrerBound;
  const shouldBlockForReferral = needsReferralBinding && !referralPromptDismissed;

  useEffect(() => {
    if (!shouldShowAdmin && activeTab === "admin") {
      setActiveTab("home");
    }
  }, [shouldShowAdmin, activeTab]);

  useEffect(() => {
    if (!needsReferralBinding) return;

    const addressLower = address?.toLowerCase();

    setReferrerAddress((prev) => {
      const cleaned = sanitizeAddressInput(prev);
      const isSelf = Boolean(addressLower) && cleaned.toLowerCase() === addressLower;
      const isValid = ethers.isAddress(cleaned);

      if (!cleaned && referrerFromUrl) {
        const isUrlSelf = Boolean(addressLower) && referrerFromUrl.toLowerCase() === addressLower;
        if (!isUrlSelf) {
          return referrerFromUrl;
        }
      }

      if (!cleaned && ownerAddress) {
        return ownerAddress;
      }

      if (!cleaned || !isValid || isSelf) {
        return ownerAddress ?? prev;
      }

      return cleaned;
    });
  }, [needsReferralBinding, ownerAddress, address, referrerFromUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!address) {
      setReferralPromptDismissed(false);
      return;
    }

    const key = `referral-skip-${address.toLowerCase()}`;
    setReferralPromptDismissed(window.localStorage.getItem(key) === "1");
  }, [address]);

  const hasPurchasedNode = MOCK_USER_DATA.nftaNodes.length + MOCK_USER_DATA.nftbNodes.length > 0;

  if (!mounted) return null;

  const handleBindReferrer = async () => {
    setReferrerError("");
    const sanitizedReferrer = sanitizeAddressInput(referrerAddress);
    const fallbackOwner = sanitizeAddressInput(ownerAddress ?? "");
    const finalReferrer = sanitizedReferrer || fallbackOwner;

    // Validate: must be valid Ethereum address
    if (!finalReferrer || !ethers.isAddress(finalReferrer)) {
      setReferrerError(t('referralInvalidAddress'));
      return;
    }

    const normalizedReferrer = ethers.getAddress(finalReferrer);

    // Cannot bind self
    if (address && normalizedReferrer.toLowerCase() === address.toLowerCase()) {
      setReferrerError(t('referralCannotSelf'));
      return;
    }

    if (!nexus || !address) {
      setReferrerError(t('referralInvalidAddress'));
      return;
    }

    setIsBindingReferrer(true);
    try {
      const res = await execTx(() => nexus.bindReferrer(normalizedReferrer));
      if (!res.success) {
        setReferrerError(res.error || t('referralInvalidAddress'));
        return;
      }

      setReferrerAddress(normalizedReferrer);

      setReferrerBound(true);
      setReferralPromptDismissed(false);
      if (typeof window !== "undefined" && address) {
        window.localStorage.removeItem(`referral-skip-${address.toLowerCase()}`);
      }
      toast({
        title: t('referralSuccess'),
        description: t('referralSuccessDesc'),
      });
    } finally {
      setIsBindingReferrer(false);
    }
  };

  const handleSkipReferralForNow = () => {
    if (!address) return;
    setReferralPromptDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`referral-skip-${address.toLowerCase()}`, "1");
    }
    toast({
      title: t("referralSkipForNow"),
      description: t("referralSkipHint"),
    });
  };

  const navItems: { key: PageTab; icon: typeof Home; label: string }[] = [
    { key: "home", icon: Home, label: t("navHome") },
    { key: "nodes", icon: Cpu, label: t("navNodes") },
    { key: "swap", icon: ArrowDownUp, label: t("navSwap") },
    { key: "earnings", icon: TrendingUp, label: t("navEarnings") },
    { key: "team", icon: Users, label: t("navTeam") },
    ...(shouldShowAdmin ? [{ key: "admin" as PageTab, icon: ShieldCheck, label: t("navAdmin") }] : []),
  ];

  const pageContent: Record<PageTab, React.ReactNode> = {
    home: <HomePage />,
    nodes: <NodesPage />,
    swap: <SwapPage />,
    earnings: <EarningsPage />,
    team: <TeamPage />,
    admin: <AdminPage />,
  };

  const onboardingSteps = [
    {
      key: "wallet",
      label: t("stepConnectWallet"),
      done: isConnected,
      later: false,
    },
    {
      key: "network",
      label: t("stepSwitchNetwork"),
      done: isConnected && chainId === 11155111,
      later: false,
    },
    {
      key: "referral",
      label: t("stepBindReferrer"),
      done: !isConnected || isOwner || referrerBound,
      later: isConnected && !isOwner && !referrerBound && referralPromptDismissed,
    },
    {
      key: "nodes",
      label: t("stepBuyNftNode"),
      done: hasPurchasedNode,
      later: false,
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 md:h-20 w-full max-w-7xl items-center gap-2 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-6">
          <div className="flex shrink-0 items-center gap-2">
          <img
            src="/truth-oracle-logo-light.svg"
            alt="Truth Oracle"
            className="h-10 md:h-16 w-auto object-contain dark:hidden"
          />
          <img
            src="/truth-oracle-logo-dark.svg"
            alt="Truth Oracle"
            className="hidden dark:block h-10 md:h-16 w-auto object-contain"
          />
          </div>

        {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 ml-3 lg:ml-6 min-w-0">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
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

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
            <LanguageSwitcher />
            <ThemeToggle />

            {!isConnected ? (
              <WalletConnectButton />
            ) : (
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-muted/30 border border-accent/20 max-w-[10.5rem] sm:max-w-none">
                <button
                  onClick={disconnect}
                  className="flex items-center gap-2 px-2 rounded-full transition-opacity hover:opacity-80 min-w-0"
                  title={t("disconnect")}
                  aria-label={t("disconnect")}
                >
                  <div className="h-2 w-2 rounded-full bg-accent animate-pulse shrink-0" />
                  <span className="text-xs font-mono text-accent truncate">{displayAddress}</span>
                </button>
                <Button
                  onClick={disconnect}
                  size="sm"
                  variant="ghost"
                  className="hidden md:inline-flex h-7 px-2 text-xs rounded-full"
                >
                  <LogOut size={14} className="mr-1" />
                  {t("disconnect")}
                </Button>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Dev-only: admin detection debug bar */}
      {process.env.NODE_ENV === "development" && isConnected && (
        <div className="bg-zinc-900 text-zinc-300 text-[11px] font-mono px-4 py-1 flex flex-wrap gap-x-4 gap-y-0.5 border-b border-zinc-700">
          <span>
            Connected:&nbsp;
            <span className="text-yellow-300">{address ?? "—"}</span>
          </span>
          <span>
            Owner (chain):&nbsp;
            <span className="text-cyan-300">{ownerAddress ?? (ownerStatusLoaded ? "null" : "loading…")}</span>
          </span>
          <span>
            Match:&nbsp;
            {ownerStatusLoaded
              ? isOwner
                ? <span className="text-green-400 font-bold">✅ YES → Admin visible</span>
                : <span className="text-red-400 font-bold">❌ NO → Admin hidden</span>
              : <span className="text-zinc-500">checking…</span>
            }
          </span>
          {isOperatorManager && (
            <span className="text-purple-300">🔧 isDistributor = true</span>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-medium">{t("onboardingTitle")}</p>
              <span className="text-xs text-muted-foreground">{onboardingSteps.filter((step) => step.done).length}/{onboardingSteps.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {onboardingSteps.map((step) => (
                <div key={step.key} className="rounded-md border border-border/40 bg-background/60 px-2.5 py-2 text-xs flex items-center justify-between gap-2">
                  <span className="truncate">{step.label}</span>
                  <span className={step.done ? "text-primary font-medium" : step.later ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}>
                    {step.done ? t("stepDone") : step.later ? t("stepLater") : t("stepPending")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">{t("networkLabel")}</span>
              <span className={chainId === 11155111 ? "text-primary font-medium" : "text-destructive font-medium"}>
                {chainId === 11155111 ? "Sepolia" : t("notTestnet")}
              </span>
            </div>
              <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">{t("walletLabel")}</span>
              <span className={isConnected ? "text-primary font-medium" : "text-muted-foreground"}>
                {isConnected ? t("connected") : isConnecting ? t("connecting") : t("notConnected")}
              </span>
            </div>
              <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">{t("referralBindLabel")}</span>
              <span className={
                !isConnected || isOwner || referrerBound
                  ? "text-primary font-medium"
                  : !referrerStatusLoaded
                    ? "text-muted-foreground font-medium"
                  : "text-amber-600 dark:text-amber-400 font-medium"
              }>
                {!isConnected ? t("waitConnect") : isOwner || referrerBound ? t("bindDone") : !referrerStatusLoaded ? t("checking") : t("waitBind")}
              </span>
            </div>
          </div>
        </div>

        {needsReferralBinding && referralPromptDismissed ? (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-amber-700 dark:text-amber-300">{t("referralPendingBanner")}</span>
            <Button size="sm" variant="outline" className="h-7" onClick={() => setReferralPromptDismissed(false)}>
              {t("referralBindNow")}
            </Button>
          </div>
        ) : null}

        {shouldBlockForReferral ? (
          /* ===== Referral Binding Overlay ===== */
          <div className="flex items-center justify-center min-h-[calc(100dvh-12rem)] md:min-h-[calc(100vh-10rem)]">
            <div className="w-full max-w-md mx-auto">
              <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl p-5 sm:p-8 shadow-xl space-y-6">
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
                    onChange={(e) => { setReferrerAddress(sanitizeAddressInput(e.target.value)); setReferrerError(""); }}
                    placeholder={t('referralAddressPlaceholder')}
                    className="font-mono text-sm"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {referrerError && (
                    <p className="text-xs text-destructive">{referrerError}</p>
                  )}
                </div>

                {/* Confirm Button */}
                <Button
                  onClick={handleBindReferrer}
                  disabled={isBindingReferrer || (!sanitizeAddressInput(referrerAddress) && !sanitizeAddressInput(ownerAddress ?? ""))}
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
                <div className="space-y-1">
                  <p className="text-center text-xs text-muted-foreground">{t('referralSkip')}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkipReferralForNow}
                    className="w-full text-xs"
                  >
                    {t("referralSkipForNow")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          pageContent[activeTab]
        )}
        </div>
      </main>

      {/* Footer */}
      <footer className="hidden md:block py-4 px-6 border-t border-border/50 text-center">
        <p className="text-xs text-muted-foreground">{t("footer")}</p>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pointer-events-none">
        <div className="pointer-events-auto mx-auto w-full max-w-md h-16 px-2 rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-lg overflow-x-auto no-scrollbar">
          <div className="flex h-full items-center justify-start gap-1 min-w-max">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex h-12 min-w-[4.5rem] flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
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
        </div>
      </nav>
    </div>
  );
}
