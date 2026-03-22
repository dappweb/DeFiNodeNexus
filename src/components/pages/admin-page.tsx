"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Users, Cpu, DollarSign, BarChart3, Settings, Megaphone,
  ShieldCheck, Pencil, Trash2, Plus, Activity, ArrowRightLeft,
} from "lucide-react";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard/stat-card";

export function AdminPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { adminData, announcements } = MOCK_USER_DATA;
  const { platformStats, users, recentTransactions, settings } = adminData;

  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode);
  const [feeRate, setFeeRate] = useState(settings.withdrawFeeRate);
  const [minPurchase, setMinPurchase] = useState(String(settings.minPurchase));

  const handleSaveSettings = () => {
    toast({ title: t('adminSettingsSaved') });
  };

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Admin Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className="text-xl font-headline font-bold">{t('adminPanel')}</h2>
          <p className="text-xs text-muted-foreground">{t('adminOwnerAddress')}: {adminData.ownerAddress.slice(0, 10)}...{adminData.ownerAddress.slice(-6)}</p>
        </div>
      </div>

      {/* Platform Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard title={t('adminTotalUsers')} value={platformStats.totalUsers.toLocaleString()} icon={Users} trend={{ value: "8.2%", positive: true }} />
        <StatCard title={t('adminActiveNodes')} value={platformStats.activeNodes.toLocaleString()} icon={Cpu} trend={{ value: "5.1%", positive: true }} />
        <StatCard title={t('adminTotalVolume')} value={`$${(platformStats.totalVolume / 1000).toFixed(0)}K`} icon={BarChart3} trend={{ value: "15.3%", positive: true }} />
        <StatCard title={t('adminRevenue')} value={`$${(platformStats.revenue / 1000).toFixed(0)}K`} icon={DollarSign} trend={{ value: "11.7%", positive: true }} />
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="users" className="text-xs gap-1"><Users size={14} /><span className="hidden sm:inline">{t('adminUserManagement')}</span><span className="sm:hidden">{t('adminUserManagement').slice(0, 2)}</span></TabsTrigger>
          <TabsTrigger value="announcements" className="text-xs gap-1"><Megaphone size={14} /><span className="hidden sm:inline">{t('adminAnnouncementMgmt')}</span><span className="sm:hidden">{t('adminAnnouncementMgmt').slice(0, 2)}</span></TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs gap-1"><ArrowRightLeft size={14} /><span className="hidden sm:inline">{t('adminRecentTransactions')}</span><span className="sm:hidden">TX</span></TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1"><Settings size={14} /><span className="hidden sm:inline">{t('adminSystemSettings')}</span><span className="sm:hidden">{t('adminSystemSettings').slice(0, 2)}</span></TabsTrigger>
        </TabsList>

        {/* === Users Tab === */}
        <TabsContent value="users">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t('adminUserManagement')}
              </CardTitle>
              <CardDescription>{platformStats.totalUsers} {t('adminTotalUsers')}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile card layout */}
              <div className="space-y-3 md:hidden">
                {users.map((user, i) => (
                  <div key={i} className="rounded-lg border border-border/50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{user.address}</span>
                      <Badge className={user.status === "enabled" ? "bg-green-500/15 text-green-500 border-green-500/30" : "bg-red-500/15 text-red-500 border-red-500/30"}>
                        {user.status === "enabled" ? t('adminEnabled') : t('adminDisabled')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">{t('adminUserNodes')}</p>
                        <p className="font-medium">{user.nodesCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">{t('adminUserTeamSize')}</p>
                        <p className="font-medium">{user.teamSize}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">{t('adminUserTotalInvested')}</p>
                        <p className="font-medium">${user.totalInvested.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>{t('adminUserAddress')}</TableHead>
                      <TableHead>{t('adminUserNodes')}</TableHead>
                      <TableHead>{t('adminUserTeamSize')}</TableHead>
                      <TableHead>{t('adminUserTotalInvested')}</TableHead>
                      <TableHead>{t('adminUserStatus')}</TableHead>
                      <TableHead className="text-right">{t('adminActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, i) => (
                      <TableRow key={i} className="border-border/50">
                        <TableCell className="font-mono text-xs">{user.address}</TableCell>
                        <TableCell>{user.nodesCount}</TableCell>
                        <TableCell>{user.teamSize}</TableCell>
                        <TableCell className="font-medium">${user.totalInvested.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={user.status === "enabled" ? "bg-green-500/15 text-green-500 border-green-500/30" : "bg-red-500/15 text-red-500 border-red-500/30"}>
                            {user.status === "enabled" ? t('adminEnabled') : t('adminDisabled')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                            <Pencil size={12} />
                            {t('adminEdit')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Announcements Tab === */}
        <TabsContent value="announcements">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  {t('adminAnnouncementMgmt')}
                </CardTitle>
              </div>
              <Button size="sm" className="bg-primary gap-1">
                <Plus size={14} />
                {t('adminAddAnnouncement')}
              </Button>
            </CardHeader>
            <CardContent>
              {/* Mobile card layout */}
              <div className="space-y-3 md:hidden">
                {announcements.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{item.type}</Badge>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                    <h4 className="text-sm font-semibold">{item.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"><Pencil size={12} />{t('adminEdit')}</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"><Trash2 size={12} />{t('adminDelete')}</Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>{t('adminTitle')}</TableHead>
                      <TableHead>{t('adminType')}</TableHead>
                      <TableHead>{t('adminDate')}</TableHead>
                      <TableHead className="text-right">{t('adminActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((item) => (
                      <TableRow key={item.id} className="border-border/50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.content}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{item.type}</Badge></TableCell>
                        <TableCell className="text-xs">{item.date}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"><Pencil size={12} />{t('adminEdit')}</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"><Trash2 size={12} />{t('adminDelete')}</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Transactions Tab === */}
        <TabsContent value="transactions">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                {t('adminRecentTransactions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile card layout */}
              <div className="space-y-3 md:hidden">
                {recentTransactions.map((tx, i) => (
                  <div key={i} className="rounded-lg border border-border/50 p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs truncate">{tx.from}</p>
                      <p className="text-sm font-medium">{tx.action}</p>
                      <p className="text-[10px] text-muted-foreground">{tx.time}</p>
                    </div>
                    <p className="font-bold text-sm whitespace-nowrap">${tx.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>{t('adminTxFrom')}</TableHead>
                      <TableHead>{t('adminTxAction')}</TableHead>
                      <TableHead>{t('adminTxAmount')}</TableHead>
                      <TableHead>{t('adminTxTime')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((tx, i) => (
                      <TableRow key={i} className="border-border/50">
                        <TableCell className="font-mono text-xs">{tx.from}</TableCell>
                        <TableCell className="text-sm">{tx.action}</TableCell>
                        <TableCell className="font-medium">${tx.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{tx.time}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Settings Tab === */}
        <TabsContent value="settings">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                {t('adminSystemSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Owner Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('adminOwnerAddress')}</label>
                  <Input value={adminData.ownerAddress} disabled className="font-mono text-xs bg-muted/30" />
                </div>

                {/* Withdraw Fee Rate */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('adminWithdrawFeeRate')}</label>
                  <Input value={feeRate} onChange={(e) => setFeeRate(e.target.value)} placeholder="5%" />
                </div>

                {/* Min Purchase */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('adminMinPurchase')} (USDT)</label>
                  <Input value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} placeholder="300" type="number" />
                </div>

                {/* Maintenance Mode */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('adminMaintenanceMode')}</label>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/10">
                    <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                    <span className={`text-sm font-medium ${maintenanceMode ? "text-orange-500" : "text-green-500"}`}>
                      {maintenanceMode ? t('adminOn') : t('adminOff')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveSettings} className="bg-primary px-6">
                  {t('adminSave')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
