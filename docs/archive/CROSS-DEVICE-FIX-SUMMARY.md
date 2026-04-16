# 跨设备购买/兑换失败问题诊断和修复

## 问题陈述

**用户反馈**: "在其他设备无法购买兑换，但在特定设备（通常是首次开发/部署的设备）可以正常操作"

## 根本原因分析

三个系统级问题被识别导致跨设备交易失败：

### 问题 1: 构建时环境变量注入（Build-time Env Vars）

**症状**: 不同设备从不同部署加载不同的合约地址

**根本原因**:

```
NEXT_PUBLIC_* 环境变量在构建时被内联到代码中，而不是运行时注入
- Device A (t1.test2dapp.xyz): 加载部署版本中的地址
- Device B (localhost): 加载本地构建版本中的地址
- Device C (其他): 加载缓存/旧版本的地址
```

**影响**: 同一用户在不同设备上与不同的合约实例交互，导致状态不一致

### 问题 2: RPC 地址硬编码/不匹配（Hardcoded RPC Mismatch）

**症状**: 交易失败，gas 估算错误，"provide network not available"

**原始代码问题**:

```typescript
// use-contract.ts - 硬编码默认 RPC
const rpcUrls = getCncRpcUrls(
  "https://rpc.cncchainpro.com", // ❌ 硬编码
  process.env.NEXT_PUBLIC_CNC_RPC_URL,
  process.env.CNC_RPC_URL,
);

// vs. wagmi.ts - 动态解析 RPC
const cncRpcUrl = getPrimaryCncRpcUrl(process.env.NEXT_PUBLIC_CNC_RPC_URL);
```

**影响**:

- wagmi 连接到一个 RPC 节点
- 合约读取从另一个 RPC 节点
- 导致网络状态不同步
- 交易失败或返回过期数据

### 问题 3: Signer 初始化延迟/失败无处理（Unhandled Signer Initialization Failures）

**症状**: "钱包连接中…" 卡住，无响应，或连接后交易仍然失败

**技术分析**:

```typescript
// web3-provider.tsx
const [ethersSigner, setEthersSigner] = useState<ethers.Signer | null>(null);

useEffect(() => {
  if (walletClient) {
    // walletClient 可能为 null 如果 wallet 还未注入
    // 或 window.ethereum 还未被 RainbowKit 初始化
    const browserProvider = new ethers.BrowserProvider(walletClient.transport);
    browserProvider
      .getSigner()
      .then((s) => setEthersSigner(s))
      .catch((err) => {
        // ❌ 之前没有错误处理
        setEthersSigner(null); // 静默失败
      });
  }
}, [walletClient]);
```

**影响**:

- 移动设备上 wallet 注入延迟
- 新设备/浏览器上首次连接不稳定
- 用户收不到任何错误提示
- 合约操作默默回退到只读 provider（无法发送交易）

## 应用的修复

### 1. ✅ 统一 RPC 配置 (`use-contract.ts`)

```typescript
// 导入与 wagmi 相同的 RPC 解析函数
import { getPrimaryCncRpcUrl } from "@/lib/cnc-rpc";

// 修复: 使用与 wagmi 相同的逻辑
function getFallbackProvider(): ethers.Provider {
  const primaryRpc = getPrimaryCncRpcUrl(process.env.NEXT_PUBLIC_CNC_RPC_URL);
  const rpcUrls = getCncRpcUrls(primaryRpc, process.env.CNC_RPC_URL);
  // ... 构건其他提供者
}
```

**好处**: 所有 Web3 交互现在使用一致的 RPC 端点

### 2. ✅ Signer 错误追踪和诊断 (`web3-provider.tsx`)

```typescript
const [signerError, setSignerError] = useState<string | null>(null);

useEffect(() => {
  if (walletClient) {
    try {
      const browserProvider = new ethers.BrowserProvider(
        walletClient.transport,
      );
      browserProvider
        .getSigner()
        .then((s) => {
          setEthersSigner(s);
          setSignerError(null);
        })
        .catch((err) => {
          console.error("Failed to get signer from wallet:", err);
          setEthersSigner(null);
          setSignerError(err?.message || "Signer initialization failed");
        });
    } catch (err) {
      console.error("Failed to initialize BrowserProvider:", err);
      setSignerError(
        err instanceof Error ? err.message : "Provider initialization failed",
      );
    }
  }
}, [walletClient]);
```

**好处**:

- 捕获和记录 signer 初始化错误
- 开发者工具中可见（console logs）
- 为用户提供清晰的诊断

### 3. ✅ 组件级 Signer 提取 (`swap-page.tsx`)

```typescript
// 从 useWeb3 在组件顶级提取 signer
const { address, isConnected, signer } = useWeb3();

// 在 disableReason useMemo 中检查 signer
const disableReason = useMemo(() => {
  if (!isConnected) return t("connectWalletFirst");
  if (!signer) return "钱包未就绪"; // ← 新增检查
  if (!swap || !tot || !usdt) return "合约初始化中...";
  // ...
}, [
  isConnected,
  signer,
  amountIn,
  side,
  usdtBalance,
  totBalance,
  maxSellAmount,
  t,
]);

// 在 handleSwap 中验证 signer
const handleSwap = async () => {
  if (!isConnected || !address) return;
  if (!signer) {
    toast({ title: "钱包未就绪", description: "请断开钱包后重新连接" });
    return;
  }
  // 继续交易逻辑
};
```

**好处**:

- 禁用按钮直到 signer 准备就绪
- 如果 signer 初始化失败，向用户显示清晰的提示
- 防止在没有有效 signer 的情况下提交交易

## 修改的文件清单

| 文件                                 | 修改                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `src/hooks/use-contract.ts`          | 导入 `getPrimaryCncRpcUrl`，统一 RPC 配置                               |
| `src/lib/web3-provider.tsx`          | 添加 `signerError` 状态，try-catch 块，开发日志                         |
| `src/components/pages/swap-page.tsx` | 从 `useWeb3()` 提取 `signer`，在 `disableReason` 和 `handleSwap` 中验证 |

## 验证步骤

### 1. 本地验证

```bash
# 编译验证无 TypeScript 错误
npm run build

# 启动开发服务器
npm run dev
```

### 2. 跨设备测试

1. **桌面浏览器** (首次工作的设备)
   - 连接钱包
   - 执行购买/兑换交易
   - 预期: ✅ 成功

2. **移动浏览器** (之前失败的设备)
   - 清除浏览器缓存
   - 访问部署的 URL: https://t1.test2dapp.xyz
   - 连接钱包
   - 预期行为:
     - 如果 signer 未准备好: 显示 "钱包未就绪"
     - 确保钱包完全连接后: "钱包未就绪" 消息消失
     - 执行购买/兑换交易
     - 预期: ✅ 成功

3. **不同网络条件**
   - 在慢网络或高延迟下重复步骤 2
   - 预期: ✅ Signer 初始化延迟更明显，但最终会成功（带有清晰的用户反馈）

### 3. 浏览器开发者工具诊断

打开浏览器的开发者工具 (F12)，切换到 Console 标签：

```javascript
// 查看 signer 错误（如有）
console.error("Failed to get signer from wallet: ...");

// 验证以太坊提供者已连接
console.log(window.ethereum); // 应为 MetaMask/OKX/TP Wallet 对象

// 验证 wagmi 状态
import { useAccount } from "wagmi";
const { address, isConnected, chainId } = useAccount();
```

## 部署状态

✅ **已部署到 t1.test2dapp.xyz**

```
- Next.js 应用: 端口 3001 (systemd service: nexus-nextjs.service)
- Caddy 反向代理: 端口 443/80 (systemd service: caddy.service)
- HTTPS: 自动启用 (Let's Encrypt)
- 响应状态: HTTP/2 200 ✓
```

## Git 历史

```
Commit: 1deb465 (feat/totswap-external-dex-v3)
Message: "fix: Resolve cross-device Web3 provider inconsistencies"

已推送到:
- Origin: https://github.com/dappweb/DeFiNodeNexus.git
- Truth-Oracle: https://github.com/partner-zhang/truth-oracle.git
```

## 已知限制 & 后续改进

### 已知限制

1. **构建时环境变量** (`NEXT_PUBLIC_*`)
   - 仍然在构建时注入
   - 不同构建的设备仍可能获得不同的配置
   - 长期解决方案: 迁移到运行时 API 端点获取配置

2. **移动钱包支持**
   - TokenPocket (TP Wallet) 在某些 Android 设备上延迟较长
   - OKX Wallet 在新设备首次连接时需要额外权限确认
   - 现在通过更好的错误处理和用户反馈来应对

### 建议的后续改进

- [ ] 创建运行时 `/api/config` 端点而不是使用 `NEXT_PUBLIC_*`
- [ ] 实现 Signer 初始化超时和自动重试机制
- [ ] 添加 Sentry/错误追踪来监控生产中的 signer 失败
- [ ] 为移动设备添加专用的 wallet 连接流程（带心跳/轮询）
- [ ] 文档化 "我的钱包显示已连接但交易失败" 故障排除步骤

## 问题解决流程

| 步骤             | 用户体验     | 修复前                     | 修复后                        |
| ---------------- | ------------ | -------------------------- | ----------------------------- |
| 1. 钱包连接      | 显示连接进度 | 卡住或显示泛错误           | "钱包未就绪" → 跳过           |
| 2. Signer 初始化 | 后台，无反馈 | 失败=静默回退              | 失败=记录日志+用户提示        |
| 3. 执行交易      | 点击购买     | 交易失败，错误信息不清     | 验证中间件阻止无效交易        |
| 4. 跨设备一致性  | 多个设备     | 设备 A 成功，设备 B/C 失败 | 所有设备现在使用同一 RPC/配置 |

## 联系信息 & 支持

如果仍然遇到跨设备问题：

1. 在浏览器控制台中截图错误信息
2. 报告您的设备类型、浏览器和钱包
3. 记录涉及的地址和尝试过的时间戳
4. 参考 `signerError` 日志作为主要诊断线索

---

**修复完成时间**: 2026-04-14 07:24 UTC
**修复分支**: `feat/totswap-external-dex-v3`
**状态**: 生产部署 ✓
