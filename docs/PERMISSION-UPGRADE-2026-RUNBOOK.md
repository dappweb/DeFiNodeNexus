# 2026 权限升级 Runbook

本次升级目标：

- Admin 继承 Owner 现有执行权限
- Manager 增加改上下级权限
- Manager 增加 Swap 提供流动性权限

## 前置条件

需要在 `.env` 中至少配置以下变量：

```env
CNC_RPC_URL=
DEPLOYER_PRIVATE_KEY=
NEXUS_ADDRESS=
SWAP_ADDRESS=
SWAP_CONTRACT_NAME=TOTSwapV3
```

可选变量：

```env
NEXUS_PROXY_ADDRESS=
SWAP_PROXY_ADDRESS=
PERMISSION_UPGRADE_SWAP_CONTRACT_NAME=TOTSwapV3
```

说明：

- `NEXUS_PROXY_ADDRESS` 未提供时回退到 `NEXUS_ADDRESS`
- `SWAP_PROXY_ADDRESS` 未提供时回退到 `SWAP_ADDRESS`
- 当前分支默认按 `TOTSwapV3` 执行 Swap 升级；如果要覆盖，再显式设置 `PERMISSION_UPGRADE_SWAP_CONTRACT_NAME`

## 执行步骤

1. 编译确认

```bash
npm exec hardhat compile
```

2. 执行权限升级

```bash
npm run upgrade:permissions:2026:cnc
```

3. 读取升级结果并校验实现地址

```bash
npm run verify:permissions:2026:cnc
```

4. 将现有 Nexus Admin / Manager 角色同步到 Swap

```bash
npm run sync:swap:roles:from:nexus:cnc
```

5. 执行权限探针，确认新权限模型实际可用

```bash
npm run probe:permissions:2026:cnc
```

## 升级后验证重点

1. Nexus

- Admin 是否可执行 `transferOwnership`
- Admin 是否可执行 `setAdmin / setAdmins`
- Manager 是否可执行 `forceSetReferrer`

2. Swap

- Admin 是否可执行 `forceDistribute`
- Admin 是否可执行 `emergencyWithdraw`
- Admin 是否可执行 `setDexRouter / setDexPair / setDexFactory / setExternalDexEnabled / setSwapPaused`
- Manager 是否可执行 `addLiquidity`

说明：

- 如果 `addLiquidity` 返回 `Disabled in external DEX mode`，说明权限已通过，但当前业务模式禁止内部池加流动性
- 如果 `emergencyWithdraw` 不再报 `Not admin`，而是其他业务性 revert，说明 Admin 权限已生效

3. 前端管理页

- Admin 是否能看到并点击 Owner 级治理按钮
- Manager 是否能点击“提供流动性”
- Manager 是否能执行改上下级入口

## 风险提醒

以下能力已随本次模型下放给 Admin：

- 所有权转移
- UUPS 升级授权
- 应急提取
- 外部 DEX 配置

上线前应至少确认：

- Admin 地址列表准确
- Nexus 与 Swap 的 Admin / Manager 是否已经完成同步
- Admin 私钥托管方式满足运营安全要求
- 升级后第一时间执行一次只读验证和一次小额写入验证
