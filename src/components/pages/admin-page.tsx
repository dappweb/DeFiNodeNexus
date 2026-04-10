"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useWeb3 } from "@/lib/web3-provider";
import { useNexusContract, useReadonlyNexusContract, useSwapContract, useTofTokenContract, execTx } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";
import { formatAddress, getNftaTierName, STAGE_LABELS, UI_PARAMS } from "@/lib/ui-config";
import { CONTRACTS, SWAP_ABI } from "@/lib/contracts";
import { ChevronDown } from "lucide-react";

let _cncReadonlyProvider: ethers.JsonRpcProvider | null = null;
function getCncReadonlyProvider() {
  if (!_cncReadonlyProvider) {
    const rpc = process.env.NEXT_PUBLIC_CNC_RPC_URL || "https://rpc.cncchainpro.com";
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

export function AdminPage() {
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();
  const nexus = useNexusContract();
  const readonlyNexus = useReadonlyNexusContract();
  const swap = useSwapContract();
  const tof = useTofTokenContract();

  const [loading, setLoading] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState("");
  const [swapOwnerAddress, setSwapOwnerAddress] = useState("");
  
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

  // 提现费率按等级
  const [withdrawLevel, setWithdrawLevel] = useState("0");
  const [withdrawFeeBps, setWithdrawFeeBps] = useState("");

  // Tier 配置
  const [nftaTierId, setNftaTierId] = useState("0");
  const [nftaPrice, setNftaPrice] = useState("");
  const [nftaDailyYield, setNftaDailyYield] = useState("");
  const [nftaMaxSupply, setNftaMaxSupply] = useState("");
  const [nftaActive, setNftaActive] = useState("true");

  const [nftbTierId, setNftbTierId] = useState("0");
  const [nftbPrice, setNftbPrice] = useState("");
  const [nftbWeight, setNftbWeight] = useState("");
  const [nftbMaxSupply, setNftbMaxSupply] = useState("");
  const [nftbDividendBps, setNftbDividendBps] = useState("");
  const [nftbActive, setNftbActive] = useState("true");

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
  const [registerType, setRegisterType] = useState("nfta");
  const [nftaIssueTierOptions, setNftaIssueTierOptions] = useState<NftaIssueTierOption[]>([]);
  const [nftaIssuedUsers, setNftaIssuedUsers] = useState<NftaIssuedUserRecord[]>([]);

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
  const [dexRouterAddr, setDexRouterAddr] = useState("");
  const [dexPairAddr, setDexPairAddr] = useState("");
  const [dexFactoryAddr, setDexFactoryAddr] = useState("");
  const [externalDexEnabled, setExternalDexEnabled] = useState(false);
  const [swapPaused, setSwapPaused] = useState(false);

  const isOwner = useMemo(() => {
    if (!address || !ownerAddress) return false;
    return address.toLowerCase() === ownerAddress.toLowerCase();
  }, [address, ownerAddress]);

  const isSwapOwner = useMemo(() => {
    if (!address || !swapOwnerAddress) return false;
    return address.toLowerCase() === swapOwnerAddress.toLowerCase();
  }, [address, swapOwnerAddress]);

  const isAdmin = isOwner || isSwapOwner;

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
    // Use the readonly (Sepolia-only) contract for reads so they succeed
    // regardless of which chain the user's wallet is connected to.
    const reader = readonlyNexus || nexus;
    if (!reader) return;
    try {
      const [owner, claimFee, burnBps, flowRate1, flowRate2, flowRate3, treasury, zLine, comm, found, inst, proj] = await Promise.all([
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
      ]);
      setOwnerAddress(owner);
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

      if (swap) {
        try {
          const swapOwner = await swap.owner();
          const [router, pair, factory, enabled, paused] = await swap.getRouterConfig();
          setSwapOwnerAddress(String(swapOwner || ""));
          setDexRouterAddr(String(router || ""));
          setDexPairAddr(String(pair || ""));
          setDexFactoryAddr(String(factory || ""));
          setExternalDexEnabled(Boolean(enabled));
          setSwapPaused(Boolean(paused));
        } catch {
          try {
            const readonlySwap = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI, getCncReadonlyProvider());
            const swapOwner = await readonlySwap.owner();
            const [router, pair, factory, enabled, paused] = await readonlySwap.getRouterConfig();
            setSwapOwnerAddress(String(swapOwner || ""));
            setDexRouterAddr(String(router || ""));
            setDexPairAddr(String(pair || ""));
            setDexFactoryAddr(String(factory || ""));
            setExternalDexEnabled(Boolean(enabled));
            setSwapPaused(Boolean(paused));
          } catch {
            setSwapOwnerAddress("");
            setExternalDexEnabled(false);
            setSwapPaused(false);
          }
        }
      }

      const nextNftaTierIdRaw = await reader.nextNftaTierId();

      const nextNftaTierId = Number(nextNftaTierIdRaw);
      if (Number.isFinite(nextNftaTierId) && nextNftaTierId > 1) {
        const tierIds = Array.from({ length: nextNftaTierId - 1 }, (_, idx) => idx + 1);
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
      } else {
        setNftaIssueTierOptions([]);
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
          setNftaIssuedUsers([]);
        }
      } catch (evtErr: any) {
        console.warn("Event query failed (non-blocking):", evtErr);
        setNftaIssuedUsers([]);
      }
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "未知错误";
      console.error("Admin refresh failed:", err);
      toast({ title: "读取失败", description: msg, variant: "destructive" });
    }
  };

  useEffect(() => {
    refresh();
  }, [nexus, address, swap]);

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
    if (externalDexEnabled) {
      toast({ title: "外部DEX模式已启用", description: "当前模式下已禁用内部池通缩", variant: "destructive" });
      return;
    }
    await runTx("执行通缩", () => swap.deflate());
  };

  const parsePositiveAmount = (value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return ethers.parseUnits(value, 18);
  };

  const onDistributeNftbTot = async () => {
    if (!nexus) return;
    const amount = parsePositiveAmount(nftbTotDividendAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "NFTB TOT分红金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("发放NFTB TOT分红", () => nexus.distributeNftbDividends(amount));
  };

  const onDistributeNftbUsdt = async () => {
    if (!nexus) return;
    const amount = parsePositiveAmount(nftbUsdtDividendAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "NFTB USDT分红金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("发放NFTB USDT分红", () => nexus.distributeNftbUsdtDividends(amount));
  };

  const onDistributePredictionFlow = async () => {
    if (!nexus) return;
    const amount = parsePositiveAmount(predictionFlowAmount);
    if (amount === null) {
      toast({ title: "参数错误", description: "预测流水金额必须大于0", variant: "destructive" });
      return;
    }
    await runTx("发放预测流水分红", () => nexus.distributePredictionFlowUsdt(amount));
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

  // ===== NFTA Tier 配置 =====
  const onConfigureNftaTier = async () => {
    if (!nexus) return;
    const tierId = parsePositiveInteger(nftaTierId);
    const price = parsePositiveAmount(nftaPrice);
    const yield_ = parsePositiveAmount(nftaDailyYield);
    const maxSup = parsePositiveInteger(nftaMaxSupply);
    if (tierId === null || price === null || yield_ === null || maxSup === null) {
      toast({ title: "参数错误", description: "所有字段必须有效", variant: "destructive" });
      return;
    }
    await runTx(
      "配置NFTA Tier",
      () => nexus.configureNftaTier(BigInt(tierId), price, yield_, BigInt(maxSup), nftaActive === "true")
    );
  };

  // ===== NFTB Tier 配置 =====
  const onConfigureNftbTier = async () => {
    if (!nexus) return;
    const tierId = parsePositiveInteger(nftbTierId);
    const price = parsePositiveAmount(nftbPrice);
    const weight = parsePositiveInteger(nftbWeight);
    const maxSup = parsePositiveInteger(nftbMaxSupply);
    const divBps = parseBps(nftbDividendBps);
    if (tierId === null || price === null || weight === null || maxSup === null || divBps === null) {
      toast({ title: "参数错误", description: "所有字段必须有效", variant: "destructive" });
      return;
    }
    await runTx(
      "配置NFTB Tier",
      () => nexus.configureNftbTier(BigInt(tierId), price, BigInt(weight), BigInt(maxSup), divBps, nftbActive === "true")
    );
  };

  // ===== 注册购买 =====
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
      await runTx(
        "注册NFTA购买",
        () => nexus.registerNftaPurchase(registerUserAddr.trim(), BigInt(tierId), referrer)
      );
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
    const level = Number(withdrawLevel);
    if (!Number.isFinite(level) || level < 0 || level > 5) {
      toast({ title: "参数错误", description: "等级必须在0-5之间", variant: "destructive" });
      return;
    }
    const bps = parseBps(withdrawFeeBps);
    if (bps === null) {
      toast({ title: "参数错误", description: "费率必须在0-10000之间", variant: "destructive" });
      return;
    }
    await runTx("设置提现费率", () => nexus.setWithdrawFeeBps(level, bps));
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
    if (externalDexEnabled) {
      toast({ title: "外部DEX模式已启用", description: "当前模式下不再使用内部池通缩参数", variant: "destructive" });
      return;
    }
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

  return (
    <div className="space-y-6 overflow-hidden">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>管理员面板</CardTitle>
          <CardDescription>
            Nexus Owner: {formatAddress(ownerAddress)} ｜ Swap Owner: {formatAddress(swapOwnerAddress)} ｜ 当前钱包: {isAdmin ? "✅ 管理员" : "👁️ 只读"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {!isConnected ? "请先连接钱包。" : "Nexus治理按Nexus Owner鉴权，DEX配置按Swap Owner鉴权。"}
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
            <Button disabled={!isOwner || loading || !nexus} onClick={onTransferNfta}>转让NFTA</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={claimNodeId} onChange={(e) => setClaimNodeId(e.target.value)} placeholder="节点ID" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onClaimNfta}>领取NFTA收益</Button>
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
              <Button disabled={!isOwner || loading || !nexus} onClick={onBulkTransfer}>批量转卡</Button>
            </div>
            <div className="space-y-2">
              <Textarea value={bulkClaimInput} onChange={(e) => setBulkClaimInput(e.target.value)} className="min-h-[120px]" placeholder="123" />
              <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onBulkClaim}>批量领取</Button>
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
          <CardDescription>TOF 领取费率、奖励池注资、Swap通缩</CardDescription>
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
            <Button disabled={!isOwner || loading || !nexus} onClick={onSetTofClaimFee}>更新TOF领取费率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={rewardFundAmount} onChange={(e) => setRewardFundAmount(e.target.value)} placeholder="奖励池注资 TOT 数量" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onFundRewardPool}>注资奖励池</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="text-xs text-muted-foreground flex items-center">触发一次 4h 通缩逻辑</div>
            <div />
            <Button variant="secondary" disabled={!isOwner || loading || !swap || externalDexEnabled} onClick={onDeflate}>执行通缩</Button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={nftbTotDividendAmount} onChange={(e) => setNftbTotDividendAmount(e.target.value)} placeholder="NFTB TOT分红金额" />
            <div />
            <Button disabled={!isOwner || loading || !nexus} onClick={onDistributeNftbTot}>发放NFTB TOT分红</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={nftbUsdtDividendAmount} onChange={(e) => setNftbUsdtDividendAmount(e.target.value)} placeholder="NFTB USDT分红金额" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onDistributeNftbUsdt}>发放NFTB USDT分红</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={predictionFlowAmount} onChange={(e) => setPredictionFlowAmount(e.target.value)} placeholder="预测流水分红金额(USDT)" />
            <div />
            <Button variant="secondary" disabled={!isOwner || loading || !nexus} onClick={onDistributePredictionFlow}>发放预测流水分红</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input value={predictionRateTier1} onChange={(e) => setPredictionRateTier1(e.target.value)} placeholder="初级费率 bps" />
            <Input value={predictionRateTier2} onChange={(e) => setPredictionRateTier2(e.target.value)} placeholder="中级费率 bps" />
            <Input value={predictionRateTier3} onChange={(e) => setPredictionRateTier3(e.target.value)} placeholder="高级费率 bps" />
            <Button disabled={!isOwner || loading || !nexus} onClick={onSetPredictionFlowRates}>更新预测流水费率</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Tier 配置</CardTitle>
          <CardDescription>配置NFTA/NFTB等级参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-3">
              <ChevronDown className="h-4 w-4" /> 查看 Tier 配置说明与举例
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-3 space-y-2">
              <Alert className="border-blue-500/50 bg-blue-500/5 text-xs">
                <AlertDescription className="space-y-2">
                  <div><strong>NFTA Tier 配置参数说明：</strong></div>
                  <div>• Tier ID：等级编号（0表示新建），如1、2、3等</div>
                  <div>• 价格：购买价格（USDT，如100、500、1000）</div>
                  <div>• 日收益：每天获得的TOT收益</div>
                  <div>• 最大供应：该等级最多可发行多少个NFT</div>
                  <div>• 激活状态：是否启用该等级</div>
                  <div className="mt-2"><strong>举例</strong>：创建一个高级NFTA</div>
                  <div className="bg-black/30 p-2 rounded text-xs">
                    Tier ID: 3 | 价格: 1000 | 日收益: 10 | 最大供应: 100 | 激活: ✓
                  </div>
                  <div className="mt-2"><strong>NFTB Tier 配置参数说明：</strong></div>
                  <div>• 权重：在分红中的权重系数</div>
                  <div>• 分红bps：该等级的分红比率（0-10000，1 bps = 0.01%）</div>
                  <div className="text-zinc-400 mt-1">💡 建议：分红bps对应Tier级别提升而增加，如Tier1:1000, Tier2:1500, Tier3:2000</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div>
            <div className="text-sm font-semibold mb-2">NFTA Tier 配置</div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <Input value={nftaTierId} onChange={(e) => setNftaTierId(e.target.value)} placeholder="Tier ID (0=新建)" />
              <Input value={nftaPrice} onChange={(e) => setNftaPrice(e.target.value)} placeholder="价格 (USDT)" />
              <Input value={nftaDailyYield} onChange={(e) => setNftaDailyYield(e.target.value)} placeholder="日收益 (TOT)" />
              <Input value={nftaMaxSupply} onChange={(e) => setNftaMaxSupply(e.target.value)} placeholder="最大供应" />
              <Select value={nftaActive} onValueChange={setNftaActive}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">激活</SelectItem>
                  <SelectItem value="false">禁用</SelectItem>
                </SelectContent>
              </Select>
              <Button disabled={!isOwner || loading || !nexus} onClick={onConfigureNftaTier} variant="outline">保存</Button>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">NFTB Tier 配置</div>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              <Input value={nftbTierId} onChange={(e) => setNftbTierId(e.target.value)} placeholder="Tier ID (0=新建)" />
              <Input value={nftbPrice} onChange={(e) => setNftbPrice(e.target.value)} placeholder="价格 (USDT)" />
              <Input value={nftbWeight} onChange={(e) => setNftbWeight(e.target.value)} placeholder="权重" />
              <Input value={nftbMaxSupply} onChange={(e) => setNftbMaxSupply(e.target.value)} placeholder="最大供应" />
              <Input value={nftbDividendBps} onChange={(e) => setNftbDividendBps(e.target.value)} placeholder="分红 bps" />
              <Select value={nftbActive} onValueChange={setNftbActive}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">激活</SelectItem>
                  <SelectItem value="false">禁用</SelectItem>
                </SelectContent>
              </Select>
              <Button disabled={!isOwner || loading || !nexus} onClick={onConfigureNftbTier} variant="outline">保存</Button>
            </div>
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
              <Button disabled={!isOwner || loading || !nexus} onClick={onRegisterPurchase} className="flex-1">
                {registerType === "nfta" ? "发放 NFTA" : "注册 NFTB"}
              </Button>
            </div>
          </div>

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
          <CardDescription>设置 TOF 费率和提现等级费用</CardDescription>
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
                  <div className="mt-2"><strong>提现费率等级</strong></div>
                  <div>• 6个等级（0-5），不同等级对应不同的提现手续费</div>
                  <div>• 等级越高，提现费率可能越低或越高（根据业务规则）</div>
                  <div className="mt-2"><strong>费率配置示例</strong>：</div>
                  <div className="bg-black/30 p-2 rounded">
                    • TOF燃烧比率: 1000 (1%的TOF会被销毁)<br/>
                    • Lv0 提现费率: 500 (0.5%)<br/>
                    • Lv1 提现费率: 400 (0.4%)<br/>
                    • Lv2 提现费率: 300 (0.3%)
                  </div>
                  <div className="text-zinc-400 mt-1">✓ 费率值范围：0-10000 bps</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={tofBurnBps} onChange={(e) => setTofBurnBps(e.target.value)} placeholder="TOF 燃烧比率 bps" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetTofBurnBps}>设置TOF燃烧比率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={withdrawLevel} onValueChange={setWithdrawLevel}>
              <SelectTrigger><SelectValue placeholder="等级" /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((l) => <SelectItem key={l} value={l.toString()}>{`Lv${l}`}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={withdrawFeeBps} onChange={(e) => setWithdrawFeeBps(e.target.value)} placeholder="提现费率 bps" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetWithdrawFee}>设置提现费率</Button>
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
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetTreasury}>设置</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input value={zeroLineAddr} onChange={(e) => setZeroLineAddr(e.target.value)} placeholder="0号线" />
            <Input value={communityAddr} onChange={(e) => setCommunityAddr(e.target.value)} placeholder="社区建设" />
            <Input value={foundationAddr} onChange={(e) => setFoundationAddr(e.target.value)} placeholder="基金会" />
            <Input value={institutionAddr} onChange={(e) => setInstitutionAddr(e.target.value)} placeholder="机构" />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetWallets}>批量设置</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={projectAddr} onChange={(e) => setProjectAddr(e.target.value)} placeholder="项目方钱包" />
            <div />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetProjectWallet}>设置</Button>
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
            <Button variant="outline" disabled={!isOwner || loading || !nexus} onClick={onSetDistributor}>设置</Button>
          </div>
        </CardContent>
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
            <Button variant="outline" disabled={!isSwapOwner || loading || !swap} onClick={onSetDexRouter}>设置 Router</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={dexPairAddr} onChange={(e) => setDexPairAddr(e.target.value)} placeholder="Pair 地址 0x..." />
            <div />
            <Button variant="outline" disabled={!isSwapOwner || loading || !swap} onClick={onSetDexPair}>设置 Pair</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={dexFactoryAddr} onChange={(e) => setDexFactoryAddr(e.target.value)} placeholder="Factory 地址 0x..." />
            <div />
            <Button variant="outline" disabled={!isSwapOwner || loading || !swap} onClick={onSetDexFactory}>设置 Factory</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button disabled={!isSwapOwner || loading || !swap || externalDexEnabled} onClick={() => onToggleExternalDex(true)}>启用外部 DEX 模式</Button>
            <Button variant="outline" disabled={!isSwapOwner || loading || !swap || !externalDexEnabled} onClick={() => onToggleExternalDex(false)}>关闭外部 DEX 模式</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button variant="secondary" disabled={!isSwapOwner || loading || !swap || swapPaused} onClick={() => onToggleSwapPaused(true)}>暂停外部兑换</Button>
            <Button variant="outline" disabled={!isSwapOwner || loading || !swap || !swapPaused} onClick={() => onToggleSwapPaused(false)}>恢复外部兑换</Button>
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
              <Button disabled={!isOwner || loading || !swap || externalDexEnabled} onClick={onAddLiquidity}>提供流动性</Button>
            </div>
          </div>
          <div className="space-y-2">
            <div><strong className="text-xs">移除流动性</strong></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input value={removeLiquidityTot} onChange={(e) => setRemoveLiquidityTot(e.target.value)} placeholder="TOT数额" />
              <Input value={removeLiquidityUsdt} onChange={(e) => setRemoveLiquidityUsdt(e.target.value)} placeholder="USDT数额" />
              <Button variant="outline" disabled={!isOwner || loading || !swap || externalDexEnabled} onClick={onRemoveLiquidity}>移除流动性</Button>
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
            <Button variant="outline" disabled={!isOwner || loading || !swap} onClick={onSetBuyFeeBps}>设置买入费率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={sellFeeBps} onChange={(e) => setSellFeeBps(e.target.value)} placeholder="卖出费率 bps" />
            <div />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !swap} onClick={onSetSellFeeBps}>设置卖出费率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={profitTaxBps} onChange={(e) => setProfitTaxBps(e.target.value)} placeholder="利润税率 bps" />
            <div />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !swap} onClick={onSetProfitTaxBps}>设置利润税率</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={deflationBps} onChange={(e) => setDeflationBps(e.target.value)} placeholder="通胀比率 bps" />
            <div />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !swap || externalDexEnabled} onClick={onSetDeflationBps}>设置通胀比率</Button>
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
            <Button variant="outline" disabled={!isOwner || loading || !swap} onClick={onSetDistributionThreshold}>设置分配阈值</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={maxDailyBuy} onChange={(e) => setMaxDailyBuy(e.target.value)} placeholder="日购买上限" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !swap} onClick={onSetMaxDailyBuy}>设置日购买上限</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={maxSellBps} onChange={(e) => setMaxSellBps(e.target.value)} placeholder="最大卖出比例 bps" />
            <div />
            <Button variant="outline" disabled={!isOwner || loading || !swap} onClick={onSetMaxSellBps}>设置卖出比例</Button>
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
                  <div>• Owner仅有的安全提取机制</div>
                  <div>• 适用于任意ERC20 token和native ETH</div>
                  <div className="text-red-400 mt-1">⚠️ 应急提取是最后防线，正常操作应避免使用</div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
          <div className="space-y-2">
            <div><strong className="text-xs">设置Nexus地址</strong></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input value={newNexusAddr} onChange={(e) => setNewNexusAddr(e.target.value)} placeholder="Nexus合约地址 0x..." />
              <div />
              <Button variant="outline" disabled={!isOwner || loading || !swap} onClick={onSetNexus}>设置Nexus</Button>
            </div>
          </div>
          <div className="space-y-2">
            <div><strong className="text-xs">强制分配</strong></div>
            <Button disabled={!isOwner || loading || !swap} onClick={onForceDistribute}>立即强制分配</Button>
          </div>
          <div className="space-y-2">
            <div><strong className="text-xs">应急提取</strong></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input value={emergencyTokenAddr} onChange={(e) => setEmergencyTokenAddr(e.target.value)} placeholder="Token地址 0x..." />
              <Input value={emergencyAmount} onChange={(e) => setEmergencyAmount(e.target.value)} placeholder="提取金额" />
              <Button variant="destructive" disabled={!isOwner || loading || !swap} onClick={onEmergencyWithdraw}>应急提取</Button>
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
          {/* 一键修复按钮 */}
          <div className="flex gap-2 flex-wrap">
            <Button
              disabled={!isOwner || loading || !tof}
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
            <Button variant="outline" disabled={!isOwner || loading || !tof} onClick={onSetTofWhitelist}>设置</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
