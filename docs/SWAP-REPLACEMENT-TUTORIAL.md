# Swap 替换部署教程（TOTSwap -> TOTSwapV3）

本文档用于指导你把现有 Swap 代理合约实现替换为 TOTSwapV3，并完成 Router/Pair/Factory 配置与上线验收。

适用范围：
- Sepolia 测试网
- CNC 主网
- 已存在 UUPS 代理（不新增代理地址）

---

## 1. 本教程会完成什么

1. 保留你当前的 Swap 代理地址不变。
2. 将代理实现替换为 TOTSwapV3。
3. 可选自动配置：
- setDexRouter
- setDexPair
- setDexFactory
- setExternalDexEnabled
- setSwapPaused
4. 输出完整替换日志，便于运维留档。

主要脚本：
- scripts/replace-swap-v3.js

相关脚本：
- scripts/upgrade-totswap-v3.js
- scripts/configure-totswap-v3.js

---

## 2. 环境变量要求

最少必需：
- DEPLOYER_PRIVATE_KEY
- SEPOLIA_RPC_URL 或 CNC_RPC_URL
- 以下地址变量至少一个可用：
- UPGRADE_PROXY_ADDRESS
- SWAP_PROXY_ADDRESS
- SWAP_ADDRESS
- CNC_SWAP_ADDRESS

TOTSwapV3 可选配置：
- SWAP_DEX_ROUTER_ADDRESS
- SWAP_DEX_PAIR_ADDRESS
- SWAP_DEX_FACTORY_ADDRESS
- SWAP_ENABLE_EXTERNAL_DEX=true|false
- SWAP_PAUSE_SWAP=true|false

可选 CNC 专用别名：
- CNC_SWAP_DEX_ROUTER_ADDRESS
- CNC_SWAP_DEX_PAIR_ADDRESS
- CNC_SWAP_DEX_FACTORY_ADDRESS

---

## 3. 可用命令

已新增命令入口：

```bash
npm run replace:swap:v3:sepolia
npm run replace:swap:v3:cnc

npm run configure:totswap:v3:sepolia
npm run configure:totswap:v3:cnc
```

---

## 4. CNC 替换流程（推荐）

### 第 1 步：检查环境变量

```bash
cd /home/ubuntu/DeFiNodeNexus
rg -n "CNC_RPC_URL|CNC_SWAP_ADDRESS|SWAP_ADDRESS|SWAP_DEX_ROUTER_ADDRESS|SWAP_DEX_PAIR_ADDRESS|SWAP_DEX_FACTORY_ADDRESS|SWAP_ENABLE_EXTERNAL_DEX|SWAP_PAUSE_SWAP" .env .env.local
```

预期结果：
- CNC_RPC_URL 非空。
- CNC_SWAP_ADDRESS（或 SWAP_ADDRESS）指向你当前 Swap 代理地址。

### 第 2 步：执行替换

```bash
npm run replace:swap:v3:cnc
```

预期输出示例：

```text
Replacing Swap implementation with TOTSwapV3
Network:       cnc (50716)
Proxy address: 0x...
Replacement complete
Old implementation: 0x...
New implementation: 0x...
Version: TOTSwapV3
Owner: 0x...
Router: 0x...
Pair: 0x...
Factory: 0x...
External DEX enabled: true|false
Swap paused: false
Suggested env sync:
CNC_SWAP_ADDRESS=0x...
SWAP_ADDRESS=0x...
```

### 第 3 步：仅更新配置时执行

```bash
npm run configure:totswap:v3:cnc
```

适用场景：
- 实现已经是 TOTSwapV3。
- 只想变更 Router/Pair/Factory 或开关状态。

---

## 5. Sepolia 替换流程

```bash
npm run replace:swap:v3:sepolia
```

替换后建议再执行一次配置校验：

```bash
npm run configure:totswap:v3:sepolia
```

---

## 6. 替换后验收清单

1. 代理地址未变化：
- 仍使用原有 proxy 地址。

2. 实现地址已变化：
- 输出中出现新的 implementation 地址。

3. Owner 正确：
- 输出 owner 与预期管理员钱包一致。

4. Router 配置正确：
- Router、Pair、Factory 为预期地址（如未配置可为零地址）。

5. 模式状态正确：
- External DEX enabled 与 Swap paused 符合发布计划。

6. 前端地址一致：
- NEXT_PUBLIC_SWAP_ADDRESS 与代理地址一致。
- SWAP_ADDRESS / CNC_SWAP_ADDRESS 与当前网络地址一致。

---

## 7. 安全发布建议

推荐顺序：

1. 先替换实现，保持 externalDexEnabled=false。
2. 配置 Router/Pair/Factory。
3. 先做只读与报价验收。
4. 再启用外部 DEX 模式。
5. 冒烟通过后保持 swapPaused=false。

---

## 8. 常见报错与处理

### 报错：Missing UPGRADE_PROXY_ADDRESS...

原因：
- 未找到可用代理地址变量。

处理：
- 至少设置 CNC_SWAP_ADDRESS / SWAP_ADDRESS / SWAP_PROXY_ADDRESS 之一。

### 报错：execution reverted (Ownable)

原因：
- 当前签名账户不是代理 owner。

处理：
- 使用 owner 对应私钥执行。

### Router 或 Pair 未更新

原因：
- 对应环境变量为空或零地址。

处理：
- 填写 SWAP_DEX_ROUTER_ADDRESS / SWAP_DEX_PAIR_ADDRESS / SWAP_DEX_FACTORY_ADDRESS 后重跑 configure。

### 前端仍读取旧 Swap

原因：
- NEXT_PUBLIC_SWAP_ADDRESS 未更新或前端未重建。

处理：
1. 更新环境变量。
2. 重新构建并重启服务。

---

## 9. CNC 快速命令集

```bash
cd /home/ubuntu/DeFiNodeNexus

# 1) 替换实现，并应用环境变量中的 V3 配置
npm run replace:swap:v3:cnc

# 2) 仅执行配置（可重复执行）
npm run configure:totswap:v3:cnc

# 3) 如果修改了 NEXT_PUBLIC_*，重建前端
npm run build

# 4) 重启服务
pm2 restart definodenexus
```

---

## 10. 相关文件

- scripts/replace-swap-v3.js
- scripts/upgrade-totswap-v3.js
- scripts/configure-totswap-v3.js
- scripts/lib/swap-v3.js
- docs/SWAP-INIT-AND-ADJUSTMENT.md
