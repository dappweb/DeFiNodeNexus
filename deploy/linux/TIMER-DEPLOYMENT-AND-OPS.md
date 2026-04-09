# DeFiNodeNexus 定时任务部署与运维指南

## 1. 概述

DeFiNodeNexus 包含两个核心定时任务，由 systemd 调度：

| 任务 | 脚本 | 触发方式 | 主要功能 |
|------|------|--------|--------|
| **Keeper** | `scripts/keeper.js --once` | 启动后 2 分钟，每 10 分钟执行一次 | 链上数据维护（deflate、分红分发） |
| **Health Check** | `scripts/daily-health-check.js` | 每天上午 8:00 执行 | 系统健康检查与告警 |

## 2. 硬件与系统要求

### 最低配置
- CPU：1 核心（建议 ≥ 2 核）
- 内存：512 MB 可用（建议 ≥ 1 GB）
- 磁盘：500 MB 可用空间
- 操作系统：Ubuntu 22.04 LTS / 24.04 LTS
- systemd：v247+ （systemctl 可用）

### 网络要求
- 能够访问 CNC RPC 端点（rpc.cncchainpro.com:443）
- 可选：Discord Webhook / Telegram 机器人（用于告警通知）

## 3. 环境变量配置

### 必填变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `CNC_RPC_URL` | CNC 链 RPC 地址 | `https://rpc.cncchainpro.com` |
| `DEPLOYER_PRIVATE_KEY` | 链上操作私钥（Keeper 需要） | `0x...` |
| `SWAP_ADDRESS` | TOTSwap 合约地址 | `0x...` |
| `NEXUS_ADDRESS` | DeFiNodeNexus 合约地址 | `0x...` |

### 可选变量

#### Keeper 配置
```bash
KEEPER_INTERVAL_MS=600000           # Keeper 循环间隔（ms），默认 600000
KEEPER_LOCK_FILE=runtime/keeper/keeper.lock
KEEPER_STATUS_FILE=runtime/keeper/latest-run.json
```

#### Health Check 配置
```bash
MIN_TOT_RESERVE=10000               # TOT 储备最小值
MIN_USDT_RESERVE=1000               # USDT 储备最小值
MAX_DEFLATION_DELAY_HOURS=6         # 最大 deflate 延迟（小时）
HEALTH_REPORT_FILE=runtime/health/latest-health-check.json
```

#### 通知告警配置
```bash
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=-1001234567890
```

## 4. 自动化部署

### 方式 A：一键部署（推荐）

执行 setup.sh 会自动完成定时任务的安装和启用：

```bash
sudo bash deploy/linux/setup.sh
```

setup.sh 的执行步骤：
1. 安装 Node.js 20 LTS（如未安装）
2. 创建系统用户 `definode`
3. 克隆/更新代码到 `/opt/definode/DeFiNodeNexus`
4. 构建 Next.js 应用
5. 复制 systemd 文件到 `/etc/systemd/system/`：
   - `definode-keeper.service`
   - `definode-keeper.timer`
   - `definode-health.service`
   - `definode-health.timer`
   - `definode-web.service`
6. 启用并启动所有服务

### 方式 B：手动部署

1. **复制 systemd 文件到系统目录：**

```bash
sudo cp deploy/linux/definode-keeper.* /etc/systemd/system/
sudo cp deploy/linux/definode-health.* /etc/systemd/system/
sudo cp deploy/linux/definode-web.service /etc/systemd/system/
```

2. **重新加载 systemd 配置：**

```bash
sudo systemctl daemon-reload
```

3. **创建环境文件：**

```bash
# 从模板复制
sudo cp deploy/linux/.env.production.example /etc/definode/keeper.env

# 编辑环境文件
sudo vim /etc/definode/keeper.env
```

4. **设置正确的文件权限：**

```bash
sudo chown definode:definode /etc/definode/keeper.env
sudo chmod 600 /etc/definode/keeper.env
```

5. **启用 timer 和 service：**

```bash
sudo systemctl enable definode-keeper.timer
sudo systemctl enable definode-keeper.service
sudo systemctl enable definode-health.timer
sudo systemctl enable definode-health.service
```

6. **启动 timer（自动启动 service）：**

```bash
sudo systemctl start definode-keeper.timer
sudo systemctl start definode-health.timer
```

## 5. 部署验证

### 5.1 检查文件复制

```bash
ls -la /etc/systemd/system/definode-*
ls -la /etc/definode/keeper.env
```

预期输出：
```
-rw-r--r-- 1 root root  xxx /etc/systemd/system/definode-keeper.service
-rw-r--r-- 1 root root  xxx /etc/systemd/system/definode-keeper.timer
-rw-r--r-- 1 root root  xxx /etc/systemd/system/definode-health.service
-rw-r--r-- 1 root root  xxx /etc/systemd/system/definode-health.timer
-rw------- 1 definode definode xxx /etc/definode/keeper.env
```

### 5.2 检查 systemd 配置

```bash
sudo systemctl list-unit-files | grep definode
```

预期输出：
```
definode-health.service                 enabled         
definode-health.timer                   enabled         
definode-keeper.service                 enabled         
definode-keeper.timer                   enabled         
definode-web.service                    enabled         
```

### 5.3 检查 Timer 计划

```bash
systemctl list-timers --all | grep definode
```

预期输出：
```
Thu 2026-04-09 08:00:00 CST 11h left        definode-health.timer           definode-health.service
Thu 2026-04-09 12:15:00 CST 3h 40min left  definode-keeper.timer           definode-keeper.service
```

### 5.4 手工执行一次验证

#### 验证 Keeper

```bash
sudo systemctl start definode-keeper.service
sleep 3
journalctl -u definode-keeper.service -n 100 --no-pager
```

预期：看到任务执行日志（deflate/distribute 状态、TOT/USDT 储备等）。

#### 验证 Health Check

```bash
sudo systemctl start definode-health.service
sleep 3
journalctl -u definode-health.service -n 100 --no-pager
```

预期：看到系统健康状态日志（链可用性、合约状态、系统告警）。

### 5.5 查看运行时文件

```bash
# Keeper 运行状态
cat /opt/definode/DeFiNodeNexus/runtime/keeper/latest-run.json

# Health Check 报告
cat /opt/definode/DeFiNodeNexus/runtime/health/latest-health-check.json
```

## 6. 日志查看与调试

### 6.1 实时查看 Keeper 日志

```bash
# 最近 50 行
journalctl -u definode-keeper.service -n 50 -f

# 或者查看特定时间范围
journalctl -u definode-keeper.service --since "1 hour ago" --no-pager
```

### 6.2 实时查看 Health Check 日志

```bash
journalctl -u definode-health.service -n 50 -f
```

### 6.3 查看 Timer 触发历史

```bash
journalctl -u definode-keeper.timer -n 20 --no-pager
journalctl -u definode-health.timer -n 20 --no-pager
```

### 6.4 查看系统错误日志

```bash
# 查找任何 systemd 错误
systemctl status definode-keeper.timer
systemctl status definode-health.timer
```

## 7. 任务管理

### 7.1 启用/停用 Keeper Timer

```bash
# 启用
sudo systemctl enable definode-keeper.timer
sudo systemctl start definode-keeper.timer

# 停用
sudo systemctl stop definode-keeper.timer
sudo systemctl disable definode-keeper.timer
```

### 7.2 启用/停用 Health Check Timer

```bash
# 启用
sudo systemctl enable definode-health.timer
sudo systemctl start definode-health.timer

# 停用
sudo systemctl stop definode-health.timer
sudo systemctl disable definode-health.timer
```

### 7.3 强制触发任务

```bash
# 强制执行 Keeper（无论计时器状态）
sudo systemctl start definode-keeper.service

# 强制执行 Health Check
sudo systemctl start definode-health.service
```

### 7.4 修改 Timer 计划

编辑 timer 文件：

```bash
sudo systemctl edit definode-keeper.timer
```

窗口中修改 `[Timer]` 部分，例如改变触发间隔：

```ini
[Timer]
OnBootSec=2min
OnUnitActiveSec=5min    # 改为每 5 分钟
Persistent=true
```

保存后重新加载：

```bash
sudo systemctl daemon-reload
sudo systemctl restart definode-keeper.timer
```

## 8. 故障排查

### 问题 1：Timer 未执行

**症状**：任务没有自动触发

**排查步骤**：
```bash
# 检查 timer 状态
systemctl status definode-keeper.timer

# 检查是否启用
systemctl is-enabled definode-keeper.timer

# 查看最后一次运行
journalctl -u definode-keeper.timer -n 10 --no-pager

# 手工触发测试
sudo systemctl start definode-keeper.service
journalctl -u definode-keeper.service -n 50 --no-pager
```

**可能原因与解决**：
- Timer 未启用 → `systemctl enable definode-keeper.timer`
- Timer 文件丢失 → 重新复制 setup.sh 中的步骤 5
- 系统时间不同步 → `timedatectl` 检查，`sudo timedatectl set-ntp true` 同步

### 问题 2：Service 以失败状态退出

**症状**：journalctl 显示错误日志

**排查步骤**：
```bash
# 查看完整错误
systemctl status definode-keeper.service

# 查看详细日志
journalctl -u definode-keeper.service -p err -n 50 --no-pager
```

**常见原因**：
- 环境变量缺失 → 检查 `/etc/definode/keeper.env`，确保所有必填字段存在
- 私钥无效或资金不足 → 验证 DEPLOYER_PRIVATE_KEY，检查链上余额
- RPC 不可达 → 测试 `curl https://rpc.cncchainpro.com`
- 合约地址错误 → 验证 SWAP_ADDRESS 和 NEXUS_ADDRESS

### 问题 3：权限错误

**症状**：`Permission denied` 或 `Access denied`

**排查步骤**：
```bash
# 检查文件权限
ls -la /etc/definode/
ls -la /opt/definode/DeFiNodeNexus/

# 检查 definode 用户是否存在
id definode
```

**解决**：
```bash
# 修复权限
sudo chown definode:definode /etc/definode/keeper.env
sudo chmod 600 /etc/definode/keeper.env
sudo chown -R definode:definode /opt/definode/DeFiNodeNexus/runtime/

# 确保 definode 能读取代码
sudo chown definode:definode /opt/definode/DeFiNodeNexus/scripts/keeper.js
```

### 问题 4：内存或超时错误

**症状**：`TIMEOUT` 或 `out of memory`

**排查步骤**：
```bash
# 查看系统资源
free -h
top -bn1 | head -n 15
```

**解决**：
- 增加服务超时：编辑 definode-keeper.service，修改 `TimeoutStartSec=300` 为更大值
- 检查系统资源：如磁盘满了需要清理
- 降低 Keeper 执行频率：修改 `OnUnitActiveSec=10min` 为 `OnUnitActiveSec=30min`

## 9. 监控与告警

### 9.1 配置 Discord 通知

获取 Discord Webhook URL（参考 Discord 文档），然后在环境文件中添加：

```bash
echo "DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN" | sudo tee -a /etc/definode/keeper.env
```

### 9.2 配置 Telegram 通知

获取 Telegram Bot Token 和 Chat ID，然后在环境文件中添加：

```bash
echo "TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" | sudo tee -a /etc/definode/keeper.env
echo "TELEGRAM_CHAT_ID=-1001234567890" | sudo tee -a /etc/definode/keeper.env
```

### 9.3 集中式日志查看

设置日志自动导出（可选的 ELK Stack 或 Splunk）：

```bash
# 导出最近 24 小时的所有日志
journalctl -u definode-keeper.service -u definode-health.service --since "24 hours ago" > /tmp/definode-logs.txt
```

## 10. 更新与回滚

### 10.1 更新脚本代码

1. **更新仓库代码**：

```bash
cd /opt/definode/DeFiNodeNexus
sudo -u definode git fetch origin
sudo -u definode git pull origin main
```

2. **重新构建应用**（如有 Next.js 变更）：

```bash
sudo -u definode npm ci --prefer-offline
sudo -u definode npm run build
```

3. **重启 Keeper 和 Health Check**（脚本通常不需要重启，下一次自动执行时加载）：

```bash
# 手工触发验证
sudo systemctl start definode-keeper.service
sudo systemctl start definode-health.service
```

### 10.2 回滚版本

如果新版脚本有问题，回滚到上一个版本：

```bash
cd /opt/definode/DeFiNodeNexus
sudo -u definode git revert HEAD
sudo -u definode git pull origin main
```

然后重新测试手工执行一次：

```bash
sudo systemctl start definode-keeper.service
journalctl -u definode-keeper.service -n 50 --no-pager
```

## 11. 性能优化建议

### 11.1 调整 Keeper 执行频率

根据链上活跃度调整：

```bash
# 低活动期：30 分钟执行一次
# 编辑 definode-keeper.timer
OnUnitActiveSec=1800

# 高活动期：5 分钟执行一次
OnUnitActiveSec=300
```

### 11.2 并行执行多个 Keeper 实例

如果单个 Keeper 无法跟上负载，考虑在不同机器上部署多个实例（需要分布式锁）。

### 11.3 清理运行时文件

定期清理历史日志和运行文件：

```bash
# 清理超过 7 天的日志
find /opt/definode/DeFiNodeNexus/runtime/ -type f -mtime +7 -delete

# 或新增一个清理 timer
sudo systemctl edit definode-cleanup.timer
```

## 12. 生产环境检查清单

启用定时任务前，确保以下各项已完成：

- [ ] RPC URL 已验证可访问
- [ ] 私钥和账户资金充足
- [ ] 合约地址已确认正确
- [ ] 环境文件权限已设置（600）
- [ ] 代码已构建完成
- [ ] 手工测试执行至少一次，无错误
- [ ] 告警通道（Discord/Telegram）已配置（可选但推荐）
- [ ] 系统资源充足（内存、磁盘、网络）
- [ ] systemd 文件已正确复制并 daemon-reload
- [ ] 至少 1 个完整周期已自动执行，日志正常

## 13. 支持与反馈

如遇到问题，请检查：

1. [CNC-BUSINESS-FEATURES-AND-DEPLOYMENT.md](CNC-BUSINESS-FEATURES-AND-DEPLOYMENT.md) - 整体部署指南
2. [CNC-DEPLOYMENT-GUIDE.md](CNC-DEPLOYMENT-GUIDE.md) - CNC 部署详情
3. 本文档的故障排查章节
4. 项目 GitHub Issues
