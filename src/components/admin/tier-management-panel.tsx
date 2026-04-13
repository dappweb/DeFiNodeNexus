"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { execTx } from "@/hooks/use-contract";
import { useToast } from "@/hooks/use-toast";
import { FIXED_NFTA_TIER_SPECS, FIXED_NFTB_TIER_SPECS } from "@/lib/node-tier-config";
import { getNftaTierName, getNftbTierName } from "@/lib/ui-config";
import { ethers } from "ethers";
import { Loader2, Pencil, Plus, Power, PowerOff, RefreshCw, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ======================== Types ========================

interface NftaTierInfo {
  tierId: number;
  price: bigint;
  dailyYield: bigint;
  maxSupply: bigint;
  currentSupply: bigint;
  isActive: boolean;
}

interface NftbTierInfo {
  tierId: number;
  price: bigint;
  weight: bigint;
  maxSupply: bigint;
  usdtMinted: bigint;
  tofMinted: bigint;
  dividendBps: bigint;
  isActive: boolean;
}

type EditMode = "nfta" | "nftb";

interface EditNftaForm {
  price: string;
  dailyYield: string;
  maxSupply: string;
  isActive: string;
}

interface EditNftbForm {
  price: string;
  weight: string;
  maxSupply: string;
  dividendBps: string;
  isActive: string;
}

interface Props {
  nexus: ethers.Contract | null;
  readonlyNexus: ethers.Contract | null;
  isOwner: boolean;
  loading: boolean;
  setLoading: (v: boolean) => void;
  onRefreshParent: () => Promise<void>;
}

// ======================== Helpers ========================

function fmtU(val: bigint): string {
  return ethers.formatUnits(val, 18);
}

function fmtUShort(val: bigint): string {
  const n = Number(ethers.formatUnits(val, 18));
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}

// ======================== Component ========================

export function TierManagementPanel({ nexus, readonlyNexus, isOwner, loading, setLoading, onRefreshParent }: Props) {
  const { toast } = useToast();

  const [nftaTiers, setNftaTiers] = useState<NftaTierInfo[]>([]);
  const [nftbTiers, setNftbTiers] = useState<NftbTierInfo[]>([]);
  const [fetching, setFetching] = useState(false);
  const [onChainEmpty, setOnChainEmpty] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>("nfta");
  const [editTierId, setEditTierId] = useState<number>(0); // 0 = new
  const [nftaForm, setNftaForm] = useState<EditNftaForm>({ price: "", dailyYield: "", maxSupply: "", isActive: "true" });
  const [nftbForm, setNftbForm] = useState<EditNftbForm>({ price: "", weight: "", maxSupply: "", dividendBps: "", isActive: "true" });

  // Confirm dialog for toggle
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ mode: EditMode; tierId: number; currentActive: boolean } | null>(null);

  // ===== Fetch all tiers from chain =====
  const fetchTiers = useCallback(async () => {
    const reader = readonlyNexus || nexus;
    if (!reader) return;
    setFetching(true);
    try {
      const [nextA, nextB] = await Promise.all([
        reader.nextNftaTierId(),
        reader.nextNftbTierId(),
      ]);

      const nA = Number(nextA);
      const nB = Number(nextB);

      // Build tier ID lists to scan.
      // Some deployments write tiers with explicit IDs (e.g. 1,2,3) without
      // going through the auto-assign path, so nextNftaTierId may stay at 1.
      // Fall back to a bounded scan (up to 20) to discover those tiers.
      const nftaIds = nA > 1
        ? Array.from({ length: nA - 1 }, (_, i) => i + 1)
        : Array.from({ length: 20 }, (_, i) => i + 1);
      const nftbIds = nB > 1
        ? Array.from({ length: nB - 1 }, (_, i) => i + 1)
        : Array.from({ length: 20 }, (_, i) => i + 1);

      // Fetch NFTA tiers
      const nftaResults: NftaTierInfo[] = [];
      {
        const promises = nftaIds.map(async (id) => {
          try {
            const t = await reader.nftaTiers(BigInt(id));
            const maxSupply = BigInt(t.maxSupply);
            if (maxSupply === 0n) return null;
            return {
              tierId: id,
              price: BigInt(t.price),
              dailyYield: BigInt(t.dailyYield),
              maxSupply,
              currentSupply: BigInt(t.currentSupply),
              isActive: Boolean(t.isActive),
            } as NftaTierInfo;
          } catch {
            return null;
          }
        });
        const results = await Promise.all(promises);
        nftaResults.push(...results.filter((r): r is NftaTierInfo => r !== null));
      }

      // Fetch NFTB tiers
      const nftbResults: NftbTierInfo[] = [];
      {
        const promises = nftbIds.map(async (id) => {
          try {
            const t = await reader.nftbTiers(BigInt(id));
            const maxSupply = BigInt(t.maxSupply);
            if (maxSupply === 0n) return null;
            return {
              tierId: id,
              price: BigInt(t.price),
              weight: BigInt(t.weight),
              maxSupply,
              usdtMinted: BigInt(t.usdtMinted),
              tofMinted: BigInt(t.tofMinted),
              dividendBps: BigInt(t.dividendBps),
              isActive: Boolean(t.isActive),
            } as NftbTierInfo;
          } catch {
            return null;
          }
        });
        const results = await Promise.all(promises);
        nftbResults.push(...results.filter((r): r is NftbTierInfo => r !== null));
      }

      setNftaTiers(nftaResults);
      setNftbTiers(nftbResults);
      setOnChainEmpty(nftaResults.length === 0 && nftbResults.length === 0);
    } catch (err: any) {
      console.error("Fetch tiers failed:", err);
      toast({ title: "读取 Tier 数据失败", description: err?.shortMessage || err?.message || "未知错误", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  }, [readonlyNexus, nexus, toast]);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  // ===== Run tx helper =====
  const runTx = async (action: string, txFn: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await execTx(txFn);
      if (!result.success) {
        toast({ title: `${action}失败`, description: result.error || "未知错误", variant: "destructive" });
        return false;
      }
      toast({ title: `${action}成功`, description: result.hash?.slice(0, 12) || "已上链" });
      await fetchTiers();
      await onRefreshParent();
      return true;
    } finally {
      setLoading(false);
    }
  };

  // ===== 一键初始化默认 Tier 到链上 =====
  const initDefaultTiers = async () => {
    if (!nexus) return;
    setLoading(true);
    try {
      // NFTA tiers
      for (const spec of FIXED_NFTA_TIER_SPECS) {
        const result = await execTx(() =>
          nexus.configureNftaTier(
            0n, // tierId=0 => auto assign
            ethers.parseUnits(spec.price, 18),
            ethers.parseUnits(spec.dailyYield, 18),
            BigInt(spec.maxSupply),
            spec.isActive,
          ),
        );
        if (!result.success) {
          toast({ title: `初始化 NFTA Tier 失败`, description: result.error || "未知错误", variant: "destructive" });
          return;
        }
        toast({ title: `NFTA Tier (${spec.price}U) 已创建`, description: result.hash?.slice(0, 12) || "" });
      }

      // NFTB tiers
      for (const spec of FIXED_NFTB_TIER_SPECS) {
        const result = await execTx(() =>
          nexus.configureNftbTier(
            0n, // tierId=0 => auto assign
            ethers.parseUnits(spec.price, 18),
            BigInt(spec.weight),
            BigInt(spec.maxSupply),
            BigInt(spec.dividendBps),
            spec.isActive,
          ),
        );
        if (!result.success) {
          toast({ title: `初始化 NFTB Tier 失败`, description: result.error || "未知错误", variant: "destructive" });
          return;
        }
        toast({ title: `NFTB Tier (${spec.price}U) 已创建`, description: result.hash?.slice(0, 12) || "" });
      }

      toast({ title: "全部 Tier 初始化完成", description: `${FIXED_NFTA_TIER_SPECS.length} NFTA + ${FIXED_NFTB_TIER_SPECS.length} NFTB` });
      await fetchTiers();
      await onRefreshParent();
    } finally {
      setLoading(false);
    }
  };

  // ===== Toggle active (上架/下架) =====
  const requestToggle = (mode: EditMode, tierId: number, currentActive: boolean) => {
    setConfirmTarget({ mode, tierId, currentActive });
    setConfirmOpen(true);
  };

  const executeToggle = async () => {
    if (!confirmTarget || !nexus) return;
    const { mode, tierId, currentActive } = confirmTarget;
    const newActive = !currentActive;
    const label = newActive ? "上架" : "下架";

    if (mode === "nfta") {
      const tier = nftaTiers.find((t) => t.tierId === tierId);
      if (!tier) return;
      await runTx(
        `${label} NFTA Tier ${tierId}`,
        () => nexus.configureNftaTier(BigInt(tierId), tier.price, tier.dailyYield, tier.maxSupply, newActive),
      );
    } else {
      const tier = nftbTiers.find((t) => t.tierId === tierId);
      if (!tier) return;
      await runTx(
        `${label} NFTB Tier ${tierId}`,
        () => nexus.configureNftbTier(BigInt(tierId), tier.price, tier.weight, tier.maxSupply, tier.dividendBps, newActive),
      );
    }
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  // ===== Open edit dialog =====
  const openEdit = (mode: EditMode, tierId: number) => {
    setEditMode(mode);
    setEditTierId(tierId);

    if (mode === "nfta") {
      if (tierId === 0) {
        setNftaForm({ price: "", dailyYield: "", maxSupply: "", isActive: "true" });
      } else {
        const tier = nftaTiers.find((t) => t.tierId === tierId);
        if (tier) {
          setNftaForm({
            price: fmtU(tier.price),
            dailyYield: fmtU(tier.dailyYield),
            maxSupply: tier.maxSupply.toString(),
            isActive: tier.isActive ? "true" : "false",
          });
        }
      }
    } else {
      if (tierId === 0) {
        setNftbForm({ price: "", weight: "", maxSupply: "", dividendBps: "", isActive: "true" });
      } else {
        const tier = nftbTiers.find((t) => t.tierId === tierId);
        if (tier) {
          setNftbForm({
            price: fmtU(tier.price),
            weight: tier.weight.toString(),
            maxSupply: tier.maxSupply.toString(),
            dividendBps: tier.dividendBps.toString(),
            isActive: tier.isActive ? "true" : "false",
          });
        }
      }
    }
    setDialogOpen(true);
  };

  // ===== Save edit =====
  const saveEdit = async () => {
    if (!nexus) return;

    if (editMode === "nfta") {
      const price = Number(nftaForm.price);
      const yield_ = Number(nftaForm.dailyYield);
      const maxSup = Number(nftaForm.maxSupply);
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(yield_) || yield_ <= 0 || !Number.isFinite(maxSup) || maxSup <= 0 || !Number.isInteger(maxSup)) {
        toast({ title: "参数错误", description: "请确认所有字段有效", variant: "destructive" });
        return;
      }
      const label = editTierId === 0 ? "新建 NFTA Tier" : `修改 NFTA Tier ${editTierId}`;
      const ok = await runTx(label, () =>
        nexus.configureNftaTier(
          BigInt(editTierId),
          ethers.parseUnits(nftaForm.price, 18),
          ethers.parseUnits(nftaForm.dailyYield, 18),
          BigInt(maxSup),
          nftaForm.isActive === "true",
        ),
      );
      if (ok) setDialogOpen(false);
    } else {
      const price = Number(nftbForm.price);
      const weight = Number(nftbForm.weight);
      const maxSup = Number(nftbForm.maxSupply);
      const divBps = Number(nftbForm.dividendBps);
      if (
        !Number.isFinite(price) || price <= 0 ||
        !Number.isFinite(weight) || weight <= 0 || !Number.isInteger(weight) ||
        !Number.isFinite(maxSup) || maxSup <= 0 || !Number.isInteger(maxSup) ||
        !Number.isFinite(divBps) || divBps < 0 || divBps > 10000
      ) {
        toast({ title: "参数错误", description: "请确认所有字段有效", variant: "destructive" });
        return;
      }
      const label = editTierId === 0 ? "新建 NFTB Tier" : `修改 NFTB Tier ${editTierId}`;
      const ok = await runTx(label, () =>
        nexus.configureNftbTier(
          BigInt(editTierId),
          ethers.parseUnits(nftbForm.price, 18),
          BigInt(weight),
          BigInt(maxSup),
          BigInt(Math.trunc(divBps)),
          nftbForm.isActive === "true",
        ),
      );
      if (ok) setDialogOpen(false);
    }
  };

  // ======================== Render ========================

  return (
    <>
      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>节点 Tier 管理</CardTitle>
            <CardDescription>查看、上架/下架、修改节点等级属性</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled={fetching} onClick={fetchTiers} title="刷新">
              <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 链上无 Tier 时显示默认规格预览 + 一键初始化 */}
          {onChainEmpty && !fetching && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-amber-400">链上尚未配置 Tier</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    前端页面当前使用硬编码默认值展示。点击下方按钮可将默认 Tier 配置写入链上，写入后即可编辑。
                  </div>
                </div>
                <Button
                  disabled={!isOwner || loading}
                  onClick={initDefaultTiers}
                  className="shrink-0"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                  一键初始化到链上
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-muted-foreground">NFTA 默认规格 ({FIXED_NFTA_TIER_SPECS.length} 个)</div>
                  {FIXED_NFTA_TIER_SPECS.map((s) => (
                    <div key={`da-${s.id}`} className="flex justify-between bg-muted/30 rounded px-2 py-1">
                      <span>{getNftaTierName(s.id)}</span>
                      <span className="font-mono">{s.price}U / {s.dailyYield} TOT/日 / 最大{s.maxSupply}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-muted-foreground">NFTB 默认规格 ({FIXED_NFTB_TIER_SPECS.length} 个)</div>
                  {FIXED_NFTB_TIER_SPECS.map((s) => (
                    <div key={`db-${s.id}`} className="flex justify-between bg-muted/30 rounded px-2 py-1">
                      <span>{getNftbTierName(s.id)}</span>
                      <span className="font-mono">{s.price}U / 权重{s.weight} / {Number(s.dividendBps) / 100}%分红</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* NFTA Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">NFTA 节点等级</h3>
              <Button size="sm" variant="outline" disabled={!isOwner || loading} onClick={() => openEdit("nfta", 0)}>
                <Plus className="h-3 w-3 mr-1" /> 新建
              </Button>
            </div>
            {nftaTiers.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                {fetching ? "加载中..." : "暂无 NFTA Tier 数据"}
              </div>
            ) : (
              <div className="rounded-md border border-border/60 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead className="text-right">价格(U)</TableHead>
                      <TableHead className="text-right">日收益</TableHead>
                      <TableHead className="text-right">已售/总量</TableHead>
                      <TableHead className="text-center">状态</TableHead>
                      <TableHead className="text-center w-32">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nftaTiers.map((tier) => (
                      <TableRow key={`nfta-${tier.tierId}`}>
                        <TableCell className="font-mono">{tier.tierId}</TableCell>
                        <TableCell>{getNftaTierName(tier.tierId)}</TableCell>
                        <TableCell className="text-right font-mono">{fmtUShort(tier.price)}</TableCell>
                        <TableCell className="text-right font-mono">{fmtU(tier.dailyYield)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {tier.currentSupply.toString()}/{tier.maxSupply.toString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={tier.isActive ? "default" : "destructive"}>
                            {tier.isActive ? "已上架" : "已下架"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant={tier.isActive ? "destructive" : "default"}
                              className="h-7 text-xs px-2"
                              disabled={!isOwner || loading}
                              onClick={() => requestToggle("nfta", tier.tierId, tier.isActive)}
                              title={tier.isActive ? "下架" : "上架"}
                            >
                              {tier.isActive ? <PowerOff className="h-3 w-3 mr-1" /> : <Power className="h-3 w-3 mr-1" />}
                              {tier.isActive ? "下架" : "上架"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              disabled={!isOwner || loading}
                              onClick={() => openEdit("nfta", tier.tierId)}
                              title="编辑"
                            >
                              <Pencil className="h-3 w-3 mr-1" /> 编辑
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* NFTB Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">NFTB 节点等级</h3>
              <Button size="sm" variant="outline" disabled={!isOwner || loading} onClick={() => openEdit("nftb", 0)}>
                <Plus className="h-3 w-3 mr-1" /> 新建
              </Button>
            </div>
            {nftbTiers.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                {fetching ? "加载中..." : "暂无 NFTB Tier 数据"}
              </div>
            ) : (
              <div className="rounded-md border border-border/60 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead className="text-right">价格(U)</TableHead>
                      <TableHead className="text-right">权重</TableHead>
                      <TableHead className="text-right">分红bps</TableHead>
                      <TableHead className="text-right">已售(U/T)/总量</TableHead>
                      <TableHead className="text-center">状态</TableHead>
                      <TableHead className="text-center w-32">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nftbTiers.map((tier) => (
                      <TableRow key={`nftb-${tier.tierId}`}>
                        <TableCell className="font-mono">{tier.tierId}</TableCell>
                        <TableCell>{getNftbTierName(tier.tierId)}</TableCell>
                        <TableCell className="text-right font-mono">{fmtUShort(tier.price)}</TableCell>
                        <TableCell className="text-right font-mono">{tier.weight.toString()}</TableCell>
                        <TableCell className="text-right font-mono">{tier.dividendBps.toString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {tier.usdtMinted.toString()}/{tier.tofMinted.toString()}/{tier.maxSupply.toString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={tier.isActive ? "default" : "destructive"}>
                            {tier.isActive ? "已上架" : "已下架"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant={tier.isActive ? "destructive" : "default"}
                              className="h-7 text-xs px-2"
                              disabled={!isOwner || loading}
                              onClick={() => requestToggle("nftb", tier.tierId, tier.isActive)}
                              title={tier.isActive ? "下架" : "上架"}
                            >
                              {tier.isActive ? <PowerOff className="h-3 w-3 mr-1" /> : <Power className="h-3 w-3 mr-1" />}
                              {tier.isActive ? "下架" : "上架"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              disabled={!isOwner || loading}
                              onClick={() => openEdit("nftb", tier.tierId)}
                              title="编辑"
                            >
                              <Pencil className="h-3 w-3 mr-1" /> 编辑
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Edit Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTierId === 0
                ? editMode === "nfta" ? "新建 NFTA Tier" : "新建 NFTB Tier"
                : editMode === "nfta" ? `编辑 NFTA Tier ${editTierId}` : `编辑 NFTB Tier ${editTierId}`}
            </DialogTitle>
            <DialogDescription>
              {editTierId === 0 ? "Tier ID 将由合约自动分配" : "修改后的参数仅影响新购买，已售出节点不受影响"}
            </DialogDescription>
          </DialogHeader>

          {editMode === "nfta" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">价格 (USDT)</label>
                <Input value={nftaForm.price} onChange={(e) => setNftaForm((f) => ({ ...f, price: e.target.value }))} placeholder="如 500" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">日收益 (TOT)</label>
                <Input value={nftaForm.dailyYield} onChange={(e) => setNftaForm((f) => ({ ...f, dailyYield: e.target.value }))} placeholder="如 6.5" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">最大供应量</label>
                <Input value={nftaForm.maxSupply} onChange={(e) => setNftaForm((f) => ({ ...f, maxSupply: e.target.value }))} placeholder="如 10000" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">状态</label>
                <Select value={nftaForm.isActive} onValueChange={(v) => setNftaForm((f) => ({ ...f, isActive: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">上架（激活）</SelectItem>
                    <SelectItem value="false">下架（禁用）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">价格 (USDT)</label>
                <Input value={nftbForm.price} onChange={(e) => setNftbForm((f) => ({ ...f, price: e.target.value }))} placeholder="如 500" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">权重</label>
                <Input value={nftbForm.weight} onChange={(e) => setNftbForm((f) => ({ ...f, weight: e.target.value }))} placeholder="如 1, 2, 3" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">最大供应量</label>
                <Input value={nftbForm.maxSupply} onChange={(e) => setNftbForm((f) => ({ ...f, maxSupply: e.target.value }))} placeholder="如 2000" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">分红比率 (bps, 0-10000)</label>
                <Input value={nftbForm.dividendBps} onChange={(e) => setNftbForm((f) => ({ ...f, dividendBps: e.target.value }))} placeholder="如 2000 (=20%)" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">状态</label>
                <Select value={nftbForm.isActive} onValueChange={(v) => setNftbForm((f) => ({ ...f, isActive: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">上架（激活）</SelectItem>
                    <SelectItem value="false">下架（禁用）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button disabled={!isOwner || loading} onClick={saveEdit}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editTierId === 0 ? "创建" : "保存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Confirm Toggle Dialog ===== */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.currentActive ? "确认下架" : "确认上架"}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.currentActive
                ? `下架 ${confirmTarget.mode.toUpperCase()} Tier ${confirmTarget.tierId} 后，用户将无法购买该等级节点。已持有的节点不受影响。`
                : `上架 ${confirmTarget?.mode.toUpperCase()} Tier ${confirmTarget?.tierId} 后，用户可购买该等级节点。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>取消</Button>
            <Button
              variant={confirmTarget?.currentActive ? "destructive" : "default"}
              disabled={loading}
              onClick={executeToggle}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {confirmTarget?.currentActive ? "确认下架" : "确认上架"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
