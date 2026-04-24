"use client";

import { TierManagementPanel } from "@/components/admin/tier-management-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { execTx, useERC20Contract, useNexusContract, useReadonlyNexusContract, useSwapContract, useTofTokenContract } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";
import { getPrimaryCncRpcUrl } from "@/lib/cnc-rpc";
import { CONTRACTS, SWAP_ABI } from "@/lib/contracts";
import { formatAddress, getNftaTierName } from "@/lib/ui-config";
import { useWeb3 } from "@/lib/web3-provider";
import { ethers } from "ethers";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

let _cncReadonlyProvider: ethers.JsonRpcProvider | null = null;
function getCncReadonlyProvider() {
  if (!_cncReadonlyProvider) {
    const rpc = getPrimaryCncRpcUrl(process.env.NEXT_PUBLIC_CNC_RPC_URL);
    _cncReadonlyProvider = new ethers.JsonRpcProvider(rpc);
  }
  return _cncReadonlyProvider;
}

type NftaIssueTierOption = {
  tierId: number;
  maxSupply: string;
  currentSupply: string;
  remaining: string;
  isActive: boolean;
};

type NftaIssuedUserRecord = {
  user: string;
  tierId: string;
  nodeId: string;
  blockNumber: string;
  txHash: string;
};

type DividendHealthCheck = {
  key: string;
  label: string;
  ok: boolean;
  detail?: string;
};

type DividendTierEstimate = {
  tierId: number;
  dividendBps: string;
  tierWeight: string;
  nodeWeight: string;
  tierTot: bigint;
  tierUsdt: bigint;
  perNodeTot: bigint;
  perNodeUsdt: bigint;
};

type UserDividendEstimate = {
  user: string;
  activeNodes: number;
  addTot: bigint;
  addUsdt: bigint;
};

function parseNodeId(value: string): bigint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  return BigInt(trimmed);
}

function parsePositiveInteger(value: string): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isInteger(numeric)) return null;
  return numeric;
}

function parseBps(value: string): bigint | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 10000) return null;
  return BigInt(Math.trunc(numeric));
}

function formatToken(value: bigint, decimals = 18, precision = 6): string {
  const formatted = ethers.formatUnits(value, decimals);
  const [intPart, decPart = ""] = formatted.split(".");
  if (precision <= 0 || decPart.length === 0) return intPart;
  const trimmed = decPart.slice(0, precision).replace(/0+$/, "");
  return trimmed ? `${intPart}.${trimmed}` : intPart;
}

function formatPercent(numerator: bigint, denominator: bigint): string {
  if (denominator <= 0n) return "0.00%";
  const bps = Number((numerator * 10000n) / denominator) / 100;
  return `${bps.toFixed(2)}%`;
}

export function AdminPage() {
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();
  const nexus = useNexusContract();
  const readonlyNexus = useReadonlyNexusContract();
  const swap = useSwapContract();
  const tof = useTofTokenContract();
  const tot = useERC20Contract(CONTRACTS.TOT);
  const usdt = useERC20Contract(CONTRACTS.USDT);

  const [loading, setLoading] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState("");
  const [swapOwnerAddress, setSwapOwnerAddress] = useState("");
  const [nexusUsdtAddress, setNexusUsdtAddress] = useState("");
  const [swapUsdtAddress, setSwapUsdtAddress] = useState("");
  const [isNexusAdminRole, setIsNexusAdminRole] = useState(false);
  const [isSwapAdminRole, setIsSwapAdminRole] = useState(false);
  const [isNexusManagerRole, setIsNexusManagerRole] = useState(false);
  const [isSwapManagerRole, setIsSwapManagerRole] = useState(false);
  const [tofOwnerAddress, setTofOwnerAddress] = useState("");
  
  // NFTA 单笔/批量
  const [transferNodeId, setTransferNodeId] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [claimNodeId, setClaimNodeId] = useState("");
  const [bulkTransferInput, setBulkTransferInput] = useState("");
  const [bulkClaimInput, setBulkClaimInput] = useState("");
  const [bulkResult, setBulkResult] = useState("");

  // 基础参数
  const [tofClaimFeeBps, setTofClaimFeeBps] = useState("");
  const [tofBurnBps, setTofBurnBps] = useState("");

  // 奖励池与分红
  const [rewardFundAmount, setRewardFundAmount] = useState("");
  const [nftbTotDividendAmount, setNftbTotDividendAmount] = useState("");
  const [nftbUsdtDividendAmount, setNftbUsdtDividendAmount] = useState("");
  const [predictionFlowAmount, setPredictionFlowAmount] = useState("");
  const [predictionRateTier1, setPredictionRateTier1] = useState("40");
  const [predictionRateTier2, setPredictionRateTier2] = useState("50");
  const [predictionRateTier3, setPredictionRateTier3] = useState("60");

  // 提现费率（统一）
  const [withdrawFeeBps, setWithdrawFeeBps] = useState("");

  // 钱包管理
  const [treasuryAddr, setTreasuryAddr] = useState("");
  const [zeroLineAddr, setZeroLineAddr] = useState("");
  const [communityAddr, setCommunityAddr] = useState("");
  const [foundationAddr, setFoundationAddr] = useState("");
  const [institutionAddr, setInstitutionAddr] = useState("");
  const [projectAddr, setProjectAddr] = useState("");

  // 分发器管理
  const [distributorAddr, setDistributorAddr] = useState("");
  const [distributorStatus, setDistributorStatus] = useState("true");

  // TOF 白名单
  const [tofWhitelistAddr, setTofWhitelistAddr] = useState("");
  const [tofWhitelistStatus, setTofWhitelistStatus] = useState("true");
  const [tofWhitelistResult, setTofWhitelistResult] = useState<Record<string, boolean | null>>({});

  // 直接注册购买
  const [registerUserAddr, setRegisterUserAddr] = useState("");
  const [registerTierId, setRegisterTierId] = useState("");
  const [registerReferrerAddr, setRegisterReferrerAddr] = useState("");
  const [registerQuantity, setRegisterQuantity] = useState("1");
  const [registerChunkSize, setRegisterChunkSize] = useState("100");
  const [registerBatchResult, setRegisterBatchResult] = useState("");
  const [registerType, setRegisterType] = useState("nfta");
  const [nftaIssueTierOptions, setNftaIssueTierOptions] = useState<NftaIssueTierOption[]>([]);
  const [nftaIssuedUsers, setNftaIssuedUsers] = useState<NftaIssuedUserRecord[]>([]);

  // Enumerable admin list (v2)
  const [nexusAdminList, setNexusAdminList] = useState<string[]>([]);
  const [nexusManagerList, setNexusManagerList] = useState<string[]>([]);
  const [swapAdminList, setSwapAdminList] = useState<string[]>([]);
  const [nexusHasEnumerableFunctions, setNexusHasEnumerableFunctions] = useState(false);
  const [swapHasEnumerableFunctions, setSwapHasEnumerableFunctions] = useState(false);

  // Swap 流动性管理
  const [addLiquidityTot, setAddLiquidityTot] = useState("");
  const [addLiquidityUsdt, setAddLiquidityUsdt] = useState("");
  const [removeLiquidityTot, setRemoveLiquidityTot] = useState("");
  const [removeLiquidityUsdt, setRemoveLiquidityUsdt] = useState("");

  // Swap 费率配置
  const [buyFeeBps, setBuyFeeBps] = useState("");
  const [sellFeeBps, setSellFeeBps] = useState("");
  const [profitTaxBps, setProfitTaxBps] = useState("");
  const [deflationBps, setDeflationBps] = useState("");
  const [maxDailyBuy, setMaxDailyBuy] = useState("");
  const [maxSellBps, setMaxSellBps] = useState("");
  const [distributionThreshold, setDistributionThreshold] = useState("");

  // Swap 应急与配置
  const [emergencyTokenAddr, setEmergencyTokenAddr] = useState("");
  const [emergencyAmount, setEmergencyAmount] = useState("");
  const [newNexusAddr, setNewNexusAddr] = useState("");
  const [currentSwapNexus, setCurrentSwapNexus] = useState("");
  const [dexRouterAddr, setDexRouterAddr] = useState("");
  const [dexPairAddr, setDexPairAddr] = useState("");
  const [dexFactoryAddr, setDexFactoryAddr] = useState("");
  const [externalDexEnabled, setExternalDexEnabled] = useState(false);
  const [swapPaused, setSwapPaused] = useState(false);

  // Owner 转移
  const [newNexusOwnerAddr, setNewNexusOwnerAddr] = useState("");
  const [newSwapOwnerAddr, setNewSwapOwnerAddr] = useState("");
  const [nexusAdminAddr, setNexusAdminAddr] = useState("");
  const [nexusAdminStatus, setNexusAdminStatus] = useState("true");
  const [nexusAdminBatchInput, setNexusAdminBatchInput] = useState("");
  const [swapAdminAddr, setSwapAdminAddr] = useState("");
  const [swapAdminStatus, setSwapAdminStatus] = useState("true");
  const [swapAdminBatchInput, setSwapAdminBatchInput] = useState("");
  const [newUsdtAddr, setNewUsdtAddr] = useState("");

  // Manager 管理员
  const [nexusManagerAddr, setNexusManagerAddr] = useState("");
  const [nexusManagerStatus, setNexusManagerStatus] = useState("true");
  const [nexusManagerBatchInput, setNexusManagerBatchInput] = useState("");
  const [swapManagerAddr, setSwapManagerAddr] = useState("");
  const [swapManagerStatus, setSwapManagerStatus] = useState("true");
  const [swapManagerBatchInput, setSwapManagerBatchInput] = useState("");

  // P0: 分红池实时监控与触发前模拟
  const [totDividendPool, setTotDividendPool] = useState<bigint>(0n);
  const [usdtDividendPool, setUsdtDividendPool] = useState<bigint>(0n);
  const [deflationPoolBalance, setDeflationPoolBalance] = useState<bigint>(0n);
  const [totDistributionThreshold, setTotDistributionThreshold] = useState<bigint>(0n);
  const [usdtDistributionThreshold, setUsdtDistributionThreshold] = useState<bigint>(0n);
  const [dividendHealthChecks, setDividendHealthChecks] = useState<DividendHealthCheck[]>([]);
  const [tierEstimates, setTierEstimates] = useState<DividendTierEstimate[]>([]);
  const [userEstimates, setUserEstimates] = useState<UserDividendEstimate[]>([]);
  const [simulatingDividends, setSimulatingDividends] = useState(false);
  const [simulateBlockRange, setSimulateBlockRange] = useState("1500000");

  // 公告管理
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementType, setAnnouncementType] = useState("update");
  const [announcementList, setAnnouncementList] = useState<{id: string | number; title: string; date: string; type: string}[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  const isOwner = useMemo(() => {
    if (!address || !ownerAddress) return false;
    return address.toLowerCase() === ownerAddress.toLowerCase();
  }, [address, ownerAddress]);

  const isSwapOwner = useMemo(() => {
    if (!address || !swapOwnerAddress) return false;
    return address.toLowerCase() === swapOwnerAddress.toLowerCase();
  }, [address, swapOwnerAddress]);

  const canManageNexusAdmins = isOwner || isNexusAdminRole;
  const isNexusManager = isOwner || isNexusAdminRole;
  const isNexusAuthorized = isOwner || isNexusAdminRole || isNexusManagerRole;
  const canManageSwapAdmins = isSwapOwner || isSwapAdminRole;
  const isSwapManager = isSwapOwner || isSwapAdminRole;
  const isSwapAuthorized = isSwapOwner || isSwapAdminRole || isSwapManagerRole;
  const canTransferNexusOwnership = isOwner || isNexusAdminRole;
  const canTransferSwapOwnership = isSwapOwner || isSwapAdminRole;
  const isTofOwner = useMemo(() => {
    if (!address || !tofOwnerAddress) return false;
    return address.toLowerCase() === tofOwnerAddress.toLowerCase();
  }, [address, tofOwnerAddress]);

  const isAdmin = isNexusAuthorized || isSwapAuthorized;
  const nexusAdminLabel = isOwner ? "✅ Nexus Owner" : isNexusAdminRole ? "✅ Nexus 超管(Admin)" : isNexusManagerRole ? "✅ Nexus 管理员(Manager)" : "👁️ Nexus 只读";
  const swapAdminLabel = isSwapOwner ? "✅ Swap Owner" : isSwapAdminRole ? "✅ Swap 超管(Admin)" : isSwapManagerRole ? "✅ Swap 管理员(Manager)" : "👁️ Swap 只读";

  const NEXUS_ADDR = process.env.NEXT_PUBLIC_NEXUS_ADDRESS || "";
  const SWAP_ADDR  = process.env.NEXT_PUBLIC_SWAP_ADDRESS  || "";

  const checkTofWhitelist = async () => {
    if (!tof) return;
    const addrs = [NEXUS_ADDR, SWAP_ADDR, tofWhitelistAddr.trim()].filter(Boolean);
    const results: Record<string, boolean | null> = {};
    await Promise.all(addrs.map(async (a) => {
      try { results[a] = Boolean(await tof.transferWhitelist(a)); }
      catch { results[a] = null; }
    }));
    setTofWhitelistResult(results);
  };

  const queryNexusAdminList = async () => {
    if (!readonlyNexus) return;
    try {
      const count = await readonlyNexus.getAdminCount();
      const adminList: string[] = [];
      for (let i = 0; i < Number(count) && i < 100; i++) {
        const admin = await readonlyNexus.getAdminAt(i);
        adminList.push(String(admin));
      }
      setNexusAdminList(adminList);
    } catch (error: any) {
      console.error("Failed to query Nexus admin list:", error);
      setNexusAdminList([]);
    }
  };

  const queryNexusManagerList = async () => {
    if (!readonlyNexus) return;
    try {
      const count = await readonlyNexus.getManagerCount();
      const managerList: string[] = [];
      for (let i = 0; i < Number(count) && i < 100; i++) {
        const manager = await readonlyNexus.getManagerAt(i);
        managerList.push(String(manager));
      }
      setNexusManagerList(managerList);
    } catch (error: any) {
      console.error("Failed to query Nexus manager list:", error);
      setNexusManagerList([]);
    }
  };

  const querySwapAdminList = async () => {
    if (!swap) return;
    const readonlySwap = CONTRACTS.SWAP
      ? new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI, getCncReadonlyProvider())
      : null;
    const swapReader = readonlySwap ?? swap;
    if (!swapReader) return;
    try {
      // Swap may not have enumerable admins yet
      // Only attempt if function exists
      if (typeof (swapReader as any).getAdminCount === 'function') {
        const count = await swapReader.getAdminCount();
        const adminList: string[] = [];
        for (let i = 0; i < Number(count) && i < 100; i++) {
          const admin = await swapReader.getAdminAt(i);
          adminList.push(String(admin));
        }
        setSwapAdminList(adminList);
      }
    } catch (error: any) {
      console.error("Failed to query Swap admin list:", error);
      setSwapAdminList([]);
    }
  };

  const runDividendHealthChecks = async (reader: any, swapReader: any) => {
    const checks: DividendHealthCheck[] = [];

    try {
      const nextNftbTierIdRaw = await reader.nextNftbTierId();
      const nextNftbTierId = Number(nextNftbTierIdRaw);
      checks.push({
        key: "nextTierId",
        label: "NFTB 层级计数器",
        ok: nextNftbTierId > 1,
        detail: `nextNftbTierId=${nextNftbTierId}`,
      });

      let activeTierCount = 0;
      let bpsSum = 0n;
      let zeroWeightTierCount = 0;

      for (let tid = 1; tid < nextNftbTierId; tid++) {
        const [tier, tierWeight] = await Promise.all([
          reader.nftbTiers(BigInt(tid)),
          reader.totalWeightByTier(BigInt(tid)),
        ]);
        if (!tier.isActive) continue;
        activeTierCount += 1;
        bpsSum += BigInt(tier.dividendBps);
        if (BigInt(tierWeight) === 0n) zeroWeightTierCount += 1;
      }

      checks.push({
        key: "activeTier",
        label: "活跃 NFTB 层级",
        ok: activeTierCount > 0,
        detail: `active=${activeTierCount}`,
      });
      checks.push({
        key: "bpsSum",
        label: "分红比例总和 (建议9000)",
        ok: bpsSum === 9000n,
        detail: `sum=${bpsSum.toString()}`,
      });
      checks.push({
        key: "tierWeight",
        label: "活跃层级权重",
        ok: zeroWeightTierCount === 0,
        detail: zeroWeightTierCount > 0 ? `zeroWeightTierCount=${zeroWeightTierCount}` : "all-good",
      });

      if (swapReader) {
        const swapNexus = String(await swapReader.nexus());
        checks.push({
          key: "nexusLink",
          label: "Swap 与 Nexus 绑定",
          ok: !CONTRACTS.NEXUS || swapNexus.toLowerCase() === CONTRACTS.NEXUS.toLowerCase(),
          detail: `swap.nexus=${formatAddress(swapNexus)}`,
        });
      }
    } catch (error: any) {
      checks.push({
        key: "checkError",
        label: "健康检查执行",
        ok: false,
        detail: error?.shortMessage || error?.message || "未知错误",
      });
    }

    setDividendHealthChecks(checks);
  };

  const runDividendSimulation = async () => {
    const reader = readonlyNexus || nexus;
    const readonlySwap = CONTRACTS.SWAP
      ? new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI, getCncReadonlyProvider())
      : null;
    const swapReader = readonlySwap ?? swap;

    if (!reader || !swapReader) {
      toast({ title: "模拟失败", description: "合约未连接，无法执行分红模拟", variant: "destructive" });
      return;
    }

    setSimulatingDividends(true);
    try {
      const [totPool, usdtPool, nextNftbTierIdRaw] = await Promise.all([
        swapReader.nftbDividendPool(),
        swapReader.nftbUsdtDividendPool(),
        reader.nextNftbTierId(),
      ]);

      const nextNftbTierId = Number(nextNftbTierIdRaw);
      const tierRows: DividendTierEstimate[] = [];
      const perWeightTot = new Map<string, bigint>();
      const perWeightUsdt = new Map<string, bigint>();

      for (let tid = 1; tid < nextNftbTierId; tid++) {
        const [tier, tierWeightRaw] = await Promise.all([
          reader.nftbTiers(BigInt(tid)),
          reader.totalWeightByTier(BigInt(tid)),
        ]);

        const tierWeight = BigInt(tierWeightRaw);
        const tierTot = (BigInt(totPool) * BigInt(tier.dividendBps)) / 10000n;
        const tierUsdt = (BigInt(usdtPool) * BigInt(tier.dividendBps)) / 10000n;
        const perTot = tierWeight > 0n ? (tierTot * 10n ** 18n) / tierWeight : 0n;
        const perUsdt = tierWeight > 0n ? (tierUsdt * 10n ** 18n) / tierWeight : 0n;
        const perNodeTot = (BigInt(tier.weight) * perTot) / (10n ** 18n);
        const perNodeUsdt = (BigInt(tier.weight) * perUsdt) / (10n ** 18n);

        perWeightTot.set(String(tid), perTot);
        perWeightUsdt.set(String(tid), perUsdt);

        tierRows.push({
          tierId: tid,
          dividendBps: BigInt(tier.dividendBps).toString(),
          tierWeight: tierWeight.toString(),
          nodeWeight: BigInt(tier.weight).toString(),
          tierTot,
          tierUsdt,
          perNodeTot,
          perNodeUsdt,
        });
      }

      const provider = ((reader.runner as any)?.provider ?? getCncReadonlyProvider()) as ethers.Provider;
      const latest = await provider.getBlockNumber();
      const lookback = Math.max(1, Number(simulateBlockRange) || 1_500_000);
      const fromBlock = Math.max(0, latest - lookback);

      const purchaseEvents = await reader.queryFilter(reader.filters.NftbPurchased(), fromBlock, latest);
      const userSet = new Set<string>();
      for (const event of purchaseEvents as any[]) {
        const user = String(event.args?.user || "").toLowerCase();
        if (user && user !== ethers.ZeroAddress.toLowerCase()) userSet.add(user);
      }

      const users = Array.from(userSet);
      const userRows: UserDividendEstimate[] = [];

      for (const user of users) {
        let nodes: bigint[] = [];
        try {
          nodes = await reader.getUserNftbNodes(user);
        } catch {
          continue;
        }

        let addTot = 0n;
        let addUsdt = 0n;
        let activeNodes = 0;

        for (const nodeId of nodes) {
          const node = await reader.nftbNodes(nodeId);
          if (!node.isActive) continue;
          const tid = BigInt(node.tierId).toString();
          const perTot = perWeightTot.get(tid) || 0n;
          const perUsdt = perWeightUsdt.get(tid) || 0n;
          addTot += (BigInt(node.weight) * perTot) / (10n ** 18n);
          addUsdt += (BigInt(node.weight) * perUsdt) / (10n ** 18n);
          activeNodes += 1;
        }

        if (addTot === 0n && addUsdt === 0n) continue;
        userRows.push({
          user: ethers.getAddress(user),
          activeNodes,
          addTot,
          addUsdt,
        });
      }

      userRows.sort((a, b) => (a.addTot === b.addTot ? 0 : a.addTot > b.addTot ? -1 : 1));
      setTierEstimates(tierRows);
      setUserEstimates(userRows);
      toast({
        title: "分红模拟完成",
        description: `覆盖 ${userRows.length} 个地址，区块范围 ${fromBlock} -> ${latest}`,
      });
    } catch (error: any) {
      toast({
        title: "分红模拟失败",
        description: error?.shortMessage || error?.message || "未知错误",
        variant: "destructive",
      });
    } finally {
      setSimulatingDividends(false);
    }
  };

  const onSetTofWhitelist = async () => {
    if (!tof) return;
    const addr = tofWhitelistAddr.trim();
    if (!ethers.isAddress(addr)) {
      toast({ title: "地址格式错误", variant: "destructive" }); return;
    }
    await runTx(`TOF白名单 ${addr.slice(0,8)}... ${tofWhitelistStatus === 'true' ? '加入' : '移除'}`,
      () => tof.setTransferWhitelist(addr, tofWhitelistStatus === "true"));
    checkTofWhitelist();
  };

  const onWhitelistNexusAndSwap = async () => {
    if (!tof) return;
    for (const addr of [NEXUS_ADDR, SWAP_ADDR].filter(Boolean)) {
      await runTx(`TOF白名单加入 ${addr.slice(0,8)}...`, () => tof.setTransferWhitelist(addr, true));
    }
    checkTofWhitelist();
  };

  const refresh = async () => {
    // Use readonly contract for reads so they succeed regardless of
    // which chain the user's wallet is connected to.
    const reader = readonlyNexus || nexus;
    if (!reader) return;
    try {
      const [owner, claimFee, burnBps, flowRate1, flowRate2, flowRate3, treasury, zLine, comm, found, inst, proj, nexusUsdt] = await Promise.all([
        reader.owner(),
        reader.tofClaimFeeBps(),
        reader.tofBurnBps(),
        reader.predictionFlowBpsByTier(1),
        reader.predictionFlowBpsByTier(2),
        reader.predictionFlowBpsByTier(3),
        reader.treasury(),
        reader.zeroLineWallet(),
        reader.communityWallet(),
        reader.foundationWallet(),
        reader.institutionWallet(),
        reader.projectWallet(),
        reader.usdtToken(),
      ]);
      setOwnerAddress(owner);
      setNexusUsdtAddress(nexusUsdt);
      setTofClaimFeeBps(claimFee.toString());
      setTofBurnBps(burnBps.toString());
      setPredictionRateTier1(flowRate1.toString());
      setPredictionRateTier2(flowRate2.toString());
      setPredictionRateTier3(flowRate3.toString());
      setTreasuryAddr(treasury);
      setZeroLineAddr(zLine);
      setCommunityAddr(comm);
      setFoundationAddr(found);
      setInstitutionAddr(inst);
      setProjectAddr(proj);

      if (address) {
        try {
          setIsNexusAdminRole(Boolean(await reader.admins(address)));
          try { setIsNexusManagerRole(Boolean(await reader.managers(address))); } catch { setIsNexusManagerRole(false); }
        } catch {
          setIsNexusAdminRole(false);
          setIsNexusManagerRole(false);
        }
      } else {
        setIsNexusAdminRole(false);
        setIsNexusManagerRole(false);
      }

      // Always use a readonly Swap contract so params load even without wallet
      const readonlySwap = CONTRACTS.SWAP
        ? new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI, getCncReadonlyProvider())
        : null;
      const swapReader = readonlySwap ?? swap;

      if (swapReader) {
        try {
          const swapOwner = await swapReader.owner();
          setSwapOwnerAddress(String(swapOwner || ""));
        } catch {
          setSwapOwnerAddress("");
        }

        try {
          const [router, pair, factory, enabled, paused] = await swapReader.getRouterConfig();
          setDexRouterAddr(String(router || ""));
          setDexPairAddr(String(pair || ""));
          setDexFactoryAddr(String(factory || ""));
          setExternalDexEnabled(Boolean(enabled));
          setSwapPaused(Boolean(paused));
          setSwapUsdtAddress(String(await swapReader.usdtToken()));
        } catch {
          setDexRouterAddr("");
          setDexPairAddr("");
          setDexFactoryAddr("");
          setExternalDexEnabled(false);
          setSwapPaused(false);
          setSwapUsdtAddress("");
        }

        // Load Swap fee params & nexus address from chain
        try {
          const [bfBps, sfBps, ptBps, dfBps, mdBuy, msBps, dThresh, usdtDThresh, totPool, usdtPool, nexusRef, defPool] = await Promise.all([
            swapReader.buyFeeBps(),
            swapReader.sellFeeBps(),
            swapReader.profitTaxBps(),
            swapReader.deflationBps(),
            swapReader.maxDailyBuy(),
            swapReader.maxSellBps(),
            swapReader.distributionThreshold(),
            swapReader.usdtDistributionThreshold(),
            swapReader.nftbDividendPool(),
            swapReader.nftbUsdtDividendPool(),
            swapReader.nexus(),
            swapReader.deflationPool().catch(() => BigInt(0)),
          ]);
          setBuyFeeBps(bfBps.toString());
          setSellFeeBps(sfBps.toString());
          setProfitTaxBps(ptBps.toString());
          setDeflationBps(dfBps.toString());
          setMaxDailyBuy(ethers.formatUnits(mdBuy, 18));
          setMaxSellBps(msBps.toString());
          setDistributionThreshold(ethers.formatUnits(dThresh, 18));
          setTotDistributionThreshold(BigInt(dThresh));
          setUsdtDistributionThreshold(BigInt(usdtDThresh));
          setTotDividendPool(BigInt(totPool));
          setUsdtDividendPool(BigInt(usdtPool));
          setDeflationPoolBalance(BigInt(defPool));
          setCurrentSwapNexus(String(nexusRef || ""));
        } catch {
          // Leave current values unchanged on error
        }

        if (address) {
          try {
            setIsSwapAdminRole(Boolean(await swapReader.admins(address)));
            try { setIsSwapManagerRole(Boolean(await swapReader.managers(address))); } catch { setIsSwapManagerRole(false); }
          } catch {
            setIsSwapAdminRole(false);
            setIsSwapManagerRole(false);
          }
        } else {
          setIsSwapAdminRole(false);
          setIsSwapManagerRole(false);
        }
      } else {
        setIsSwapAdminRole(false);
        setIsSwapManagerRole(false);
        setSwapUsdtAddress("");
      }

      // Fetch TOF owner for whitelist permission checks
      if (tof) {
        try {
          setTofOwnerAddress(String(await tof.owner()));
        } catch {
          setTofOwnerAddress("");
        }
      }

      // Probe whether Nexus on-chain supports admins() — call with zero address
      try {
        await reader.admins(ethers.ZeroAddress);
        setNexusHasAdminFunctions(true);
      } catch {
        setNexusHasAdminFunctions(false);
      }

      // Check if Nexus supports enumerable admin functions (v2)
      try {
        if (typeof (reader as any).getAdminCount === 'function') {
          await reader.getAdminCount();
          setNexusHasEnumerableFunctions(true);
          // Query admin list if available
          queryNexusAdminList();
          queryNexusManagerList();
        } else {
          setNexusHasEnumerableFunctions(false);
        }
      } catch {
        setNexusHasEnumerableFunctions(false);
      }

      // Check if Swap supports enumerable admin functions
      try {
        if (swapReader && typeof (swapReader as any).getAdminCount === 'function') {
          await swapReader.getAdminCount();
          setSwapHasEnumerableFunctions(true);
          querySwapAdminList();
        } else {
          setSwapHasEnumerableFunctions(false);
        }
      } catch {
        setSwapHasEnumerableFunctions(false);
      }

      // P0: 分红触发前健康检查
      await runDividendHealthChecks(reader, swapReader);

      const nextNftaTierIdRaw = await reader.nextNftaTierId();
      const nextNftaTierId = Number(nextNftaTierIdRaw);

      // Some deployments configure explicit tier IDs (1/2/3...) without bumping nextNftaTierId.
      // Fall back to a bounded scan so Admin can still select existing tiers.
      const tierIds = Number.isFinite(nextNftaTierId) && nextNftaTierId > 1
        ? Array.from({ length: nextNftaTierId - 1 }, (_, idx) => idx + 1)
        : Array.from({ length: 20 }, (_, idx) => idx + 1);

      const tierResults = await Promise.all(
        tierIds.map(async (tierId) => {
          const [tier, remainingRaw] = await Promise.all([
            reader.nftaTiers(BigInt(tierId)),
            reader.getNftaTierRemaining(BigInt(tierId)),
          ]);

          return {
            tierId,
            maxSupply: BigInt(tier.maxSupply).toString(),
            currentSupply: BigInt(tier.currentSupply).toString(),
            remaining: BigInt(remainingRaw).toString(),
            isActive: Boolean(tier.isActive),
          } as NftaIssueTierOption;
        })
      );

      const validTierOptions = tierResults.filter((tier) => BigInt(tier.maxSupply) > 0n);
      setNftaIssueTierOptions(validTierOptions);
      if (!registerTierId && validTierOptions.length > 0) {
        setRegisterTierId(String(validTierOptions[0].tierId));
      }

      // Event query is isolated: failure here won't block the rest of the page
      try {
        const readerProvider = (reader.runner as any)?.provider;
        if (readerProvider?.getBlockNumber) {
          const latestBlock = await readerProvider.getBlockNumber();
          const fromBlock = Math.max(0, latestBlock - 50_000);
          const events = await reader.queryFilter(reader.filters.NftaPurchased(), fromBlock, latestBlock);
          const records = events
            .slice(-100)
            .reverse()
            .map((event: any) => ({
              user: String(event.args?.user || ""),
              tierId: BigInt(event.args?.tierId ?? 0).toString(),
              nodeId: BigInt(event.args?.nodeId ?? 0).toString(),
              blockNumber: String(event.blockNumber ?? "-"),
              txHash: String(event.transactionHash || ""),
            }))
            .filter((row) => row.user && row.user !== ethers.ZeroAddress);
          setNftaIssuedUsers(records);
        } else {
          // Keep existing rows if provider cannot query events temporarily.
          setNftaIssuedUsers((prev) => prev);
        }
      } catch (evtErr: any) {
        console.warn("Event query failed (non-blocking):", evtErr);
        // Do not clear the table on transient RPC/query issues.
        setNftaIssuedUsers((prev) => prev);
      }
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "未知错误";
      console.error("Admin refresh failed:", err);
      toast({ title: "读取失败", description: msg, variant: "destructive" });
    }
  };

  useEffect(() => {
    refresh();
  }, [nexus, address, swap, tof]);

  const runTx = async (action: string, txRequest: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await execTx(txRequest);
      if (!result.success) {
        toast({ title: `${action}失败`, description: result.error || "未知错误", variant: "destructive" });
        return false;
      }
      toast({ title: `${action}成功`, description: result.hash?.slice(0, 12) || "已上链" });
      await refresh();
      return true;
    } finally {
      setLoading(false);
    }
  };

  const onTransferNfta = async () => {
    if (!nexus) return;
    const nodeId = parseNodeId(transferNodeId);
    if (nodeId === null) {
      toast({ title: "参数错误", description: "节点ID必须是正整数", variant: "destructive" });
      return;
    }
    if (!ethers.isAddress(transferTo.trim())) {
      toast({ title: "参数错误", description: "接收地址无效", variant: "destructive" });
      return;
    }
    await runTx("NFTA转卡", () => nexus.transferNftaCard(transferTo.trim(), nodeId));
  };

  const onClaimNfta = async () => {
    if (!nexus) return;
    const nodeId = parseNodeId(claimNodeId);
    if (nodeId === null) {
      toast({ title: "参数错误", description: "节点ID必须是正整数", variant: "destructive" });
      return;
    }
    await runTx("NFTA领取", () => nexus.claimNftaYield(nodeId));
  };

  const onBulkTransfer = async () => {
    if (!nexus) return;
    const lines = bulkTransferInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast({ title: "参数错误", description: "请输入批量转卡数据", variant: "destructive" });
      return;
    }

    setLoading(true);
    const results: string[] = [];
    try {
      for (const line of lines) {
        const [addr, nodeText] = line.split(/,|，/).map((s) => s.trim());
        const nodeId = parseNodeId(nodeText || "");
        if (!ethers.isAddress(addr) || nodeId === null) {
          results.push(`${line} => 格式错误`);
          continue;
        }

        const tx = await execTx(() => nexus.transferNftaCard(addr, nodeId));
        if (tx.success) {
          results.push(`${line} => 成功 ${tx.hash?.slice(0, 12) || ""}`);
        } else {
          results.push(`${line} => 失败 ${(tx.error || "未知错误").slice(0, 40)}`);
        }
      }
      setBulkResult(results.join("\n"));
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const onBulkClaim = async () => {
    if (!nexus) return;
    const lines = bulkClaimInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast({ title: "参数错误", description: "请输入批量领取节点ID", variant: "destructive" });
      return;
    }

    setLoading(true);
    const results: string[] = [];
    try {
      for (const line of lines) {
        const nodeId = parseNodeId(line);
        if (nodeId === null) {
          results.push(`${line} => 格式错误`);
          continue;
        }

        const tx = await execTx(() => nexus.claimNftaYield(nodeId));
        if (tx.success) {
          results.push(`${line} => 成功 ${tx.hash?.slice(0, 12) || ""}`);
        } else {
          results.push(`${line} => 失败 ${(tx.error || "未知错误").slice(0, 40)}`);
        }
      }
      setBulkResult(results.join("\n"));
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const onSetTofClaimFee = async () => {
    if (!nexus) return;
    const numeric = Number(tofClaimFeeBps);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 10000) {
      toast({ title: "参数错误", description: "TOF领取费率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("更新TOF领取费率", () => nexus.setTofClaimFeeBps(BigInt(Math.trunc(numeric))));
  };

  const onFundRewardPool = async () => {
    if (!nexus) return;
    const numeric = Number(rewardFundAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast({ title: "参数错误", description: "注资数量必须大于0", variant: "destructive" });
      return;
    }
    await runTx("注资奖励池", () => nexus.fundRewardPool(ethers.parseUnits(rewardFundAmount, 18)));
  };

  const onDeflate = async () => {
    if (!swap) return;
    await runTx("执行通缩", () => swap.deflate());
  };

  const parsePositiveAmount = (value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return ethers.parseUnits(value, 18);
  };

  // 一键从 Swap 分红池分红（调用 swap.forceDistribute）
  const onForceDistributeFromPool = async () => {
    if (!swap) {
      toast({ title: "错误", description: "Swap合约未连接", variant: "destructive" });
      return;
    }
    if (totDividendPool <= 0n && usdtDividendPool <= 0n) {
      toast({ title: "池子为空", description: "TOT和USDT分红池都为0，无需分红", variant: "destructive" });
      return;
    }
    await runTx(
      `从Swap池强制分红 (TOT: ${formatToken(totDividendPool)}, USDT: ${formatToken(usdtDividendPool)})`,
      () => swap.forceDistribute()
    );
  };

  // 手动从管理员钱包注入 TOT 分红
  const onDistributeNftbTot = async () => {
    if (!nexus || !tot || !address) return;
    const amount = parsePositiveAmount(nftbTotDividendAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "NFTB TOT分红金额必须大于0", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const signerAddr = address;
      const balance = await tot.balanceOf(signerAddr);
      if (balance < amount) {
        toast({ title: "钱包余额不足", description: `需要 ${ethers.formatUnits(amount, 18)} TOT，您的钱包余额: ${ethers.formatUnits(balance, 18)}。如需从Swap分红池分红，请使用上方「一键从池子分红」按钮`, variant: "destructive" });
        return;
      }

      const allowance = await tot.allowance(signerAddr, CONTRACTS.NEXUS);
      if (allowance < amount) {
        if (allowance > BigInt(0)) {
          const resetRes = await execTx(() => tot.approve(CONTRACTS.NEXUS, BigInt(0), { gasLimit: 100_000 }));
          if (!resetRes.success) { toast({ title: "授权失败", description: resetRes.error || "重置授权失败", variant: "destructive" }); return; }
        }
        const approveRes = await execTx(() => tot.approve(CONTRACTS.NEXUS, amount, { gasLimit: 200_000 }));
        if (!approveRes.success) { toast({ title: "授权失败", description: approveRes.error || "TOT授权失败", variant: "destructive" }); return; }
      }

      await runTx("从钱包发放NFTB TOT分红", () => nexus.distributeNftbDividends(amount));
    } finally {
      setLoading(false);
    }
  };

  // 手动从管理员钱包注入 USDT 分红
  const onDistributeNftbUsdt = async () => {
    if (!nexus || !usdt || !address) return;
    const amount = parsePositiveAmount(nftbUsdtDividendAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "NFTB USDT分红金额必须大于0", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const signerAddr = address;
      const balance = await usdt.balanceOf(signerAddr);
      if (balance < amount) {
        toast({ title: "钱包余额不足", description: `需要 ${ethers.formatUnits(amount, 18)} USDT，您的钱包余额: ${ethers.formatUnits(balance, 18)}。如需从Swap分红池分红，请使用上方「一键从池子分红」按钮`, variant: "destructive" });
        return;
      }

      const allowance = await usdt.allowance(signerAddr, CONTRACTS.NEXUS);
      if (allowance < amount) {
        if (allowance > BigInt(0)) {
          const resetRes = await execTx(() => usdt.approve(CONTRACTS.NEXUS, BigInt(0), { gasLimit: 100_000 }));
          if (!resetRes.success) { toast({ title: "授权失败", description: resetRes.error || "重置授权失败", variant: "destructive" }); return; }
        }
        const approveRes = await execTx(() => usdt.approve(CONTRACTS.NEXUS, amount, { gasLimit: 200_000 }));
        if (!approveRes.success) { toast({ title: "授权失败", description: approveRes.error || "USDT授权失败", variant: "destructive" }); return; }
      }

      await runTx("从钱包发放NFTB USDT分红", () => nexus.distributeNftbUsdtDividends(amount));
    } finally {
      setLoading(false);
    }
  };

  const onDistributePredictionFlow = async () => {
    if (!nexus || !usdt || !address) return;
    const amount = parsePositiveAmount(predictionFlowAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "预测流水金额必须大于0", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Get current signer address from useWeb3 context
      const signerAddr = address;

      // Check balance
      const balance = await usdt.balanceOf(signerAddr);
      if (balance < amount) {
        toast({ title: "余额不足", description: `需要 ${ethers.formatUnits(amount, 18)} USDT，当前余额: ${ethers.formatUnits(balance, 18)}`, variant: "destructive" });
        return;
      }

      // Check current allowance
      const allowance = await usdt.allowance(signerAddr, CONTRACTS.NEXUS);
      
      if (allowance < amount) {
        // Reset to 0 first if current allowance is non-zero (Tether-style protection)
        if (allowance > BigInt(0)) {
          const resetRes = await execTx(() => usdt.approve(CONTRACTS.NEXUS, BigInt(0), { gasLimit: 100_000 }));
          if (!resetRes.success) {
            toast({ title: "授权失败", description: resetRes.error || "重置授权失败", variant: "destructive" });
            return;
          }
        }

        // Approve the amount
        const approveRes = await execTx(() => usdt.approve(CONTRACTS.NEXUS, amount, { gasLimit: 200_000 }));
        if (!approveRes.success) {
          toast({ title: "授权失败", description: approveRes.error || "USDT授权失败", variant: "destructive" });
          return;
        }
      }

      // Now do the actual distribution
      await runTx("发放预测流水分红", () => nexus.distributePredictionFlowUsdt(amount));
    } finally {
      setLoading(false);
    }
  };

  const onSetPredictionFlowRates = async () => {
    if (!nexus) return;

    const r1 = parseBps(predictionRateTier1);
    const r2 = parseBps(predictionRateTier2);
    const r3 = parseBps(predictionRateTier3);
    if (r1 === null || r2 === null || r3 === null) {
      toast({ title: "参数错误", description: "费率必须在0-10000之间", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const tx1 = await execTx(() => nexus.setPredictionFlowRateBps(1, r1));
      if (!tx1.success) {
        toast({ title: "设置费率失败", description: tx1.error || "Tier1失败", variant: "destructive" });
        return;
      }
      const tx2 = await execTx(() => nexus.setPredictionFlowRateBps(2, r2));
      if (!tx2.success) {
        toast({ title: "设置费率失败", description: tx2.error || "Tier2失败", variant: "destructive" });
        return;
      }
      const tx3 = await execTx(() => nexus.setPredictionFlowRateBps(3, r3));
      if (!tx3.success) {
        toast({ title: "设置费率失败", description: tx3.error || "Tier3失败", variant: "destructive" });
        return;
      }
      toast({ title: "设置预测流水费率成功", description: tx3.hash?.slice(0, 12) || "已上链" });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  // ===== 注册购买 =====
  const collectNftaIssuedRows = (receipt: any, fallbackTxHash?: string): NftaIssuedUserRecord[] => {
    if (!receipt) return [];
    const rows: NftaIssuedUserRecord[] = [];
    for (const log of receipt.logs || []) {
      try {
        const parsed = nexus?.interface.parseLog(log);
        if (parsed?.name !== "NftaPurchased") continue;

        const user = String(parsed.args?.user || "");
        if (!user || user === ethers.ZeroAddress) continue;

        rows.push({
          user,
          tierId: BigInt(parsed.args?.tierId ?? 0n).toString(),
          nodeId: BigInt(parsed.args?.nodeId ?? 0n).toString(),
          blockNumber: String(receipt.blockNumber ?? "-"),
          txHash: String(receipt.hash || fallbackTxHash || ""),
        });
      } catch {
        // Ignore unrelated logs
      }
    }
    return rows;
  };

  const onBatchRegisterNfta = async () => {
    if (!nexus) return;
    const user = registerUserAddr.trim();
    if (!ethers.isAddress(user)) {
      toast({ title: "参数错误", description: "用户地址无效", variant: "destructive" });
      return;
    }

    const tierId = parsePositiveInteger(registerTierId);
    if (tierId === null) {
      toast({ title: "参数错误", description: "Tier ID 必须是正整数", variant: "destructive" });
      return;
    }

    const quantity = parsePositiveInteger(registerQuantity);
    if (quantity === null) {
      toast({ title: "参数错误", description: "数量必须是正整数", variant: "destructive" });
      return;
    }

    const chunkSize = parsePositiveInteger(registerChunkSize);
    if (chunkSize === null) {
      toast({ title: "参数错误", description: "每批数量必须是正整数", variant: "destructive" });
      return;
    }

    const referrer = registerReferrerAddr.trim() ? registerReferrerAddr.trim() : ethers.ZeroAddress;
    if (!ethers.isAddress(referrer)) {
      toast({ title: "参数错误", description: "推荐人地址无效", variant: "destructive" });
      return;
    }

    setLoading(true);
    setRegisterBatchResult("");
    const resultLines: string[] = [];
    try {
      // Prefer one tx with new batch function; fallback to chunked single registration when old contract is still on-chain.
      try {
        const batchTx = await (nexus as any).batchRegisterNftaPurchase(user, BigInt(tierId), BigInt(quantity), referrer);
        const receipt = await batchTx.wait();
        const rows = collectNftaIssuedRows(receipt, batchTx.hash);
        if (rows.length > 0) {
          setNftaIssuedUsers((prev) => [...rows.reverse(), ...prev].slice(0, 100));
        }
        resultLines.push(`批量发放成功: ${quantity} 个, tx ${String(batchTx.hash || "").slice(0, 12)}`);
        setRegisterBatchResult(resultLines.join("\n"));
        toast({ title: "批量发放NFTA成功", description: `已发放 ${quantity} 个` });
        await refresh();
        return;
      } catch (batchErr: any) {
        resultLines.push(`链上批量接口不可用或执行失败，回退分批模式: ${(batchErr?.shortMessage || batchErr?.message || "未知错误").slice(0, 80)}`);
      }

      let completed = 0;
      while (completed < quantity) {
        const currentBatch = Math.min(chunkSize, quantity - completed);
        for (let i = 0; i < currentBatch; i++) {
          const tx = await nexus.registerNftaPurchase(user, BigInt(tierId), referrer);
          const receipt = await tx.wait();
          const rows = collectNftaIssuedRows(receipt, tx.hash);
          if (rows.length > 0) {
            setNftaIssuedUsers((prev) => [...rows.reverse(), ...prev].slice(0, 100));
          }
          completed += 1;
        }
        resultLines.push(`分批进度: ${completed}/${quantity}`);
        setRegisterBatchResult(resultLines.join("\n"));
      }

      toast({ title: "批量发放NFTA成功", description: `已发放 ${completed} 个` });
      await refresh();
    } catch (err: any) {
      toast({ title: "批量发放NFTA失败", description: err?.shortMessage || err?.message || "未知错误", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onRegisterPurchase = async () => {
    if (!nexus) return;
    if (!ethers.isAddress(registerUserAddr.trim())) {
      toast({ title: "参数错误", description: "用户地址无效", variant: "destructive" });
      return;
    }
    const tierId = parsePositiveInteger(registerTierId);
    if (tierId === null) {
      toast({ title: "参数错误", description: "Tier ID 必须是正整数", variant: "destructive" });
      return;
    }
    const referrer = registerReferrerAddr.trim() ? registerReferrerAddr.trim() : ethers.ZeroAddress;
    if (!ethers.isAddress(referrer)) {
      toast({ title: "参数错误", description: "推荐人地址无效", variant: "destructive" });
      return;
    }
    
    if (registerType === "nfta") {
      setLoading(true);
      try {
        const tx = await nexus.registerNftaPurchase(registerUserAddr.trim(), BigInt(tierId), referrer);
        const receipt = await tx.wait();

        const parsedRows = collectNftaIssuedRows(receipt, tx.hash);
        if (parsedRows.length > 0) {
          setNftaIssuedUsers((prev) => [...parsedRows.reverse(), ...prev].slice(0, 100));
        }

        toast({ title: "注册NFTA购买成功", description: tx.hash?.slice(0, 12) || "已上链" });
        await refresh();
      } catch (err: any) {
        toast({ title: "注册NFTA购买失败", description: err?.shortMessage || err?.message || "未知错误", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    } else {
      await runTx(
        "注册NFTB购买",
        () => nexus.registerNftbPurchase(registerUserAddr.trim(), BigInt(tierId), referrer)
      );
    }
  };

  // ===== 提现费率 =====
  const onSetWithdrawFee = async () => {
    if (!nexus) return;
    const bps = parseBps(withdrawFeeBps);
    if (bps === null) {
      toast({ title: "参数错误", description: "费率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("设置提现费率", () => nexus.setWithdrawFeeBps(bps));
  };

  // ===== TOF 燃烧比率 =====
  const onSetTofBurnBps = async () => {
    if (!nexus) return;
    const bps = parseBps(tofBurnBps);
    if (bps === null) {
      toast({ title: "参数错误", description: "费率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("设置TOF燃烧比率", () => nexus.setTofBurnBps(bps));
  };

  // ===== Treasury =====
  const onSetTreasury = async () => {
    if (!nexus) return;
    if (!ethers.isAddress(treasuryAddr.trim())) {
      toast({ title: "参数错误", description: "地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置Treasury", () => nexus.setTreasury(treasuryAddr.trim()));
  };

  // ===== 钱包地址 =====
  const onSetWallets = async () => {
    if (!nexus) return;
    const addrs = [zeroLineAddr, communityAddr, foundationAddr, institutionAddr].map((a) => a.trim());
    if (!addrs.every((a) => ethers.isAddress(a))) {
      toast({ title: "参数错误", description: "所有地址都必须有效", variant: "destructive" });
      return;
    }
    await runTx("设置钱包地址", () => nexus.setWallets(...addrs.map((a) => a) as Parameters<typeof nexus.setWallets>));
  };

  // ===== 项目方钱包 =====
  const onSetProjectWallet = async () => {
    if (!nexus) return;
    if (!ethers.isAddress(projectAddr.trim())) {
      toast({ title: "参数错误", description: "地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置项目方钱包", () => nexus.setProjectWallet(projectAddr.trim()));
  };

  // ===== 分发器管理 =====
  const onSetDistributor = async () => {
    if (!nexus) return;
    if (!ethers.isAddress(distributorAddr.trim())) {
      toast({ title: "参数错误", description: "地址无效", variant: "destructive" });
      return;
    }
    await runTx(
      "设置分发器",
      () => nexus.setDistributor(distributorAddr.trim(), distributorStatus === "true")
    );
  };

  // ===== Swap 流动性管理 =====
  const onAddLiquidity = async () => {
    if (!swap) return;
    if (externalDexEnabled) {
      toast({ title: "外部DEX模式已启用", description: "当前模式下已禁用内部池流动性管理", variant: "destructive" });
      return;
    }
    const tot = parsePositiveAmount(addLiquidityTot);
    const usdt = parsePositiveAmount(addLiquidityUsdt);
    if (tot === null || usdt === null) {
      toast({ title: "参数错误", description: "TOT和USDT金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("提供流动性", () => swap.addLiquidity(tot, usdt));
  };

  const onRemoveLiquidity = async () => {
    if (!swap) return;
    if (externalDexEnabled) {
      toast({ title: "外部DEX模式已启用", description: "当前模式下已禁用内部池流动性管理", variant: "destructive" });
      return;
    }
    const tot = parsePositiveAmount(removeLiquidityTot);
    const usdt = parsePositiveAmount(removeLiquidityUsdt);
    if (tot === null || usdt === null) {
      toast({ title: "参数错误", description: "TOT和USDT金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("移除流动性", () => swap.removeLiquidity(tot, usdt));
  };

  // ===== Swap 费率配置 =====
  const onSetBuyFeeBps = async () => {
    if (!swap) return;
    const fee = parseBps(buyFeeBps);
    if (fee === null) {
      toast({ title: "参数错误", description: "费率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("设置买入费率", () => swap.setBuyFeeBps(fee));
  };

  const onSetSellFeeBps = async () => {
    if (!swap) return;
    const fee = parseBps(sellFeeBps);
    if (fee === null) {
      toast({ title: "参数错误", description: "费率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("设置卖出费率", () => swap.setSellFeeBps(fee));
  };

  const onSetProfitTaxBps = async () => {
    if (!swap) return;
    const tax = parseBps(profitTaxBps);
    if (tax === null) {
      toast({ title: "参数错误", description: "税率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("设置利润税率", () => swap.setProfitTaxBps(tax));
  };

  const onSetDeflationBps = async () => {
    if (!swap) return;
    const def = parseBps(deflationBps);
    if (def === null) {
      toast({ title: "参数错误", description: "比率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("设置通胀比率", () => swap.setDeflationBps(def));
  };

  // ===== Swap 分配策略 =====
  const onSetDistributionThreshold = async () => {
    if (!swap) return;
    const threshold = parsePositiveAmount(distributionThreshold);
    if (threshold === null) {
      toast({ title: "参数错误", description: "分配阈值必须大于0", variant: "destructive" });
      return;
    }
    await runTx("设置分配阈值", () => swap.setDistributionThreshold(threshold));
  };

  const onSetMaxDailyBuy = async () => {
    if (!swap) return;
    const max = parsePositiveAmount(maxDailyBuy);
    if (max === null) {
      toast({ title: "参数错误", description: "日购买上限必须大于0", variant: "destructive" });
      return;
    }
    await runTx("设置日购买上限", () => swap.setMaxDailyBuy(max));
  };

  const onSetMaxSellBps = async () => {
    if (!swap) return;
    const maxBps = parseBps(maxSellBps);
    if (maxBps === null) {
      toast({ title: "参数错误", description: "卖出比例必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("设置最大卖出比例", () => swap.setMaxSellBps(maxBps));
  };

  // ===== Swap 核心功能 =====
  const onSetNexus = async () => {
    if (!swap) return;
    if (!ethers.isAddress(newNexusAddr.trim())) {
      toast({ title: "参数错误", description: "Nexus地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置Nexus地址", () => swap.setNexus(newNexusAddr.trim()));
  };

  const onSetDexRouter = async () => {
    if (!swap) return;
    const addr = dexRouterAddr.trim();
    if (!ethers.isAddress(addr)) {
      toast({ title: "参数错误", description: "Router地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置DEX Router", () => swap.setDexRouter(addr));
    setDexRouterAddr(addr);
  };

  const onSetDexPair = async () => {
    if (!swap) return;
    const addr = dexPairAddr.trim();
    if (!ethers.isAddress(addr)) {
      toast({ title: "参数错误", description: "Pair地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置DEX Pair", () => swap.setDexPair(addr));
    setDexPairAddr(addr);
  };

  const onSetDexFactory = async () => {
    if (!swap) return;
    const addr = dexFactoryAddr.trim();
    if (!ethers.isAddress(addr)) {
      toast({ title: "参数错误", description: "Factory地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置DEX Factory", () => swap.setDexFactory(addr));
    setDexFactoryAddr(addr);
  };

  const onToggleExternalDex = async (enabled: boolean) => {
    if (!swap) return;
    await runTx(enabled ? "启用外部DEX模式" : "关闭外部DEX模式", () => swap.setExternalDexEnabled(enabled));
    setExternalDexEnabled(enabled);
  };

  const onToggleSwapPaused = async (paused: boolean) => {
    if (!swap) return;
    await runTx(paused ? "暂停外部兑换" : "恢复外部兑换", () => swap.setSwapPaused(paused));
    setSwapPaused(paused);
  };

  const onForceDistribute = async () => {
    if (!swap) return;
    await runTx("强制分配", () => swap.forceDistribute());
  };

  const onEmergencyWithdraw = async () => {
    if (!swap) return;
    if (!ethers.isAddress(emergencyTokenAddr.trim())) {
      toast({ title: "参数错误", description: "Token地址无效", variant: "destructive" });
      return;
    }
    const amount = parsePositiveAmount(emergencyAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "提取金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("应急提取", () => swap.emergencyWithdraw(emergencyTokenAddr.trim(), amount));
  };

  const onTransferNexusOwner = async () => {
    if (!canTransferNexusOwnership) {
      toast({ title: "权限不足", description: "只有 Nexus Owner 或 Admin 才能转移所有权", variant: "destructive" });
      return;
    }

    if (!nexus) {
      toast({ title: "错误", description: "Nexus合约未加载", variant: "destructive" });
      return;
    }

    if (!ethers.isAddress(newNexusOwnerAddr.trim())) {
      toast({ title: "参数错误", description: "新Owner地址无效", variant: "destructive" });
      return;
    }

    if (newNexusOwnerAddr.trim().toLowerCase() === ownerAddress.toLowerCase()) {
      toast({ title: "参数错误", description: "新Owner与当前Owner相同", variant: "destructive" });
      return;
    }

    // Confirm with user
    const confirmed = window.confirm(
      `确认转移Nexus Owner权限吗？\n当前Owner: ${ownerAddress}\n新Owner: ${newNexusOwnerAddr}\n\n此操作不可逆！`
    );
    if (!confirmed) return;

    await runTx("转移Nexus Owner", () => nexus.transferOwnership(newNexusOwnerAddr.trim()));
    setNewNexusOwnerAddr("");
  };

  const onTransferSwapOwner = async () => {
    if (!canTransferSwapOwnership) {
      toast({ title: "权限不足", description: "只有 Swap Owner 或 Admin 才能转移所有权", variant: "destructive" });
      return;
    }

    if (!swap) {
      toast({ title: "错误", description: "Swap合约未加载", variant: "destructive" });
      return;
    }

    if (!ethers.isAddress(newSwapOwnerAddr.trim())) {
      toast({ title: "参数错误", description: "新Owner地址无效", variant: "destructive" });
      return;
    }

    if (newSwapOwnerAddr.trim().toLowerCase() === swapOwnerAddress.toLowerCase()) {
      toast({ title: "参数错误", description: "新Owner与当前Owner相同", variant: "destructive" });
      return;
    }

    // Confirm with user
    const confirmed = window.confirm(
      `确认转移Swap Owner权限吗？\n当前Owner: ${swapOwnerAddress}\n新Owner: ${newSwapOwnerAddr}\n\n此操作不可逆！`
    );
    if (!confirmed) return;

    await runTx("转移Swap Owner", () => swap.transferOwnership(newSwapOwnerAddr.trim()));
    setNewSwapOwnerAddr("");
  };

  const parseAddressBatch = (raw: string): string[] => {
    const items = raw
      .split(/\r?\n|,|，|;|\s+/)
      .map((v) => v.trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(items.map((v) => v.toLowerCase())));
    return uniq;
  };

  const [nexusHasAdminFunctions, setNexusHasAdminFunctions] = useState(true);

  const onSetNexusAdmin = async () => {
    if (!nexus) return;
    const account = nexusAdminAddr.trim();
    if (!ethers.isAddress(account)) {
      toast({ title: "参数错误", description: "Nexus 管理员地址无效", variant: "destructive" });
      return;
    }
    try {
      await runTx("设置 Nexus 管理员", () => nexus.setAdmin(account, nexusAdminStatus === "true"));
    } catch {
      toast({ title: "设置失败", description: "当前 Nexus 合约版本不支持 setAdmin，请先升级合约", variant: "destructive" });
    }
  };

  const onBatchSetNexusAdmins = async () => {
    if (!nexus) return;
    const accounts = parseAddressBatch(nexusAdminBatchInput);
    if (accounts.length === 0 || accounts.some((a) => !ethers.isAddress(a))) {
      toast({ title: "参数错误", description: "批量 Nexus 管理员地址格式无效", variant: "destructive" });
      return;
    }
    const status = nexusAdminStatus === "true";
    try {
      await runTx("批量设置 Nexus 管理员", () => nexus.setAdmins(accounts, Array(accounts.length).fill(status)));
    } catch {
      toast({ title: "设置失败", description: "当前 Nexus 合约版本不支持 setAdmins，请先升级合约", variant: "destructive" });
    }
  };

  const onSetSwapAdmin = async () => {
    if (!swap) return;
    const account = swapAdminAddr.trim();
    if (!ethers.isAddress(account)) {
      toast({ title: "参数错误", description: "Swap 管理员地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置 Swap 管理员", () => swap.setAdmin(account, swapAdminStatus === "true"));
  };

  const onBatchSetSwapAdmins = async () => {
    if (!swap) return;
    const accounts = parseAddressBatch(swapAdminBatchInput);
    if (accounts.length === 0 || accounts.some((a) => !ethers.isAddress(a))) {
      toast({ title: "参数错误", description: "批量 Swap 管理员地址格式无效", variant: "destructive" });
      return;
    }
    const status = swapAdminStatus === "true";
    await runTx("批量设置 Swap 管理员", () => swap.setAdmins(accounts, Array(accounts.length).fill(status)));
  };

  const onRemoveNexusAdmin = async (account: string) => {
    if (!nexus) return;
    const confirmed = window.confirm(`确认移除 Nexus 超管权限？\n\n${account}`);
    if (!confirmed) return;
    try {
      await runTx("移除 Nexus 超管", () => nexus.setAdmin(account, false));
    } catch {
      toast({ title: "移除失败", description: "当前 Nexus 合约版本不支持 setAdmin，请先升级合约", variant: "destructive" });
    }
  };

  const onRemoveSwapAdmin = async (account: string) => {
    if (!swap) return;
    const confirmed = window.confirm(`确认移除 Swap 超管权限？\n\n${account}`);
    if (!confirmed) return;
    await runTx("移除 Swap 超管", () => swap.setAdmin(account, false));
  };

  // ===== Manager 管理 =====
  const onSetNexusManager = async () => {
    if (!nexus) return;
    const account = nexusManagerAddr.trim();
    if (!ethers.isAddress(account)) {
      toast({ title: "参数错误", description: "Nexus Manager 地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置 Nexus Manager", () => nexus.setManager(account, nexusManagerStatus === "true"));
  };

  const onBatchSetNexusManagers = async () => {
    if (!nexus) return;
    const accounts = parseAddressBatch(nexusManagerBatchInput);
    if (accounts.length === 0 || accounts.some((a) => !ethers.isAddress(a))) {
      toast({ title: "参数错误", description: "批量 Nexus Manager 地址格式无效", variant: "destructive" });
      return;
    }
    const status = nexusManagerStatus === "true";
    await runTx("批量设置 Nexus Manager", () => nexus.setManagers(accounts, Array(accounts.length).fill(status)));
  };

  const onSetSwapManager = async () => {
    if (!swap) return;
    const account = swapManagerAddr.trim();
    if (!ethers.isAddress(account)) {
      toast({ title: "参数错误", description: "Swap Manager 地址无效", variant: "destructive" });
      return;
    }
    await runTx("设置 Swap Manager", () => swap.setManager(account, swapManagerStatus === "true"));
  };

  const onBatchSetSwapManagers = async () => {
    if (!swap) return;
    const accounts = parseAddressBatch(swapManagerBatchInput);
    if (accounts.length === 0 || accounts.some((a) => !ethers.isAddress(a))) {
      toast({ title: "参数错误", description: "批量 Swap Manager 地址格式无效", variant: "destructive" });
      return;
    }
    const status = swapManagerStatus === "true";
    await runTx("批量设置 Swap Manager", () => swap.setManagers(accounts, Array(accounts.length).fill(status)));
  };

  const onRemoveNexusManager = async (account: string) => {
    if (!nexus) return;
    const confirmed = window.confirm(`确认移除 Nexus Manager 权限？\n\n${account}`);
    if (!confirmed) return;
    await runTx("移除 Nexus Manager", () => nexus.setManager(account, false));
  };

  const onReplaceUsdtToken = async () => {
    if (!swap) return;
    const addr = newUsdtAddr.trim();
    if (!ethers.isAddress(addr)) {
      toast({ title: "参数错误", description: "USDT 地址无效", variant: "destructive" });
      return;
    }

    const targets: string[] = [];
    if (nexus && isNexusManager) targets.push("Nexus");
    if (swap && isSwapManager) targets.push("Swap");
    if (targets.length === 0) {
      toast({ title: "权限不足", description: "当前钱包无任何合约管理权限", variant: "destructive" });
      return;
    }

    const confirmed = window.confirm(
      `确认将 ${targets.join(" 和 ")} 的 usdtToken 替换为 ${addr} 吗？\n\n此操作会立即影响购买、分红和兑换。`
    );
    if (!confirmed) return;

    if (nexus && isNexusManager) {
      try {
        const okNexus = await runTx("替换 Nexus USDT 地址", () => nexus.setUsdtToken(addr));
        if (!okNexus) {
          toast({ title: "Nexus USDT 替换失败", description: "合约可能尚未支持此功能（需升级 Nexus）", variant: "destructive" });
        }
      } catch {
        toast({ title: "Nexus USDT 替换失败", description: "合约可能尚未支持此功能（需升级 Nexus）", variant: "destructive" });
      }
    }
    if (swap && isSwapManager) {
      const okSwap = await runTx("替换 Swap USDT 地址", () => swap.setUsdtToken(addr));
      if (!okSwap) return;
    }
    setNewUsdtAddr("");

    // Re-fetch USDT addresses so the UI reflects the new value immediately
    try {
      if (nexus && isNexusManager) {
        const updated = String(await nexus.usdtToken());
        setNexusUsdtAddress(updated);
      }
    } catch {}
    try {
      if (swap) {
        const updated = String(await swap.usdtToken());
        setSwapUsdtAddress(updated);
      }
    } catch {}
  };

  return (
    <div className="space-y-6 overflow-hidden">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>管理员面板</CardTitle>
          <CardDescription>
            分离展示 Nexus 与 Swap 的治理权限，避免不同合约角色混淆。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="font-medium text-foreground">Nexus 治理</div>
              <div>Owner: {ownerAddress ? formatAddress(ownerAddress) : "读取中..."}</div>
              <div>{nexusAdminLabel}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="font-medium text-foreground">Swap 治理</div>
              <div>Owner: {swapOwnerAddress ? formatAddress(swapOwnerAddress) : "读取中..."}</div>
              <div>{swapAdminLabel}</div>
            </div>
          </div>
          <div>
            {!isConnected
              ? "请先连接钱包。"
              : isAdmin
                ? "当前钱包至少拥有一个管理角色；Nexus 与 Swap 将按各自 Owner/Admin/Manager 分别鉴权。"
                : "当前钱包没有管理权限，页面仅展示只读信息。"}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>权限管理（三级体系）</CardTitle>
          <CardDescription>Owner 与 Admin 同权，Manager 负责业务执行。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-500/40 bg-blue-500/5">
            <AlertDescription className="text-xs space-y-3">
              <div>
                <div className="font-medium text-foreground">职责边界</div>
                <div>• Owner：保留所有者身份，执行权限与 Admin 对齐。</div>
                <div>• Admin超管：与 Owner 同权，可执行全部治理/运营操作，并可继续管理 Admin/Manager。</div>
                <div>• Manager管理员：运营执行权限，可执行日常业务操作，并额外支持改上下级、增加流动性。</div>
              </div>
              <div>
                <div className="font-medium text-foreground">授权链路</div>
                <div>• Owner 或 Admin超管 可设置/撤销 Admin超管。</div>
                <div>• Owner 或 Admin超管 可设置/撤销 Manager管理员。</div>
                <div>• Nexus 与 Swap 分别鉴权：一个合约有权限，不代表另一个合约自动有权限。</div>
              </div>
              <div>
                <div className="font-medium text-foreground">可操作范围</div>
                <div>• Manager 可做：发放/领取、分红触发、常规费率与通缩等运营动作，以及改上下级、增加流动性。</div>
                <div>• Admin/Owner 额外可做：角色管理、钱包治理、USDT替换、外部 DEX 配置、应急与升级相关操作。</div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
              <div>当前 Nexus USDT: {nexusUsdtAddress ? formatAddress(nexusUsdtAddress) : "读取中..."}</div>
              <div>当前钱包 Nexus 角色: {isOwner ? "Owner" : isNexusAdminRole ? "Admin(超管)" : isNexusManagerRole ? "Manager(管理员)" : "None"}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
              <div>当前 Swap USDT: {swapUsdtAddress ? formatAddress(swapUsdtAddress) : "读取中..."}</div>
              <div>当前钱包 Swap 角色: {isSwapOwner ? "Owner" : isSwapAdminRole ? "Admin(超管)" : isSwapManagerRole ? "Manager(管理员)" : "None"}</div>
            </div>
          </div>

          {!nexusHasAdminFunctions && (
            <Alert className="border-amber-500/40 bg-amber-500/5">
              <AlertDescription className="text-xs text-amber-400">
                ⚠️ 当前部署的 Nexus 合约版本不支持 setAdmin / setAdmins 功能，Nexus 管理员操作将失败。请先升级 Nexus 合约后再使用。
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={nexusAdminAddr} onChange={(e) => setNexusAdminAddr(e.target.value)} placeholder="Nexus 管理员地址" />
            <Select value={nexusAdminStatus} onValueChange={setNexusAdminStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">授权</SelectItem>
                <SelectItem value="false">撤销</SelectItem>
              </SelectContent>
            </Select>
            <div />
            <Button variant="outline" disabled={!canManageNexusAdmins || loading || !nexus || !nexusHasAdminFunctions} onClick={onSetNexusAdmin}>设置 Nexus 超管</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Textarea value={nexusAdminBatchInput} onChange={(e) => setNexusAdminBatchInput(e.target.value)} className="md:col-span-3 min-h-[90px]" placeholder="批量 Nexus 超管地址，支持换行/逗号分隔" />
            <Button variant="outline" disabled={!canManageNexusAdmins || loading || !nexus || !nexusHasAdminFunctions} onClick={onBatchSetNexusAdmins}>批量设置 Nexus 超管</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={swapAdminAddr} onChange={(e) => setSwapAdminAddr(e.target.value)} placeholder="Swap 管理员地址" />
            <Select value={swapAdminStatus} onValueChange={setSwapAdminStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">授权</SelectItem>
                <SelectItem value="false">撤销</SelectItem>
              </SelectContent>
            </Select>
            <div />
            <Button variant="outline" disabled={!canManageSwapAdmins || loading || !swap} onClick={onSetSwapAdmin}>设置 Swap 超管</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Textarea value={swapAdminBatchInput} onChange={(e) => setSwapAdminBatchInput(e.target.value)} className="md:col-span-3 min-h-[90px]" placeholder="批量 Swap 超管地址，支持换行/逗号分隔" />
            <Button variant="outline" disabled={!canManageSwapAdmins || loading || !swap} onClick={onBatchSetSwapAdmins}>批量设置 Swap 超管</Button>
          </div>

          <div className="border-t border-border/40 pt-3 mt-3">
            <div className="text-sm font-medium mb-2">Manager 管理员（超管或 Owner 可操作）</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={nexusManagerAddr} onChange={(e) => setNexusManagerAddr(e.target.value)} placeholder="Nexus Manager 地址" />
            <Select value={nexusManagerStatus} onValueChange={setNexusManagerStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">授权</SelectItem>
                <SelectItem value="false">撤销</SelectItem>
              </SelectContent>
            </Select>
            <div />
            <Button variant="outline" disabled={!isNexusManager || loading || !nexus} onClick={onSetNexusManager}>设置 Nexus Manager</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Textarea value={nexusManagerBatchInput} onChange={(e) => setNexusManagerBatchInput(e.target.value)} className="md:col-span-3 min-h-[90px]" placeholder="批量 Nexus Manager 地址，支持换行/逗号分隔" />
            <Button variant="outline" disabled={!isNexusManager || loading || !nexus} onClick={onBatchSetNexusManagers}>批量设置 Nexus Manager</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={swapManagerAddr} onChange={(e) => setSwapManagerAddr(e.target.value)} placeholder="Swap Manager 地址" />
            <Select value={swapManagerStatus} onValueChange={setSwapManagerStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">授权</SelectItem>
                <SelectItem value="false">撤销</SelectItem>
              </SelectContent>
            </Select>
            <div />
            <Button variant="outline" disabled={!isSwapManager || loading || !swap} onClick={onSetSwapManager}>设置 Swap Manager</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Textarea value={swapManagerBatchInput} onChange={(e) => setSwapManagerBatchInput(e.target.value)} className="md:col-span-3 min-h-[90px]" placeholder="批量 Swap Manager 地址，支持换行/逗号分隔" />
            <Button variant="outline" disabled={!isSwapManager || loading || !swap} onClick={onBatchSetSwapManagers}>批量设置 Swap Manager</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-cyan-500/30">
        <CardHeader>
          <CardTitle>P0 分红监控与触发前模拟</CardTitle>
          <CardDescription>不发交易即可预演本轮分红效果，并在触发前检查关键配置风险。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="font-medium text-foreground">TOT 分红池</div>
              <div>当前池子: {formatToken(totDividendPool)} TOT</div>
              <div>触发阈值: {formatToken(totDistributionThreshold)} TOT</div>
              <div>达成进度: {formatPercent(totDividendPool, totDistributionThreshold)}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="font-medium text-foreground">USDT 分红池</div>
              <div>当前池子: {formatToken(usdtDividendPool)} USDT</div>
              <div>触发阈值: {formatToken(usdtDistributionThreshold)} USDT</div>
              <div>达成进度: {formatPercent(usdtDividendPool, usdtDistributionThreshold)}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 text-xs">
            <div className="font-medium text-foreground">触发前健康检查</div>
            {dividendHealthChecks.length === 0 ? (
              <div className="text-muted-foreground">暂无检查结果，请点击刷新或等待页面自动加载。</div>
            ) : (
              dividendHealthChecks.map((check) => (
                <div key={check.key} className="flex items-center justify-between gap-3">
                  <span>{check.ok ? "✅" : "⚠️"} {check.label}</span>
                  <span className="text-muted-foreground">{check.detail || "-"}</span>
                </div>
              ))
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 text-xs">
            <div className="font-medium text-foreground">触发前模拟参数</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <Input
                value={simulateBlockRange}
                onChange={(e) => setSimulateBlockRange(e.target.value)}
                placeholder="事件回溯区块数（默认1500000）"
              />
              <div className="md:col-span-2 text-muted-foreground">
                模拟逻辑：读取当前分红池 + 当前节点权重 + 最近购买事件，估算“如果现在触发”每个地址的新增额度。
              </div>
              <Button variant="outline" disabled={simulatingDividends || loading} onClick={runDividendSimulation}>
                {simulatingDividends ? "模拟中..." : "运行模拟（只读）"}
              </Button>
            </div>
          </div>

          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 使用说明（建议先看）
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-2">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-1">
                  <div>1. 先看“健康检查”：若出现 ⚠️，先修配置再触发分红。</div>
                  <div>2. 再看“分红池达成进度”：低于阈值时建议只做模拟，不要强制分配。</div>
                  <div>3. 点击“运行模拟（只读）”：确认本轮项目方份额、各层份额和用户预计新增额度。</div>
                  <div>4. 模拟结果满意后，再去下方“强制分配”执行真实链上交易。</div>
                  <div>5. 本区块不会发交易，不会改变链上状态。</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>

          {tierEstimates.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 text-xs">
              <div className="font-medium text-foreground">分层预估结果（本轮）</div>
              <div className="space-y-1">
                {tierEstimates.map((tier) => (
                  <div key={tier.tierId} className="rounded border border-border/40 p-2 bg-background/40">
                    <div>Tier {tier.tierId} | bps={tier.dividendBps} | tierWeight={tier.tierWeight} | nodeWeight={tier.nodeWeight}</div>
                    <div>层总额: TOT {formatToken(tier.tierTot)} | USDT {formatToken(tier.tierUsdt)}</div>
                    <div>单卡预估: TOT +{formatToken(tier.perNodeTot)} | USDT +{formatToken(tier.perNodeUsdt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {userEstimates.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 text-xs">
              <div className="font-medium text-foreground">用户预估结果（按 TOT 降序）</div>
              <div className="max-h-[240px] overflow-y-auto space-y-1">
                {userEstimates.map((row) => (
                  <div key={row.user} className="rounded border border-border/40 p-2 bg-background/40">
                    <div className="font-mono">{formatAddress(row.user)}</div>
                    <div>活跃NFTB节点: {row.activeNodes}</div>
                    <div>预计新增: TOT +{formatToken(row.addTot)} | USDT +{formatToken(row.addUsdt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(nexusHasEnumerableFunctions || swapHasEnumerableFunctions) && (
        <Card className="glass-panel border-blue-500/30">
          <CardHeader>
            <CardTitle>角色列表查询 (v2)</CardTitle>
            <CardDescription>显示当前合约可枚举的超管 Admin 与 Manager 地址</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nexusHasEnumerableFunctions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">Nexus 超管 Admin ({nexusAdminList.length})</div>
                  <Button variant="ghost" size="sm" onClick={queryNexusAdminList} disabled={loading}>
                    刷新
                  </Button>
                </div>
                <div className="border border-border/40 rounded-lg bg-muted/10 p-3 max-h-[200px] overflow-y-auto text-xs space-y-1">
                  {nexusAdminList.length > 0 ? (
                    nexusAdminList.map((admin, idx) => (
                      <div key={idx} className="flex items-center justify-between font-mono p-1 hover:bg-muted/20 rounded">
                        <span>[{idx}] {formatAddress(admin)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-400 hover:text-red-300"
                          disabled={!canManageNexusAdmins || loading || !nexus || !nexusHasAdminFunctions}
                          onClick={() => onRemoveNexusAdmin(admin)}
                        >
                          删除
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">暂无超管 Admin</div>
                  )}
                </div>
              </div>
            )}
            {swapHasEnumerableFunctions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">Swap 超管 Admin ({swapAdminList.length})</div>
                  <Button variant="ghost" size="sm" onClick={querySwapAdminList} disabled={loading}>
                    刷新
                  </Button>
                </div>
                <div className="border border-border/40 rounded-lg bg-muted/10 p-3 max-h-[200px] overflow-y-auto text-xs space-y-1">
                  {swapAdminList.length > 0 ? (
                    swapAdminList.map((admin, idx) => (
                      <div key={idx} className="flex items-center justify-between font-mono p-1 hover:bg-muted/20 rounded">
                        <span>[{idx}] {formatAddress(admin)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-400 hover:text-red-300"
                          disabled={!canManageSwapAdmins || loading || !swap}
                          onClick={() => onRemoveSwapAdmin(admin)}
                        >
                          删除
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">暂无超管 Admin</div>
                  )}
                </div>
              </div>
            )}
            {nexusHasEnumerableFunctions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">Nexus Manager ({nexusManagerList.length})</div>
                  <Button variant="ghost" size="sm" onClick={queryNexusManagerList} disabled={loading}>
                    刷新
                  </Button>
                </div>
                <div className="border border-border/40 rounded-lg bg-muted/10 p-3 max-h-[200px] overflow-y-auto text-xs space-y-1">
                  {nexusManagerList.length > 0 ? (
                    nexusManagerList.map((manager, idx) => (
                      <div key={idx} className="flex items-center justify-between font-mono p-1 hover:bg-muted/20 rounded">
                        <span>[{idx}] {formatAddress(manager)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-400 hover:text-red-300"
                          disabled={!isNexusManager || loading || !nexus}
                          onClick={() => onRemoveNexusManager(manager)}
                        >
                          删除
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">暂无 Manager</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel border-emerald-500/30">
        <CardHeader>
          <CardTitle>USDT 地址同步替换</CardTitle>
          <CardDescription>一次操作同步替换 Nexus 与 Swap 的 usdtToken 地址</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="border-emerald-500/40 bg-emerald-500/5">
            <AlertDescription className="text-xs">
              请先确认新 USDT 合约地址已正确部署且可用。替换后会影响购买、分红与兑换逻辑。
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={newUsdtAddr} onChange={(e) => setNewUsdtAddr(e.target.value)} placeholder="新 USDT 合约地址 0x..." />
            <div />
            <Button disabled={(!isNexusManager && !isSwapManager) || loading || !swap} onClick={onReplaceUsdtToken}>替换 USDT 地址（按权限分别执行）</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-blue-500/30">
        <CardHeader>
          <CardTitle>Nexus 配置面板</CardTitle>
          <CardDescription>主合约治理、节点参数、钱包与分发配置</CardDescription>
        </CardHeader>
      </Card>

      <TierManagementPanel
        nexus={nexus}
        readonlyNexus={readonlyNexus}
        isOwner={isNexusAuthorized}
        loading={loading}
        setLoading={setLoading}
        onRefreshParent={refresh}
      />

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Nexus Owner 转移</CardTitle>
          <CardDescription>转移主合约所有权到新地址（Owner 或 Admin 可操作，不可逆）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="border-amber-500/50 bg-amber-500/5">
            <AlertDescription className="text-xs text-amber-400">
              ⚠️ <strong>警告：</strong>此操作将永久转移 Nexus 合约的所有权。请确保新地址有效且由您控制。此操作不可逆！
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input 
              value={newNexusOwnerAddr} 
              onChange={(e) => setNewNexusOwnerAddr(e.target.value)} 
              placeholder="新Owner地址 0x..."
              disabled={!canTransferNexusOwnership || loading}
            />
            <Button 
              variant="destructive" 
              disabled={!canTransferNexusOwnership || loading || !newNexusOwnerAddr.trim() || !nexus}
              onClick={onTransferNexusOwner}
            >
              {loading ? "处理中..." : "转移Owner"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>NFTA 单笔操作</CardTitle>
          <CardDescription>转卡与单节点领取</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看操作举例
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-1">
                  <div><strong>举例1：转让节点</strong></div>
                  <div>• 节点ID：<code className="bg-black/20 px-1 rounded">12345</code></div>
                  <div>• 接收地址：<code className="bg-black/20 px-1 rounded">0x742d35Cc6634C0532925a3b844Bc87e9f88aEd39</code></div>
                  <div className="mt-1"><strong>举例2：领取单个节点收益</strong></div>
                  <div>• 节点ID：<code className="bg-black/20 px-1 rounded">12345</code></div>
                  <div className="text-zinc-400 mt-1">✓ 节点ID为数字，接收地址需要有效的以太坊地址格式</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={transferNodeId} onChange={(e) => setTransferNodeId(e.target.value)} placeholder="节点ID" />
            <Input value={transferTo} onChange={(e) => setTransferTo(e.target.value)} placeholder="接收地址" />
            <Button disabled={!isNexusAuthorized || loading || !nexus} onClick={onTransferNfta}>转让NFTA</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={claimNodeId} onChange={(e) => setClaimNodeId(e.target.value)} placeholder="节点ID" />
            <div />
            <Button variant="outline" disabled={!isNexusAuthorized || loading || !nexus} onClick={onClaimNfta}>领取NFTA收益</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>NFTA 批量操作</CardTitle>
          <CardDescription>转卡格式：地址,节点ID；领取格式：每行一个节点ID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看批量操作示例
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3 space-y-2">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>批量转卡示例</strong>（每行一条，地址和节点ID用逗号分隔）：</div>
                  <div className="bg-black/30 p-2 rounded font-mono text-xs whitespace-pre-wrap overflow-x-auto">
{`0x742d35Cc6634C0532925a3b844Bc87e9f88aEd39,12345
0x8fd379246834a3cDa7c1C2EACD957b5747539ca42,12346
0xAbFD8f7d3b214b3B74dd6fA6C80dFe2f59C1c6ea,12347`}
                  </div>
                  <div className="mt-2"><strong>批量领取示例</strong>（每行一个节点ID）：</div>
                  <div className="bg-black/30 p-2 rounded font-mono text-xs whitespace-pre-wrap">
{`12345
12346
12347
12348`}
                  </div>
                  <div className="text-zinc-400 mt-2">💡 提示：操作完成后会显示每笔交易的结果（成功/失败）</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Textarea value={bulkTransferInput} onChange={(e) => setBulkTransferInput(e.target.value)} className="min-h-[120px]" placeholder="0xabc...,123" />
              <Button disabled={!isNexusAuthorized || loading || !nexus} onClick={onBulkTransfer}>批量转卡</Button>
            </div>
            <div className="space-y-2">
              <Textarea value={bulkClaimInput} onChange={(e) => setBulkClaimInput(e.target.value)} className="min-h-[120px]" placeholder="123" />
              <Button variant="outline" disabled={!isNexusAuthorized || loading || !nexus} onClick={onBulkClaim}>批量领取</Button>
            </div>
          </div>
          {bulkResult ? (
            <div className="text-xs whitespace-pre-wrap rounded border border-border/60 bg-muted/30 p-2">{bulkResult}</div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>参数与运营</CardTitle>
          <CardDescription>TOF 领取费率、奖励池注资</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看参数说明与示例
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-1">
                  <div><strong>参数解释：</strong></div>
                  <div>• <strong>TOF 领取费率</strong>：用户领取TOT时收取的手续费（bps单位，1 bps = 0.01%）</div>
                  <div>• <strong>奖励池注资</strong>：向奖励池添加TOT代币，单位为TOT</div>
                  <div>• <strong>执行通缩</strong>：触发Swap合约的4小时通缩逻辑（自动焚烧部分代币）</div>
                  <div className="mt-2"><strong>常见配置示例：</strong></div>
                  <div className="bg-black/30 p-2 rounded">
                    • TOF费率: 500 (0.5%的手续费)<br/>
                    • 奖励池注资: 10000 (增加1万TOT)<br/>
                    • 通缩频率: 手动触发或定时触发
                  </div>
                  <div className="text-zinc-400 mt-1">✓ 费率范围：0-10000 bps（即0%-100%）</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={tofClaimFeeBps} onChange={(e) => setTofClaimFeeBps(e.target.value)} placeholder="TOF领取费率 bps" />
            <div />
            <Button disabled={!isNexusAuthorized || loading || !nexus} onClick={onSetTofClaimFee}>更新TOF领取费率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={rewardFundAmount} onChange={(e) => setRewardFundAmount(e.target.value)} placeholder="奖励池注资 TOT 数量" />
            <div />
            <Button variant="outline" disabled={!isNexusAuthorized || loading || !nexus} onClick={onFundRewardPool}>注资奖励池</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>NFTB 专项运维</CardTitle>
          <CardDescription>TOT/USDT 分红发放、预测流水分红、预测流水费率设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看 NFTB 分红管理指南
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>分红类型说明：</strong></div>
                  <div>• <strong>TOT分红</strong>：定期向NFTB持有人分配TOT代币</div>
                  <div>• <strong>USDT分红</strong>：定期向NFTB持有人分配USDT稳定币</div>
                  <div>• <strong>预测流水分红</strong>：根据用户预测活动的流水情况分配USDT</div>
                  <div className="mt-2"><strong>预测流水费率说明：</strong></div>
                  <div>• 3个Tier级别对应不同的流水转化率</div>
                  <div>• 初级(Tier1): 40 bps、中级(Tier2): 50 bps、高级(Tier3): 60 bps</div>
                  <div className="mt-2"><strong>操作示例：</strong></div>
                  <div className="bg-black/30 p-2 rounded">
                    • TOT分红: 输入1000表示向所有NFTB持有人分配1000个TOT<br/>
                    • USDT分红: 输入5000表示分配5000个USDT<br/>
                    • 预测流水: 输入2000表示分配2000个USDT作为预测奖励
                  </div>
                  <div className="text-zinc-400 mt-1">💡 分红会按照用户的权重自动分配</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>

          {/* 分红池余额信息卡 + 一键分红 */}
          <Card className="glass-panel border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Swap 分红池（交易手续费累积）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">TOT分红池:</span>
                <span className="font-mono font-semibold">
                  {`${formatToken(totDividendPool, 18)} TOT`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">USDT分红池:</span>
                <span className="font-mono font-semibold">
                  {`${formatToken(usdtDividendPool, 18)} USDT`}
                </span>
              </div>
              <Button
                className="w-full"
                disabled={!canManageSwapAdmins || loading || !swap || (totDividendPool <= 0n && usdtDividendPool <= 0n)}
                onClick={onForceDistributeFromPool}
              >
                一键从池子分红（TOT + USDT 全部分发）
              </Button>
              <p className="text-xs text-muted-foreground">
                💡 点击上方按钮将把 Swap 合约中累积的手续费全部分发给 NFTB 持有者
              </p>
            </CardContent>
          </Card>

          {/* 手动从钱包注入额外分红（高级） */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-amber-400 hover:underline cursor-pointer">
              <ChevronDown className="h-3 w-3" />
              手动从钱包注入额外分红（需钱包持有对应代币）
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={nftbTotDividendAmount} onChange={(e) => setNftbTotDividendAmount(e.target.value)} placeholder="TOT金额（从您的钱包转出）" />
            <div />
            <Button variant="outline" disabled={!isNexusAuthorized || loading || !nexus} onClick={onDistributeNftbTot}>从钱包发放TOT分红</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={nftbUsdtDividendAmount} onChange={(e) => setNftbUsdtDividendAmount(e.target.value)} placeholder="USDT金额（从您的钱包转出）" />
            <div />
            <Button variant="outline" disabled={!isNexusAuthorized || loading || !nexus} onClick={onDistributeNftbUsdt}>从钱包发放USDT分红</Button>
          </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={predictionFlowAmount} onChange={(e) => setPredictionFlowAmount(e.target.value)} placeholder="预测流水分红金额(USDT)" />
            <div />
            <Button variant="secondary" disabled={!isNexusAuthorized || loading || !nexus} onClick={onDistributePredictionFlow}>发放预测流水分红</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input value={predictionRateTier1} onChange={(e) => setPredictionRateTier1(e.target.value)} placeholder="初级费率 bps" />
            <Input value={predictionRateTier2} onChange={(e) => setPredictionRateTier2(e.target.value)} placeholder="中级费率 bps" />
            <Input value={predictionRateTier3} onChange={(e) => setPredictionRateTier3(e.target.value)} placeholder="高级费率 bps" />
            <Button disabled={!isNexusAuthorized || loading || !nexus} onClick={onSetPredictionFlowRates}>更新预测流水费率</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>{registerType === "nfta" ? "管理员发放 NFTA" : "直接注册 NFTB"}</CardTitle>
          <CardDescription>{registerType === "nfta" ? "为指定用户发放 NFTA（管理员登记）" : "为用户直接注册 NFTB 节点"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看注册流程与示例
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>操作流程：</strong></div>
                  <div>1️⃣ 选择类型（NFTA 或 NFTB）</div>
                  <div>2️⃣ 输入接收用户地址</div>
                  <div>3️⃣ 输入发放级别（Tier ID，如 1、2、3）</div>
                  <div>4️⃣ 可选：输入推荐人地址（若无推荐人留空）</div>
                  <div>5️⃣ 点击按钮完成发放/注册</div>
                  <div className="mt-2"><strong>实际示例</strong>：</div>
                  <div className="bg-black/30 p-2 rounded">
                    接收用户地址: 0x742d35Cc6634C0532925a3b844Bc87e9f88aEd39<br/>
                    发放级别: 1<br/>
                    推荐人: 0x8fd379246834a3cDa7c1C2EACD957b5747539ca42<br/>
                    类型: NFTA
                  </div>
                  <div className="text-zinc-400 mt-1">✓ 完成后该用户即可获得对应级别的节点权益</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input value={registerUserAddr} onChange={(e) => setRegisterUserAddr(e.target.value)} placeholder="接收用户地址" />
              {registerType === "nfta" ? (
                <Select value={registerTierId} onValueChange={setRegisterTierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="NFTA级别/库存ID" />
                  </SelectTrigger>
                  <SelectContent>
                    {nftaIssueTierOptions.map((tier) => (
                      <SelectItem key={tier.tierId} value={String(tier.tierId)}>
                        {`${getNftaTierName(tier.tierId)} ｜ 级别/库存ID:${tier.tierId} ｜ 剩余:${tier.remaining}/${tier.maxSupply}${tier.isActive ? "" : " ｜ 未启用"}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={registerTierId} onChange={(e) => setRegisterTierId(e.target.value)} placeholder="Tier ID" />
              )}
              <Input value={registerReferrerAddr} onChange={(e) => setRegisterReferrerAddr(e.target.value)} placeholder="推荐人(可选)" />
              <Select value={registerType} onValueChange={setRegisterType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nfta">NFTA</SelectItem>
                  <SelectItem value="nftb">NFTB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button disabled={!isNexusAuthorized || loading || !nexus} onClick={onRegisterPurchase} className="flex-1">
                {registerType === "nfta" ? "发放 NFTA" : "注册 NFTB"}
              </Button>
            </div>
          </div>

          {registerType === "nfta" ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
              <div className="text-sm font-medium">批量发放NFTA（一键）</div>
              <div className="text-xs text-muted-foreground">输入地址 + 级别/库存ID + 数量，系统优先走链上批量接口；如当前链未升级则自动回退分批单发。</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input value={registerUserAddr} onChange={(e) => setRegisterUserAddr(e.target.value)} placeholder="接收用户地址" />
                <Input value={registerQuantity} onChange={(e) => setRegisterQuantity(e.target.value)} placeholder="发放数量，例如 2000" />
                <Input value={registerChunkSize} onChange={(e) => setRegisterChunkSize(e.target.value)} placeholder="回退分批数量，例如 100" />
                <Button disabled={!isNexusAuthorized || loading || !nexus} onClick={onBatchRegisterNfta}>批量发放NFTA</Button>
              </div>
              {registerBatchResult ? (
                <div className="text-xs whitespace-pre-wrap rounded border border-border/60 bg-muted/30 p-2">{registerBatchResult}</div>
              ) : null}
            </div>
          ) : null}

          {registerType === "nfta" && (
            <div className="space-y-2 pt-1">
              <div className="text-xs text-muted-foreground">已发放NFTA用户（最近100条）</div>
              <div className="rounded-md border border-border/60 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">接收用户</th>
                      <th className="text-left px-3 py-2 font-medium">级别/库存ID</th>
                      <th className="text-left px-3 py-2 font-medium">节点ID</th>
                      <th className="text-left px-3 py-2 font-medium">区块</th>
                      <th className="text-left px-3 py-2 font-medium">交易哈希</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nftaIssuedUsers.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-muted-foreground" colSpan={5}>暂无发放记录</td>
                      </tr>
                    ) : (
                      nftaIssuedUsers.map((row) => (
                        <tr key={`${row.txHash}-${row.nodeId}`} className="border-t border-border/40">
                          <td className="px-3 py-2">{formatAddress(row.user)}</td>
                          <td className="px-3 py-2">{`${getNftaTierName(Number(row.tierId))} (${row.tierId})`}</td>
                          <td className="px-3 py-2">{row.nodeId}</td>
                          <td className="px-3 py-2">{row.blockNumber}</td>
                          <td className="px-3 py-2 font-mono">{row.txHash ? `${row.txHash.slice(0, 10)}...${row.txHash.slice(-6)}` : "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>费率管理</CardTitle>
          <CardDescription>设置 TOF 费率和提现费用</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看费率配置详解
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>TOF 燃烧比率</strong></div>
                  <div>• 用户领取收益时 TOF 代币被销毁的比例</div>
                  <div>• 单位为 bps（基点），1 bps = 0.01%，10000 bps = 100%</div>
                  <div className="mt-2"><strong>提现费率</strong></div>
                  <div>• 所有用户统一的提现手续费</div>
                  <div className="mt-2"><strong>费率配置示例</strong>：</div>
                  <div className="bg-black/30 p-2 rounded">
                    • TOF燃烧比率: 1000 (1%的TOF会被销毁)<br/>
                    • 提现费率: 500 (0.5%)
                  </div>
                  <div className="text-zinc-400 mt-1">✓ 费率值范围：0-10000 bps</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={tofBurnBps} onChange={(e) => setTofBurnBps(e.target.value)} placeholder="TOF 燃烧比率 bps" />
            <div />
            <Button variant="outline" disabled={!isNexusAuthorized || loading || !nexus} onClick={onSetTofBurnBps}>设置TOF燃烧比率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={withdrawFeeBps} onChange={(e) => setWithdrawFeeBps(e.target.value)} placeholder="提现费率 bps" />
            <div />
            <Button variant="outline" disabled={!isNexusAuthorized || loading || !nexus} onClick={onSetWithdrawFee}>设置提现费率</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>钱包与治理</CardTitle>
          <CardDescription>管理Treasury、分布钱包、分发器</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看钱包用途说明
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-1">
                  <div><strong>各钱包用途：</strong></div>
                  <div>• <strong>Treasury</strong>：项目金库，管理流动性和储备金</div>
                  <div>• <strong>0号线</strong>：零号线分配钱包，用于特定渠道分配</div>
                  <div>• <strong>社区建设</strong>：社区发展基金钱包</div>
                  <div>• <strong>基金会</strong>：基金会管理钱包</div>
                  <div>• <strong>机构</strong>：合作机构钱包</div>
                  <div>• <strong>项目方</strong>：项目开发团队钱包</div>
                  <div>• <strong>分发器</strong>：代理分发代币的合约/钱包，需单独授权</div>
                  <div className="text-zinc-400 mt-2">💡 填入真实的以太坊地址，不要使用测试地址</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={treasuryAddr} onChange={(e) => setTreasuryAddr(e.target.value)} placeholder="Treasury 地址" />
            <div />
            <div />
            <Button variant="outline" disabled={!isNexusManager || loading || !nexus} onClick={onSetTreasury}>设置</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input value={zeroLineAddr} onChange={(e) => setZeroLineAddr(e.target.value)} placeholder="0号线" />
            <Input value={communityAddr} onChange={(e) => setCommunityAddr(e.target.value)} placeholder="社区建设" />
            <Input value={foundationAddr} onChange={(e) => setFoundationAddr(e.target.value)} placeholder="基金会" />
            <Input value={institutionAddr} onChange={(e) => setInstitutionAddr(e.target.value)} placeholder="机构" />
            <Button variant="outline" disabled={!isNexusManager || loading || !nexus} onClick={onSetWallets}>批量设置</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={projectAddr} onChange={(e) => setProjectAddr(e.target.value)} placeholder="项目方钱包" />
            <div />
            <div />
            <Button variant="outline" disabled={!isNexusManager || loading || !nexus} onClick={onSetProjectWallet}>设置</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={distributorAddr} onChange={(e) => setDistributorAddr(e.target.value)} placeholder="分发器地址" />
            <Select value={distributorStatus} onValueChange={setDistributorStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">授权</SelectItem>
                <SelectItem value="false">撤销</SelectItem>
              </SelectContent>
            </Select>
            <div />
            <Button variant="outline" disabled={!isNexusManager || loading || !nexus} onClick={onSetDistributor}>设置</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-amber-500/30">
        <CardHeader>
          <CardTitle>Swap 配置面板</CardTitle>
          <CardDescription>交易引擎、DEX 路由、流动性与费率配置</CardDescription>
        </CardHeader>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Swap 外部 DEX 配置</CardTitle>
          <CardDescription>保留 TOTSwap 业务规则，核心成交切到外部 Router 与 Pair</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <div>当前模式: <strong className="text-foreground">{externalDexEnabled ? "External DEX" : "Internal Pool"}</strong></div>
            <div>兑换状态: <strong className="text-foreground">{swapPaused ? "Paused" : "Active"}</strong></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={dexRouterAddr} onChange={(e) => setDexRouterAddr(e.target.value)} placeholder="Router 地址 0x..." />
            <div />
            <Button variant="outline" disabled={!canManageSwapAdmins || loading || !swap} onClick={onSetDexRouter}>设置 Router</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={dexPairAddr} onChange={(e) => setDexPairAddr(e.target.value)} placeholder="Pair 地址 0x..." />
            <div />
            <Button variant="outline" disabled={!canManageSwapAdmins || loading || !swap} onClick={onSetDexPair}>设置 Pair</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={dexFactoryAddr} onChange={(e) => setDexFactoryAddr(e.target.value)} placeholder="Factory 地址 0x..." />
            <div />
            <Button variant="outline" disabled={!canManageSwapAdmins || loading || !swap} onClick={onSetDexFactory}>设置 Factory</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button disabled={!canManageSwapAdmins || loading || !swap || externalDexEnabled} onClick={() => onToggleExternalDex(true)}>启用外部 DEX 模式</Button>
            <Button variant="outline" disabled={!canManageSwapAdmins || loading || !swap || !externalDexEnabled} onClick={() => onToggleExternalDex(false)}>关闭外部 DEX 模式</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button variant="secondary" disabled={!canManageSwapAdmins || loading || !swap || swapPaused} onClick={() => onToggleSwapPaused(true)}>暂停外部兑换</Button>
            <Button variant="outline" disabled={!canManageSwapAdmins || loading || !swap || !swapPaused} onClick={() => onToggleSwapPaused(false)}>恢复外部兑换</Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Swap 流动性管理 ===== */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Swap 流动性管理</CardTitle>
          <CardDescription>提供或移除交易对流动性</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看流动性操作说明
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>提供流动性 (addLiquidity)</strong></div>
                  <div>• 向DEX中存入等量价值的TOT和USDT</div>
                  <div>• 接收LP（流动性提供者）凭证，可参与手续费分红</div>
                  <div className="mt-1"><strong>移除流动性 (removeLiquidity)</strong></div>
                  <div>• 根据LP凭证数量提取TOT和USDT</div>
                  <div>• 返回时已包含期间获得的手续费收益</div>
                  <div className="text-zinc-400 mt-1">💡 金额单位为最小单位（Wei）</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="space-y-2">
            <div><strong className="text-xs">提供流动性</strong></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input value={addLiquidityTot} onChange={(e) => setAddLiquidityTot(e.target.value)} placeholder="TOT数额" />
              <Input value={addLiquidityUsdt} onChange={(e) => setAddLiquidityUsdt(e.target.value)} placeholder="USDT数额" />
              <Button disabled={!isSwapAuthorized || loading || !swap || externalDexEnabled} onClick={onAddLiquidity}>提供流动性</Button>
            </div>
          </div>
          <div className="space-y-2">
            <div><strong className="text-xs">移除流动性</strong></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input value={removeLiquidityTot} onChange={(e) => setRemoveLiquidityTot(e.target.value)} placeholder="TOT数额" />
              <Input value={removeLiquidityUsdt} onChange={(e) => setRemoveLiquidityUsdt(e.target.value)} placeholder="USDT数额" />
              <Button variant="outline" disabled={!isSwapManager || loading || !swap || externalDexEnabled} onClick={onRemoveLiquidity}>移除流动性</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== Swap 费率配置 ===== */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Swap 费率配置</CardTitle>
          <CardDescription>设置交易费率、通胀比率等参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看费率配置说明
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>买入费率 (setBuyFeeBps)</strong>：用户购买TOT时的交易费</div>
                  <div><strong>卖出费率 (setSellFeeBps)</strong>：用户出售TOT时的交易费</div>
                  <div><strong>利润税率 (setProfitTaxBps)</strong>：对交易利润部分征税</div>
                  <div><strong>通胀比率 (setDeflationBps)</strong>：每次交易中销毁的代币比例</div>
                  <div className="text-zinc-400 mt-1">💡 所有参数单位为bps（基点），10000 bps = 100%</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={buyFeeBps} onChange={(e) => setBuyFeeBps(e.target.value)} placeholder="买入费率 bps" />
            <div />
            <div />
            <Button variant="outline" disabled={!isSwapAuthorized || loading || !swap} onClick={onSetBuyFeeBps}>设置买入费率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={sellFeeBps} onChange={(e) => setSellFeeBps(e.target.value)} placeholder="卖出费率 bps" />
            <div />
            <div />
            <Button variant="outline" disabled={!isSwapAuthorized || loading || !swap} onClick={onSetSellFeeBps}>设置卖出费率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={profitTaxBps} onChange={(e) => setProfitTaxBps(e.target.value)} placeholder="利润税率 bps" />
            <div />
            <div />
            <Button variant="outline" disabled={!isSwapAuthorized || loading || !swap} onClick={onSetProfitTaxBps}>设置利润税率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={deflationBps} onChange={(e) => setDeflationBps(e.target.value)} placeholder="通胀比率 bps" />
            <div />
            <div />
            <Button variant="outline" disabled={!isSwapAuthorized || loading || !swap} onClick={onSetDeflationBps}>设置通胀比率</Button>
          </div>
          {externalDexEnabled && deflationPoolBalance > 0n && (
            <div className="text-xs text-muted-foreground p-2 rounded bg-amber-500/10">
              通缩池余额: <span className="font-mono font-semibold">{formatToken(deflationPoolBalance, 18)} TOT</span>
              （50% 销毁 + 50% 回流分红池）
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="text-xs text-muted-foreground flex items-center">
              {externalDexEnabled ? "从通缩池执行销毁（外部DEX模式）" : "触发一次 4h 通缩逻辑"}
            </div>
            <div />
            <div />
            <Button variant="secondary" disabled={!isSwapAuthorized || loading || !swap} onClick={onDeflate}>执行通缩</Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Swap 分配策略 ===== */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Swap 分配策略</CardTitle>
          <CardDescription>配置分配阈值、交易限制</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看分配策略说明
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>分配阈值 (setDistributionThreshold)</strong></div>
                  <div>• 当合约中累积费用达到此金额时自动触发分配</div>
                  <div className="mt-1"><strong>日购买上限 (setMaxDailyBuy)</strong></div>
                  <div>• 单个地址单日购买TOT的最大数量</div>
                  <div className="mt-1"><strong>最大卖出比例 (setMaxSellBps)</strong></div>
                  <div>• 单笔交易卖出的最大百分比限制</div>
                  <div className="text-zinc-400 mt-1">💡 用于防止恶意操纵和保护市场防线</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={distributionThreshold} onChange={(e) => setDistributionThreshold(e.target.value)} placeholder="分配阈值" />
            <div />
            <Button variant="outline" disabled={!isSwapAuthorized || loading || !swap} onClick={onSetDistributionThreshold}>设置分配阈值</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={maxDailyBuy} onChange={(e) => setMaxDailyBuy(e.target.value)} placeholder="日购买上限" />
            <div />
            <Button variant="outline" disabled={!isSwapAuthorized || loading || !swap} onClick={onSetMaxDailyBuy}>设置日购买上限</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={maxSellBps} onChange={(e) => setMaxSellBps(e.target.value)} placeholder="最大卖出比例 bps" />
            <div />
            <Button variant="outline" disabled={!isSwapAuthorized || loading || !swap} onClick={onSetMaxSellBps}>设置卖出比例</Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Swap 核心功能 ===== */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Swap 核心功能</CardTitle>
          <CardDescription>设置Nexus、强制分配、应急提取</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              <ChevronDown className="h-4 w-4" /> 查看核心功能说明
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>设置Nexus (setNexus)</strong></div>
                  <div>• 绑定DeFiNodeNexus合约地址，用于交互</div>
                  <div className="mt-1"><strong>强制分配 (forceDistribute)</strong></div>
                  <div>• 立即触发分配流程，不等待阈值</div>
                  <div>• 用于紧急情况或定期维护</div>
                  <div className="mt-1"><strong>应急提取 (emergencyWithdraw)</strong></div>
                  <div>• Owner 或 Admin 可执行的安全提取机制</div>
                  <div>• 适用于任意ERC20 token和native ETH</div>
                  <div className="text-red-400 mt-1">⚠️ 应急提取是最后防线，正常操作应避免使用</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="space-y-2">
            <div><strong className="text-xs">设置Nexus地址</strong></div>
            <div className="text-xs text-muted-foreground mb-1">当前 Swap.nexus(): {currentSwapNexus ? formatAddress(currentSwapNexus) : "读取中..."}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input value={newNexusAddr} onChange={(e) => setNewNexusAddr(e.target.value)} placeholder="Nexus合约地址 0x..." />
              <div />
              <Button variant="outline" disabled={!isSwapManager || loading || !swap} onClick={onSetNexus}>设置Nexus</Button>
            </div>
          </div>
          <div className="space-y-2">
            <div><strong className="text-xs">强制分配</strong></div>
            <Button disabled={!canManageSwapAdmins || loading || !swap} onClick={onForceDistribute}>立即强制分配</Button>
          </div>
          <div className="space-y-2">
            <div><strong className="text-xs">应急提取</strong></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input value={emergencyTokenAddr} onChange={(e) => setEmergencyTokenAddr(e.target.value)} placeholder="Token地址 0x..." />
              <Input value={emergencyAmount} onChange={(e) => setEmergencyAmount(e.target.value)} placeholder="提取金额" />
              <Button variant="destructive" disabled={!canManageSwapAdmins || loading || !swap} onClick={onEmergencyWithdraw}>应急提取</Button>
            </div>
          </div>

          <div className="space-y-2 border-t pt-3 mt-3">
            <div><strong className="text-xs">Swap Owner 转移</strong></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input 
                value={newSwapOwnerAddr} 
                onChange={(e) => setNewSwapOwnerAddr(e.target.value)} 
                placeholder="新Owner地址 0x..."
                disabled={!canTransferSwapOwnership || loading}
              />
              <Button 
                variant="destructive" 
                disabled={!canTransferSwapOwnership || loading || !newSwapOwnerAddr.trim() || !swap}
                onClick={onTransferSwapOwner}
              >
                {loading ? "处理中..." : "转移Owner"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== TOF 白名单管理 ===== */}
      <Card className="border-red-500/40">
        <CardHeader>
          <CardTitle className="text-red-500">TOF 转账白名单</CardTitle>
          <CardDescription>
            提现/领取手续费需要 Nexus 合约和 Swap 合约在 TOF 白名单中。若提现报 &quot;TOF non-transferable&quot; 请先点「一键修复」。
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mb-2">
                        <ChevronDown className="h-4 w-4" /> 常见问题与快速解决
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mb-3">
                        <Alert className="border-red-500/50 bg-red-500/5 text-xs">
                          <AlertDescription className="space-y-2">
                            <div><strong>❌ 问题：提现时出现 "TOF non-transferable" 错误</strong></div>
                            <div>原因：Nexus 或 Swap 合约不在 TOF 白名单中</div>
                            <div><strong>✅ 快速解决：</strong>点击「一键修复：将 Nexus + Swap 加入白名单」按钮</div>
                            <div className="mt-2"><strong>⚙️ 手动操作流程：</strong></div>
                            <div>1️⃣ 点击「查询白名单状态」查看当前状态</div>
                            <div>2️⃣ 若显示 ❌ 则需要加入白名单</div>
                            <div>3️⃣ 输入合约地址（如 Nexus 或自定义合约）</div>
                            <div>4️⃣ 选择「加入白名单」并点「设置」</div>
                            <div className="mt-2"><strong>💡 提示：</strong>激活新的合约时记得加入白名单，否则无法进行转账操作</div>
                          </AlertDescription>
                        </Alert>
                      </CollapsibleContent>
                    </Collapsible>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
            <div>TOF Owner: {tofOwnerAddress ? formatAddress(tofOwnerAddress) : "读取中..."}</div>
            <div>{isTofOwner ? "✅ 当前钱包是 TOF Owner，可操作白名单" : "👁️ 仅 TOF Owner 可操作白名单"}</div>
          </div>
          {/* 一键修复按钮 */}
          <div className="flex gap-2 flex-wrap">
            <Button
              disabled={!isTofOwner || loading || !tof}
              onClick={onWhitelistNexusAndSwap}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              一键修复：将 Nexus + Swap 加入白名单
            </Button>
            <Button variant="outline" disabled={!tof} onClick={checkTofWhitelist}>查询白名单状态</Button>
          </div>

          {/* 白名单状态展示 */}
          {Object.keys(tofWhitelistResult).length > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs font-mono space-y-1">
              {Object.entries(tofWhitelistResult).map(([addr, ok]) => (
                <div key={addr} className="flex items-center gap-2">
                  <span className={ok ? "text-green-400" : ok === false ? "text-red-400" : "text-zinc-400"}>
                    {ok === null ? "❓" : ok ? "✅" : "❌"}
                  </span>
                  <span className="truncate">{addr}</span>
                  <span className="text-muted-foreground">{ok === null ? "查询失败" : ok ? "已授权" : "未授权"}</span>
                </div>
              ))}
            </div>
          )}

          {/* 手动设置单个地址 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              value={tofWhitelistAddr}
              onChange={(e) => setTofWhitelistAddr(e.target.value)}
              placeholder="合约地址 0x..."
              className="md:col-span-2"
            />
            <Select value={tofWhitelistStatus} onValueChange={setTofWhitelistStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">加入白名单</SelectItem>
                <SelectItem value="false">移除白名单</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" disabled={!isTofOwner || loading || !tof} onClick={onSetTofWhitelist}>设置</Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== 公告管理 ===== */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>公告管理</CardTitle>
          <CardDescription>发布、查看和删除系统公告（存储于 JSONBin）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="公告标题" className="md:col-span-2" />
            <Select value={announcementType} onValueChange={setAnnouncementType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="update">更新</SelectItem>
                <SelectItem value="news">新闻</SelectItem>
                <SelectItem value="maintenance">维护</SelectItem>
                <SelectItem value="event">活动</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled={announcementLoading || !announcementTitle.trim() || !announcementContent.trim()} onClick={async () => {
              setAnnouncementLoading(true);
              try {
                const res = await fetch("/api/admin/announcements", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: announcementTitle.trim(), content: announcementContent.trim(), type: announcementType }),
                });
                const data = await res.json();
                if (res.ok) {
                  toast({ title: "发布成功", description: data.message });
                  setAnnouncementTitle(""); setAnnouncementContent("");
                  // Refresh list
                  const listRes = await fetch("/api/announcements"); const listData = await listRes.json();
                  if (Array.isArray(listData.data)) setAnnouncementList(listData.data);
                } else {
                  toast({ title: "发布失败", description: data.message || data.detail, variant: "destructive" });
                }
              } catch (e) {
                toast({ title: "发布失败", description: String(e), variant: "destructive" });
              } finally { setAnnouncementLoading(false); }
            }}>发布公告</Button>
          </div>
          <Textarea value={announcementContent} onChange={(e) => setAnnouncementContent(e.target.value)} placeholder="公告内容" rows={3} />

          {/* 公告列表 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">已发布公告 ({announcementList.length})</span>
            <Button variant="ghost" size="sm" onClick={async () => {
              const res = await fetch("/api/announcements"); const data = await res.json();
              if (Array.isArray(data.data)) setAnnouncementList(data.data);
            }}>刷新</Button>
          </div>
          {announcementList.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {announcementList.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 mr-2">{a.type}</span>
                    <span className="font-medium">{a.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">{a.date}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 ml-2" onClick={async () => {
                    if (!confirm(`确认删除公告「${a.title}」？`)) return;
                    setAnnouncementLoading(true);
                    try {
                      const res = await fetch("/api/admin/announcements", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: a.id }),
                      });
                      if (res.ok) {
                        setAnnouncementList(prev => prev.filter(x => String(x.id) !== String(a.id)));
                        toast({ title: "已删除" });
                      } else {
                        const d = await res.json();
                        toast({ title: "删除失败", description: d.message, variant: "destructive" });
                      }
                    } finally { setAnnouncementLoading(false); }
                  }}>删除</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
